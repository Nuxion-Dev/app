// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[macro_use]
extern crate dotenv_codegen;

use std::sync::Arc;

use declarative_discord_rich_presence::DeclarativeDiscordIpcClient;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder}, path::BaseDirectory, tray::TrayIconBuilder, AppHandle, Emitter, Listener as _, Manager, RunEvent
};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use tauri_plugin_autostart::MacosLauncher;
use tokio::{spawn, sync::Mutex};
use lazy_static::lazy_static;

mod utils;
mod clips;

lazy_static! {
    static ref service: Arc<Mutex<Option<CommandChild>>> = Arc::new(Mutex::new(None));
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
            let games_handle = handle.clone();
            spawn(async {
                start_service(service_handle).await.expect("failed to start service");

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

            let new_handle = handle.clone();
            app.listen("tauri://close-requested", move |_| {
                spawn(stop(new_handle.clone()));
            });

            let main_window = app.get_webview_window("main").unwrap();
            main_window.listen("tauri://close-requested", move |_| {
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
            utils::fs::create_file_if_not_exists
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
