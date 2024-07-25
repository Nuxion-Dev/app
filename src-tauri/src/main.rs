// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use declarative_discord_rich_presence::DeclarativeDiscordIpcClient;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager,
};

mod utils;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let quit = MenuItemBuilder::new("Quit").id("quit").build(app).unwrap();
            let menu = MenuBuilder::new(app).items(&[&quit]).build().unwrap();

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)
                .unwrap();

            let client = DeclarativeDiscordIpcClient::new("1261024461377896479");
            app.manage(client);

            // global shortcut
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

                /*let test_shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyI);

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move | _app, shortcut, event | {
                            println!("Global shortcut triggered: {:?}", shortcut);
                            if shortcut == &test_shortcut {
                                println!("Global registered shortcut triggered: {:?}", shortcut);
                            }
                        })
                        .build(),
                )?;

                app.global_shortcut().register(test_shortcut)?;*/
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            utils::rpc::set_rpc,
            utils::rpc::rpc_toggle,
            utils::fs::read_file,
            utils::fs::write_file,
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
