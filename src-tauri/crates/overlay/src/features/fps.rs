use hudhook::imgui;
use crate::state::OverlayState;
use super::OverlayFeature;

pub struct FpsFeature {
    pub timer: f32,
    pub value: f32,
}

impl FpsFeature {
    pub fn new() -> Self {
        Self {
            timer: 0.0,
            value: 0.0,
        }
    }
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
        let font_scale = state.fps.size / 14.0;

        // Calculate size manually to avoid AutoResize issues with FontScale
        let text_size = ui.calc_text_size(&text);
        let window_w = (text_size[0] * font_scale) + (padding * 2.0);
        let window_h = (text_size[1] * font_scale) + (padding * 2.0);

        let bg_color = if let Ok(color) = hex_color::HexColor::parse(&state.fps.bg_color) {
            [color.r as f32 / 255.0, color.g as f32 / 255.0, color.b as f32 / 255.0, state.fps.bg_opacity]
        } else {
            [0.0, 0.0, 0.0, state.fps.bg_opacity]
        };

        let text_color = if let Ok(color) = hex_color::HexColor::parse(&state.fps.text_color) {
            [color.r as f32 / 255.0, color.g as f32 / 255.0, color.b as f32 / 255.0, 1.0]
        } else {
            [1.0, 1.0, 1.0, 1.0]
        };

        let _style_bg = ui.push_style_color(imgui::StyleColor::WindowBg, bg_color);
        let _style_text = ui.push_style_color(imgui::StyleColor::Text, text_color);
        let _style_padding = ui.push_style_var(imgui::StyleVar::WindowPadding([padding, padding]));
        let _style_min_size = ui.push_style_var(imgui::StyleVar::WindowMinSize([0.0, 0.0]));
        let _style_border = ui.push_style_var(imgui::StyleVar::WindowBorderSize(0.0));

        let (pos, pivot) = match state.fps.position.as_str() {
            "TopRight" => ([width - margin, margin], [1.0, 0.0]),
            "BottomLeft" => ([margin, height - margin], [0.0, 1.0]),
            "BottomRight" => ([width - margin, height - margin], [1.0, 1.0]),
            _ => ([margin, margin], [0.0, 0.0]), // TopLeft
        };

        ui.window("FPS")
            .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_INPUTS | imgui::WindowFlags::NO_MOVE | imgui::WindowFlags::NO_NAV | imgui::WindowFlags::NO_SCROLLBAR)
            .size([window_w, window_h], imgui::Condition::Always)
            .position(pos, imgui::Condition::Always)
            .position_pivot(pivot)
            .build(|| {
                ui.set_window_font_scale(font_scale);
                ui.text(text);
            });
    }
}
