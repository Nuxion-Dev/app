use windows::Win32::{Foundation::{HWND, RECT}, UI::WindowsAndMessaging::GetWindowRect};

fn get_window_size(hwnd: HWND) -> (i32, i32) {
    let mut rect: RECT = unsafe { std::mem::zeroed() };
    unsafe {
        GetWindowRect(hwnd, &mut rect);
    }
    let width = rect.right - rect.left;
    let height = rect.bottom - rect.top;
    (width, height)
}

#[tauri::command]
pub fn start_recording(fps: u32, pid: u32) {
    let (target, window) = get_all_targets()
        .into_iter()
        .find(|t| match t {
            Target::Window(w) => return w.id == mc_pid,
            Target::Display(_) => false,
        })
        .map(|t| match t.clone() {
            Target::Window(w) => (Some(t), w),
            Target::Display(_) => unreachable!()
        })
        .expect("Failed to find target");

    let (width, height) = get_window_size(window.hwnd);

    let options = Options {
        fps,
        target,
        show_cursor: true,
        show_highlight: false,
        excluded_targets: None,
    };

}

#[tauri::command]
pub fn stop_recording() {

}

#[tauri::command]
pub fn save_clip(length: u32) -> String {
}