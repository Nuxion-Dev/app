use crate::user::token::{decode, JwtClaims};
use anyhow::Result;
use futures_util::{stream::SplitSink, SinkExt, StreamExt};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::{error::Error, sync::Arc};
use tauri::{AppHandle, Emitter, Listener, Manager, State};
use tauri_plugin_authium::user;
use tokio::{net::TcpStream, spawn, sync::Mutex};
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, protocol::Message},
    MaybeTlsStream, WebSocketStream,
};

const WEBSOCKET_URL: &str = "ws://127.0.0.1:9898/api/ws";
lazy_static! {
    static ref CONNECTED: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct WebSocketMessage {
    pub event: String,
    pub value: Vec<String>,
}

type WsStream = SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>;
pub struct WsState(pub Arc<Mutex<Option<WsStream>>>);

pub async fn init(app: AppHandle) -> Result<()> {
    if !user::is_logged_in() {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let tx = Arc::new(std::sync::Mutex::new(Some(tx)));
        let tx_clone = Arc::clone(&tx);
        let listener = app.listen("authium:login", move |_| {
            let mut tx_lock = tx_clone.lock().unwrap();
            if let Some(sender) = tx_lock.take() {
                let _ = sender.send(());
            }
        });
        rx.await.ok();
        app.unlisten(listener);
    }

    let state = WsState(Arc::new(Mutex::new(None)));
    app.manage(state);

    let mut attempt = 0;
    let max_attempts = 10;
    loop {
        let token = dotenv!("WEBSOCKET_TOKEN");
        let mut request = WEBSOCKET_URL.into_client_request().unwrap();
        request.headers_mut().insert(
            "Authorization",
            format!("Bearer {}", token).parse().unwrap(),
        );

        match connect_async(request).await {
            Ok((stream, _)) => {
                println!("WebSocket connected after {} attempts", attempt + 1);
                attempt = 0; // reset attempts on success

                let (write, mut read) = stream.split();
                {
                    let binding = app.state::<WsState>();
                    let mut ws_lock = binding.0.lock().await;
                    *ws_lock = Some(write);
                }

                let app = app.clone();
                let read_app = app.clone();
                spawn(async move {
                    // wait 1 seconds and request auth
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

                    *CONNECTED.lock().await = true;
                    let _ = app.emit("websocket:connected", {});
                    
                    let user = user::get_user().unwrap();
                    let claims = JwtClaims::new(user.id as u32, user.username.unwrap().clone());
                    let token = claims.encode().unwrap();

                    let auth_message = WebSocketMessage {
                        event: "req auth".to_string(),
                        value: vec![token],
                    };
                    let json = serde_json::to_string(&auth_message).unwrap();

                    let binding = app.state::<WsState>();
                    let mut ws = binding.0.lock().await;
                    if ws.is_none() {
                        eprintln!("WebSocket not connected");
                        return;
                    }
                    let ws = ws.as_mut().unwrap();
                    ws.send(Message::Text(json.into())).await.unwrap();
                });

                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(Message::Text(text)) => {
                            if let Ok(message) = serde_json::from_str::<WebSocketMessage>(&text) {
                                println!("Received message: {:?}", text.as_str());
                                let _ = read_app.emit("websocket:message", message);
                            }
                        }
                        Ok(Message::Binary(b)) => {
                            println!("Received binary: {:?}", b);
                        }
                        Ok(other) => {
                            println!("Received: {:?}", other);
                        }
                        Err(e) => {
                            eprintln!("Read error: {e}");
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                attempt += 1;
                eprintln!("WebSocket connect failed (attempt {attempt}): {e}");

                if attempt >= max_attempts {
                    eprintln!("Max attempts ({max_attempts}) reached, giving up");
                    return Err(anyhow::anyhow!("Max attempts reached"));
                }
            }
        }

        // exponential backoff: 2^attempt seconds (capped at 60s)
        let backoff = std::cmp::min(2u64.pow(attempt.min(6)), 60);
        eprintln!("Retrying in {backoff}s...");
        tokio::time::sleep(tokio::time::Duration::from_secs(backoff)).await;
    }
}

#[tauri::command]
pub async fn ws_connected<'a>() -> bool {
    *CONNECTED.lock().await
}

#[tauri::command]
pub async fn send<'a>(
    conn: State<'a, WsState>,
    event: String,
    value: Vec<String>,
) -> Result<(), crate::Error> {
    if !user::is_logged_in() {
        return Err(crate::Error::Text("User not logged in".to_string()));
    }

    let message = WebSocketMessage { event, value };
    let json = serde_json::to_string(&message)
        .map_err(|e| e.to_string())
        .expect("Failed to serialize websocket message");

    let mut ws = conn.0.lock().await;
    if ws.is_none() {
        return Err(crate::Error::Text("WebSocket not connected".to_string()));
    }

    let ws = ws.as_mut().unwrap();
    ws.send(Message::Text(json.into()))
        .await
        .map_err(|e| e.to_string())
        .expect("Failed to send websocket message");
    Ok(())
}
