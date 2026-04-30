use hudhook::imgui;
use crate::state::{OverlayState, OverlayCrosshairData};
use super::OverlayFeature;
use log::{info, error};

const TEXTURE_SIZE: u32 = 256;

/// Produce a standalone SVG string for the given predefined crosshair type,
/// with `color_hex` applied as fill/stroke throughout the shape.
/// Returns `None` for non-SVG types (grid, cross, circle, etc.)
fn svg_source(svg_type: &str, color_hex: &str) -> Option<String> {
    let c = color_hex;
    // (viewBox, inner SVG content with USERCOLOR placeholder for stroke/fill)
    let (vb, inner): (&str, &str) = match svg_type {
        "svg1" => ("0 0 474.27 474.27", r#"<g><path d="M237.135,474.27c130.968,0,237.135-106.167,237.135-237.135S368.103,0,237.135,0S0,106.167,0,237.135S106.167,474.27,237.135,474.27z M60.639,200.556C75.197,130.212,130.87,74.742,201.32,60.485v65.557h73.157V60.81c69.727,14.753,124.7,69.914,139.161,139.746h-66.167v73.157h66.167c-14.453,69.833-69.434,124.993-139.161,139.746v-65.232H201.32v65.557c-70.45-14.266-126.123-69.727-140.681-140.072h66.167v-73.157H60.639z"/><circle cx="237.135" cy="237.135" r="18.964"/></g>"#),
        "svg2" => ("0 0 334.312 334.312", r#"<g><circle cx="167.156" cy="167.155" r="13.921"/><path d="M110.483,135.793c3.497,3.491,8.079,5.239,12.656,5.239s9.159-1.748,12.656-5.245c6.993-6.987,6.993-18.324,0-25.317L30.556,5.244c-6.993-6.987-18.318-6.987-25.311,0s-6.993,18.324,0,25.317L110.483,135.793z"/><path d="M211.173,141.038c4.583,0,9.159-1.748,12.656-5.239L329.067,30.561c6.993-6.993,6.993-18.324,0-25.317c-6.993-6.993-18.318-6.987-25.311,0L198.518,110.475c-6.993,6.993-6.993,18.324,0,25.317C202.014,139.289,206.591,141.038,211.173,141.038z"/><path d="M303.755,329.066c3.497,3.491,8.079,5.239,12.656,5.239s9.159-1.748,12.656-5.245c6.993-6.987,6.993-18.324,0-25.317L223.829,198.517c-6.993-6.987-18.318-6.987-25.311,0s-6.993,18.324,0,25.317L303.755,329.066z"/><path d="M17.901,334.311c4.583,0,9.159-1.748,12.656-5.239L135.794,223.84c6.993-6.993,6.993-18.324,0-25.317s-18.318-6.987-25.311,0L5.245,303.748c-6.993,6.993-6.993,18.324,0,25.317C8.741,332.562,13.324,334.311,17.901,334.311z"/></g>"#),
        "svg3" => ("0 0 358.012 358.012", r#"<g><polygon points="274.303,52.983 274.303,88.784 322.211,88.784 322.211,269.228 274.303,269.228 274.303,305.029 358.012,305.029 358.012,52.983"/><polygon points="35.801,88.784 83.709,88.784 83.709,52.983 0,52.983 0,305.029 83.709,305.029 83.709,269.228 35.801,269.228"/><rect x="167.072" y="90.968" width="23.867" height="54.466"/><polygon points="304.31,193.515 304.31,169.647 274.303,169.647 217.564,169.647 217.564,193.515 274.303,193.515"/><rect x="167.072" y="211.749" width="23.867" height="54.466"/><polygon points="53.702,169.647 53.702,193.515 83.709,193.515 140.448,193.515 140.448,169.647 83.709,169.647"/></g>"#),
        "svg4" => ("0 0 477.554 477.554", r#"<g><path d="M267.227,12.193c0-6.73-21.72-12.193-28.45-12.193s-28.45,5.462-28.45,12.193l16.257,180.861c0,6.73,5.462,12.193,12.193,12.193s12.193-5.462,12.193-12.193L267.227,12.193z"/><path d="M272.307,238.777c0,6.73,5.462,12.193,12.193,12.193l180.861,8.129c6.73,0,12.193-13.591,12.193-20.321s-5.462-20.321-12.193-20.321L284.5,226.584C277.77,226.584,272.307,232.046,272.307,238.777z"/><path d="M238.777,477.554c6.73,0,28.45-5.462,28.45-12.193L250.97,284.5c0-6.73-5.462-12.193-12.193-12.193s-12.193,5.462-12.193,12.193l-16.257,180.861C210.327,472.091,232.046,477.554,238.777,477.554z"/><path d="M0,238.777c0,6.73,5.462,20.321,12.193,20.321l180.861-8.129c6.73,0,12.193-5.462,12.193-12.193s-5.462-12.193-12.193-12.193l-180.861-8.129C5.462,218.455,0,232.046,0,238.777z"/><circle cx="238.777" cy="238.777" r="9.657"/></g>"#),
        "svg5" => ("0 0 48 48", r#"<g><circle cx="24" cy="24" r="20"/></g>"#),
        "svg6" => ("0 0 100 100", r#"<g><path d="M50 1 A49 49 0 0 1 99 50 L86 50 A36 36 0 0 0 50 14 Z M99 50 A49 49 0 0 1 50 99 L50 86 A36 36 0 0 0 86 50 Z M50 99 A49 49 0 0 1 1 50 L14 50 A36 36 0 0 0 50 86 Z M1 50 A49 49 0 0 1 50 1 L50 14 A36 36 0 0 0 14 50 Z"/><path d="M32 32 H68 V68 H32 Z"/><path d="M47 14 H53 V36 H47 Z M47 64 H53 V86 H47 Z M14 47 H36 V53 H14 Z M64 47 H86 V53 H64 Z"/><circle cx="50" cy="50" r="4"/></g>"#),
        // svg7-svg9 use explicit fill/stroke attributes (no inheritance needed)
        "svg7" => ("0 0 100 100", r#"<g fill="none"><circle cx="50" cy="50" r="4.5" fill="USERCOLOR" stroke="none"/><circle cx="50" cy="50" r="20" stroke="USERCOLOR" stroke-width="3.5"/><circle cx="50" cy="50" r="42" stroke="USERCOLOR" stroke-width="3.5"/><g stroke="USERCOLOR" stroke-width="7" stroke-linecap="butt"><path d="M50 0 V11 M50 89 V100 M0 50 H11 M89 50 H100"/><path d="M14.5 14.5 L22 22 M78 78 L85.5 85.5 M14.5 85.5 L22 78 M78 14.5 L85.5 22"/></g></g>"#),
        "svg8" => ("0 0 100 100", r#"<g fill="none"><path d="M30 15 H15 V30 M70 15 H85 V30 M30 85 H15 V70 M70 85 H85 V70" stroke="USERCOLOR" stroke-width="8" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M50 28 V72 M28 50 H72" stroke="USERCOLOR" stroke-width="6" stroke-linecap="butt"/><rect x="44" y="44" width="12" height="12" fill="USERCOLOR" stroke="none" transform="rotate(45 50 50)"/></g>"#),
        "svg9" => ("0 0 100 100", r#"<g stroke-linecap="round" stroke-linejoin="round"><path d="M50 6 L94 50 L50 94 L6 50 Z" fill="USERCOLOR" stroke="none"/><rect x="34" y="34" width="32" height="32" rx="4" ry="4" fill="none" stroke="USERCOLOR" stroke-width="4"/><circle cx="50" cy="50" r="9" fill="none" stroke="USERCOLOR" stroke-width="2.5"/><path d="M44 50 H56 M50 44 V56" fill="none" stroke="USERCOLOR" stroke-width="2.5"/></g>"#),
        _ => return None,
    };
    let inner = inner.replace("USERCOLOR", c);
    Some(format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="{c}" color="{c}">{inner}</svg>"#
    ))
}

/// Rasterize an SVG string into a TEXTURE_SIZE×TEXTURE_SIZE RGBA byte vec.
fn rasterize_svg(svg_str: &str) -> Option<Vec<u8>> {
    use resvg::usvg;
    use resvg::tiny_skia;

    let options = usvg::Options::default();
    let tree = usvg::Tree::from_str(svg_str, &options).ok()?;

    let mut pixmap = tiny_skia::Pixmap::new(TEXTURE_SIZE, TEXTURE_SIZE)?;

    // All crosshair SVGs have square viewboxes; scale to fill the pixmap.
    let svg_w = tree.size().width();
    let scale = TEXTURE_SIZE as f32 / svg_w;
    let transform = tiny_skia::Transform::from_scale(scale, scale);

    resvg::render(&tree, transform, &mut pixmap.as_mut());
    Some(pixmap.take())
}

pub struct CrosshairFeature {
    /// GPU texture for rasterized SVG crosshairs. Uploaded once per config change.
    texture_id: Option<imgui::TextureId>,
    /// Tracks last (type, color) so we only re-rasterize on actual changes.
    last_key: Option<(String, String)>,
}

impl CrosshairFeature {
    pub fn new() -> Self {
        Self { texture_id: None, last_key: None }
    }

    /// Called from `Overlay::before_render` while holding the state lock.
    /// Re-rasterizes and uploads the SVG texture only when type or color changes.
    pub fn update_svg_texture(&mut self, cfg: &OverlayCrosshairData, rc: &mut dyn hudhook::RenderContext) {
        let svg_type = cfg.crosshair_type.as_deref().unwrap_or("svg1");
        if !svg_type.starts_with("svg") {
            return; // native draw-list types — nothing to rasterize
        }

        let key = (svg_type.to_string(), cfg.color.clone());
        if self.last_key.as_ref() == Some(&key) {
            return; // unchanged
        }

        let Some(svg_str) = svg_source(svg_type, &cfg.color) else { return; };
        let Some(pixels) = rasterize_svg(&svg_str) else {
            error!("resvg: failed to rasterize crosshair type={}", svg_type);
            return;
        };

        match self.texture_id {
            Some(tid) => {
                if let Err(e) = rc.replace_texture(tid, &pixels, TEXTURE_SIZE, TEXTURE_SIZE) {
                    error!("replace_texture failed: {:?}", e);
                    return;
                }
            }
            None => {
                match rc.load_texture(&pixels, TEXTURE_SIZE, TEXTURE_SIZE) {
                    Ok(tid) => {
                        info!("Crosshair SVG texture allocated (resvg).");
                        self.texture_id = Some(tid);
                    }
                    Err(e) => {
                        error!("load_texture failed: {:?}", e);
                        return;
                    }
                }
            }
        }

        self.last_key = Some(key);
        info!("Crosshair texture updated: type={} color={}", svg_type, cfg.color);
    }
}

fn parse_hex_color(hex: &str) -> (u8, u8, u8) {
    let hex = hex.trim_start_matches('#');
    if hex.len() < 6 { return (0, 255, 0); }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255);
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
    (r, g, b)
}

fn col(r: u8, g: u8, b: u8, a: u8) -> u32 {
    ((a as u32) << 24) | ((b as u32) << 16) | ((g as u32) << 8) | r as u32
}

impl OverlayFeature for CrosshairFeature {
    fn initialize(&mut self, _ctx: &mut imgui::Context, _rc: &mut dyn hudhook::RenderContext) {
        info!("Crosshair feature initialized (resvg + native imgui fallback).");
    }

    fn render(&mut self, ui: &mut imgui::Ui, state: &OverlayState) {
        if !state.crosshair.enabled { return; }

        let cfg = &state.crosshair;
        let [sw, sh] = ui.io().display_size;
        let cx = sw / 2.0 + cfg.offset_x;
        let cy = sh / 2.0 + cfg.offset_y;
        let (r, g, b) = parse_hex_color(&cfg.color);
        let color = col(r, g, b, 255);
        let size = cfg.size;
        let draw = ui.get_foreground_draw_list();
        let svg_type = cfg.crosshair_type.as_deref().unwrap_or("svg1");

        if svg_type.starts_with("svg") {
            // Composite the resvg-rasterized texture, scaled to the user's size setting.
            if let Some(tid) = self.texture_id {
                let half = size / 2.0;
                draw.add_image(tid, [cx - half, cy - half], [cx + half, cy + half]).build();
            }
            return;
        }

        match svg_type {
            "cross" => {
                let half = size / 2.0;
                draw.add_line([cx, cy - half], [cx, cy + half], color).thickness(2.0).build();
                draw.add_line([cx - half, cy], [cx + half, cy], color).thickness(2.0).build();
            }
            "grid" => {
                if let Some(grid) = &cfg.grid {
                    let rows = grid.len();
                    if rows == 0 { return; }
                    let cols = grid[0].len();
                    if cols == 0 { return; }
                    let cell = size / cols as f32;
                    let ox = cx - size / 2.0;
                    let oy = cy - (rows as f32 * cell) / 2.0;
                    for (ri, row) in grid.iter().enumerate() {
                        for (ci, &on) in row.iter().enumerate() {
                            if on {
                                let tx = ox + ci as f32 * cell;
                                let ty = oy + ri as f32 * cell;
                                draw.add_rect([tx, ty], [tx + cell, ty + cell], color)
                                    .filled(true).build();
                            }
                        }
                    }
                }
            }
            _ => {
                // Default: circle outline
                draw.add_circle([cx, cy], size / 2.0, color).thickness(2.0).build();
            }
        }
    }
}
