// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[macro_use]
extern crate dotenv_codegen;

use std::{ffi::CString, sync::Arc};

use declarative_discord_rich_presence::DeclarativeDiscordIpcClient;
use lazy_static::lazy_static;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    path::BaseDirectory,
    tray::TrayIconBuilder,
    AppHandle, Listener as _, Manager, WindowEvent,
};
use tauri_plugin_authium::AuthiumConfig;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_shell::{process::CommandChild, ShellExt};
use tokio::{spawn, sync::Mutex};

use crate::dxgi::clips::{CaptureConfig, dxgi_is_recording, dxgi_stop_recording};

//use crate::dxgi::clips::{AudioSource, CaptureConfig};

mod dxgi;
mod utils;

lazy_static! {
    static ref service: Arc<Mutex<Option<CommandChild>>> = Arc::new(Mutex::new(None));
}

async fn send_webhook(url: &str, content: &str) {
    let client = tauri_plugin_http::reqwest::Client::new();
    println!("Sending webhook");
    let res = client
        .post(url)
        .json(&serde_json::json!({
            "content": content
        }))
        .send()
        .await;
    println!("Webhook sent");
    if let Err(e) = res {
        eprintln!("failed to send webhook: {}", e);
    }

    println!("Webhook sent");
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_authium::init(Some(AuthiumConfig::new(
            dotenv!("AUTHIUM_API_KEY").into(),
            dotenv!("AUTHIUM_APP_ID").into(),
        ))))
        .setup(|app| {
            //utils::logger::init(app.handle());
            let handle = app.handle().clone();
            let app_data_dir = app.path().app_data_dir().unwrap();

            let show = MenuItemBuilder::new("Show").id("show").build(app).unwrap();
            let quit = MenuItemBuilder::new("Quit").id("quit").build(app).unwrap();
            let menu = MenuBuilder::new(app)
                .items(&[&show, &quit])
                .build()
                .unwrap();

            let main_window = app.get_webview_window("main").unwrap();
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        main_window.show().unwrap();
                    }
                    "quit" => {
                        spawn(stop(app.clone()));
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)
                .unwrap();

            let service_handle = handle.clone();
            let games_handle = handle.clone();
            spawn(async {
                //utils::logger::log("Starting service").unwrap();
                start_service(service_handle)
                    .await
                    .expect("failed to start service");

                utils::game::check_games(games_handle).await;
            });

            let new_handle = handle.clone();
            app.listen("tauri://close-requested", move |_| {
                spawn(stop(new_handle.clone()));
            });

            let client_id = dotenv!("DISCORD_CLIENT_ID");
            let client = DeclarativeDiscordIpcClient::new(&client_id);
            app.manage(client);

            let overlay = app.get_webview_window("overlay").unwrap();
            overlay.show().unwrap();
            #[cfg(debug_assertions)]
            overlay.open_devtools();
            overlay.set_ignore_cursor_events(true).unwrap();
            overlay.set_skip_taskbar(true).unwrap();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            stop,
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
            dxgi::clips::get_primary_hwnd_id,
            dxgi::clips::initialize_capture,
            dxgi::clips::update,
            dxgi::clips::dxgi_is_recording,
            dxgi::clips::save_clip,
            dxgi::clips::dxgi_stop_recording,
            dxgi::clips::dxgi_start_recording,
            utils::audio::get_microphones,
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

    if dxgi_is_recording() {
        dxgi_stop_recording();
    }

    // stop the service
    let mut s = service.lock().await;
    if let Some(child) = s.take() {
        let _ = child.kill();
        *s = None;
    }

    handle.exit(0);
    overlay.close().unwrap();
    overlay.app_handle().exit(0);
}

async fn start_service(handle: AppHandle) -> Result<(), Error> {
    if let Some(_) = service.lock().await.take() {
        return Ok(());
    }

    let path = handle
        .path()
        .resolve("bin/nuxion_service.exe", BaseDirectory::Resource)
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
        .spawn();
    if let Ok(child) = child {
        *service.lock().await = Some(child.1);
    } else {
        //utils::logger::err(&format!("Failed to start service: {}", child.err().unwrap())).unwrap();
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
