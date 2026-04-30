use std::ffi::c_void;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use windows::core::PCWSTR;
use windows::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE, GetLastError, ERROR_PIPE_CONNECTED};
use windows::Win32::System::Memory::{
    CreateFileMappingW, MapViewOfFile, UnmapViewOfFile, FILE_MAP_ALL_ACCESS, 
    PAGE_READWRITE, MEMORY_MAPPED_VIEW_ADDRESS
};
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
use log::{info, error, LevelFilter};
use env_logger::Builder;
use ul_next::{Renderer, Config, Library, platform, View};
use std::io::{Read, Write};
use std::path::PathBuf;

// Shared Memory Structure
// Header (32 bytes) + Pixel Data
// [0..4] Width
// [4..8] Height
// [8..12] Dirty Flag (1 = dirty, 0 = clean)
// [12..16] Heartbeat (Frame Counter)
// [32..] Pixels (BGRA or RGBA)

const SHM_NAME_PREFIX: &str = "Local\\NuxionOverlayBuffer_";
const PIPE_NAME_PREFIX: &str = r"\\.\pipe\NuxionOverlayIPC_";

const PIPE_ACCESS_DUPLEX: u32 = 0x00000003;

pub struct SharedMemory {
    handle: HANDLE,
    map_view: MEMORY_MAPPED_VIEW_ADDRESS,
    size: usize,
}
unsafe impl Send for SharedMemory {}
unsafe impl Sync for SharedMemory {}

impl SharedMemory {
    pub fn create(name: &str, size: usize) -> Option<Self> {
        unsafe {
            let wide_name: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
            let handle = CreateFileMappingW(
                INVALID_HANDLE_VALUE,
                None,
                PAGE_READWRITE,
                (size >> 32) as u32,
                size as u32,
                PCWSTR(wide_name.as_ptr()),
            )
            .ok()?;

            if handle.is_invalid() {
                return None;
            }

            let map_view = MapViewOfFile(handle, FILE_MAP_ALL_ACCESS, 0, 0, size);

            if map_view.Value.is_null() {
                let _ = CloseHandle(handle);
                return None;
            }

            Some(Self {
                handle,
                map_view,
                size,
            })
        }
    }

    pub fn write_metadata(&self, width: u32, height: u32, dirty: bool, frame: u32) {
        unsafe {
            let ptr = self.map_view.Value as *mut u32;
            *ptr.offset(0) = width;
            *ptr.offset(1) = height;
            *ptr.offset(2) = if dirty { 1 } else { 0 };
            *ptr.offset(3) = frame;
        }
    }

    pub fn write_pixels(&self, data: &[u8], offset: usize) {
        if offset + data.len() > self.size {
            return;
        }
        unsafe {
            std::ptr::copy_nonoverlapping(data.as_ptr(), (self.map_view.Value as *mut u8).add(offset), data.len());
        }
    }
}

impl Drop for SharedMemory {
    fn drop(&mut self) {
        unsafe {
            if !self.map_view.Value.is_null() {
                let _ = UnmapViewOfFile(self.map_view);
            }
            if !self.handle.is_invalid() {
                let _ = CloseHandle(self.handle);
            }
        }
    }
}

pub enum IpcCommand {
    Resize(u32, u32),
    LoadHtml(String),
    ExecuteScript(String),
    Quit,
}

