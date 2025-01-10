// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use declarative_discord_rich_presence::DeclarativeDiscordIpcClient;
use dotenv::dotenv;
use std::{
    process::{Child, Command},
    thread::spawn,
};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Listener, Manager,
};

mod integrations;
mod utils;

fn main() {
    dotenv().ok();
    spawn(integrations::spotify::main);
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
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

            app.listen("tauri://close-requested", move |_| {
                handle.exit(0);
            });

            let mut service: Option<Child> = None;
            //service = Some(Command::new("bin/service").env("NUXION_TAURI_APP_START", "true").spawn().expect("Failed to start Nuxion service"));

            let client = DeclarativeDiscordIpcClient::new("1261024461377896479");
            app.manage(client);

            let overlay = app.get_webview_window("overlay").unwrap();
            overlay.show().unwrap();
            #[cfg(debug_assertions)]
            overlay.open_devtools();
            let _ = overlay.set_ignore_cursor_events(true);

            if let Some(mut child) = service.take() {
                let _ = child.kill().expect("Failed to kill Nuxion service");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            utils::rpc::set_rpc,
            utils::rpc::rpc_toggle,
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
