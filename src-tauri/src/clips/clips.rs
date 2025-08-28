use std::ffi::{CStr, CString};

#[link(name = "dxgi_capture")]
extern "C" {
    fn start_recording(outputDir: *const i8, fps: u32, bufferSeconds: u32, captureAudio: bool, captureMicrophone: bool);
    fn stop_recording();
    fn save_buffer() -> *const i8;
}

#[tauri::command]
pub fn save_clip() -> std::io::Result<String> {
    let buffer_ptr = unsafe { save_buffer() };
    let c_str = unsafe { CStr::from_ptr(buffer_ptr) };
    Ok(c_str.to_string_lossy().into_owned())
}