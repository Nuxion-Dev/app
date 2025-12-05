use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use lazy_static::lazy_static;
use nnnoiseless::DenoiseState;
use serde::Serialize;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use crate::dxgi::clips::get_capture_config;

lazy_static! {
    static ref DESKTOP_BUFFER: Arc<Mutex<VecDeque<f32>>> = Arc::new(Mutex::new(VecDeque::new()));
    static ref MIC_BUFFER: Arc<Mutex<VecDeque<f32>>> = Arc::new(Mutex::new(VecDeque::new()));
    
    static ref DESKTOP_STREAM: Arc<Mutex<Option<cpal::Stream>>> = Arc::new(Mutex::new(None));
    static ref MIC_STREAM: Arc<Mutex<Option<cpal::Stream>>> = Arc::new(Mutex::new(None));
    
    static ref DESKTOP_CONFIG: Arc<Mutex<Option<cpal::StreamConfig>>> = Arc::new(Mutex::new(None));
    static ref MIC_CONFIG: Arc<Mutex<Option<cpal::StreamConfig>>> = Arc::new(Mutex::new(None));
}

#[derive(Serialize)]
pub struct Microphone {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub fn get_microphones() -> Vec<Microphone> {
    let mut microphones = Vec::new();

    let host = cpal::default_host();
    if let Ok(devices) = host.input_devices() {
        for device in devices {
            if let Ok(name) = device.name() {
                microphones.push(Microphone { 
                    id: name.clone(), 
                    name 
                });
            }
        }
    }

