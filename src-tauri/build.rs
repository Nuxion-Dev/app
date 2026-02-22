fn main() {
    // Copy overlay.dll to bin folder for bundling
    let profile = std::env::var("PROFILE").unwrap_or_else(|_| "debug".to_string());
    let target_dir = std::env::current_dir()
        .unwrap()
        .join("target")
        .join(&profile);
    
    let overlay_dll = target_dir.join("overlay.dll");
    let dest_dir = std::env::current_dir().unwrap().join("bin");
    let dest_path = dest_dir.join("overlay.dll");

    let renderer_executable = target_dir.join("overlay_renderer.exe");
    let renderer_dest_path = dest_dir.join("overlay_renderer.exe");

    // Only copy if it exists (it might not be built yet during initial check)
    if overlay_dll.exists() {
        let _ = std::fs::create_dir_all(&dest_dir);
        let _ = std::fs::copy(overlay_dll, dest_path);
    }

    if renderer_executable.exists() {
        let _ = std::fs::create_dir_all(&dest_dir);
        let _ = std::fs::copy(renderer_executable, renderer_dest_path);
    }

    tauri_build::build()
}
