use hudhook::imgui;
use crate::state::OverlayState;
use super::OverlayFeature;

pub struct FpsFeature {
    pub timer: f32,
    pub value: f32,
}

impl FpsFeature {
    pub fn new() -> Self {
        Self { timer: 0.0, value: 0.0 }
    }
}

/// Pack r,g,b (0-255) and a (0.0-1.0) into imgui u32 color (0xAABBGGRR).
fn rgba(r: f32, g: f32, b: f32, a: f32) -> u32 {
    let r = (r * 255.0) as u8;
    let g = (g * 255.0) as u8;
    let b = (b * 255.0) as u8;
    let a = (a.clamp(0.0, 1.0) * 255.0) as u8;
    ((a as u32) << 24) | ((b as u32) << 16) | ((g as u32) << 8) | r as u32
}

impl OverlayFeature for FpsFeature {
    fn render(&mut self, ui: &mut imgui::Ui, state: &OverlayState) {
        if !state.fps.enabled {
            return;
        }

        let io = ui.io();
        let [width, height] = io.display_size;

        self.timer += io.delta_time;
        if self.timer >= 1.0 {
            self.value = io.framerate;
            self.timer = 0.0;
        }

        let text = format!("{:.0} FPS", self.value);
        let padding = state.fps.padding;
        let margin = state.fps.margin;

        let text_size = ui.calc_text_size(&text);
        let box_w = text_size[0] + padding * 2.0;
        let box_h = text_size[1] + padding * 2.0;

        // Resolve position from corner + margin
        let (bx, by) = match state.fps.position.as_str() {
            "TopRight"    => (width  - margin - box_w, margin),
            "BottomLeft"  => (margin,                  height - margin - box_h),
            "BottomRight" => (width  - margin - box_w, height - margin - box_h),
            _             => (margin,                  margin), // TopLeft
        };

        let bg_color = if let Ok(c) = hex_color::HexColor::parse(&state.fps.bg_color) {
            rgba(c.r as f32 / 255.0, c.g as f32 / 255.0, c.b as f32 / 255.0, state.fps.bg_opacity)
        } else {
            rgba(0.0, 0.0, 0.0, state.fps.bg_opacity)
        };

        let text_color = if let Ok(c) = hex_color::HexColor::parse(&state.fps.text_color) {
            rgba(c.r as f32 / 255.0, c.g as f32 / 255.0, c.b as f32 / 255.0, 1.0)
        } else {
            rgba(1.0, 1.0, 1.0, 1.0)
        };

        // Pure draw-list rendering — no imgui Window, no hit-testing, no WndProc overhead
        let draw = ui.get_foreground_draw_list();
        draw.add_rect([bx, by], [bx + box_w, by + box_h], bg_color)
            .filled(true)
            .build();
        draw.add_text([bx + padding, by + padding], text_color, &text);
    }
}
