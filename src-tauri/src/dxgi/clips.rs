use std::ffi::{CStr, CString};

#[repr(C)]
pub enum AudioSource {
    None = 0,
    Desktop = 1,
    Game = 2,
    GameAndDiscord = 3,
}

#[repr(C)]
pub struct CaptureConfig {
    pub fps: i32,
    pub clip_length: i32,
    pub audio_volume: f32,
    pub microphone_volume: f32,
    pub audio_mode: AudioSource,
    pub capture_microphone: bool,
    pub noise_suppression: bool,

    pub clips_directory: [u8; 512],
    pub monitor_device_id: [u8; 512],
    pub microphone_device_id: [u8; 512]
}

#[link(name = "bin/dxgi_capture")]
extern "C" {
    fn init(config: *const CaptureConfig);
    fn update_config(config: *const CaptureConfig);
    fn start_recording(outputDir: *const i8, fps: u32, bufferSeconds: u32, captureAudio: bool, captureMicrophone: bool);
    fn stop_recording();
    fn save_buffer() -> *const i8;
    fn get_primary_monitor_id() -> *const i8;
}

pub fn initialize_capture(config: CaptureConfig) {
    unsafe {
        init(&config);
    }
}

#[tauri::command]
pub fn save_clip() -> std::io::Result<String> {
    let buffer_ptr = unsafe { save_buffer() };
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