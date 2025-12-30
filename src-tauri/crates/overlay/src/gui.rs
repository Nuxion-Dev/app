use crate::state::OverlayState;
use hudhook::ImguiRenderLoop;
use log::info;
use std::sync::{Arc, Mutex};
use hudhook::imgui;

use crate::features::{OverlayFeature, fps::FpsFeature, crosshair::CrosshairFeature, notifications::NotificationFeature};

pub struct Overlay {
    pub state: Arc<Mutex<OverlayState>>,
    pub fps: FpsFeature,
    pub crosshair: CrosshairFeature,
    pub notifications: NotificationFeature,
}

impl Overlay {
    pub fn new(state: Arc<Mutex<OverlayState>>) -> Self {
        let dll_dir = if let Ok(s) = state.lock() {
            s.dll_dir.clone()
        } else {
            None
        };

        Self {
            state,
            fps: FpsFeature::new(),
            crosshair: CrosshairFeature::new(),
            notifications: NotificationFeature::new(dll_dir),
        }
    }
}

impl ImguiRenderLoop for Overlay {
    fn initialize<'a>(&'a mut self, ctx: &mut imgui::Context, render_context: &'a mut dyn hudhook::RenderContext) {
        info!("Initializing Overlay... (Entry)");
        
        // Force enable FPS for debugging
        if let Ok(mut state) = self.state.lock() {
            state.fps.enabled = true;
            info!("Enabled FPS counter for debugging.");
        }

        self.fps.initialize(ctx, render_context);
        self.crosshair.initialize(ctx, render_context);
        self.notifications.initialize(ctx, render_context);
        
        info!("Initializing Overlay... (Exit)");
    }

    fn before_render<'a>(&'a mut self, ctx: &mut imgui::Context, render_context: &'a mut dyn hudhook::RenderContext) {
        self.fps.before_render(ctx, render_context);
        self.crosshair.before_render(ctx, render_context);
        self.notifications.before_render(ctx, render_context);
    }

    fn render(&mut self, ui: &mut imgui::Ui) {
        static ONCE: std::sync::Once = std::sync::Once::new();
        ONCE.call_once(|| {
            info!("Render called for the first time!");
        });

        if let Ok(state) = self.state.lock() {
            if !state.enabled {
                // Render a dummy invisible window to prevent empty draw list issues
                ui.window("Hidden")
                    .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_INPUTS | imgui::WindowFlags::NO_BACKGROUND | imgui::WindowFlags::NO_NAV)
                    .size([1.0, 1.0], imgui::Condition::Always)
                    .position([0.0, 0.0], imgui::Condition::Always)
                    .bg_alpha(0.0)
                    .build(|| {
                        ui.text_colored([0.0, 0.0, 0.0, 0.0], ".");
                    });
                return;
            }

            self.fps.render(ui, &state);
            self.crosshair.render(ui, &state);
            self.notifications.render(ui, &state);
        }
    }
}
