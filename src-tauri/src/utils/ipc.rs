use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tokio::net::windows::named_pipe::ClientOptions;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use rand::Rng;

use crate::utils::game::{handle_game_closed, handle_game_launched};

#[derive(Serialize)]
struct IPCMessage {
    #[serde(rename = "type")]
    msg_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload: Option<Value>,
    id: String,
}

#[derive(Deserialize, Debug)]
struct IPCResponse {
    #[serde(rename = "type")]
    msg_type: String,
    payload: Option<Value>,
    id: Option<String>,
    error: Option<String>,
}

const PIPE_NAME: &str = r"\\.\pipe\nuxion-service";

fn generate_id() -> String {
    let mut rng = rand::rng(); 
    let id: u32 = rng.random();
    id.to_string()
}

pub fn start_listener(app: AppHandle) {
    tokio::spawn(async move {
        loop {
            // Wait a bit before connecting/reconnecting
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;

            let client = match ClientOptions::new().open(PIPE_NAME) {
                Ok(c) => c,
                Err(_) => continue, // Daemon might not be running
            };

            let mut reader = BufReader::new(client);
            let mut buffer = Vec::new();

            loop {
                buffer.clear();
                match reader.read_until(b'\n', &mut buffer).await {
                    Ok(0) => break, // EOF
                    Ok(_) => {
                        if let Ok(msg) = serde_json::from_slice::<IPCResponse>(&buffer) {
                             // Handle events
                             // Events typically don't have ID, or specific types
                             match msg.msg_type.as_str() {
                                 "game_launched" => {
                                     if let Some(payload) = msg.payload {
                                         if let (Some(id), Some(name), Some(pid)) = (
                                             payload.get("game_id").and_then(|v| v.as_str()),
                                             payload.get("name").and_then(|v| v.as_str()),
                                             payload.get("pid").and_then(|v| v.as_u64()) // JSON numbers are usually u64 or f64
                                         ) {
                                             handle_game_launched(app.clone(), id.to_string(), name.to_string(), pid.to_string()).await;
                                         }
                                     }
                                 },
                                 "game_closed" => {
                                      if let Some(payload) = msg.payload {
                                          if let Some(id) = payload.get("game_id").and_then(|v| v.as_str()) {
                                              handle_game_closed(app.clone(), id.to_string()).await;
                                          }
                                      }
                                 },
                                 _ => {}
                             }
                        }
                    }
                    Err(_) => break, // Error reading
                }
            }
        }
    });
}

#[tauri::command]
pub async fn ipc_request(msg_type: String, payload: Option<Value>) -> Result<Value, String> {
    let id = generate_id();
    
    let request = IPCMessage {
        msg_type,
        payload,
        id: id.clone(),
    };

    let mut body = serde_json::to_vec(&request).map_err(|e| e.to_string())?;
    body.push(b'\n');

    let client = ClientOptions::new()
        .open(PIPE_NAME)
        .map_err(|e| format!("Failed to connect to IPC pipe at {}: {}", PIPE_NAME, e))?;

    let (reader, mut writer) = tokio::io::split(client);
    
    writer.write_all(&body).await.map_err(|e| e.to_string())?;
    
    // Read response until we find matching ID or EOF
    let mut buf_reader = BufReader::new(reader);
    let mut response_buffer = Vec::new();
    
    loop {
        response_buffer.clear();
        let n = buf_reader.read_until(b'\n', &mut response_buffer).await
            .map_err(|e| format!("Failed to read from IPC pipe: {}", e))?;
            
        if n == 0 {
            return Err("Connection closed by daemon with no response".to_string());
        }

        if let Ok(response) = serde_json::from_slice::<IPCResponse>(&response_buffer) {
            // Check ID
            if let Some(resp_id) = &response.id {
                if resp_id == &id {
                    if let Some(err) = response.error {
                        if !err.is_empty() {
                             return Err(err);
                        }
                    }
                    return Ok(response.payload.unwrap_or(Value::Null));
                }
            }
            // If ID doesn't match, it might be a broadcast received on this connection.
            // Ignore it and continue reading.
        } else {
            // JSON parse error
            return Err("Failed to parse IPC response".to_string());
        }
    }
}

