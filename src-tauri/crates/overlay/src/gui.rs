use crate::state::{OverlayState, RendererMode};
use hudhook::ImguiRenderLoop;
use log::{info, error};
use std::sync::{Arc, Mutex};
use hudhook::imgui;

const UL_W: u32 = 400;
const UL_H: u32 = 420;

use crate::features::{OverlayFeature, fps::FpsFeature, crosshair::CrosshairFeature, notifications::NotificationFeature};
use crate::ultralight::{Ultralight, UltralightThread, UserCommand};

pub struct Overlay {
    pub state: Arc<Mutex<OverlayState>>,
    pub fps: FpsFeature,
    pub crosshair: CrosshairFeature,
    pub notifications: NotificationFeature,
    ul_thread: Option<UltralightThread>,
    ul_texture_id: Option<imgui::TextureId>,
    ul_pixel_buffer: Vec<u8>,
    /// Snapshot of state captured each before_render so render() holds no mutex.
    snapshot: OverlayState,
}

impl Overlay {
    pub fn new(state: Arc<Mutex<OverlayState>>) -> Self {
        let snapshot = state.lock().map(|s| s.clone()).unwrap_or_default();
        Self {
            state: state.clone(),
            fps: FpsFeature::new(),
            crosshair: CrosshairFeature::new(),
            notifications: NotificationFeature::new(),
            ul_thread: None,
            ul_texture_id: None,
            ul_pixel_buffer: Vec::new(),
            snapshot,
        }
    }
}

impl ImguiRenderLoop for Overlay {
    fn initialize<'a>(&'a mut self, ctx: &mut imgui::Context, rc: &'a mut dyn hudhook::RenderContext) {
        info!("Initializing Overlay...");

        // Disable imgui.ini disk writes (causes periodic stalls) and cursor changes.
        ctx.set_ini_filename(None);
        ctx.io_mut().mouse_draw_cursor = false;
        // Stop imgui from consuming mouse events in hudhook's WndProc — lets all
        // WM_MOUSEMOVE pass straight through to the game with zero imgui overhead.
        ctx.io_mut().config_flags |= imgui::ConfigFlags::NO_MOUSE;

        let (renderer, dll_dir) = {
            let s = self.state.lock().unwrap();
            (s.renderer.clone(), s.dll_dir.clone())
        };

        // Ultralight is only started when renderer=Ultralight (notification HTML).
        // The crosshair is now rendered via resvg (pure Rust, no background threads),
        // so Ultralight/JavaScriptCore is completely absent for renderer=Native users.
        if renderer == RendererMode::Ultralight {
            info!("Starting Ultralight for notification rendering: {}x{}...", UL_W, UL_H);
            if let Some(thread) = Ultralight::spawn_thread(dll_dir, UL_W, UL_H) {
                let html = include_str!("../assets/notification.html");
                let _ = thread.tx.send(UserCommand::LoadHtml(html.to_string()));
                let pixels = vec![0u8; (UL_W * UL_H * 4) as usize];
                match rc.load_texture(&pixels, UL_W, UL_H) {
                    Ok(tid) => { self.ul_texture_id = Some(tid); info!("Notification UL texture allocated."); }
                    Err(e) => error!("Failed to allocate notification UL texture: {:?}", e),
                }
                self.ul_thread = Some(thread);
            }
        }

        // Load Segoe UI for crisp, modern text (notifications, FPS counter).
        let font_path = std::path::Path::new(r"C:\Windows\Fonts\segoeui.ttf");
        let fallback_path = std::path::Path::new(r"C:\Windows\Fonts\arial.ttf");
        let chosen = if font_path.exists() { font_path } else { fallback_path };
        let font_data = std::fs::read(chosen).unwrap_or_default();
        let fonts = ctx.fonts();
        fonts.clear();
        fonts.add_font(&[imgui::FontSource::TtfData {
            data: &font_data,
            size_pixels: 16.0,
            config: Some(imgui::FontConfig {
                oversample_h: 4,
                oversample_v: 4,
                pixel_snap_h: false,
                ..Default::default()
            }),
        }]);

