use crate::state::OverlayState;
use hudhook::ImguiRenderLoop;
use log::{info, error};
use std::sync::{Arc, Mutex};
use hudhook::imgui;

use crate::features::{OverlayFeature, fps::FpsFeature, crosshair::CrosshairFeature, notifications::NotificationFeature};
use crate::ultralight::Ultralight;
use crate::renderer_client::RendererClient;
use std::time::{Instant, Duration};

pub struct Overlay {
    pub state: Arc<Mutex<OverlayState>>,
    pub fps: FpsFeature,
    pub crosshair: CrosshairFeature,
    pub notifications: NotificationFeature,
    pub client: Arc<Mutex<Option<RendererClient>>>,
    pub texture_id: Option<imgui::TextureId>,
    pub pixel_buffer: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

impl Overlay {
    pub fn new(state: Arc<Mutex<OverlayState>>) -> Self {
        let dll_dir = if let Ok(s) = state.lock() {
            s.dll_dir.clone()
        } else {
            None
        };

        // Initialize Shared RendererClient
        let width = 1920; // Default buffer size
        let height = 1080;
        let client_mutex = Arc::new(Mutex::new(None));
        
        Self {
            state: state.clone(),
            fps: FpsFeature::new(),
            crosshair: CrosshairFeature::new(state.clone(), client_mutex.clone()),
            notifications: NotificationFeature::new(client_mutex.clone()),
            client: client_mutex,
            texture_id: None,
            pixel_buffer: Vec::new(),
            width,
            height,
        }
    }
}

impl ImguiRenderLoop for Overlay {
    fn initialize<'a>(&'a mut self, ctx: &mut imgui::Context, render_context: &'a mut dyn hudhook::RenderContext) {
        info!("Initializing Overlay... (Entry)");
        
        // Initialize Renderer Client if needed
        let mut client_guard = self.client.lock().unwrap();
        if client_guard.is_none() {
             let pid = std::process::id();
             let dll_dir = if let Ok(s) = self.state.lock() { s.dll_dir.clone() } else { None };
             
             info!("Starting Unified Overlay Renderer...");
             // Using "overlay" as instance ID
             let mut client = RendererClient::new(dll_dir, self.width, self.height, pid, "overlay");
             
             // Load the new unified HTML
             let html = include_str!("../assets/overlay.html");
             client.load_html(html);
             
             *client_guard = Some(client);
        }
        drop(client_guard);

        // Initialize features
        self.fps.initialize(ctx, render_context);
        self.notifications.initialize(ctx, render_context);
        self.crosshair.initialize(ctx, render_context);
        
        // Create Fullscreen Texture
        if self.texture_id.is_none() {
            let initial_pixels = vec![0u8; (self.width * self.height * 4) as usize];
            match render_context.load_texture(&initial_pixels, self.width, self.height) {
                Ok(tid) => {
                    self.texture_id = Some(tid);
                    info!("Created Overlay Master Texture ({}x{})", self.width, self.height);
                }
                Err(e) => error!("Failed to create Overlay Master Texture: {:?}", e),
            }
        }

        info!("Initializing Overlay... (Exit)");
    }

    fn before_render<'a>(&'a mut self, ctx: &mut imgui::Context, render_context: &'a mut dyn hudhook::RenderContext) {
        self.fps.before_render(ctx, render_context);
        
        // Features update the shared client state (sending JS commands)
        // self.notifications.before_render(ctx, render_context); // Doesn't do anything
        if let Ok(mut state) = self.state.lock() {
             self.notifications.update(&mut state);
        }
        self.crosshair.before_render(ctx, render_context);

        // Master update loop
        if let Ok(mut client_opt) = self.client.lock() {
            if let Some(client) = client_opt.as_mut() {
                if client.check_update() {
                    // Log to see how often this hits!
                    info!("Client buffer update detected! Frame: {}", client.last_frame_id);

                    // Client buffer has new data (BGRA)
                    // We need to upload it to our texture
                    
                    // Resize local buffer if needed
                    let len = client.pixel_buffer.len();
                    if self.pixel_buffer.len() != len {
                        self.pixel_buffer.resize(len, 0);
                    }
                    
                    // Copy (Already Swizzled to RGBA by renderer process)
                    self.pixel_buffer.copy_from_slice(&client.pixel_buffer);

                    if let Some(tid) = self.texture_id {
                        let _ = render_context.replace_texture(
                            tid, 
                            &self.pixel_buffer,
                            self.width, 
                            self.height
                        );
                    }
                }
            }
        }
    }

    fn render(&mut self, ui: &mut imgui::Ui) {
        // Debug Window - Always draw this to prove ImGui is working
        ui.window("Debug Info")
          .size([300.0, 150.0], imgui::Condition::FirstUseEver)
          .build(|| {
              ui.text("Nuxion Overlay Active");
              ui.text(format!("Texture ID: {:?}", self.texture_id));
              ui.text(format!("Buffer Size: {}x{}", self.width, self.height));
              
              if let Ok(client_guard) = self.client.lock() {
                  if let Some(client) = client_guard.as_ref() {
                      ui.text(format!("Renderer Connected: Yes"));
                      ui.text(format!("Frame ID: {}", client.last_frame_id));
                  } else {
                      ui.text("Renderer Connected: No");
                  }
              }

              if let Ok(state) = self.state.lock() {
                  ui.text(format!("FPS Enabled: {}", state.fps.enabled));
                  ui.text(format!("Crosshair Enabled: {}", state.crosshair.enabled));
              }
          });

        // Draw the full screen overlay texture
        if let Some(tid) = self.texture_id {
             let io = ui.io();
             
             ui.window("OverlayMaster")
                .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_INPUTS | imgui::WindowFlags::NO_BACKGROUND | imgui::WindowFlags::NO_NAV | imgui::WindowFlags::NO_FOCUS_ON_APPEARING | imgui::WindowFlags::NO_BRING_TO_FRONT_ON_FOCUS)
                .size([io.display_size[0], io.display_size[1]], imgui::Condition::Always)
                .position([0.0, 0.0], imgui::Condition::Always)
                .bg_alpha(0.1) // 10% opacity Red to verify coverage
                .build(|| {
                    // Draw a red border or background to verify the window itself
                    let draw_list = ui.get_window_draw_list();
                    draw_list.add_rect(
                        [0.0, 0.0], 
                        [io.display_size[0], io.display_size[1]], 
                        0xFFFFFFFF 
                    ).build();

                    imgui::Image::new(tid, [io.display_size[0], io.display_size[1]]).build(ui);
                });
        }

        if let Ok(state) = self.state.lock() {
             if !state.enabled { return; }
             self.fps.render(ui, &state);
             
             // Check pending notifications and process them (handled by notification internal logic if any remaining)
             // Notification rendering via ImGui windows is removed, now handled by OverlayMaster texture
        }
    }
}
