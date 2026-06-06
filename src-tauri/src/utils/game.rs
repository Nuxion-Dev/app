use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;

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
    // This calls internal helper to ensure deduplication
    handle_game_launched(app, id, name, pid).await;
}

pub async fn handle_game_launched(app: AppHandle, id: String, name: String, pid: String) {
    let mut games = RUNNING_GAMES.lock().await;

    // Check for duplicates
    if games.iter().any(|g| g.id == id) {
        return;
    }

    games.push(Game { id: id.clone(), name: name.clone(), pid: pid.clone() });
    
    // Update timestamp if first game
    if games.len() == 1 {
        let time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        *TIMESTAMP.lock().await = time;
    }

    let settings = get_settings(app.clone());
    let ignored_games = settings["crosshair"]["ignoredGames"].as_array();
    
    // Check if this specific game is ignored
    let is_ignored = if let Some(ignored) = ignored_games {
        ignored.iter().any(|x| x.as_str().unwrap_or("") == id)
    } else {
        false
    };

    if !is_ignored {
        app.emit_to("overlay", "show-crosshair", true).unwrap();
    }
}

pub async fn handle_game_closed(app: AppHandle, id: String) {
    let mut games = RUNNING_GAMES.lock().await;
    let had_games = !games.is_empty();
    
    games.retain(|g| g.id != id);
    
    // After removing, check what the crosshair state should be
    if games.is_empty() {
        if had_games {
            app.emit_to("main", "game:stop", {}).unwrap();
            app.emit_to("overlay", "show-crosshair", false).unwrap();
        }
    } else {
        // There are still games running. Check if ANY of them are NOT ignored.
        let settings = get_settings(app.clone());
        let ignored_games = settings["crosshair"]["ignoredGames"].as_array();

        let mut should_show_crosshair = false;
        for game in games.iter() {
            let is_ignored = if let Some(ignored) = ignored_games {
                ignored.iter().any(|x| x.as_str().unwrap_or("") == game.id)
            } else {
                false
            };

            if !is_ignored {
                should_show_crosshair = true;
                break;
            }
        }
        
        // If all remaining games are ignored, hide crosshair. Otherwise show it.
        app.emit_to("overlay", "show-crosshair", should_show_crosshair).unwrap();
    }
}

#[tauri::command]
pub async fn get_games() -> Vec<String> {
    let games = RUNNING_GAMES.lock().await;
    games.iter().map(|x| x.name.clone()).collect()
}
