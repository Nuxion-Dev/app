use cpal::traits::{HostTrait, DeviceTrait};
use serde::Serialize;

#[derive(Serialize)]
pub struct Microphone {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub fn get_microphones() -> Vec<Microphone> {
    let mut microphones = Vec::new();

    let host = cpal::default_host();
    for device in host.input_devices().unwrap() {
        let name = device.name().unwrap_or("Unknown Microphone".to_string());
        let id = format!("{:?}", device.name().unwrap_or("unknown".to_string()));
        microphones.push(Microphone { id, name });
    }

    microphones
}
