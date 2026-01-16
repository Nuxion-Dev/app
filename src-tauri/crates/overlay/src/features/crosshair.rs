use hudhook::imgui;
use crate::state::{OverlayState, OverlayCrosshairData};
use super::OverlayFeature;
use std::sync::{Arc, Mutex};
use log::{info, error};
use crate::renderer_client::RendererClient;
use serde_json::json;

pub struct CrosshairFeature {
    pub state: Arc<Mutex<OverlayState>>,
    pub client: Arc<Mutex<Option<RendererClient>>>,
    pub last_config: String,
}

impl CrosshairFeature {
    pub fn new(state: Arc<Mutex<OverlayState>>, client: Arc<Mutex<Option<RendererClient>>>) -> Self {
        Self {
            state,
            client,
            last_config: String::new(),
        }
    }
}

impl OverlayFeature for CrosshairFeature {
    fn initialize(&mut self, _context: &mut imgui::Context, _render_context: &mut dyn hudhook::RenderContext) {
        info!("Initializing Crosshair Feature (Unified)...");
    }

    fn before_render(&mut self, _context: &mut imgui::Context, _render_context: &mut dyn hudhook::RenderContext) {
        if let Ok(mut client_guard) = self.client.lock() {
            if let Some(client) = client_guard.as_mut() {
                // Check for config updates
                if let Ok(state) = self.state.lock() {
                    if state.crosshair.enabled {
                        let grid_json = if let Some(grid) = &state.crosshair.grid {
                            json!(grid)
                        } else {
                            json!(null)
                        };
                        
                        let current_config = json!({
                            "color": state.crosshair.color,
                            "size": state.crosshair.size,
                            "type": state.crosshair.crosshair_type.as_deref().unwrap_or("circle"),
                            "grid": grid_json
                        }).to_string();

                        if current_config != self.last_config {
                             info!("Updating Crosshair Config: {}", current_config);
                             let script = format!("if (window.updateCrosshair) {{ window.updateCrosshair({}); }}", current_config);
                             client.execute_script(&script);
                             self.last_config = current_config;
                        }
                    } else {
                         // Disable crosshair? 
                         // With unified overlay, we might need a way to hide it.
                         // For now assume "enabled" controls sending updates, but maybe we should send a hide command?
                         // The JS implementation has 'crosshair-svg.active', so if we don't call update, it stays provided it was active.
                         // But we want to hide it if disabled.
                    }
                }
            }
        }
    }

    fn render(&mut self, _ui: &mut imgui::Ui, _state: &OverlayState) {
        // Rendering is handled by the unified texture in gui.rs
    }
}
