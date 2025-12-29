use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;
use tokio::sync::mpsc;
use tokio::net::windows::named_pipe::ServerOptions;
use tokio::io::AsyncWriteExt;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

use sysinfo::{Pid, System};

use lazy_static::lazy_static;

use crate::utils::settings::get_settings;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CustomCrosshair {
    pub id: String,
    pub name: String,
    pub grid: Vec<Vec<bool>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CrosshairSettings {
    pub enabled: bool,
    pub selected: String,
    pub color: String,
    pub size: f32,
    pub offset: Offset,
    #[serde(default)]
    pub ignoredGames: Vec<String>,
    #[serde(default)]
    pub customCrosshairs: Vec<CustomCrosshair>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Offset {
    pub x: f32,
    pub y: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OverlayCrosshairData {
    pub enabled: bool,
    pub color: String,
    pub size: f32,
    pub offset_x: f32,
    pub offset_y: f32,
    pub grid: Option<Vec<Vec<bool>>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub message: String,
    pub duration: f32,
    pub elapsed: f32,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum OverlayCommand {
    UpdateCrosshair(OverlayCrosshairData),
    ShowNotification(Notification),
}

#[derive(Debug)]
struct Game {
    id: String,
    name: String,
    pid: String,
}

lazy_static! {
    static ref RUNNING_GAMES: Mutex<Vec<Game>> = Mutex::new(Vec::new());
    static ref TIMESTAMP: Mutex<i64> = Mutex::new(0);
    static ref OVERLAY_CHANNELS: Mutex<HashMap<String, mpsc::Sender<OverlayCommand>>> = Mutex::new(HashMap::new());
}

#[tauri::command]
pub async fn add_game(app: AppHandle, id: String, name: String, process: String, pid: String) {
    //println!("DEBUG: add_game called for {} (PID: {})", name, pid);
    let mut games = RUNNING_GAMES.lock().await;
    games.push(Game { id: id.clone(), name: name.clone(), pid: pid.clone() });

    // Inject Overlay
    if let Ok(pid_int) = pid.parse::<u32>() {
        let dll_path = if cfg!(debug_assertions) {
             // In debug mode, the DLL is in the same directory as the executable
             std::env::current_exe()
                .map(|p| p.parent().unwrap().join("overlay.dll"))
                .unwrap_or_else(|_| std::env::current_dir().unwrap().join("target/debug/overlay.dll"))
        } else {
             app.path().resource_dir().unwrap().join("overlay.dll")
        };

        println!("Attempting to inject overlay into PID: {} Path: {:?}", pid_int, dll_path);
        
        #[cfg(windows)]
        {
            if !dll_path.exists() {
                eprintln!("Overlay DLL not found at: {:?}", dll_path);
                return;
            }

            let path_buf = match dll_path.canonicalize() {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("Failed to canonicalize path {:?}: {}", dll_path, e);
                    return;
                }
            };

            // Try using hudhook's injection first
            use hudhook::inject::Process;
            
            println!("Injecting using hudhook::inject into PID {}", pid_int);
            // hudhook 0.7 doesn't expose inject() directly, it's a method on Process
            // Also Process::Pid doesn't exist, we must use by_name or by_title as per user request/compiler error
            // Since we have the name in the function args, let's use that.
            
            // Note: 'name' argument is usually the executable name (e.g. "game.exe")
            match Process::by_name(&process) {
                Ok(process) => {
                    match process.inject(path_buf.clone()) {
                        Ok(_) => {
                            println!("Overlay injected successfully via hudhook");
                            app.emit_to("overlay", "show-crosshair", true).unwrap();

                            let pid_clone = pid.clone();
                            tokio::spawn(async move {
                                let pipe_name = format!(r"\\.\pipe\nuxion-overlay-{}", pid_clone);
                                let server = ServerOptions::new()
                                    .first_pipe_instance(true)
                                    .create(&pipe_name);
                                
                                match server {
                                    Ok(mut server) => {
                                        println!("Created named pipe: {}", pipe_name);
                                        let (tx, mut rx) = mpsc::channel::<OverlayCommand>(32);
                                        {
                                            let mut channels = OVERLAY_CHANNELS.lock().await;
                                            channels.insert(pid_clone.clone(), tx);
                                        }

                                        if let Err(e) = server.connect().await {
                                            eprintln!("Error waiting for client connection: {}", e);
                                        } else {
                                            println!("Client connected to pipe: {}", pipe_name);
                                            while let Some(cmd) = rx.recv().await {
                                                if let Ok(json) = serde_json::to_string(&cmd) {
                                                    let msg = format!("{}\n", json);
                                                    if let Err(e) = server.write_all(msg.as_bytes()).await {
                                                        eprintln!("Failed to write to pipe: {}", e);
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        let mut channels = OVERLAY_CHANNELS.lock().await;
                                        channels.remove(&pid_clone);
                                    }
                                    Err(e) => eprintln!("Failed to create named pipe: {}", e),
                                }
                            });

                            return;
                        },
                        Err(e) => {
                            eprintln!("hudhook injection failed: {:?}. Falling back to manual injection...", e);
                        }
                    }
                },
                Err(e) => {
                     eprintln!("Could not find process by name '{}': {:?}. Falling back to manual injection...", name, e);
                }
            }

            unsafe {
                use windows::core::{PCWSTR, PSTR};
                use windows::Win32::Foundation::{CloseHandle, FALSE, HANDLE};
                use windows::Win32::System::Diagnostics::Debug::WriteProcessMemory;
                use windows::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
                use windows::Win32::System::Memory::{
                    VirtualAllocEx, MEM_COMMIT, MEM_RESERVE, PAGE_READWRITE,
                };
                use windows::Win32::System::Threading::{
                    CreateRemoteThread, OpenProcess, PROCESS_ALL_ACCESS,
                };

                let pid = pid_int;
                let path_str = path_buf.to_str().unwrap();
                let path_wide: Vec<u16> = path_str.encode_utf16().chain(std::iter::once(0)).collect();


                let process_handle = OpenProcess(PROCESS_ALL_ACCESS, false, pid);
                
                if let Ok(handle) = process_handle {
                    let remote_mem = VirtualAllocEx(
                        handle,
                        None,
                        path_wide.len() * 2,
                        MEM_COMMIT | MEM_RESERVE,
                        PAGE_READWRITE,
                    );

                    if !remote_mem.is_null() {
                        let mut bytes_written = 0;
                        let write_res = WriteProcessMemory(
                            handle,
                            remote_mem,
                            path_wide.as_ptr() as *const _,
                            path_wide.len() * 2,
                            Some(&mut bytes_written),
                        );

                        if write_res.is_ok() {
                            let kernel32 = windows::core::w!("kernel32.dll");
                            let h_kernel32 = GetModuleHandleW(kernel32).unwrap();
                            let load_library = GetProcAddress(h_kernel32, windows::core::s!("LoadLibraryW"));

                            if let Some(load_library_addr) = load_library {
                                let thread_id = 0;
                                let h_thread = CreateRemoteThread(
                                    handle,
                                    None,
                                    0,
                                    Some(std::mem::transmute(load_library_addr)),
                                    Some(remote_mem),
                                    0,
                                    None,
                                );

                                if let Ok(thread) = h_thread {
                                    println!("Overlay injected successfully via manual injection");
                                    let _ = CloseHandle(thread);
                                } else {
                                    eprintln!("Failed to create remote thread");
                                }
                            } else {
                                eprintln!("Failed to get LoadLibraryW address");
                            }
                        } else {
                            eprintln!("Failed to write process memory");
                        }
                    } else {
                        eprintln!("Failed to allocate memory in remote process");
                    }
                    let _ = CloseHandle(handle);
                } else {
                    eprintln!("Failed to open process {}", pid);
                }
            }
        }
    }

    let time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    *TIMESTAMP.lock().await = time;

    // Check if we should show crosshair immediately
    let settings = get_settings(app.clone());
    let ignored_games = settings["crosshair"]["ignoredGames"].as_array();
    
    let is_ignored = if let Some(ignored) = ignored_games {
        ignored.iter().any(|x| x.as_str().unwrap_or("") == id)
    } else {
        false
    };

    if !is_ignored {
        //println!("DEBUG: Game not ignored, showing crosshair");
        app.emit_to("overlay", "show-crosshair", true).unwrap();
    } else {
        //println!("DEBUG: Game is ignored");
    }
}

pub async fn check_games(app: AppHandle) {
    let mut last_play = false;
    //println!("DEBUG: check_games loop started");
    loop {
        let settings = get_settings(app.clone());

        let mut games = RUNNING_GAMES.lock().await;
        let mut to_remove = Vec::new();
        let mut hide_crosshair = true;
        let ignored_games = settings["crosshair"]["ignoredGames"].as_array();
        
        for game in games.iter() {
            if !is_running(&game.pid) {
                //println!("DEBUG: Game {} (PID: {}) is no longer running", game.name, game.pid);
                to_remove.push(game.name.clone());
                continue;
            }

            let is_ignored = if let Some(ignored) = ignored_games {
                ignored.iter().any(|x| x.as_str().unwrap_or("") == game.id)
            } else {
                false
            };

            if !is_ignored {
                hide_crosshair = false;
            }            
        }
        
        for game in to_remove.iter() {
            games.retain(|x| x.name != *game);
        }

        if games.is_empty() && last_play {
            //println!("DEBUG: No games running, hiding crosshair");
            app.emit_to("main", "game:stop", {}).unwrap();
            app.emit_to("overlay", "show-crosshair", false).unwrap();
            // Show desktop overlay for notifications when idling
            app.emit_to("overlay", "toggle-overlay", true).unwrap();
            last_play = false;
        }

        if !games.is_empty() {
            // Hide desktop overlay when game is running (using hook instead)
            if !last_play {
                app.emit_to("overlay", "toggle-overlay", false).unwrap();
            }
            app.emit_to("overlay", "show-crosshair", !hide_crosshair).unwrap();
            last_play = true;
        }

        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    }
}

pub fn is_running(pid_str: &str) -> bool {
    let pid_res = pid_str.parse::<u32>();
    if pid_res.is_err() {
        return false;
    }
    let pid = pid_res.unwrap();
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, false);
    sys.process(Pid::from_u32(pid)).is_some()
}

#[tauri::command]
pub async fn get_games() -> Vec<String> {
    let games = RUNNING_GAMES.lock().await;
    games.iter().map(|x| x.name.clone()).collect()
}

#[tauri::command]
pub async fn update_overlay_crosshair(config: CrosshairSettings) {
    let channels = OVERLAY_CHANNELS.lock().await;
    
    let mut grid: Option<Vec<Vec<bool>>> = None;

    // Check if selected is a custom crosshair
    if let Some(custom) = config.customCrosshairs.iter().find(|c| c.id == config.selected) {
        grid = Some(custom.grid.clone());
    } else {
        // Fallback for default crosshairs (svg1, svg2, etc)
        // We can define a simple default grid here if we want, or just leave it None
        // and let the overlay render a default dot.
        if config.selected == "svg1" {
             // Example: A simple cross
             grid = Some(vec![
                 vec![false, true, false],
                 vec![true, true, true],
                 vec![false, true, false],
             ]);
        } else if config.selected == "svg2" {
             // Example: A hollow square
             grid = Some(vec![
                 vec![true, true, true],
                 vec![true, false, true],
                 vec![true, true, true],
             ]);
        }
    }

    let data = OverlayCrosshairData {
        enabled: config.enabled,
        color: config.color,
        size: config.size,
        offset_x: config.offset.x,
        offset_y: config.offset.y,
        grid,
    };

    for tx in channels.values() {
        let _ = tx.send(OverlayCommand::UpdateCrosshair(data.clone())).await;
    }
}

#[tauri::command]
pub async fn send_overlay_notification(notification: Notification) {
    let channels = OVERLAY_CHANNELS.lock().await;
    for tx in channels.values() {
        let _ = tx.send(OverlayCommand::ShowNotification(notification.clone())).await;
    }
}