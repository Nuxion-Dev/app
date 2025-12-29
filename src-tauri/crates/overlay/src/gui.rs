use crate::state::OverlayState;
use hudhook::ImguiRenderLoop;
use log::error;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Overlay {
    pub state: Arc<Mutex<OverlayState>>,
}

impl ImguiRenderLoop for Overlay {
    fn render(&mut self, ui: &mut imgui::Ui) {
        ui.window("Debug Overlay")
            .size([200.0, 50.0], imgui::Condition::FirstUseEver)
            .build(|| {
                ui.text("Overlay Active");
                if let Ok(state) = self.state.lock() {
                    ui.text(format!("Crosshair: {}", state.crosshair.enabled));
                }
            });
    }
}