        self.fps.initialize(ctx, rc);
        self.notifications.initialize(ctx, rc);
        self.crosshair.initialize(ctx, rc);
    }

    fn before_render<'a>(&'a mut self, ctx: &mut imgui::Context, rc: &'a mut dyn hudhook::RenderContext) {
        self.fps.before_render(ctx, rc);

        // Lock briefly: drain pending notifications and snapshot state for render().
        // render() must never block on the mutex — it runs inside the Present hook.
        if let Ok(mut state) = self.state.lock() {
            self.notifications.update(&mut state);

            // Re-rasterize the crosshair SVG texture if type or color changed.
            // resvg runs synchronously here — no background threads, no JSC GC contention.
            self.crosshair.update_svg_texture(&state.crosshair, rc);

            // Update snapshot fields individually, reusing existing String heap allocations.
            // String::clone_from reuses buffer capacity when the new value fits — zero malloc
            // at steady state (color/type strings are stable short strings).
            let c = &state.crosshair;
            self.snapshot.enabled = state.enabled;
            self.snapshot.renderer = state.renderer.clone();
            self.snapshot.dll_dir.clone_from(&state.dll_dir);
            self.snapshot.crosshair.enabled = c.enabled;
            self.snapshot.crosshair.color.clone_from(&c.color);
            self.snapshot.crosshair.size = c.size;
            self.snapshot.crosshair.offset_x = c.offset_x;
            self.snapshot.crosshair.offset_y = c.offset_y;
            self.snapshot.crosshair.crosshair_type.clone_from(&c.crosshair_type);
            self.snapshot.crosshair.grid = None; // never needed for rendering
            let f = &state.fps;
            self.snapshot.fps.enabled = f.enabled;
            self.snapshot.fps.position.clone_from(&f.position);
            self.snapshot.fps.text_color.clone_from(&f.text_color);
            self.snapshot.fps.bg_color.clone_from(&f.bg_color);
            self.snapshot.fps.bg_opacity = f.bg_opacity;
            self.snapshot.fps.size = f.size;
            self.snapshot.fps.padding = f.padding;
            self.snapshot.fps.margin = f.margin;
            // notifications already drained above — snapshot keeps empty Vec
            // event_tx not needed in render path
        }

        // Upload UL notification view buffer when dirty (non-blocking try_lock).
        if let Some(thread) = &self.ul_thread {
            if let Ok(mut ul_state) = thread.state.try_lock() {
                if ul_state.dirty {
                    let len = ul_state.buffer.len();
                    if self.ul_pixel_buffer.len() != len { self.ul_pixel_buffer.resize(len, 0); }
                    self.ul_pixel_buffer.copy_from_slice(&ul_state.buffer);
                    ul_state.dirty = false;
                    if let Some(tid) = self.ul_texture_id {
                        let _ = rc.replace_texture(tid, &self.ul_pixel_buffer, UL_W, UL_H);
                    }
                }
            }
        }
    }

    fn render(&mut self, ui: &mut imgui::Ui) {
        // Field-disjoint borrows — no OverlayState::clone() at 1200 FPS.
        // Rust allows an immutable borrow of `snapshot` alongside mutable borrows
        // of unrelated fields (notifications, fps, crosshair) in the same struct.
        let Self { snapshot, notifications, fps, crosshair, ul_texture_id, .. } = self;

        // Native notifications always render regardless of renderer mode.
        notifications.render(ui, snapshot);

        if !snapshot.enabled { return; }

        // If UL texture is live, composite it over the notification area (bottom-right).
        if let Some(tid) = *ul_texture_id {
            let [sw, sh] = ui.io().display_size;
            let x0 = sw - UL_W as f32;
            let y0 = sh - UL_H as f32;
            ui.get_foreground_draw_list()
                .add_image(tid, [x0, y0], [sw, sh])
                .build();
        }

        fps.render(ui, snapshot);

        // Crosshair: CrosshairFeature renders SVG types via resvg texture,
        // and cross/grid/circle via imgui draw list primitives.
        if snapshot.crosshair.enabled {
            crosshair.render(ui, snapshot);
        }
    }

}