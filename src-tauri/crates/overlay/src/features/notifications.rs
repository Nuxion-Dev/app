use hudhook::imgui;
use crate::state::OverlayState;
use super::OverlayFeature;
use std::sync::{Arc, Mutex};
use log::{info, error};
use ul_next::{Renderer, View, Config, Library};
use ul_next::view::ViewConfig;
use std::path::PathBuf;
use windows::Win32::System::LibraryLoader::{GetModuleHandleExW, GetModuleFileNameW, LoadLibraryW, SetDllDirectoryW, GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS, GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT};
use windows::Win32::Foundation::{HMODULE, GetLastError};
use windows::core::PCWSTR;

// Holds the heavy resources (Non-Clone)
pub struct UltralightContext {
    renderer: Renderer,
    view: View,
    texture_id: imgui::TextureId,
    width: u32,
    height: u32,
    _lib: Arc<Library>,
}

unsafe impl Send for UltralightContext {}
unsafe impl Sync for UltralightContext {}

pub struct NotificationFeature {
    pub ul_context: Arc<Mutex<Option<UltralightContext>>>,
    pub dll_dir: Option<String>,
}

impl NotificationFeature {
    pub fn new(dll_dir: Option<String>) -> Self {
        Self {
            ul_context: Arc::new(Mutex::new(None)),
            dll_dir,
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

impl OverlayFeature for NotificationFeature {
    fn initialize(&mut self, _context: &mut imgui::Context, render_context: &mut dyn hudhook::RenderContext) {
        info!("Initializing Ultralight Feature...");

        let dll_dir = if let Some(ref d) = self.dll_dir {
            PathBuf::from(d)
        } else {
            get_current_module_dir().unwrap_or(PathBuf::from("."))
        };
        
        info!("Overlay DLL directory: {:?}", dll_dir);
        
        let possible_paths = vec![
            dll_dir.join("Ultralight.dll"),
            dll_dir.join("../../bin/Ultralight.dll"), // Dev env relative to target/debug
            PathBuf::from("Ultralight.dll"), // System path
        ];

        let mut loaded = false;
        let mut loaded_path = PathBuf::new();

        for path in possible_paths {
            info!("Checking for Ultralight at: {:?}", path);
            if path.exists() {
                info!("Found Ultralight at: {:?}", path);
                
                // Use SetDllDirectoryW to ensure dependencies are found
                if let Some(parent) = path.parent() {
                    let p = parent.to_string_lossy().to_string();
                    let wide: Vec<u16> = p.encode_utf16().chain(std::iter::once(0)).collect();
                    unsafe {
                        if SetDllDirectoryW(PCWSTR(wide.as_ptr())).is_ok() {
                            info!("SetDllDirectoryW succeeded: {:?}", parent);
                        } else {
                            error!("SetDllDirectoryW failed: {:?}", GetLastError());
                        }
                    }
                }

                unsafe {
                     let p = path.to_string_lossy().to_string();
                     let wide: Vec<u16> = p.encode_utf16().chain(std::iter::once(0)).collect();
                     let result = LoadLibraryW(PCWSTR(wide.as_ptr()));
                     
                     // Always restore the DLL directory to avoid affecting the game
                     let _ = SetDllDirectoryW(PCWSTR(std::ptr::null()));

                     if let Ok(_) = result {
                         info!("Manually loaded Ultralight from {:?}", path);
                         loaded = true;
                         loaded_path = path.clone();
                         break;
                     } else {
                         error!("Failed to LoadLibraryW {:?}. Error: {:?}", path, GetLastError());
                     }
                }
            }
        }
        
        if !loaded {
            error!("Could not find or load Ultralight.dll. Notifications will be disabled.");
            return;
        }

        let lib = Library::linked();

        let resource_path = loaded_path.parent().unwrap_or(&PathBuf::from(".")).join("resources");
        info!("Setting Ultralight resource path to: {:?}", resource_path);

        let config = Config::start()
            .resource_path_prefix(&resource_path.to_string_lossy().to_string())
            .build(lib.clone())
            .unwrap();
        
        info!("Creating Ultralight Renderer...");
        let renderer = match Renderer::create(config) {
            Ok(r) => r,
            Err(e) => {
                error!("Failed to create Ultralight Renderer: {:?}", e);
                return;
            }
        };
        info!("Ultralight Renderer created.");

        let width = 400u32;
        let height = 600u32; 
        
        let view_config = ViewConfig::start()
            .is_transparent(true)
            .build(lib.clone())
            .unwrap();

        info!("Creating Ultralight View...");
        let view = match renderer.create_view(width, height, &view_config, None) {
            Some(v) => v,
            None => {
                error!("Failed to create Ultralight View: returned None");
                return;
            }
        };
        info!("Ultralight View created.");
        
        let _ = view.load_html(r#"
            <html>
                <body style="background-color: transparent; color: white; font-family: sans-serif;">
                    <div style="background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px; border: 1px solid #333;">
                        <h1>Ultralight Ready</h1>
                        <p>Waiting for notifications...</p>
                    </div>
                </body>
            </html>
        "#);

        info!("Ultralight View Created.");

        let initial_pixels = vec![0u8; (width * height * 4) as usize];
        match render_context.load_texture(&initial_pixels, width, height) {
            Ok(texture_id) => {
                info!("Hudhook Texture Created: {:?}", texture_id);
                let mut ul_lock = self.ul_context.lock().unwrap();
                *ul_lock = Some(UltralightContext {
                    renderer,
                    view,
                    texture_id,
                    width,
                    height,
                    _lib: lib,
                });
            },
            Err(e) => {
                error!("Failed to create texture: {:?}", e);
            }
        }
    }

    fn before_render(&mut self, _context: &mut imgui::Context, render_context: &mut dyn hudhook::RenderContext) {
        if let Ok(mut ul_guard) = self.ul_context.lock() {
            if let Some(ctx) = ul_guard.as_mut() {
                ctx.renderer.update();
                ctx.renderer.render();

                if let Some(mut surface) = ctx.view.surface() {
                    if let Some(pixels_guard) = surface.lock_pixels() {
                         if let Err(e) = render_context.replace_texture(ctx.texture_id, &pixels_guard, ctx.width, ctx.height) {
                             error!("Failed to replace texture: {:?}", e);
                         }
                    }
                }
            }
        }
    }

    fn render(&mut self, ui: &mut imgui::Ui, _state: &OverlayState) {
        let io = ui.io();
        let [width, height] = io.display_size;

        if let Ok(ul_guard) = self.ul_context.lock() {
            if let Some(ctx) = ul_guard.as_ref() {
                ui.window("UltralightOverlay")
                    .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_INPUTS | imgui::WindowFlags::NO_BACKGROUND | imgui::WindowFlags::NO_NAV)
                    .size([ctx.width as f32, ctx.height as f32], imgui::Condition::Always)
                    .position([width - 420.0, height - 620.0], imgui::Condition::Always)
                    .bg_alpha(0.0)
                    .build(|| {
                        imgui::Image::new(ctx.texture_id, [ctx.width as f32, ctx.height as f32]).build(ui);
                    });
            }
        }
    }
}
