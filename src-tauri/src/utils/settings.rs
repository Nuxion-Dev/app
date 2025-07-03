use tauri::{AppHandle, Manager as _};

pub fn get_settings(app: AppHandle) -> serde_json::Value {
    let data_dir = app.path().app_data_dir().unwrap();
    let settings_file = data_dir.join("settings.json");
    let settings_str = crate::utils::fs::read_file(settings_file.to_str().unwrap().to_string()).unwrap();
    serde_json::from_str(&settings_str).unwrap()
}