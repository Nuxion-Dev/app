use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OverlayCrosshairData {
    pub enabled: bool,
    pub color: String,
    pub size: f32,
    pub offset_x: f32,
    pub offset_y: f32,
    pub grid: Option<Vec<Vec<bool>>>,
}

impl Default for OverlayCrosshairData {
    fn default() -> Self {
        Self {
            enabled: false,
            color: "#00FF00".to_string(),
            size: 20.0,
            offset_x: 0.0,
            offset_y: 0.0,
            grid: None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub message: String,
    pub duration: f32,
    pub elapsed: f32,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum Command {
    UpdateCrosshair(OverlayCrosshairData),
    ShowNotification(Notification),
}

#[derive(Default, Clone)]
pub struct OverlayState {
    pub crosshair: OverlayCrosshairData,
    pub notifications: Vec<Notification>,
}
