use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use lazy_static::lazy_static;
use nnnoiseless::DenoiseState;
use serde::Serialize;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

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
    for device in host.input_devices().unwrap() {
        let name = device.name().unwrap_or("Unknown Microphone".to_string());
        let id = format!("{:?}", device.name().unwrap_or("unknown".to_string()));
        microphones.push(Microphone { id, name });
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

            let stream = match sample_format {
                cpal::SampleFormat::F32 => device.build_input_stream(
                    &config,
                    move |data: &[f32], _: &_| write_input_data(data, &buffer, max_samples),
                    err_fn,
                    None,
                ),
                cpal::SampleFormat::I16 => device.build_input_stream(
                    &config,
                    move |data: &[i16], _: &_| write_input_data_i16(data, &buffer, max_samples),
                    err_fn,
                    None,
                ),
                cpal::SampleFormat::U16 => device.build_input_stream(
                    &config,
                    move |data: &[u16], _: &_| write_input_data_u16(data, &buffer, max_samples),
                    err_fn,
                    None,
                ),
                _ => Ok(Err(cpal::BuildStreamError::StreamConfigNotSupported).unwrap()), // Hacky error handling
            };

            if let Ok(stream) = stream {
                stream.play().unwrap();
                *DESKTOP_STREAM.lock().unwrap() = Some(stream);
            }
        }
    }

    // --- Microphone Capture ---
    if capture_config.capture_microphone {
        // TODO: Use capture_config.microphone_device_id to select device
        // For now, use default input
        if let Some(device) = host.default_input_device() {
             if let Ok(supported_config) = device.default_input_config() {
                let sample_format = supported_config.sample_format();
                let config: cpal::StreamConfig = supported_config.into();
                *MIC_CONFIG.lock().unwrap() = Some(config.clone());

                let channels = config.channels as usize;
                let sample_rate = config.sample_rate.0;
                let max_samples = (duration_secs as usize) * sample_rate as usize * channels;

                let buffer = MIC_BUFFER.clone();
                let err_fn = |err| eprintln!("an error occurred on mic stream: {}", err);

                let mut denoisers = if capture_config.noise_suppression {
                     (0..channels).map(|_| DenoiseState::new()).collect::<Vec<_>>()
                } else {
                    Vec::new()
                };
                let mut input_accumulator: Vec<f32> = Vec::new();

                let stream = match sample_format {
                    cpal::SampleFormat::F32 => device.build_input_stream(
                        &config,
                        move |data: &[f32], _: &_| {
                            process_audio_chunk(data, &buffer, max_samples, &mut input_accumulator, &mut denoisers, channels)
                        },
                        err_fn,
                        None,
                    ),
                    cpal::SampleFormat::I16 => device.build_input_stream(
                        &config,
                        move |data: &[i16], _: &_| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| s as f32 / i16::MAX as f32).collect();
                            process_audio_chunk(&f32_data, &buffer, max_samples, &mut input_accumulator, &mut denoisers, channels)
                        },
                        err_fn,
                        None,
                    ),
                    cpal::SampleFormat::U16 => device.build_input_stream(
                        &config,
                        move |data: &[u16], _: &_| {
                            let f32_data: Vec<f32> = data.iter().map(|&s| (s as f32 - u16::MAX as f32 / 2.0) / (u16::MAX as f32 / 2.0)).collect();
                            process_audio_chunk(&f32_data, &buffer, max_samples, &mut input_accumulator, &mut denoisers, channels)
                        },
                        err_fn,
                        None,
                    ),
                    _ => Ok(Err(cpal::BuildStreamError::StreamConfigNotSupported).unwrap()),
                };

                if let Ok(stream) = stream {
                    stream.play().unwrap();
                    *MIC_STREAM.lock().unwrap() = Some(stream);
                }
             }
        }
    }
}

fn process_audio_chunk(
    input: &[f32], 
    buffer: &Arc<Mutex<VecDeque<f32>>>, 
    max_samples: usize,
    accumulator: &mut Vec<f32>,
    denoisers: &mut [Box<DenoiseState>],
    channels: usize
) {
    if denoisers.is_empty() {
        // No denoising, just write
        let mut buf = buffer.lock().unwrap();
        buf.extend(input);
        while buf.len() > max_samples {
            buf.pop_front();
        }
        return;
    }

    // Denoising logic
    accumulator.extend_from_slice(input);
    
    let frame_size = 480; // nnnoiseless expects 480 samples
    let chunk_size = frame_size * channels;
    
    let mut processed_chunk = vec![0.0; chunk_size];
    let mut out_frame = [0.0f32; 480];
    let mut in_frame = [0.0f32; 480];

    while accumulator.len() >= chunk_size {
        let chunk: Vec<f32> = accumulator.drain(0..chunk_size).collect();
        
        for ch in 0..channels {
            // Deinterleave
            for i in 0..frame_size {
                in_frame[i] = chunk[i * channels + ch];
            }
            
            // Process
            denoisers[ch].process_frame(&mut out_frame, &in_frame);
            
            // Interleave back
            for i in 0..frame_size {
                processed_chunk[i * channels + ch] = out_frame[i];
            }
        }
        
        // Write to main buffer
        let mut buf = buffer.lock().unwrap();
        buf.extend(&processed_chunk);
        while buf.len() > max_samples {
            buf.pop_front();
        }
    }
}

fn write_input_data(input: &[f32], buffer: &Arc<Mutex<VecDeque<f32>>>, max_samples: usize) {
    let mut buf = buffer.lock().unwrap();
    buf.extend(input);
    while buf.len() > max_samples {
        buf.pop_front();
    }
}

fn write_input_data_i16(input: &[i16], buffer: &Arc<Mutex<VecDeque<f32>>>, max_samples: usize) {
    let mut buf = buffer.lock().unwrap();
    for &sample in input {
        buf.push_back(sample as f32 / i16::MAX as f32);
    }
    while buf.len() > max_samples {
        buf.pop_front();
    }
}

fn write_input_data_u16(input: &[u16], buffer: &Arc<Mutex<VecDeque<f32>>>, max_samples: usize) {
    let mut buf = buffer.lock().unwrap();
    for &sample in input {
        buf.push_back((sample as f32 - u16::MAX as f32 / 2.0) / (u16::MAX as f32 / 2.0));
    }
    while buf.len() > max_samples {
        buf.pop_front();
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
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                };

                let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
                for sample in buf.iter() {
                    writer.write_sample(*sample).map_err(|e| e.to_string())?;
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
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                };

                let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
                for sample in buf.iter() {
                    writer.write_sample(*sample).map_err(|e| e.to_string())?;
                }
                writer.finalize().map_err(|e| e.to_string())?;
            }
        }
    }
    
    Ok(())
}