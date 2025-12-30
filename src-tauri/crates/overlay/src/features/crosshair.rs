use hudhook::imgui;
use crate::state::OverlayState;
use super::OverlayFeature;
use std::sync::{Arc, Mutex};
use log::{info, error};
use ul_next::{View, view::ViewConfig};
use crate::ultralight::{Ultralight, SafeView};

pub struct CrosshairFeature {
    pub ultralight: Arc<Mutex<Option<Ultralight>>>,
    pub view: Option<SafeView>,
    pub texture_id: Option<imgui::TextureId>,
    pub width: u32,
    pub height: u32,
}

impl CrosshairFeature {
    pub fn new(ultralight: Arc<Mutex<Option<Ultralight>>>) -> Self {
        Self {
            ultralight,
            view: None,
            texture_id: None,
            width: 256,
            height: 256,
        }
    }
}

impl OverlayFeature for CrosshairFeature {
    fn initialize(&mut self, _context: &mut imgui::Context, render_context: &mut dyn hudhook::RenderContext) {
        info!("Initializing Crosshair Feature...");

        // Wait for Ultralight to be initialized by the Notification feature (or whoever comes first)
        let ul_guard = self.ultralight.lock().unwrap();
        if let Some(ul) = ul_guard.as_ref() {
            let view_config = ViewConfig::start()
                .is_transparent(true)
                .build(ul.lib.clone())
                .unwrap();

            info!("Creating Crosshair View...");
            if let Some(view) = ul.renderer.create_view(self.width, self.height, &view_config, None) {
                let html = include_str!("../../assets/crosshair.html");
                let _ = view.load_html(html);
                self.view = Some(SafeView(view));
                info!("Crosshair View created.");
            } else {
                error!("Failed to create Crosshair View");
            }
        } else {
            error!("Ultralight not initialized when initializing CrosshairFeature. Ensure NotificationFeature is initialized first.");
        }

        if self.view.is_some() {
            let initial_pixels = vec![0u8; (self.width * self.height * 4) as usize];
            match render_context.load_texture(&initial_pixels, self.width, self.height) {
                Ok(id) => {
                    self.texture_id = Some(id);
                    info!("Crosshair Texture Created: {:?}", id);
                },
                Err(e) => error!("Failed to create crosshair texture: {:?}", e),
            }
        }
    }

    fn before_render(&mut self, _context: &mut imgui::Context, render_context: &mut dyn hudhook::RenderContext) {
        if let (Some(view), Some(texture_id)) = (&mut self.view, self.texture_id) {
            if let Some(mut surface) = view.surface() {
                if let Some(pixels_guard) = surface.lock_pixels() {
                     if let Err(e) = render_context.replace_texture(texture_id, &pixels_guard, self.width, self.height) {
                         error!("Failed to replace crosshair texture: {:?}", e);
                     }
                }
            }
        }
    }

    fn render(&mut self, ui: &mut imgui::Ui, state: &OverlayState) {
        if !state.crosshair.enabled {
            return;
        }

        if let (Some(texture_id), Some(view)) = (self.texture_id, &self.view) {
            let io = ui.io();
            let [width, height] = io.display_size;
            
            let center_x = (width / 2.0) + state.crosshair.offset_x;
            let center_y = (height / 2.0) + state.crosshair.offset_y;

            // Update Crosshair State in Ultralight
            // We construct a JSON object to pass to the JS function
            let grid_json = if let Some(grid) = &state.crosshair.grid {
                serde_json::to_string(grid).unwrap_or("null".to_string())
            } else {
                "null".to_string()
            };

            let script = format!(
                "updateCrosshair({{ color: '{}', size: {}, type: '{}', grid: {} }});", 
                state.crosshair.color, 
                state.crosshair.size,
                state.crosshair.crosshair_type.as_deref().unwrap_or("circle"),
                grid_json
            );
            let _ = view.evaluate_script(&script);

            ui.window("UltralightCrosshair")
                .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_INPUTS | imgui::WindowFlags::NO_BACKGROUND | imgui::WindowFlags::NO_NAV | imgui::WindowFlags::NO_FOCUS_ON_APPEARING)
                .size([self.width as f32, self.height as f32], imgui::Condition::Always)
                .position([center_x - (self.width as f32 / 2.0), center_y - (self.height as f32 / 2.0)], imgui::Condition::Always)
                .bg_alpha(0.0)
                .build(|| {
                    imgui::Image::new(texture_id, [self.width as f32, self.height as f32]).build(ui);
                });
        }
    }
}
