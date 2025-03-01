// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use declarative_discord_rich_presence::DeclarativeDiscordIpcClient;
use dotenv::{dotenv, var};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::{
    os::windows::process::CommandExt,
    process::{Child, Command},
    sync::{Arc, Mutex},
    thread::spawn,
};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    path::BaseDirectory,
    tray::TrayIconBuilder,
    AppHandle, Listener, Manager, WebviewWindow,
};

mod integrations;
mod utils;

lazy_static! {
    static ref service: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    spawn(integrations::spotify::main);
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("failed to get main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let handle = app.handle().clone();
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
            let games_handle = service_handle.clone();
            spawn(move || {
                start_service(service_handle).expect("failed to start service");
            });
            tokio::spawn(async {
                utils::game::check_games(games_handle).await;
            });

            let client = DeclarativeDiscordIpcClient::new("1261024461377896479");
            app.manage(client);

            let overlay = app.get_webview_window("overlay").unwrap();
            overlay.show().unwrap();
            #[cfg(debug_assertions)]
            overlay.open_devtools();
            overlay.set_ignore_cursor_events(true).unwrap();
            overlay.set_skip_taskbar(true).unwrap();

            // hide overlay tray icon
            let overlay_tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .build(overlay.app_handle())
                .unwrap();
            let _ = overlay_tray
                .set_visible(false)
                .expect("failed to hide tray icon");

            let overlay_clone = overlay.clone();
            let new_handle = handle.clone();
            app.listen("tauri://close-requested", move |_| {
                stop(new_handle.clone(), &overlay_clone);
            });

            let main_window = app.get_webview_window("main").unwrap();
            main_window.listen("tauri://close-requested", move |_| {
                stop(handle.clone(), &overlay);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            close_app,
            get_version,
            is_dev,
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
            integrations::spotify::spotify_login,
            integrations::spotify::connect,
            integrations::spotify::get_info,
            integrations::spotify::toggle_playback,
            integrations::spotify::next,
            integrations::spotify::previous,
            integrations::spotify::remove,
            integrations::spotify::set_time,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn close_app(handle: AppHandle) {
    let overlay = handle.get_webview_window("overlay").unwrap();

    stop(handle, &overlay);
}

#[tauri::command]
fn stop_service() -> Result<(), Error> {
    let mut s = service.lock().unwrap();
    if let Some(ref mut child) = *s {
        child.kill().unwrap();
    }

    Ok(())
}

fn stop(handle: AppHandle, overlay: &WebviewWindow) {
    handle.exit(0);
    overlay.close().unwrap();
    overlay.app_handle().exit(0);

    // stop the service
    let mut s = service.lock().unwrap();
    if let Some(ref mut child) = *s {
        child.kill().unwrap();
    }
}

fn start_service(handle: AppHandle) -> Result<(), Error> {
    let exe = handle
        .path()
        .resolve("bin", BaseDirectory::Resource)
        .expect("failed to resolve path");
    let path = exe.join("service.exe");
    let child = Command::new(path)
        .env("NUXION_TAURI_APP_START", "true")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .creation_flags(0x08000000)
        .spawn()
        .map_err(Error::Io)?;
    *service.lock().unwrap() = Some(child);

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

#[derive(Debug, Serialize, Deserialize)]
struct Version {
    version: String,
    build: i32,
}

#[tauri::command]
fn is_dev() -> bool {
    cfg!(debug_assertions)
}

#[tauri::command]
async fn get_version() -> Result<Version, Error> {
    // https request to  https://api.nuxion.org/v1/versions/latest
    let api_token = var("API_TOKEN").ok();
    if let Some(token) = api_token {
        let client = reqwest::Client::new();
        let res = client
            .get("https://api.nuxion.org/v1/versions/latest")
            .header(reqwest::header::AUTHORIZATION, format!("Bearer {}", token))
            .send()
            .await;
        match res {
            Ok(res) => {
                if res.status().is_success() {
                    let version = res.json::<Version>().await.unwrap();
                    return Ok(version);
                }
                
                Err(Error::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    res.text().await.unwrap(),
                )))
            }
            Err(e) => Err(Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string(),
            ))),
        }
    } else {
        Err(Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            "API_TOKEN not found",
        )))
    }
}