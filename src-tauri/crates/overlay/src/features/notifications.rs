use hudhook::imgui;
use crate::state::{OverlayState, Notification};
use super::OverlayFeature;
use log::info;
use std::time::Instant;

// Dimensions chosen to match the Next.js notification page:
//   Window 400px, container p-4 (16px each side) → card width = 368px
//   Card p-4, avatar h-10 w-10 (40px), items-start
//   Height: 16 (top-pad) + 40 (avatar) + 16 (bottom-pad) = 72px
const ANIM_SECS: f32 = 0.20; // matches page exit duration: 0.2s
const NOTIF_W: f32 = 368.0;
const NOTIF_H: f32 = 72.0;
const PAD: f32 = 16.0;      // p-4
const GAP: f32 = 8.0;       // gap between stacked cards
const AVA: f32 = 40.0;      // h-10 w-10
const AVA_GAP: f32 = 16.0;  // gap-4 between avatar and text
const MARGIN_R: f32 = 16.0;
const MARGIN_B: f32 = 20.0;
const ROUND: f32 = 8.0;     // rounded-lg

struct ActiveNotification {
    notification: Notification,
    created_at: Instant,
    leave_start: Option<Instant>,
}

pub struct NotificationFeature {
    active_notifications: Vec<ActiveNotification>,
}

/// Pack R, G, B (0–255) and A (0.0–1.0) into an imgui u32 color (0xAABBGGRR).
fn col(r: u8, g: u8, b: u8, a: f32) -> u32 {
    let a = (a.clamp(0.0, 1.0) * 255.0) as u8;
    ((a as u32) << 24) | ((b as u32) << 16) | ((g as u32) << 8) | r as u32
}

fn ease_out_cubic(t: f32) -> f32 { 1.0 - (1.0 - t).powi(3) }
fn ease_in_cubic(t: f32) -> f32 { t * t * t }

impl NotificationFeature {
    pub fn new() -> Self {
        Self {
            active_notifications: Vec::new(),
        }
    }

    fn push(&mut self, notification: Notification) {
        info!("Queuing native notification: {} – {}", notification.title, notification.message);
        self.active_notifications.push(ActiveNotification {
            notification,
            created_at: Instant::now(),
            leave_start: None,
        });
    }

    pub fn update(&mut self, state: &mut OverlayState) {
        if !state.notifications.is_empty() {
            info!("Processing {} pending notification(s)", state.notifications.len());
            for notif in state.notifications.drain(..) {
                self.push(notif);
            }
        }
    }
}

impl OverlayFeature for NotificationFeature {
    fn initialize(&mut self, _ctx: &mut imgui::Context, _rc: &mut dyn hudhook::RenderContext) {
        info!("Notification feature initialized (native imgui).");
    }

    fn before_render(&mut self, _ctx: &mut imgui::Context, _rc: &mut dyn hudhook::RenderContext) {}

