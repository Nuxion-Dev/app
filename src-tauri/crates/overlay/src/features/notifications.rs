use hudhook::imgui;
use crate::state::{OverlayState, Notification};
use super::OverlayFeature;
use std::sync::{Arc, Mutex};
use log::{info, error};
use ul_next::{View, view::ViewConfig};
use crate::ultralight::{Ultralight, SafeView};
use std::time::{Instant, Duration};

pub struct NotificationFeature {
    pub ultralight: Arc<Mutex<Option<Ultralight>>>,
    pub view: Option<SafeView>,
    pub texture_id: Option<imgui::TextureId>,
    pub width: u32,
    pub height: u32,
    pub dll_dir: Option<String>,
    pub active_until: Instant,
}

impl NotificationFeature {
    pub fn new(ultralight: Arc<Mutex<Option<Ultralight>>>, dll_dir: Option<String>) -> Self {
        Self {
            ultralight,
            view: None,
            texture_id: None,
            width: 400,
            height: 600,
            dll_dir,
            active_until: Instant::now(),
        }
    }

    pub fn send_notification(&mut self, notification: &Notification) {
        // Extend active period: duration + 1.0s for fade out/in
        self.active_until = Instant::now() + Duration::from_secs_f32(notification.duration + 1.0);
        
        if let Some(view) = &self.view {
            info!("Sending notification to JS: {} - {}", notification.title, notification.message);
            let script = format!(
                "if (window.addNotification) {{ addNotification('{}', '{}', '{}', {}); }} else {{ console.error('addNotification not found'); }}",
                notification.id,
                notification.title.replace("'", "\\'"),
                notification.message.replace("'", "\\'"),
                notification.duration
            );
            match view.evaluate_script(&script) {
                Ok(_) => info!("Notification script evaluated successfully"),
                Err(e) => error!("Failed to evaluate notification script: {:?}", e),
            }
        } else {
            error!("Cannot send notification: View is None");
        }
    }
}

impl OverlayFeature for NotificationFeature {
    fn initialize(&mut self, _context: &mut imgui::Context, render_context: &mut dyn hudhook::RenderContext) {
        info!("Initializing Notification Feature...");

        // Initialize Ultralight if not already initialized
        {
            let mut ul_guard = self.ultralight.lock().unwrap();
            if ul_guard.is_none() {
                *ul_guard = Ultralight::new(self.dll_dir.clone());
            }
        }

        let ul_guard = self.ultralight.lock().unwrap();
        if let Some(ul) = ul_guard.as_ref() {
            let view_config = ViewConfig::start()
                .is_transparent(true)
                .build(ul.lib.clone())
                .unwrap();

            info!("Creating Notification View...");
            if let Some(view) = ul.renderer.create_view(self.width, self.height, &view_config, None) {
                let html = include_str!("../../assets/notification.html");
                let _ = view.load_html(html);
                self.view = Some(SafeView(view));
                info!("Notification View created.");
            } else {
                error!("Failed to create Notification View");
            }
        }

        if self.view.is_some() {
            let initial_pixels = vec![0u8; (self.width * self.height * 4) as usize];
            match render_context.load_texture(&initial_pixels, self.width, self.height) {
                Ok(id) => {
                    self.texture_id = Some(id);
                    info!("Notification Texture Created: {:?}", id);
                },
                Err(e) => error!("Failed to create notification texture: {:?}", e),
            }
        }
    }

    fn before_render(&mut self, _context: &mut imgui::Context, render_context: &mut dyn hudhook::RenderContext) {
        // Only update texture if we are within the active period
        if Instant::now() > self.active_until {
            return;
        }

        if let (Some(view), Some(texture_id)) = (&mut self.view, self.texture_id) {
            if let Some(mut surface) = view.surface() {
                if let Some(pixels_guard) = surface.lock_pixels() {
                     if let Err(e) = render_context.replace_texture(texture_id, &pixels_guard, self.width, self.height) {
                         error!("Failed to replace notification texture: {:?}", e);
                     }
                }
            }
        }
    }

    fn render(&mut self, ui: &mut imgui::Ui, _state: &OverlayState) {
        if let Some(texture_id) = self.texture_id {
            let io = ui.io();
            let [width, height] = io.display_size;

            ui.window("UltralightOverlay")
                .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_INPUTS | imgui::WindowFlags::NO_BACKGROUND | imgui::WindowFlags::NO_NAV)
                .size([self.width as f32, self.height as f32], imgui::Condition::Always)
                .position([width - 420.0, height - 620.0], imgui::Condition::Always)
                .bg_alpha(0.0)
                .build(|| {
                    imgui::Image::new(texture_id, [self.width as f32, self.height as f32]).build(ui);
                });
        }
    }
}
