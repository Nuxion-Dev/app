use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

use sysinfo::{Pid, Process, RefreshKind, System};

use lazy_static::lazy_static;
#[derive(Debug)]
struct Game {
    name: String,
    pid: String,
}

lazy_static! {
    static ref RUNNING_GAMES: Mutex<Vec<Game>> = Mutex::new(Vec::new());
    static ref TIMESTAMP: Mutex<i64> = Mutex::new(0);
}

#[tauri::command]
pub async fn add_game(name: String, pid: String) {
    let mut games = RUNNING_GAMES.lock().await;
    games.push(Game { name, pid });

    let time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    *TIMESTAMP.lock().await = time;
}

pub async fn check_games(app: AppHandle) {
    let mut last_play = false;
    loop {
        let data_dir = app.path().app_data_dir().unwrap();
        let settings_file = data_dir.join("settings.json");
        let settings_str = crate::utils::fs::read_file(settings_file.to_str().unwrap().to_string()).unwrap();
        let settings: serde_json::Value = serde_json::from_str(&settings_str).unwrap();

        let mut games = RUNNING_GAMES.lock().await;
        let mut to_remove = Vec::new();
        let mut hide_crosshair = true;
        let ignored_games = settings["crosshair"]["ignoredGames"].as_array().unwrap();
        for game in games.iter() {
            if !is_running(&game.pid) {
                to_remove.push(game.name.clone());
            }

            if !ignored_games.iter().any(|x| x.as_str().unwrap() == game.name) {
                hide_crosshair = false;
            }            
        }
        for game in to_remove.iter() {
            games.retain(|x| x.name != *game);
        }

        if games.is_empty() && last_play {
            app.emit_to("main", "game:stop", {}).unwrap();
            app.emit_to("overlay", "show-crosshair", false).unwrap();
            last_play = false;
        }

        if !games.is_empty() {
            app.emit_to("overlay", "show-crosshair", hide_crosshair).unwrap();
            last_play = true;
        }

        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    }
}

pub fn is_running(pid_str: &str) -> bool {
    let pid: u32 = pid_str.parse::<u32>().unwrap();
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, false);
    sys.process(Pid::from_u32(pid)).is_some()
}

#[tauri::command]
pub async fn get_games() -> Vec<String> {
    let games = RUNNING_GAMES.lock().await;
    games.iter().map(|x| x.name.clone()).collect()
}