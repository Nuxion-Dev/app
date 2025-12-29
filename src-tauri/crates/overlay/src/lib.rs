mod ipc;
mod gui;
mod state;

use hudhook::hooks::dx11::ImguiDx11Hooks;
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

            info!("Initializing Hudhook...");
            let hooks = Hudhook::builder()
                .with::<ImguiDx11Hooks>(Overlay { state })
                .build();
            
            info!("Applying hooks...");
            match hooks.apply() {
                Ok(_) => info!("Hooks applied successfully."),
                Err(e) => error!("Failed to apply hooks: {:?}", e),
            }
        });
    }
}
