use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OverlayCrosshairData {
    pub enabled: bool,
    pub color: String,
    pub size: f32,
    pub offset_x: f32,
    pub offset_y: f32,
    pub grid: Option<Vec<Vec<bool>>>,
    pub crosshair_type: Option<String>,
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
            crosshair_type: None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FpsConfig {
    pub enabled: bool,
    pub position: String, // "TopLeft", "TopRight", "BottomLeft", "BottomRight"
    pub text_color: String,
    pub bg_color: String,
    pub bg_opacity: f32,
    pub size: f32,
    pub padding: f32,
    pub margin: f32,
}

impl Default for FpsConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            position: "TopLeft".to_string(),
            text_color: "#FFFFFF".to_string(),
            bg_color: "#000000".to_string(),
            bg_opacity: 0.5,
            size: 14.0,
            padding: 5.0,
            margin: 10.0,
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
    UpdateFps(FpsConfig),
    ToggleOverlay(bool),
}

#[derive(Clone)]
pub struct OverlayState {
    pub enabled: bool,
    pub crosshair: OverlayCrosshairData,
    pub notifications: Vec<Notification>,
    pub fps: FpsConfig,
    pub dll_dir: Option<String>,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            enabled: true,
            crosshair: OverlayCrosshairData::default(),
            notifications: Vec::new(),
            fps: FpsConfig::default(),
            dll_dir: None,
        }
    }
}
