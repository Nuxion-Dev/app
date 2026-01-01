use crate::state::{Command, OverlayState, OverlayEvent};
use log::{error, info, warn};
use std::fs::File;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::sync::mpsc::Receiver;

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
                                        Command::UpdateFps(cfg) => s.fps = cfg,
                                        Command::ToggleOverlay(enabled) => s.enabled = enabled,
                                        Command::SetRenderer(mode) => s.renderer = mode,
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

pub fn event_thread(rx: Receiver<OverlayEvent>) {
    let pid = std::process::id();
    let pipe_name = format!(r"\\.\pipe\nuxion-overlay-{}-events", pid);
    
    info!("Event Thread started. Target pipe: {}", pipe_name);

    // We keep trying to connect to the pipe when we have an event
    while let Ok(event) = rx.recv() {
        info!("Processing event: {:?}", event);
        if let Ok(json) = serde_json::to_string(&event) {
            // Try to open pipe and write
            // We open and close for each event to keep it simple, assuming events are rare
            if let Ok(mut file) = File::create(&pipe_name) {
                let msg = format!("{}\n", json);
                if let Err(e) = file.write_all(msg.as_bytes()) {
                    error!("Failed to write event to pipe: {:?}", e);
                } else {
                    info!("Event sent successfully");
                }
            } else {
                warn!("Failed to connect to event pipe: {}", pipe_name);
            }
        }
    }
}

