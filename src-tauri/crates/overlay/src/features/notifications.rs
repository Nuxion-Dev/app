use hudhook::imgui;
use crate::state::{OverlayState, Notification, RendererMode};
use super::OverlayFeature;
use std::sync::{Arc, Mutex};
use log::{info, error};
use crate::renderer_client::RendererClient;
use std::time::{Instant, Duration};

struct ActiveNotification {
    notification: Notification,
    created_at: Instant,
}

pub struct NotificationFeature {
    pub client: Arc<Mutex<Option<RendererClient>>>,
    pub active_until: Instant,
    active_notifications: Vec<ActiveNotification>,
}

impl NotificationFeature {
    pub fn new(client: Arc<Mutex<Option<RendererClient>>>) -> Self {
        Self {
            client,
            active_until: Instant::now(),
            active_notifications: Vec::new(),
        }
    }

    pub fn send_notification(&mut self, notification: Notification, mode: &RendererMode) {
        match mode {
            RendererMode::Ultralight => {
                // Extend active period
                let new_active_until = Instant::now() + Duration::from_secs_f32(notification.duration + 2.0);
                if new_active_until > self.active_until {
                    self.active_until = new_active_until;
                }
                
                if let Ok(mut client_guard) = self.client.lock() {
                    if let Some(client) = client_guard.as_mut() {
                        info!("Sending notification to JS: {} - {}", notification.title, notification.message);
                        let script = format!(
                            "if (window.addNotification) {{ addNotification('{}', '{}', '{}', {}); }} else {{ console.error('addNotification not found'); }}",
                            notification.id,
                            notification.title.replace("'", "\\'"),
                            notification.message.replace("'", "\\'"),
                            notification.duration
                        );
                        client.execute_script(&script);
                    } else {
                        error!("Cannot send notification: Renderer Client is None");
                    }
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

    pub fn update(&mut self, state: &mut OverlayState) {
        if !state.notifications.is_empty() {
             info!("Found {} pending notifications", state.notifications.len());
             for notif in state.notifications.drain(..) {
                 self.send_notification(notif, &state.renderer);
             }
        }
    }
}

impl OverlayFeature for NotificationFeature {
    fn initialize(&mut self, _context: &mut imgui::Context, _render_context: &mut dyn hudhook::RenderContext) {
        info!("Initializing Notification Feature (Unified)...");
    }

    fn before_render(&mut self, _context: &mut imgui::Context, _render_context: &mut dyn hudhook::RenderContext) {
        // We only manage native notifications here if necessary, but mostly we just push commands via send_notification
    }
    
    fn render(&mut self, _ui: &mut imgui::Ui, _state: &OverlayState) {
        // Native notifications rendering if mode is native
    }
}
