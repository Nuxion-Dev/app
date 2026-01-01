use crate::state::OverlayState;
use hudhook::ImguiRenderLoop;
use log::info;
use std::sync::{Arc, Mutex};
use hudhook::imgui;

use crate::features::{OverlayFeature, fps::FpsFeature, crosshair::CrosshairFeature, notifications::NotificationFeature};
use crate::ultralight::Ultralight;
use std::time::{Instant, Duration};

pub struct Overlay {
    pub state: Arc<Mutex<OverlayState>>,
    pub fps: FpsFeature,
    pub crosshair: CrosshairFeature,
    pub notifications: NotificationFeature,
    pub ultralight: Arc<Mutex<Option<Ultralight>>>,
    pub last_ul_update: Instant,
}

impl Overlay {
    pub fn new(state: Arc<Mutex<OverlayState>>) -> Self {
        let dll_dir = if let Ok(s) = state.lock() {
            s.dll_dir.clone()
        } else {
            None
        };

        let ultralight = Arc::new(Mutex::new(None));

        Self {
            state,
            fps: FpsFeature::new(),
            crosshair: CrosshairFeature::new(ultralight.clone()),
            notifications: NotificationFeature::new(ultralight.clone(), dll_dir),
            ultralight,
            last_ul_update: Instant::now(),
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
        self.notifications.initialize(ctx, render_context);
        self.crosshair.initialize(ctx, render_context);
        
        info!("Initializing Overlay... (Exit)");
    }

    fn before_render<'a>(&'a mut self, ctx: &mut imgui::Context, render_context: &'a mut dyn hudhook::RenderContext) {
        // Update Ultralight Engine at max 60 FPS to prevent blocking the game thread
        let now = Instant::now();
        if now.duration_since(self.last_ul_update) >= Duration::from_millis(16) {
            if let Ok(mut ul_guard) = self.ultralight.lock() {
                if let Some(ul) = ul_guard.as_mut() {
                    ul.renderer.update();
                    ul.renderer.render();
                }
            }
            self.last_ul_update = now;
        }

        self.fps.before_render(ctx, render_context);
        self.notifications.before_render(ctx, render_context);
        self.crosshair.before_render(ctx, render_context);
    }

    fn render(&mut self, ui: &mut imgui::Ui) {
        static ONCE: std::sync::Once = std::sync::Once::new();
        ONCE.call_once(|| {
            info!("Render called for the first time!");
        });

        // Process notifications (drain them from state and send to Ultralight)
        if let Ok(mut state) = self.state.lock() {
            if !state.notifications.is_empty() {
                let notifications: Vec<_> = state.notifications.drain(..).collect();
                let mode = state.renderer.clone();
                for notif in notifications {
                    self.notifications.send_notification(notif, &mode);
                }
            }
        }

        if let Ok(state) = self.state.lock() {
            // Always render a dummy invisible window to prevent empty draw list issues
            // We use a tiny non-zero alpha to ensure it's not culled by optimization
            ui.window("Hidden")
                .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_INPUTS | imgui::WindowFlags::NO_BACKGROUND | imgui::WindowFlags::NO_NAV | imgui::WindowFlags::NO_FOCUS_ON_APPEARING)
                .size([10.0, 10.0], imgui::Condition::Always)
                .position([0.0, 0.0], imgui::Condition::Always)
                .bg_alpha(0.01) 
                .build(|| {
                    ui.text_colored([0.0, 0.0, 0.0, 0.01], ".");
                });

            if !state.enabled {
                return;
            }

            self.fps.render(ui, &state);
            self.notifications.render(ui, &state);
            self.crosshair.render(ui, &state);
        }
    }
}
