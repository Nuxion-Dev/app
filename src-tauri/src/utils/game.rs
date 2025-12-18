use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

use sysinfo::{Pid, System};

use lazy_static::lazy_static;

use crate::utils::settings::get_settings;
#[derive(Debug)]
struct Game {
    id: String,
    name: String,
    pid: String,
}

lazy_static! {
    static ref RUNNING_GAMES: Mutex<Vec<Game>> = Mutex::new(Vec::new());
    static ref TIMESTAMP: Mutex<i64> = Mutex::new(0);
}

#[tauri::command]
pub async fn add_game(app: AppHandle, id: String, name: String, pid: String) {
    //println!("DEBUG: add_game called for {} (PID: {})", name, pid);
    let mut games = RUNNING_GAMES.lock().await;
    games.push(Game { id: id.clone(), name, pid });

    let time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    *TIMESTAMP.lock().await = time;

    // Check if we should show crosshair immediately
    let settings = get_settings(app.clone());
    let ignored_games = settings["crosshair"]["ignoredGames"].as_array();
    
    let is_ignored = if let Some(ignored) = ignored_games {
        ignored.iter().any(|x| x.as_str().unwrap_or("") == id)
    } else {
        false
    };

    if !is_ignored {
        //println!("DEBUG: Game not ignored, showing crosshair");
        app.emit_to("overlay", "show-crosshair", true).unwrap();
    } else {
        //println!("DEBUG: Game is ignored");
    }
}

pub async fn check_games(app: AppHandle) {
    let mut last_play = false;
    //println!("DEBUG: check_games loop started");
    loop {
        let settings = get_settings(app.clone());

        let mut games = RUNNING_GAMES.lock().await;
        let mut to_remove = Vec::new();
        let mut hide_crosshair = true;
        let ignored_games = settings["crosshair"]["ignoredGames"].as_array();
        
        for game in games.iter() {
            if !is_running(&game.pid) {
                //println!("DEBUG: Game {} (PID: {}) is no longer running", game.name, game.pid);
                to_remove.push(game.name.clone());
                continue;
            }

            let is_ignored = if let Some(ignored) = ignored_games {
                ignored.iter().any(|x| x.as_str().unwrap_or("") == game.id)
            } else {
                false
            };

            if !is_ignored {
                hide_crosshair = false;
            }            
        }
        
        for game in to_remove.iter() {
            games.retain(|x| x.name != *game);
        }

        if games.is_empty() && last_play {
            //println!("DEBUG: No games running, hiding crosshair");
            app.emit_to("main", "game:stop", {}).unwrap();
            app.emit_to("overlay", "show-crosshair", false).unwrap();
            last_play = false;
        }

        if !games.is_empty() {
            app.emit_to("overlay", "show-crosshair", !hide_crosshair).unwrap();
            last_play = true;
        }

        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    }
}

pub fn is_running(pid_str: &str) -> bool {
    let pid_res = pid_str.parse::<u32>();
    if pid_res.is_err() {
        return false;
    }
    let pid = pid_res.unwrap();
    let mut sys = System::new_all();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, false);
    sys.process(Pid::from_u32(pid)).is_some()
}

#[tauri::command]
pub async fn get_games() -> Vec<String> {
    let games = RUNNING_GAMES.lock().await;
    games.iter().map(|x| x.name.clone()).collect()
}