use std::ffi::{CStr, CString};
use serde::{Deserialize, Serialize};

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
    pub microphone_device_id: [u8; 256]
}

#[derive(Deserialize)]
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
        CaptureConfig {
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
        }
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
    fn init(config: *const CaptureConfig);
    fn update_config(config: *const CaptureConfig);
    fn start_recording();
    fn stop_recording();
    fn is_recording() -> bool;
    fn save_buffer() -> *const i8;
    fn get_primary_monitor_id() -> *const i8;
}

#[tauri::command]
pub fn initialize_capture(config: CaptureConfigArgs) {
    let c_config: CaptureConfig = config.into();
    unsafe {
        init(&c_config);
    }
}

#[tauri::command]
pub fn dxgi_is_recording() -> bool {
    unsafe { is_recording() }
}

#[tauri::command]
pub fn save_clip() -> Result<String, String> {
    let buffer_ptr = unsafe { save_buffer() };
    if buffer_ptr.is_null() {
        return Err("Failed to save clip: buffer is null".to_string());
    }
    let c_str = unsafe { CStr::from_ptr(buffer_ptr) };
    Ok(c_str.to_string_lossy().into_owned())
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