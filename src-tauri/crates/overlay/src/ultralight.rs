use std::sync::{Arc, Mutex};
use ul_next::{Renderer, Config, Library, platform, View};
use log::{info, error};
use std::path::PathBuf;
use windows::Win32::System::LibraryLoader::{GetModuleHandleExW, GetModuleFileNameW, LoadLibraryW, SetDllDirectoryW, GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS, GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT};
use windows::Win32::Foundation::{HMODULE, GetLastError};
use windows::core::PCWSTR;

pub struct SafeView(pub View);

unsafe impl Send for SafeView {}
unsafe impl Sync for SafeView {}

impl std::ops::Deref for SafeView {
    type Target = View;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl std::ops::DerefMut for SafeView {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

pub struct Ultralight {
    pub renderer: Renderer,
    pub lib: Arc<Library>,
}

unsafe impl Send for Ultralight {}
unsafe impl Sync for Ultralight {}

pub enum UserCommand {
    LoadHtml(String),
    ExecuteScript(String),
    Resize(u32, u32),
}

pub struct SharedRenderState {
    pub buffer: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub dirty: bool,
}

pub struct UltralightThread {
    pub tx: std::sync::mpsc::Sender<UserCommand>,
    pub state: Arc<Mutex<SharedRenderState>>,
}

impl Ultralight {
    pub fn spawn_thread(dll_dir: Option<String>, width: u32, height: u32) -> Option<UltralightThread> {
        let (tx, rx) = std::sync::mpsc::channel();
        let state = Arc::new(Mutex::new(SharedRenderState {
            buffer: vec![0u8; (width * height * 4) as usize],
            width,
            height,
            dirty: false,
        }));
        
        let state_clone = state.clone();

        std::thread::spawn(move || {
            info!("Ultralight Worker Thread Started");
            
            // Initialize UL on this thread
            let mut ul_opt = Self::new(dll_dir);
            if ul_opt.is_none() {
                error!("Failed to initialize Ultralight on worker thread");
                return;
            }
            let mut ul = ul_opt.unwrap();
            
            // Create View
            let view_config = ul_next::view::ViewConfig::start()
                .is_transparent(true)
                .build(ul.lib.clone())
                .unwrap();
            
            let mut view = ul.renderer.create_view(width, height, &view_config, None);
            
            if view.is_none() {
                error!("Failed to create Ultralight View");
                return;
            }

            info!("Ultralight Renderer Loop Active");
            
            loop {
                // Process Commands
                while let Ok(cmd) = rx.try_recv() {
                    match cmd {
                        UserCommand::LoadHtml(html) => {
                            if let Some(v) = view.as_mut() {
                                let _ = v.load_html(&html);
                            }
                        },
                        UserCommand::ExecuteScript(script) => {
                            if let Some(v) = view.as_mut() {
                                let _ = v.evaluate_script(&script);
                            }
                        },
                        UserCommand::Resize(w, h) => {
                            if let Some(v) = view.as_mut() {
                                v.resize(w, h);
                                // Resize buffer in state (requires lock)
                                if let Ok(mut s) = state_clone.lock() {
                                    s.width = w;
                                    s.height = h;
                                    s.buffer.resize((w * h * 4) as usize, 0);
                                }
                            }
                        }
                    }
                }

                // Update & Render
                ul.renderer.update();
                ul.renderer.render();

                // Pixel Copy (Swizzle)
                if let Some(v) = view.as_mut() {
                    if let Some(mut surface) = v.surface() {
                        // We check dirty bounds but also just copy if we want high FPS
                        if !surface.dirty_bounds().is_empty() {
                            if let Some(pixels) = surface.lock_pixels() {
                                if let Ok(mut s) = state_clone.lock() {
                                    let len = pixels.len();
                                    if s.buffer.len() != len {
                                        s.buffer.resize(len, 0);
                                    }
                                    
                                    // Copy and Swizzle in one go if possible, or just copy then swizzle
                                    // Doing it here offloads the Game Thread
                                    s.buffer.copy_from_slice(&pixels);
                                    
                                    // Swizzle BGRA -> RGBA
                                    for chunk in s.buffer.chunks_exact_mut(4) {
                                        chunk.swap(0, 2);
                                    }
                                    
                                    s.dirty = true;
                                }
                            }
                            surface.clear_dirty_bounds();
                        }
                    }
                }

                // Sleep to cap thread usage (~120Hz)
                std::thread::sleep(std::time::Duration::from_millis(8));
            }
        });

        Some(UltralightThread {
            tx,
            state,
        })
    }

    pub fn new(dll_dir: Option<String>) -> Option<Self> {
        info!("Initializing Ultralight Engine...");

        let dll_dir = if let Some(ref d) = dll_dir {
            PathBuf::from(d)
        } else {
            get_current_module_dir().unwrap_or(PathBuf::from("."))
        };
        
        info!("Overlay DLL directory: {:?}", dll_dir);
        
        let possible_paths = vec![
            dll_dir.join("Ultralight.dll"),
            dll_dir.join("../../bin/Ultralight.dll"),
            PathBuf::from("Ultralight.dll"),
        ];

        let mut loaded = false;
        let mut loaded_path = PathBuf::new();

        for path in possible_paths {
            info!("Checking for Ultralight at: {:?}", path);
            if path.exists() {
                info!("Found Ultralight at: {:?}", path);
                
                if let Some(parent) = path.parent() {
                    let p = parent.to_string_lossy().to_string();
                    let wide: Vec<u16> = p.encode_utf16().chain(std::iter::once(0)).collect();
                    unsafe {
                        let _ = SetDllDirectoryW(PCWSTR(wide.as_ptr()));
                    }
                }

                unsafe {
                     let app_core_path = path.parent().unwrap().join("AppCore.dll");
                     let p = app_core_path.to_string_lossy().to_string();
                     let wide: Vec<u16> = p.encode_utf16().chain(std::iter::once(0)).collect();
                     
                     let result = LoadLibraryW(PCWSTR(wide.as_ptr()));
                     let _ = SetDllDirectoryW(PCWSTR(std::ptr::null()));

                     if let Ok(_) = result {
                         info!("Manually loaded AppCore.dll from {:?}", app_core_path);
                         loaded = true;
                         loaded_path = path.clone();
                         break;
                     } else {
                         // Fallback
                         let p = path.to_string_lossy().to_string();
                         let wide: Vec<u16> = p.encode_utf16().chain(std::iter::once(0)).collect();
                         if let Ok(_) = LoadLibraryW(PCWSTR(wide.as_ptr())) {
                             loaded = true;
                             loaded_path = path.clone();
                             break;
                         }
                     }
                }
            }
        }
        
        if !loaded {
            error!("Could not find or load Ultralight.dll.");
            return None;
        }

        let lib = Library::linked();

        // Enable platform handlers
        let log_path = std::env::temp_dir().join("ultralight.log");
        if let Err(e) = platform::enable_default_logger(lib.clone(), &log_path) {
            error!("Failed to enable Ultralight logger: {:?}", e);
        }

        platform::enable_platform_fontloader(lib.clone());

        let default_path = PathBuf::from(".");
        let base_dir = loaded_path.parent().unwrap_or(&default_path);
        if let Err(e) = platform::enable_platform_filesystem(lib.clone(), base_dir) {
             error!("Failed to enable platform filesystem: {:?}", e);
        }

        let resource_path = base_dir.join("resources");
        let mut resource_path_str = resource_path.to_string_lossy().to_string();
        if !resource_path_str.ends_with('/') && !resource_path_str.ends_with('\\') {
            resource_path_str.push('/');
        }

        let config = Config::start()
            .resource_path_prefix(&resource_path_str)
            .cache_path(&std::env::temp_dir().join("nuxion_ul_cache").to_string_lossy().to_string())
            .build(lib.clone())
            .unwrap();

        info!("Creating Ultralight Renderer...");
        match Renderer::create(config) {
            Ok(renderer) => Some(Self { renderer, lib }),
            Err(e) => {
                error!("Failed to create Ultralight Renderer: {:?}", e);
                None
            }
        }
    }
}

fn get_current_module_dir() -> Option<PathBuf> {
    let mut module = HMODULE::default();
    unsafe {
        let lp_module_name = &get_current_module_dir as *const _ as *const u16;
        if GetModuleHandleExW(
            GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
            PCWSTR(lp_module_name),
            &mut module,
        ).is_ok() {
             let mut buf = [0u16; 1024];
             let len = GetModuleFileNameW(Some(module), &mut buf);
             if len > 0 {
                 let path = String::from_utf16_lossy(&buf[..len as usize]);
                 return PathBuf::from(path).parent().map(|p| p.to_path_buf());
             }
        }
    }
    None
}