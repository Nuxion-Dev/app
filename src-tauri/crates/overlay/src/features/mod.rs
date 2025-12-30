use hudhook::imgui;
use crate::state::OverlayState;

pub trait OverlayFeature {
    fn initialize(&mut self, _context: &mut imgui::Context, _render_context: &mut dyn hudhook::RenderContext) {}
    fn before_render(&mut self, _context: &mut imgui::Context, _render_context: &mut dyn hudhook::RenderContext) {}
    fn render(&mut self, ui: &mut imgui::Ui, state: &OverlayState);
}

pub mod fps;
pub mod crosshair;
pub mod notifications;
