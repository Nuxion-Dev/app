use hudhook::imgui;
use crate::state::{OverlayState, Notification, RendererMode};
use super::OverlayFeature;
use std::sync::{Arc, Mutex};
use log::{info, error};
use ul_next::{View, view::ViewConfig};
use crate::ultralight::{Ultralight, SafeView};
use std::time::{Instant, Duration};

struct ActiveNotification {
    notification: Notification,
    created_at: Instant,
}

pub struct NotificationFeature {
    pub ultralight: Arc<Mutex<Option<Ultralight>>>,
    pub view: Option<SafeView>,
    pub texture_id: Option<imgui::TextureId>,
    pub width: u32,
    pub height: u32,
    pub dll_dir: Option<String>,
    pub active_until: Instant,
    pub last_texture_update: Instant,
    active_notifications: Vec<ActiveNotification>,
}

impl NotificationFeature {
    pub fn new(ultralight: Arc<Mutex<Option<Ultralight>>>, dll_dir: Option<String>) -> Self {
        Self {
            ultralight,
            view: None,
            texture_id: None,
            width: 400,
            height: 600,
            dll_dir,
            active_until: Instant::now(),
            last_texture_update: Instant::now(),
            active_notifications: Vec::new(),
        }
    }

    pub fn send_notification(&mut self, notification: Notification, mode: &RendererMode) {
        match mode {
            RendererMode::Ultralight => {
                // Extend active period: duration + 2.0s for fade out/in and to prevent freezing at the end
                self.active_until = Instant::now() + Duration::from_secs_f32(notification.duration + 2.0);
                
                if let Some(view) = &self.view {
                    info!("Sending notification to JS: {} - {}", notification.title, notification.message);
                    let script = format!(
                        "if (window.addNotification) {{ addNotification('{}', '{}', '{}', {}); }} else {{ console.error('addNotification not found'); }}",
                        notification.id,
                        notification.title.replace("'", "\\'"),
                        notification.message.replace("'", "\\'"),
                        notification.duration
                    );
                    match view.evaluate_script(&script) {
                        Ok(_) => info!("Notification script evaluated successfully"),
                        Err(e) => error!("Failed to evaluate notification script: {:?}", e),
                    }
                } else {
                    error!("Cannot send notification: View is None");
                }
            },
            RendererMode::Native => {
                self.active_notifications.push(ActiveNotification {
                    notification,
                    created_at: Instant::now(),
                });
            },
            RendererMode::Legacy => {
                // Legacy mode does not support notifications
            },
        }
    }
}

impl OverlayFeature for NotificationFeature {
    fn initialize(&mut self, _context: &mut imgui::Context, render_context: &mut dyn hudhook::RenderContext) {
        info!("Initializing Notification Feature...");

        // Initialize Ultralight if not already initialized
        {
            let mut ul_guard = self.ultralight.lock().unwrap();
            if ul_guard.is_none() {
                *ul_guard = Ultralight::new(self.dll_dir.clone());
            }
        }

        let ul_guard = self.ultralight.lock().unwrap();
        if let Some(ul) = ul_guard.as_ref() {
            let view_config = ViewConfig::start()
                .is_transparent(true)
                .build(ul.lib.clone())
                .unwrap();

            info!("Creating Notification View...");
            if let Some(view) = ul.renderer.create_view(self.width, self.height, &view_config, None) {
                let html = include_str!("../../assets/notification.html");
                let _ = view.load_html(html);
                self.view = Some(SafeView(view));
                info!("Notification View created.");
            } else {
                error!("Failed to create Notification View");
            }
        }

        if self.view.is_some() {
            let initial_pixels = vec![0u8; (self.width * self.height * 4) as usize];
            match render_context.load_texture(&initial_pixels, self.width, self.height) {
                Ok(id) => {
                    self.texture_id = Some(id);
                    info!("Notification Texture Created: {:?}", id);
                },
                Err(e) => error!("Failed to create notification texture: {:?}", e),
            }
        }
    }

    fn before_render(&mut self, _context: &mut imgui::Context, render_context: &mut dyn hudhook::RenderContext) {
        let now = Instant::now();
        
        // Only update texture if we are within the active period
        if now > self.active_until {
            return;
        }

        // Cap update rate to ~30 FPS (33ms) to save bandwidth
        if now.duration_since(self.last_texture_update) < Duration::from_millis(33) {
            return;
        }

        if let (Some(view), Some(texture_id)) = (&mut self.view, self.texture_id) {
            if let Some(mut surface) = view.surface() {
                if let Some(pixels_guard) = surface.lock_pixels() {
                     if let Err(e) = render_context.replace_texture(texture_id, &pixels_guard, self.width, self.height) {
                         error!("Failed to replace notification texture: {:?}", e);
                     } else {
                         self.last_texture_update = now;
                     }
                }
            }
        }
    }

