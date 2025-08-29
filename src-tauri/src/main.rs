// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

extern crate dotenv_codegen;

use std::{ffi::CString, sync::Arc};

use declarative_discord_rich_presence::DeclarativeDiscordIpcClient;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder}, path::BaseDirectory, tray::TrayIconBuilder, AppHandle, Listener as _, Manager
};
use tauri_plugin_shell::{
    process::CommandChild,
    ShellExt,
};
use tauri_plugin_autostart::MacosLauncher;
use tokio::{spawn, sync::Mutex};
use lazy_static::lazy_static;

use crate::dxgi::clips::{AudioSource, CaptureConfig};

mod utils;
mod dxgi;

lazy_static! {
    static ref service: Arc<Mutex<Option<CommandChild>>> = Arc::new(Mutex::new(None));
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("failed to get main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_authium::init())
        .setup(|app| {
            utils::logger::init(app.handle());
            let handle = app.handle().clone();
            let app_data_dir = app.path().app_data_dir().unwrap();

            let quit = MenuItemBuilder::new("Quit").id("quit").build(app).unwrap();
            let menu = MenuBuilder::new(app).items(&[&quit]).build().unwrap();

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)
                .unwrap();

            let service_handle = handle.clone();
            let games_handle = handle.clone();
            spawn(async {
                utils::logger::log("Starting service");
                start_service(service_handle).await.expect("failed to start service");

                utils::game::check_games(games_handle).await;
            });

            let clips_path = app_data_dir.join("Clips");
            let clips_file = clips_path.join("clips.json");
            let clips_save_path = clips_path.join("saves");
            utils::fs::create_dir_if_not_exists(clips_path.to_str().unwrap());
            utils::fs::create_dir_if_not_exists(clips_save_path.to_str().unwrap());
            utils::fs::create_file_if_not_exists(clips_file.to_str().unwrap().to_string(), "[]".to_string());

            let client_id = std::env::var("DISCORD_CLIENT_ID").unwrap();
            let client = DeclarativeDiscordIpcClient::new(&client_id);
            app.manage(client);

            let overlay = app.get_webview_window("overlay").unwrap();
            overlay.show().unwrap();
            #[cfg(debug_assertions)]
            overlay.open_devtools();
            overlay.set_ignore_cursor_events(true).unwrap();
            overlay.set_skip_taskbar(true).unwrap();

            /*dxgi::clips::initialize_capture(CaptureConfig {
                fps: 60,
                clip_length: 15,
                audio_volume: 1.0,
                microphone_volume: 1.0,
                audio_mode: AudioSource::Desktop,
                capture_microphone: true,
                noise_suppression: true,
                clips_directory: make_buffer_from_str::<512>(clips_save_path.to_str().unwrap()),
                monitor_device_id: make_buffer_from_str::<256>("default"),
                microphone_device_id: make_buffer_from_str::<256>("default"),
            });*/

            let new_handle = handle.clone();
            app.listen("tauri://close-requested", move |_| {
                utils::logger::log("Close requested, stopping service");
                spawn(stop(new_handle.clone()));
            });

            let main_window = app.get_webview_window("main").unwrap();
            main_window.listen("tauri://close-requested", move |_| {
                utils::logger::log("Close requested, stopping service");
                spawn(stop(handle.clone()));
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            stop,
            is_dev,
            toggle_overlay,
            stop_service,
            utils::rpc::set_rpc,
            utils::rpc::rpc_toggle,
            utils::game::add_game,
            utils::game::get_games,
            utils::fs::read_file,
            utils::fs::write_file,
            utils::fs::write_file_buffer,
            utils::fs::create_dir,
            utils::fs::remove_dir,
            utils::fs::remove_file,
            utils::fs::rename_file,
            utils::fs::copy_file,
            utils::fs::exists,
            utils::fs::create_dir_if_not_exists,
            utils::fs::create_file_if_not_exists,

            //dxgi::clips::get_primary_hwnd_id
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn make_buffer_from_str<const N: usize>(s: &str) -> [u8; N] {
    let mut buf = [0u8; N];
    let c_str = CString::new(s).unwrap();
    let bytes = c_str.as_bytes_with_nul();

    let len = bytes.len().min(N);
    buf[..len].copy_from_slice(&bytes[..len]);
    buf
}

#[tauri::command]
async fn stop_service() -> Result<(), Error> {
    let mut s = service.lock().await;
    if let Some(child) = s.take() {
        let _ = child.kill();
        *s = None;
    }

    Ok(())
}

#[tauri::command]
async fn stop(handle: AppHandle) {
    let overlay = handle.get_webview_window("overlay").unwrap();

    handle.exit(0);
    overlay.close().unwrap();
    overlay.app_handle().exit(0);

    // stop the service
    let mut s = service.lock().await;
    if let Some(child) = s.take() {
        let _ = child.kill();
        *s = None;
    }
}

async fn start_service(handle: AppHandle) -> Result<(), Error> {
    if let Some(_) = service.lock().await.take() {
        return Ok(());
    }

    let path = handle
        .path()
        .resolve("bin/service.exe", BaseDirectory::Resource)
        .expect("failed to resolve path");
    
    let dir = std::env::current_exe()
        .expect("failed to get current exe")
        .parent()
        .expect("failed to get parent dir")
        .to_path_buf();
    
    let shell = handle.shell();
    let child = shell
        .command(path.to_str().unwrap())
        .current_dir(dir)
        .env("NUXION_TAURI_APP_START", "true")
        .spawn()
        .unwrap()
        .1;

    let mut s = service.lock().await;
    *s = Some(child);

    Ok(())
}
#[tauri::command]
async fn toggle_overlay(app: tauri::AppHandle, show: bool) -> Result<(), Error> {
    let overlay = app.get_webview_window("overlay").unwrap();
    if show {
        overlay.show().unwrap();
    } else {
        overlay.hide().unwrap();
    }
    Ok(())
}

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[tauri::command]
fn is_dev() -> bool {
    cfg!(debug_assertions)
}
