// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[macro_use]
extern crate dotenv_codegen;

use declarative_discord_rich_presence::DeclarativeDiscordIpcClient;
use lazy_static::lazy_static;
use std::{
    os::windows::process::CommandExt,
    process::{Child, Command},
    sync::{Arc, Mutex},
};
use tauri::{
    State,
    menu::{MenuBuilder, MenuItemBuilder},
    path::BaseDirectory,
    tray::TrayIconBuilder,
    AppHandle, Listener, Manager, WebviewWindow,
};
use tokio::spawn;
use winreg::enums::*;
use winreg::RegKey;

mod integrations;
mod utils;

lazy_static! {
    static ref service: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    static ref service_fail_count: Arc<Mutex<u32>> = Arc::new(Mutex::new(0));
}

async fn send_webhook(url: &str, content: &str) {
    let client = tauri_plugin_http::reqwest::Client::new();
    let res = client
        .post(url)
        .json(&serde_json::json!({ "content": content }))
        .send()
        .await;
    if let Err(e) = res {
        eprintln!("failed to send webhook: {}", e);
    }
}

const TASK_NAME: &str = "NuxionAutoStart"; // Name for Task Scheduler

#[tauri::command]
fn enable_autostart() -> Result<(), String> {
    let exe_path = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;

    let exe_path_str = exe_path.to_string_lossy();
    let exe_dir_str = exe_dir.to_string_lossy();

    let _ = Command::new("schtasks")
        .args(&["/DELETE", "/TN", TASK_NAME, "/F"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .status();

    let status = Command::new("schtasks")
        .args(&[
            "/CREATE", "/SC", "ONLOGON", "/TN", TASK_NAME,
            "/TR", &format!("cmd /c cd /d \"{}\" && \"{}\"", exe_dir_str, exe_path_str),
            "/RL", "HIGHEST",
            "/F"
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .status()
        .map_err(|e| format!("Failed to create task: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err("Failed to enable autostart.".to_string())
    }
}

#[tauri::command]
fn disable_autostart() -> Result<(), String> {
    let status = Command::new("schtasks")
        .args(&["/DELETE", "/TN", TASK_NAME, "/F"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .status()
        .map_err(|e| format!("Failed to delete task: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err("Failed to disable autostart.".to_string())
    }
}

#[tauri::command]
fn is_autostart_enabled() -> Result<bool, String> {
    let status = Command::new("schtasks")
        .args(&["/QUERY", "/TN", TASK_NAME])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .map_err(|e| format!("Failed to check task: {}", e))?;

    Ok(status.status.success())
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    std::thread::spawn(integrations::spotify::main);
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("failed to get main window")
                .set_focus();
        }))
        /*.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))*/
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let data_dir = handle.path().app_data_dir().unwrap();
            let spotify_token_path = data_dir.join("spotify");
            if spotify_token_path.exists() {
                if let Some(path) = spotify_token_path.to_str() {
                    let token = utils::fs::read_file(path.to_string()).unwrap();
                    tokio::spawn(async move {
                        integrations::spotify::set_token(token).await;
                    });
                }
            }

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
            spawn(async {
                utils::game::check_games(games_handle).await;
            });

            let client = DeclarativeDiscordIpcClient::new("1261024461377896479");
            app.manage(client);

            let external_window = app.get_webview_window("external").unwrap();
            external_window.set_skip_taskbar(true).unwrap();
            external_window.hide().unwrap();

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
            is_dev,
            stop_service,
            start_service,
            is_autostart_enabled,
            enable_autostart,
            disable_autostart,
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

#[tauri::command]
fn start_service(handle: AppHandle) -> Result<(), Error> {
    if let Some(ref mut child) = *service.lock().unwrap() {
        return Ok(());
    }

    let mut fail_count = service_fail_count.lock().unwrap();
    if *fail_count > 5 {
        return Err(Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            "failed to start service",
        )));
    }

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
        .spawn();
    if let Err(e) = child {
        *fail_count += 1;
        if *fail_count > 5 {
            return Err(Error::Io(e));
        }

        return start_service(handle);
    }

    let child = child.unwrap();
    *service.lock().unwrap() = Some(child);

    start_service(handle)
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
