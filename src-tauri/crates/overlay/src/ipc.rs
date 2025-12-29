use crate::state::{Command, OverlayState};
use log::{error, info, warn};
use std::fs::File;
use std::io::Read;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

pub fn ipc_thread(state: Arc<Mutex<OverlayState>>) {
    let pid = std::process::id();
    let pipe_name = format!(r"\\.\pipe\nuxion-overlay-{}", pid);
    
    info!("IPC Thread started. Looking for pipe: {}", pipe_name);

    loop {
        if let Ok(mut file) = File::open(&pipe_name) {
            info!("Connected to IPC pipe!");
            let mut buffer = [0u8; 4096];
            loop {
                match file.read(&mut buffer) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = &buffer[0..n];
                        if let Ok(text) = std::str::from_utf8(data) {
                            for line in text.lines() {
                                if line.trim().is_empty() { continue; }
                                if let Ok(cmd) = serde_json::from_str::<Command>(line) {
                                    info!("Received command: {:?}", cmd);
                                    let mut s = state.lock().unwrap();
                                    match cmd {
                                        Command::UpdateCrosshair(cfg) => s.crosshair = cfg,
                                        Command::ShowNotification(notif) => s.notifications.push(notif),
                                    }
                                } else {
                                    warn!("Failed to parse command: {}", line);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Error reading from pipe: {:?}", e);
                        break;
                    }
                }
            }
            info!("Disconnected from IPC pipe");
        }
        thread::sleep(Duration::from_secs(1));
    }
}