    microphones
}


pub fn start_audio_capture(duration_secs: u64) {
    let host = cpal::default_host();
    let capture_config_opt = get_capture_config();
    if capture_config_opt.is_none() {
        return;
    }
    let capture_config = capture_config_opt.unwrap();
    
    // Clear buffers to ensure we don't have leftover audio from previous sessions
    DESKTOP_BUFFER.lock().unwrap().clear();
    MIC_BUFFER.lock().unwrap().clear();

    // --- Desktop Capture ---
    if let Some(device) = host.default_output_device() {
        if let Ok(supported_config) = device.default_output_config() {
            let sample_format = supported_config.sample_format();
            let config: cpal::StreamConfig = supported_config.into();
            *DESKTOP_CONFIG.lock().unwrap() = Some(config.clone());

            let channels = config.channels as usize;
            let sample_rate = config.sample_rate.0;
            let max_samples = (duration_secs as usize) * sample_rate as usize * channels;

            let buffer = DESKTOP_BUFFER.clone();
            let err_fn = |err| eprintln!("an error occurred on desktop stream: {}", err);

            // Sync state for desktop
            let start_time = Instant::now();
            let mut total_samples_written: usize = 0;

            let stream = match sample_format {
                cpal::SampleFormat::F32 => device.build_input_stream(
                    &config,
                    move |data: &[f32], _: &_| {
                        write_input_data_synced(data, &buffer, max_samples, start_time, &mut total_samples_written, sample_rate, channels, "Desktop")
                    },
                    err_fn,
                    None,
                ),
                cpal::SampleFormat::I16 => device.build_input_stream(
                    &config,
                    move |data: &[i16], _: &_| {
                        let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                        write_input_data_synced(&f32_data, &buffer, max_samples, start_time, &mut total_samples_written, sample_rate, channels, "Desktop")
                    },
                    err_fn,
                    None,
                ),
                cpal::SampleFormat::U16 => device.build_input_stream(
                    &config,
                    move |data: &[u16], _: &_| {
                        let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - u16::MAX as f32 / 2.0) / (u16::MAX as f32 / 2.0)).collect();
                        write_input_data_synced(&f32_data, &buffer, max_samples, start_time, &mut total_samples_written, sample_rate, channels, "Desktop")
                    },
                    err_fn,
                    None,
                ),
                _ => Ok(Err(cpal::BuildStreamError::StreamConfigNotSupported).unwrap()),
            };

            if let Ok(stream) = stream {
                stream.play().unwrap();
                *DESKTOP_STREAM.lock().unwrap() = Some(stream);
            }
        }
    }

    // --- Microphone Capture ---
    if capture_config.capture_microphone {
        let target_mic_id = capture_config.microphone_device_id.clone();
        
        // Find device by name
        let device = if target_mic_id.is_empty() || target_mic_id == "default" {
            host.default_input_device()
        } else {
            host.input_devices().ok().and_then(|mut devices| {
                devices.find(|d| {
                    d.name().map(|n| n == target_mic_id).unwrap_or(false)
                })
            }).or_else(|| host.default_input_device())
        };

        if let Some(device) = device {
             if let Ok(supported_config) = device.default_input_config() {
                let sample_format = supported_config.sample_format();
                let config: cpal::StreamConfig = supported_config.into();
                *MIC_CONFIG.lock().unwrap() = Some(config.clone());

                let channels = config.channels as usize;
                let sample_rate = config.sample_rate.0;
                let max_samples = (duration_secs as usize) * sample_rate as usize * channels;

                let buffer = MIC_BUFFER.clone();
                let err_fn = |err| eprintln!("an error occurred on mic stream: {}", err);

                // Sync state for mic (though usually less critical for drift, good for consistency)
                let start_time = Instant::now();
                let mut total_samples_written: usize = 0;

                // Noise suppression state
                let mut denoise_states: Option<Vec<DenoiseState>> = if capture_config.noise_suppression {
                    Some((0..channels).map(|_| *DenoiseState::new()).collect())
                } else {
                    None
                };
                let mut denoise_buffer: Vec<f32> = Vec::new();

                let stream = match sample_format {
                    cpal::SampleFormat::F32 => device.build_input_stream(
                        &config,
                        move |data: &[f32], _: &_| {
                            process_and_write_mic(data, &mut denoise_states, &mut denoise_buffer, &buffer, max_samples, start_time, &mut total_samples_written, sample_rate, channels)
                        },
                        err_fn,
                        None,
                    ),
                    cpal::SampleFormat::I16 => device.build_input_stream(
                        &config,
                        move |data: &[i16], _: &_| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                            process_and_write_mic(&f32_data, &mut denoise_states, &mut denoise_buffer, &buffer, max_samples, start_time, &mut total_samples_written, sample_rate, channels)
                        },
                        err_fn,
                        None,
                    ),
                    cpal::SampleFormat::U16 => device.build_input_stream(
                        &config,
                        move |data: &[u16], _: &_| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - u16::MAX as f32 / 2.0) / (u16::MAX as f32 / 2.0)).collect();
                            process_and_write_mic(&f32_data, &mut denoise_states, &mut denoise_buffer, &buffer, max_samples, start_time, &mut total_samples_written, sample_rate, channels)
                        },
                        err_fn,
                        None,
                    ),
                    _ => Ok(Err(cpal::BuildStreamError::StreamConfigNotSupported).unwrap()),
                };

                if let Ok(stream) = stream {
                    println!("Microphone stream started successfully for device: {:?}", device.name());
                    stream.play().unwrap();
                    *MIC_STREAM.lock().unwrap() = Some(stream);
                } else {
                    println!("Failed to build microphone stream: {:?}", stream.err());
                }
             }
        } else {
            println!("Microphone device not found: {}", target_mic_id);
        }
    }
}

fn write_input_data_synced(
    input: &[f32], 
    buffer: &Arc<Mutex<VecDeque<f32>>>, 
    max_samples: usize,
    start_time: Instant,
    total_samples_written: &mut usize,
    sample_rate: u32,
    channels: usize,
    source_name: &str
) {
    let mut buf = buffer.lock().unwrap();
    
    // Check for silence (debug)
    if source_name == "Mic" {
        let mut max_amp = 0.0;
        for &s in input {
            let abs_s = s.abs();
            if abs_s > max_amp { max_amp = abs_s; }
        }
        if max_amp == 0.0 {
            // println!("Mic input is pure silence"); // Commented out to avoid spam, but useful for debug
        } else {
            // println!("Mic input signal detected: {}", max_amp);
        }
    }

    // Calculate expected samples based on elapsed time
    let elapsed = start_time.elapsed();
    let expected_samples = (elapsed.as_secs_f64() * sample_rate as f64 * channels as f64) as usize;
    
    // If we are behind, pad with silence
    // We add a small threshold (e.g. 50ms) to avoid jittery padding
    let threshold = (sample_rate as usize * channels) / 20; 

    if expected_samples > *total_samples_written + input.len() + threshold {
        let gap = expected_samples - (*total_samples_written + input.len());
        
        // Limit gap to avoid massive allocations if something goes wrong (e.g. 5 seconds max)
        let max_gap = sample_rate as usize * channels * 5;
        let actual_gap = gap.min(max_gap);

        if actual_gap > 0 {
            // println!("Padding {} with {} samples of silence", source_name, actual_gap);
            let silence = vec![0.0; actual_gap];
            buf.extend(silence);
            *total_samples_written += actual_gap;
        }
    }

    buf.extend(input);
    *total_samples_written += input.len();

    while buf.len() > max_samples {
        buf.pop_front();
    }
}

