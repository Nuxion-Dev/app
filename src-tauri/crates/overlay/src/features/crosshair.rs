use hudhook::imgui;
use crate::state::OverlayState;
use super::OverlayFeature;

pub struct CrosshairFeature;

impl CrosshairFeature {
    pub fn new() -> Self {
        Self
    }
}

impl OverlayFeature for CrosshairFeature {
    fn render(&mut self, ui: &mut imgui::Ui, state: &OverlayState) {
        if !state.crosshair.enabled {
            return;
        }

        let io = ui.io();
        let [width, height] = io.display_size;

        let size = state.crosshair.size.max(1.0);
        let center_x = (width / 2.0) + state.crosshair.offset_x;
        let center_y = (height / 2.0) + state.crosshair.offset_y;
        
        let draw_list = ui.get_foreground_draw_list();

        if let Ok(color) = hex_color::HexColor::parse(&state.crosshair.color) {
            let color_u32 = imgui::ImColor32::from_rgba(color.r, color.g, color.b, color.a);
            
            // Check for specific crosshair types first
            if let Some(ctype) = &state.crosshair.crosshair_type {
                match ctype.as_str() {
                    "svg1" => {
                        // Cross with circle
                        let thickness = size * 0.15;
                        let half_size = size / 2.0;
                        draw_list.add_line(
                            [center_x - half_size, center_y],
                            [center_x + half_size, center_y],
                            color_u32
                        ).thickness(thickness).build();
                        draw_list.add_line(
                            [center_x, center_y - half_size],
                            [center_x, center_y + half_size],
                            color_u32
                        ).thickness(thickness).build();
                        // Circle in middle
                        draw_list.add_circle([center_x, center_y], size * 0.1, color_u32).filled(true).build();
                    },
                    "svg2" => {
                        // Hollow square / Scope
                        let half_size = size / 2.0;
                        let thickness = size * 0.1;
                        // Outer circle/corners
                        draw_list.add_rect(
                            [center_x - half_size, center_y - half_size],
                            [center_x + half_size, center_y + half_size],
                            color_u32
                        ).thickness(thickness).rounding(size * 0.2).build();
                        // Center dot
                        draw_list.add_circle([center_x, center_y], size * 0.1, color_u32).filled(true).build();
                    },
                    "svg3" => {
                        // Triangle / Hazard
                        let half_size = size / 2.0;
                        let p1 = [center_x, center_y - half_size];
                        let p2 = [center_x + half_size, center_y + half_size];
                        let p3 = [center_x - half_size, center_y + half_size];
                        draw_list.add_triangle(p1, p2, p3, color_u32).thickness(size * 0.1).build();
                        // Center dot
                        draw_list.add_circle([center_x, center_y], size * 0.1, color_u32).filled(true).build();
                    },
                    "svg4" => {
                        // Crosshair with gap
                        let half_size = size / 2.0;
                        let gap = size * 0.2;
                        let thickness = size * 0.1;
                        
                        // Top
                        draw_list.add_line([center_x, center_y - half_size], [center_x, center_y - gap], color_u32).thickness(thickness).build();
                        // Bottom
                        draw_list.add_line([center_x, center_y + half_size], [center_x, center_y + gap], color_u32).thickness(thickness).build();
                        // Left
                        draw_list.add_line([center_x - half_size, center_y], [center_x - gap, center_y], color_u32).thickness(thickness).build();
                        // Right
                        draw_list.add_line([center_x + half_size, center_y], [center_x + gap, center_y], color_u32).thickness(thickness).build();
                        
                        // Center dot
                        draw_list.add_circle([center_x, center_y], size * 0.05, color_u32).filled(true).build();
                    },
                    "svg5" => {
                        // Simple Dot
                        draw_list.add_circle([center_x, center_y], size / 2.0, color_u32).filled(true).build();
                    },
                    _ => {
                        // Fallback to grid if type is unknown or "grid"
                        if let Some(grid) = &state.crosshair.grid {
                            let rows = grid.len();
                            if rows > 0 {
                                let cols = grid[0].len();
                                let cell_size = size / (rows.max(cols) as f32);
                                
                                let grid_width = cols as f32 * cell_size;
                                let grid_height = rows as f32 * cell_size;
                                let start_x = center_x - (grid_width / 2.0);
                                let start_y = center_y - (grid_height / 2.0);

                                for (r, row) in grid.iter().enumerate() {
                                    for (c, &filled) in row.iter().enumerate() {
                                        if filled {
                                            let x = start_x + c as f32 * cell_size;
                                            let y = start_y + r as f32 * cell_size;
                                            draw_list.add_rect(
                                                [x, y],
                                                [x + cell_size, y + cell_size],
                                                color_u32
                                            ).filled(true).build();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else if let Some(grid) = &state.crosshair.grid {
                // Legacy/Custom grid support
                let rows = grid.len();
                if rows > 0 {
                    let cols = grid[0].len();
                    let cell_size = size / (rows.max(cols) as f32);
                    
                    let grid_width = cols as f32 * cell_size;
                    let grid_height = rows as f32 * cell_size;
                    let start_x = center_x - (grid_width / 2.0);
                    let start_y = center_y - (grid_height / 2.0);

                    for (r, row) in grid.iter().enumerate() {
                        for (c, &filled) in row.iter().enumerate() {
                            if filled {
                                let x = start_x + c as f32 * cell_size;
                                let y = start_y + r as f32 * cell_size;
                                draw_list.add_rect(
                                    [x, y],
                                    [x + cell_size, y + cell_size],
                                    color_u32
                                ).filled(true).build();
                            }
                        }
                    }
                }
            } else {
                draw_list.add_circle([center_x, center_y], size / 2.0, color_u32).filled(true).build();
            }
        }
    }
}