fn main() {
    // Setup logging
    let mut builder = Builder::new();
    builder.filter_level(LevelFilter::Info);
    builder.init();
    
    // Set panic hook to log panics
    std::panic::set_hook(Box::new(|info| {
        error!("PANIC: {:?}", info);
    }));

    info!("Overlay Renderer Service Starting...");
    
    // Parse PID from args
    let args: Vec<String> = std::env::args().collect();
    let target_pid_str = if args.len() > 1 {
        args[1].clone()
    } else {
        error!("No PID argument provided, exiting.");
        return;
    };
    
    let target_pid: u32 = target_pid_str.parse().unwrap_or(0);
    
    let width: u32 = if args.len() > 2 { args[2].parse().unwrap_or(1920) } else { 1920 };
    let height: u32 = if args.len() > 3 { args[3].parse().unwrap_or(1080) } else { 1080 };
    let instance_id = if args.len() > 4 { args[4].clone() } else { "default".to_string() };

    let suffix = format!("{}_{}", target_pid_str, instance_id);
    let shm_name = format!("{}{}", SHM_NAME_PREFIX, suffix);
    let pipe_name = format!("{}{}", PIPE_NAME_PREFIX, suffix);

    info!("Arguments - PID: {}, Width: {}, Height: {}, Instance: {}", target_pid, width, height, instance_id);
    info!("Using IPC: {} & {}", shm_name, pipe_name);
    let shm_size = 32 + (width * height * 4) as usize; // Header + Pixels
    
    // Safety check for parent process
    let parent_check_thread = std::thread::spawn(move || {
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, WaitForSingleObject, INFINITE};
        use windows::Win32::Foundation::WAIT_OBJECT_0;
        
        if target_pid > 0 {
            unsafe {
                if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, target_pid) {
                    // blocking wait for process to exit
                    if WaitForSingleObject(handle, INFINITE) == WAIT_OBJECT_0 {
                        error!("Parent process {} exited. Shutting down overlay renderer.", target_pid);
                        std::process::exit(0);
                    }
                } else {
                    error!("Could not open handle to parent process {}. Exit immediately.", target_pid);
                    std::process::exit(1);
                }
            }
        }
    });

    let shm = SharedMemory::create(&shm_name, shm_size).expect("Failed to create Shared Memory");
    info!("Shared Memory created: {}", shm_name);

    // Channels for IPC
    let (tx, rx) = std::sync::mpsc::channel::<IpcCommand>();

    // Start IPC Thread
    std::thread::spawn(move || {
        info!("IPC Thread started. Pipe name: {}", pipe_name);
        use windows::Win32::System::Pipes::{CreateNamedPipeW, ConnectNamedPipe, PIPE_TYPE_MESSAGE, PIPE_READMODE_MESSAGE, PIPE_WAIT, PIPE_UNLIMITED_INSTANCES};
        
        let pipe_name_wide: Vec<u16> = pipe_name.encode_utf16().chain(std::iter::once(0)).collect();
        
        loop {
            unsafe {
                let handle = CreateNamedPipeW(
                    PCWSTR(pipe_name_wide.as_ptr()),
                    FILE_FLAGS_AND_ATTRIBUTES(PIPE_ACCESS_DUPLEX),
                    PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
                    PIPE_UNLIMITED_INSTANCES,
                    4096,
                    4096,
                    0,
                    None
                );
// ...
                if handle != INVALID_HANDLE_VALUE {
                    info!("Waiting for client connection...");
                    let connected = ConnectNamedPipe(handle, None);
                    let is_connected = connected.is_ok() || GetLastError() == ERROR_PIPE_CONNECTED;

                    if is_connected {
                         info!("Client connected.");
                         // Create file from handle to use standard IO? Or just raw win32
                         // For simplicity, we just loop reading
                         let mut buffer = [0u8; 8192];
                         let mut bytes_read: u32 = 0;
                         
                         loop {
                             let success = windows::Win32::Storage::FileSystem::ReadFile(
                                 handle,
                                 Some(&mut buffer),
                                 Some(&mut bytes_read),
                                 None
                             );
                             
                             if success.is_err() || bytes_read == 0 {
                                 info!("Client disconnected. Signaling shutdown.");
                                 let _ = tx.send(IpcCommand::Quit);
                                 break;
                             }
                             
                             let cmd_str = String::from_utf8_lossy(&buffer[..bytes_read as usize]);
                             // Parse JSON or simple text
                             if let Ok(json) = serde_json::from_str::<serde_json::Value>(&cmd_str) {
                                  if let Some(t) = json.get("type").and_then(|v| v.as_str()) {
                                      match t {
                                          "resize" => {
                                              let w = json["w"].as_u64().unwrap_or(800) as u32;
                                              let h = json["h"].as_u64().unwrap_or(600) as u32;
                                              let _ = tx.send(IpcCommand::Resize(w, h));
                                          },
                                          "html" => {
                                              if let Some(h) = json["content"].as_str() {
                                                  let _ = tx.send(IpcCommand::LoadHtml(h.to_string()));
                                              }
                                          },
                                          "script" => {
                                              if let Some(s) = json["code"].as_str() {
                                                  let _ = tx.send(IpcCommand::ExecuteScript(s.to_string()));
                                              }
                                          },
                                          _ => {}
                                      }
                                  }
                             }
                        }
                    }
                    let _ = CloseHandle(handle);
                    // Exit the IPC thread loop as well, effectively stopping the listener
                    break;
                }
            }
            std::thread::sleep(Duration::from_millis(100));
        }
    });

    // Ultralight Init
    info!("Initializing Ultralight...");
    let mut ul_opt: Option<UltralightWrapper> = UltralightWrapper::new();
    
    if let Some(mut ul) = ul_opt {
        info!("Ultralight Initialized.");
        let view_config = ul_next::view::ViewConfig::start()
            .is_transparent(true)
            .build(ul.lib.clone())
            .unwrap();
        
        info!("Creating View...");
        let mut view = ul.renderer.create_view(width, height, &view_config, None);
        info!("View Created.");

        // Default Load
        if let Some(v) = view.as_mut() {
            let _ = v.load_html("<html><body><h1>Waiting...</h1></body></html>");
        }

        info!("Starting Main Loop...");
        let mut frame_count = 0u32;
        let mut shm_width = width;
        let mut shm_height = height;

        // Persistent buffer to avoid reallocating 8MB every frame
        let mut buffer_cache: Vec<u8> = vec![0u8; (width * height * 4) as usize];
        
        // Coasting mechanism: Continue updating for X frames after dirtiness stops
        let mut coasting_frames = 0;
        let mut should_quit = false;

        loop {
            // Check IPC
            while let Ok(cmd) = rx.try_recv() {
                match cmd {
                    IpcCommand::Resize(w, h) => {
                        if let Some(v) = view.as_mut() {
                            v.resize(w, h);
                            ul.renderer.refresh_display(0);
                            shm_width = w;
                            shm_height = h;
                            buffer_cache.resize((w * h * 4) as usize, 0);
                        }
                    },
                    IpcCommand::LoadHtml(html) => {
                         if let Some(v) = view.as_mut() {
                            let _ = v.load_html(&html); // Ignore result
                            coasting_frames = 10;
                        }
                    },
                    IpcCommand::ExecuteScript(code) => {
                         if let Some(v) = view.as_mut() {
                            v.evaluate_script(&code).ok();
                            coasting_frames = 60; // 2 seconds of coasting
                        }
                    },
                    IpcCommand::Quit => {
                        info!("Received Quit command. Exiting main loop.");
                        should_quit = true;
                        break;
                    }
                }
            }

            if should_quit {
                break;
            }

            ul.renderer.update();
            ul.renderer.render();

            if let Some(v) = view.as_mut() {
                if let Some(mut surface) = v.surface() {
                    // FORCE UPDATE MODE: Ignore dirty bounds, just upload every frame.
                    // This separates "SDK not reporting changes" from "Bandwidth too slow".
                    
                    if let Some(pixels) = surface.lock_pixels() {
                         let src = pixels.to_vec();
                         if buffer_cache.len() == src.len() {
                             // Compare buffer_cache with src? No, src is BGR, cache is RGB (prev frame).
                             // We just copy blindly for smoothness.
                             
                             buffer_cache.copy_from_slice(&src);
                             
                             // In-place swizzle
                             for chunk in buffer_cache.chunks_exact_mut(4) {
                                 chunk.swap(0, 2); 
                             }
                             
                             shm.write_pixels(&buffer_cache, 32); 
                             
                             frame_count = frame_count.wrapping_add(1);
                             shm.write_metadata(shm_width, shm_height, true, frame_count);
                         }
                    }
                     
                    surface.clear_dirty_bounds();
                }
            }
            
            // Limit to ~60 FPS (16ms)
            std::thread::sleep(Duration::from_millis(16));   
        }
    } else {
        error!("Failed to init Ultralight");
    }
}

