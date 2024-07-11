// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, RunEvent, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

mod utils;

fn main() {
	let quit = CustomMenuItem::new("quit".to_string(), "Quit");
	let hide = CustomMenuItem::new("hide".to_string(), "Hide");
	let show = CustomMenuItem::new("show".to_string(), "Show");

	let tray_menu = SystemTrayMenu::new()
		.add_item(hide)
		.add_item(show)
		.add_native_item(SystemTrayMenuItem::Separator)
		.add_item(quit);
	
	let tray = SystemTray::new().with_menu(tray_menu);

	tauri::Builder::default()
		.system_tray(tray)
		.on_system_tray_event(|app, event| match event {
			SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
				"quit" => {
					app.exit(0);
				}
				"hide" => {
					let window = app.get_window("main").unwrap();
					window.hide().unwrap();
				}
				"show" => {
					let window = app.get_window("main").unwrap();
					window.show().unwrap();
				}
				_ => {}
			},
			_ => {}
		})
		.setup(|app| {
			let window = app.get_window("main").unwrap();
			window.show().unwrap();

			let handle = app.handle();
			let shortcut_manager = handle.global_shortcut_manager();

			/*shortcut_manager.register("CmdOrControl+Shift+D", move || {
				let window = handle.get_window("overlay").unwrap();
				window.show().unwrap();
			}).unwrap();*/
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			utils::rpc::set_rpc_activity,
			utils::rpc::rpc_toggle
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}