    fn render(&mut self, ui: &mut imgui::Ui, state: &OverlayState) {
        match state.renderer {
            RendererMode::Ultralight => {
                if let Some(texture_id) = self.texture_id {
                    let io = ui.io();
                    let [width, height] = io.display_size;

                    ui.window("UltralightOverlay")
                        .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_INPUTS | imgui::WindowFlags::NO_BACKGROUND | imgui::WindowFlags::NO_NAV)
                        .size([self.width as f32, self.height as f32], imgui::Condition::Always)
                        .position([width - 420.0, height - 620.0], imgui::Condition::Always)
                        .bg_alpha(0.0)
                        .build(|| {
                            imgui::Image::new(texture_id, [self.width as f32, self.height as f32]).build(ui);
                        });
                }
            },
            RendererMode::Native => {
                // Clean up expired notifications
                self.active_notifications.retain(|n| n.created_at.elapsed().as_secs_f32() < n.notification.duration);

                let io = ui.io();
                let [width, height] = io.display_size;
                let mut y_pos = height - 50.0; // Start from bottom

                // Push styles for the notification cards
                let _style_rounding = ui.push_style_var(imgui::StyleVar::WindowRounding(8.0));
                let _style_border = ui.push_style_var(imgui::StyleVar::WindowBorderSize(1.0));
                let _style_padding = ui.push_style_var(imgui::StyleVar::WindowPadding([12.0, 12.0]));
                
                let _color_bg = ui.push_style_color(imgui::StyleColor::WindowBg, [0.05, 0.05, 0.05, 0.85]); // Dark background, slight transparency
                let _color_border = ui.push_style_color(imgui::StyleColor::Border, [0.2, 0.2, 0.2, 1.0]); // Subtle border

                for active in &self.active_notifications {
                    let notif = &active.notification;
                    let elapsed = active.created_at.elapsed().as_secs_f32();
                    
                    // Animation: Slide in/out and Fade
                    let (alpha, x_offset) = if elapsed < 0.3 {
                        // Entry: Fade in + Slide from right
                        let t = elapsed / 0.3;
                        (t, (1.0 - t) * 50.0)
                    } else if elapsed > notif.duration - 0.3 {
                        // Exit: Fade out
                        let t = (notif.duration - elapsed) / 0.3;
                        (t, 0.0)
                    } else {
                        (1.0, 0.0)
                    };

                    let window_name = format!("Notification_{}", notif.id);
                    let size = [320.0, 80.0]; // Increased height for wrapped text
                    y_pos -= size[1] + 10.0; // Stack upwards

                    // Enable inputs for click detection
                    ui.window(&window_name)
                        .flags(imgui::WindowFlags::NO_DECORATION | imgui::WindowFlags::NO_NAV | imgui::WindowFlags::NO_FOCUS_ON_APPEARING)
                        .size(size, imgui::Condition::Always)
                        .position([width - size[0] - 20.0 + x_offset, y_pos], imgui::Condition::Always)
                        .bg_alpha(0.85 * alpha) // Apply fade alpha
                        .build(|| {
                            // Click detection
                            if ui.is_window_hovered() && ui.is_mouse_clicked(imgui::MouseButton::Left) {
                                if let Some(path) = &notif.action_path {
                                    info!("Notification clicked! Path: {}", path);
                                    if let Some(tx) = &state.event_tx {
                                        let _ = tx.send(crate::state::OverlayEvent::NotificationClicked(notif.id.clone()));
                                    }
                                }
                            }

                            // Avatar Placeholder
                            let draw_list = ui.get_window_draw_list();
                            let p = ui.cursor_screen_pos();
                            
                            // Draw rounded rect for avatar background
                            let avatar_size = 40.0;
                            draw_list.add_rect_filled_multicolor(
                                p, 
                                [p[0] + avatar_size, p[1] + avatar_size], 
                                [0.2, 0.2, 0.2, alpha], // Top Left
                                [0.2, 0.2, 0.2, alpha], // Top Right
                                [0.15, 0.15, 0.15, alpha], // Bottom Right
                                [0.15, 0.15, 0.15, alpha]  // Bottom Left
                            );
                            
                            // Draw "NX" text in avatar
                            // Centering text roughly
                            draw_list.add_text(
                                [p[0] + 10.0, p[1] + 12.0], 
                                [0.8, 0.8, 0.8, alpha], 
                                "NX"
                            );

                            // Move cursor past avatar
                            ui.set_cursor_pos([ui.cursor_pos()[0] + avatar_size + 12.0, ui.cursor_pos()[1]]);

                            // Text Content Group
                            ui.group(|| {
                                ui.text_colored([1.0, 1.0, 1.0, alpha], &notif.title);
                                
                                // Wrapped Message
                                let _wrap = ui.push_text_wrap_pos();
                                ui.text_colored([0.7, 0.7, 0.7, alpha], &notif.message);
                                // _wrap is dropped here, popping the wrap pos
                            });
                        });
                }
                
                // Pop styles (automatically handled by Drop, but good practice to be explicit if scopes were different)
                // In Rust imgui-rs, StyleVar/Color tokens pop on drop.
            },
            RendererMode::Legacy => {
                // Legacy mode does not support notifications
            },
        }
    }
}