// Minimal wrapper to hold UL objects
struct UltralightWrapper {
    renderer: Renderer,
    lib: Arc<Library>,
}

unsafe impl Send for UltralightWrapper {}

impl UltralightWrapper {
    fn new() -> Option<Self> {
        info!("UltralightWrapper::new() called");
        // Assume dlls are next to exe
        let lib = Library::linked();
        info!("Library::linked() done");
        
        info!("Enabling platform logger...");
        let _ = ul_next::platform::enable_default_logger(lib.clone(), "./ultralight.log");

        info!("Enabling platform filesystem...");
        let _ = ul_next::platform::enable_platform_filesystem(lib.clone(), ".");

        info!("Enabling platform font loader...");
        let _ = ul_next::platform::enable_platform_fontloader(lib.clone());
        
        info!("Building config...");
        let config_opt = Config::start()
            .resource_path_prefix("./resources/")
            //.use_gpu(false) // Not available in this version?
            .build(lib.clone());
        if config_opt.is_none() {
             error!("Failed to build config (returned None)");
             return None;
        }
        let config = config_opt.unwrap();

        info!("Creating Renderer...");
        match Renderer::create(config) {
             Ok(renderer) => {
                 info!("Renderer created successfully");
                 Some(Self { renderer, lib })
             },
             Err(e) => {
                 error!("Failed to create Renderer: {:?}", e);
                 None
             }
        }
    }
}
