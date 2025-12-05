use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager as _, path::BaseDirectory};
use std::ffi::{CStr, CString};
use crate::dxgi::audio;

lazy_static! {
    static ref CAPTURE_CONFIG: std::sync::Mutex<Option<CaptureConfigArgs>> = std::sync::Mutex::new(None);
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum AudioSource {
    None = 0,
    Desktop = 1,
    Game = 2,
    GameAndDiscord = 3,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct CaptureConfig {
    pub fps: i32,
    pub clip_length: i32,
    pub audio_volume: f32,
    pub microphone_volume: f32,
    pub audio_mode: AudioSource,
    pub capture_microphone: bool,
    pub noise_suppression: bool,

    pub clips_directory: [u8; 512],
    pub monitor_device_id: [u8; 256],
    pub microphone_device_id: [u8; 256],
}

#[derive(Deserialize, Clone)]
pub struct CaptureConfigArgs {
    pub fps: i32,
    pub clip_length: i32,
    pub audio_volume: f32,
    pub microphone_volume: f32,
    pub audio_mode: AudioSource,
    pub capture_microphone: bool,
    pub noise_suppression: bool,

    pub clips_directory: String,
    pub monitor_device_id: String,
    pub microphone_device_id: String,
}

impl From<CaptureConfigArgs> for CaptureConfig {
    fn from(args: CaptureConfigArgs) -> Self {
        let config = CaptureConfig {
            fps: args.fps,
            clip_length: args.clip_length,
            audio_volume: args.audio_volume,
            microphone_volume: args.microphone_volume,
            audio_mode: args.audio_mode,
            capture_microphone: args.capture_microphone,
            noise_suppression: args.noise_suppression,
            clips_directory: string_to_array(&args.clips_directory),
            monitor_device_id: string_to_array(&args.monitor_device_id),
            microphone_device_id: string_to_array(&args.microphone_device_id),
        };
        *CAPTURE_CONFIG.lock().unwrap() = Some(args);
        config
    }
}

fn string_to_array<const N: usize>(s: &str) -> [u8; N] {
    let mut buf = [0u8; N];
    let bytes = s.as_bytes();
    let len = bytes.len().min(N - 1);
    buf[..len].copy_from_slice(&bytes[..len]);
    buf[len] = 0;
    buf
}

#[link(name = "bin/dxgi_capture")]
extern "C" {
    fn init(config: *const CaptureConfig, ffmpeg_path: *const i8);
    fn update_config(config: *const CaptureConfig);
    fn start_recording();
    fn stop_recording();
    fn is_recording() -> bool;
    fn save_buffer() -> *const i8;
    fn get_primary_monitor_id() -> *const i8;
}

#[tauri::command]
pub fn initialize_capture(app: tauri::AppHandle, config: CaptureConfigArgs) {
    let c_config: CaptureConfig = config.into();
    let path = app.path().resolve("bin/ffmpeg.exe", BaseDirectory::Resource).unwrap();
    let c_ffmpeg_path = CString::new(path.to_str().unwrap()).unwrap();
    unsafe {
        init(&c_config, c_ffmpeg_path.as_ptr());
    }
}

#[tauri::command]
pub fn dxgi_is_recording() -> bool {
    unsafe { is_recording() }
}

#[tauri::command]
pub fn dxgi_start_recording() {
    unsafe {
        let duration = if let Some(config) = CAPTURE_CONFIG.lock().unwrap().as_ref() {
            config.clip_length as u64
        } else {
            60
        };
        audio::start_audio_capture(duration);
        start_recording();
    }
}

#[tauri::command]
pub fn dxgi_stop_recording() {
    unsafe {
        audio::stop_audio_capture();
        stop_recording();
    }
}

#[derive(Serialize)]
pub struct ClipPaths {
    pub video: String,
    pub audio: String,
}

#[tauri::command]
pub async fn save_clip(app: AppHandle) -> Result<String, String> {
    let config = get_capture_config().ok_or("No capture config found".to_string())?;
    let clips_dir = config.clips_directory;
    
    // Generate a temporary ID for audio files to allow parallel saving
    let start = std::time::SystemTime::now();
    let since_the_epoch = start.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let temp_id = since_the_epoch.as_nanos().to_string();
    
    // We append .mp4 so that save_audio_clips logic (replace .mp4 with .wav) works correctly
    let temp_audio_base = std::path::Path::new(&clips_dir)
        .join(format!("temp_{}.mp4", temp_id))
        .to_string_lossy()
        .into_owned();

    let temp_audio_base_clone = temp_audio_base.clone();

    // Spawn video saving task
    let video_task = tauri::async_runtime::spawn_blocking(move || {
        let buffer_ptr = unsafe { save_buffer() };
        if buffer_ptr.is_null() {
            return Err("Failed to save clip: buffer is null".to_string());
        }
        let path = unsafe { CStr::from_ptr(buffer_ptr) };
        Ok(path.to_string_lossy().into_owned())
    });

    // Spawn audio saving task
    let audio_task = tauri::async_runtime::spawn_blocking(move || {
        audio::save_audio_clips(&temp_audio_base_clone)
    });

    // Wait for both to complete
    let (video_res, audio_res) = tokio::join!(video_task, audio_task);

    // Handle video result
    let video_path = video_res.map_err(|e| e.to_string())??;
    
    // Handle audio result
    audio_res.map_err(|e| e.to_string())??;

    // Rename audio files to match video filename
    let temp_desktop = temp_audio_base.replace(".mp4", "_desktop.wav");
    let temp_mic = temp_audio_base.replace(".mp4", "_mic.wav");
    
    let target_desktop = video_path.replace(".mp4", "_desktop.wav");
    let target_mic = video_path.replace(".mp4", "_mic.wav");

    if std::path::Path::new(&temp_desktop).exists() {
        std::fs::rename(&temp_desktop, &target_desktop).map_err(|e| e.to_string())?;
    }
    
    if std::path::Path::new(&temp_mic).exists() {
        std::fs::rename(&temp_mic, &target_mic).map_err(|e| e.to_string())?;
    }

    app.emit("clip:created", video_path.clone()).map_err(|e| e.to_string())?;

    Ok(video_path)
}

#[tauri::command]
pub fn get_primary_hwnd_id() -> String {
    unsafe {
        let hwnd_id_ptr = get_primary_monitor_id();
        let c_str = CStr::from_ptr(hwnd_id_ptr);
        c_str.to_string_lossy().into_owned()
    }
}

#[tauri::command]
pub fn update(config: CaptureConfigArgs) {
    let c_config: CaptureConfig = config.into();
    unsafe {
        update_config(&c_config);
    }
}

#[tauri::command]
pub async fn combine_clips(app: tauri::AppHandle, video_path: String, audio_path: String) -> Result<String, String> {
    // This function might need updates if we want to combine multiple audio tracks,
    // but for now the user asked for separate files.
    // If they want to combine, they might need to pass multiple audio paths or we infer them.
    // Given the request "have them in 2 separate files so that the clip creator can exclude or include them",
    // we might not need to combine them automatically here, or we might need a more complex combine command.
    // For now, I'll leave this as is, assuming it's for a different workflow or manual combination.
    
    let output_path = video_path.replace(".mp4", "_combined.mp4");
    let output_path_clone = output_path.clone();
    
    let ffmpeg_path = app.path().resolve("bin/ffmpeg.exe", BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;

    let status = tauri::async_runtime::spawn_blocking(move || {
        std::process::Command::new(ffmpeg_path)
            .args(&[
                "-i", &video_path,
                "-i", &audio_path,
                "-c:v", "copy",
                "-c:a", "aac",
                "-y",
                &output_path
            ])
            .status()
            .map_err(|e| e.to_string())
    }).await.map_err(|e| e.to_string())??;

    if status.success() {
        Ok(output_path_clone)
    } else {
        Err("FFmpeg failed to combine clips".to_string())
    }
}

pub fn get_capture_config() -> Option<CaptureConfigArgs> {
    CAPTURE_CONFIG.lock().unwrap().clone()
}