    fn render(&mut self, ui: &mut imgui::Ui, _state: &OverlayState) {
        if self.active_notifications.is_empty() {
            return;
        }

        let now = Instant::now();
        let [sw, sh] = ui.io().display_size;

        // Arm leave animation for notifications whose display time has elapsed.
        for an in &mut self.active_notifications {
            if an.leave_start.is_none() {
                let elapsed = now.duration_since(an.created_at).as_secs_f32();
                let leave_at = (an.notification.duration - ANIM_SECS).max(ANIM_SECS);
                if elapsed >= leave_at {
                    an.leave_start = Some(now);
                }
            }
        }

        // Drop notifications whose leave animation has fully completed.
        self.active_notifications.retain(|an| {
            an.leave_start
                .map_or(true, |ls| now.duration_since(ls).as_secs_f32() < ANIM_SECS)
        });

        let count = self.active_notifications.len();

        // Measure text metrics before acquiring the draw list (which mutably borrows ui).
        let nx_size = ui.calc_text_size("NX");
        let line_h = ui.calc_text_size("A")[1];

        let draw = ui.get_foreground_draw_list();

        for (i, an) in self.active_notifications.iter().enumerate() {
            let elapsed = now.duration_since(an.created_at).as_secs_f32();

            // Newest notification sits at the bottom; older ones stack up.
            let stack_idx = (count - 1 - i) as f32;

            let enter_t = ease_out_cubic((elapsed / ANIM_SECS).min(1.0));
            let (leave_t, alpha_mult) = match an.leave_start {
                Some(ls) => {
                    let t = (now.duration_since(ls).as_secs_f32() / ANIM_SECS).min(1.0);
                    (ease_in_cubic(t), 1.0 - t)
                }
                None => (0.0, 1.0),
            };

            let alpha = enter_t * alpha_mult;
            // Slide in from the right (matches page: x: 50 → 0); slide back out on leave.
            let slide_x = ((1.0 - enter_t) + leave_t) * (NOTIF_W + MARGIN_R + 16.0);

            let x = sw - NOTIF_W - MARGIN_R + slide_x;
            let y = sh - MARGIN_B - stack_idx * (NOTIF_H + GAP) - NOTIF_H;

            // shadcn dark theme (matches page CSS variables):
            //   --background:      hsl(240 5.9% 10%)  ≈ rgb(24,  24,  27)
            //   --border:          hsl(240 3.7% 15.9%) ≈ rgb(39,  39,  46)
            //   --foreground:      hsl(0 0% 98%)       ≈ rgb(250, 250, 250)
            //   --muted-foreground: hsl(240 5% 64.9%)  ≈ rgb(161, 161, 170)
            let shadow  = col(0,   0,   0,   0.30 * alpha); // shadow-lg
            let bg      = col(24,  24,  27,  0.97 * alpha); // --background / bg-background
            let border  = col(39,  39,  46,  alpha);         // --border / border-border
            let ava_bg  = col(39,  39,  46,  alpha);         // AvatarFallback bg (muted)
            let ava_fg  = col(161, 161, 170, alpha);         // AvatarFallback text
            let title_c = col(250, 250, 250, alpha);         // font-semibold
            let desc_c  = col(161, 161, 170, alpha);         // text-muted-foreground

            // shadow-lg: offset rect drawn behind the card
            draw.add_rect(
                [x + 2.0, y + 6.0],
                [x + NOTIF_W + 2.0, y + NOTIF_H + 6.0],
                shadow,
            )
            .filled(true)
            .rounding(ROUND)
            .build();

            // Card background (bg-background with backdrop blur approximation)
            draw.add_rect([x, y], [x + NOTIF_W, y + NOTIF_H], bg)
                .filled(true)
                .rounding(ROUND)
                .build();

            // Card border (border-border)
            draw.add_rect([x, y], [x + NOTIF_W, y + NOTIF_H], border)
                .rounding(ROUND)
                .build();

            // Avatar box – items-start so top-aligned with card padding
            // Matches: <Avatar className="h-10 w-10 rounded-lg border">
            let ax = x + PAD;
            let ay = y + PAD;
            draw.add_rect([ax, ay], [ax + AVA, ay + AVA], ava_bg)
                .filled(true)
                .rounding(ROUND)
                .build();
            draw.add_rect([ax, ay], [ax + AVA, ay + AVA], border)
                .rounding(ROUND)
                .build();

            // "NX" fallback text centered in the avatar box
            let nx_x = ax + (AVA - nx_size[0]) / 2.0;
            let nx_y = ay + (AVA - nx_size[1]) / 2.0;
            draw.add_text([nx_x, nx_y], ava_fg, "NX");

            // Text area to the right of the avatar (gap-4 = 16px)
            // Matches: <div className="grid gap-1"> with title then description
            let tx = ax + AVA + AVA_GAP;
            let title_y = y + PAD;
            let desc_y  = title_y + line_h + 4.0; // gap-1 ≈ 4px

            draw.add_text([tx, title_y], title_c, &an.notification.title);
            draw.add_text([tx, desc_y],  desc_c,  &an.notification.message);
        }
    }
}