fn process_and_write_mic(
    data: &[f32],
    denoise_states: &mut Option<Vec<DenoiseState>>,
    denoise_buffer: &mut Vec<f32>,
    buffer: &Arc<Mutex<VecDeque<f32>>>, 
    max_samples: usize,
    start_time: Instant,
    total_samples_written: &mut usize,
    sample_rate: u32,
    channels: usize
) {
    if let Some(states) = denoise_states {
        // Append to buffer
        denoise_buffer.extend_from_slice(data);
        
        let frame_size = DenoiseState::FRAME_SIZE; // 480
        let chunk_size = frame_size * channels;
        
        let mut processed_chunk = Vec::new();
        
        while denoise_buffer.len() >= chunk_size {
            // Extract chunk
            let chunk: Vec<f32> = denoise_buffer.drain(0..chunk_size).collect();
            let mut output_chunk = vec![0.0; chunk_size];
            
            // Process per channel
            for ch in 0..channels {
                let mut input_frame = vec![0.0; frame_size];
                let mut output_frame = [0.0; DenoiseState::FRAME_SIZE];
                
                // Deinterleave
                for i in 0..frame_size {
                    input_frame[i] = chunk[i * channels + ch];
                }
                
                // Denoise
                if ch < states.len() {
                    states[ch].process_frame(&mut output_frame, &input_frame);
                } else {
                    // Fallback if channel count mismatch (shouldn't happen)
                    output_frame.copy_from_slice(&input_frame);
                }
                
                // Reinterleave
                for i in 0..frame_size {
                    output_chunk[i * channels + ch] = output_frame[i];
                }
            }
            processed_chunk.extend(output_chunk);
        }
        
        if !processed_chunk.is_empty() {
             write_input_data_synced(&processed_chunk, buffer, max_samples, start_time, total_samples_written, sample_rate, channels, "Mic");
        }
    } else {
        write_input_data_synced(data, buffer, max_samples, start_time, total_samples_written, sample_rate, channels, "Mic");
    }
}

pub fn stop_audio_capture() {
    if let Some(stream) = DESKTOP_STREAM.lock().unwrap().take() {
        drop(stream);
    }
    if let Some(stream) = MIC_STREAM.lock().unwrap().take() {
        drop(stream);
    }
}

pub fn save_audio_clips(base_path: &str) -> Result<(), String> {
    // Save Desktop
    {
        let buf = DESKTOP_BUFFER.lock().unwrap();
        let config = DESKTOP_CONFIG.lock().unwrap();

        if let Some(config) = config.as_ref() {
            if !buf.is_empty() {
                let path = base_path.replace(".mp4", "_desktop.wav");
                let spec = hound::WavSpec {
                    channels: config.channels,
                    sample_rate: config.sample_rate.0,
                    bits_per_sample: 16,
                    sample_format: hound::SampleFormat::Int,
                };

                let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
                for sample in buf.iter() {
                    let amplitude = i16::MAX as f32;
                    let s = (sample * amplitude).clamp(-amplitude, amplitude) as i16;
                    writer.write_sample(s).map_err(|e| e.to_string())?;
                }
                writer.finalize().map_err(|e| e.to_string())?;
            }
        }
    }

    // Save Mic
    {
        let buf = MIC_BUFFER.lock().unwrap();
        let config = MIC_CONFIG.lock().unwrap();

        if let Some(config) = config.as_ref() {
            if !buf.is_empty() {
                let path = base_path.replace(".mp4", "_mic.wav");
                let spec = hound::WavSpec {
                    channels: config.channels,
                    sample_rate: config.sample_rate.0,
                    bits_per_sample: 16,
                    sample_format: hound::SampleFormat::Int,
                };

                let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
                for sample in buf.iter() {
                    let amplitude = i16::MAX as f32;
                    let s = (sample * amplitude).clamp(-amplitude, amplitude) as i16;
                    writer.write_sample(s).map_err(|e| e.to_string())?;
                }
                writer.finalize().map_err(|e| e.to_string())?;
            }
        }
    }
    
    Ok(())
}