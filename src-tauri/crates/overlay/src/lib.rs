mod ipc;
mod gui;
mod state;
mod features;

use hudhook::hooks::dx11::ImguiDx11Hooks;
use hudhook::hooks::dx12::ImguiDx12Hooks;
use hudhook::hooks::opengl3::ImguiOpenGl3Hooks;
use hudhook::*;
use log::*;
use simplelog::*;
use std::fs::File;
use std::sync::{Arc, Mutex};

use crate::gui::Overlay;
use crate::state::OverlayState;

#[no_mangle]
pub unsafe extern "system" fn DllMain(_: usize, reason: u32, _: *mut std::ffi::c_void) {
    if reason == 1 {
        let log_path = std::env::temp_dir().join("nuxion_overlay.log");
        if let Ok(file) = File::create(&log_path) {
            let _ = WriteLogger::init(LevelFilter::Trace, Config::default(), file);
        }
        
        std::panic::set_hook(Box::new(|info| {
            error!("PANIC: {:?}", info);
        }));

        info!("DllMain attached. Log file created at: {:?}", log_path);

        std::thread::spawn(move || {
            let state = Arc::new(Mutex::new(OverlayState::default()));
            let state_clone = state.clone();

            // Start IPC thread
            std::thread::spawn(move || ipc::ipc_thread(state_clone));

            // Wait a bit for the game to fully initialize
            std::thread::sleep(std::time::Duration::from_millis(2000));

            // Read configuration to determine which backend to use
            let pid = std::process::id();
            let config_path = std::env::temp_dir().join(format!("nuxion_overlay_config_{}.json", pid));
            let mut backend = "dx11".to_string(); // Default to DX11
            let mut dll_dir = None;

            if let Ok(file) = File::open(&config_path) {
                if let Ok(json) = serde_json::from_reader::<_, serde_json::Value>(file) {
                    if let Some(b) = json.get("backend").and_then(|v| v.as_str()) {
                        backend = b.to_string();
                        info!("Read backend config: {}", backend);
                    }
                    if let Some(d) = json.get("dll_dir").and_then(|v| v.as_str()) {
                        dll_dir = Some(d.to_string());
                        info!("Read dll_dir config: {}", d);
                    }
                }
            } else {
                warn!("Config file not found at {:?}, defaulting to DX11", config_path);
            }

            if let Ok(mut s) = state.lock() {
                s.dll_dir = dll_dir;
            }

            info!("Initializing Hudhook with backend: {}", backend);
            
            let overlay = Overlay::new(state.clone());

            let result = match backend.as_str() {
                "dx12" => {
                    Hudhook::builder()
                        .with::<ImguiDx12Hooks>(overlay)
                        .build()
                        .apply()
                },
                "opengl" => {
                    Hudhook::builder()
                        .with::<ImguiOpenGl3Hooks>(overlay)
                        .build()
                        .apply()
                },
                _ => {
                    // Default to DX11
                    Hudhook::builder()
                        .with::<ImguiDx11Hooks>(overlay)
                        .build()
                        .apply()
                }
            };
            
            match result {
                Ok(_) => {
                    info!("Hooks applied successfully.");
                    // Keep the thread alive to prevent hooks from being dropped/unloaded
                    loop {
                        std::thread::sleep(std::time::Duration::from_millis(1000));
                    }
                },
                Err(e) => error!("Failed to apply hooks: {:?}", e),
            }
        });
    }
}
