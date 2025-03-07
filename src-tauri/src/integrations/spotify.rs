use crate::Error;

use actix_web::{get, rt::net::TcpListener, web, App, HttpResponse, HttpServer, Responder};
use base64::prelude::*;
use base64::Engine;
use rand::Rng;
use tauri_plugin_http::reqwest::{Client, Url};
use serde::Deserialize;
use std::sync::{Arc, OnceLock};
use tauri::Manager;
use tokio::sync::Mutex;

lazy_static::lazy_static! {
    static ref ACCESS_TOKEN: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    static ref EXT_WINDOW: Arc<Mutex<Option<tauri::Window>>> = Arc::new(Mutex::new(None));
}
static CLIENT_ID: OnceLock<String> = OnceLock::new();
static CLIENT_SECRET: OnceLock<String> = OnceLock::new();

#[actix_web::main]
pub async fn main() -> std::io::Result<()> {
    if CLIENT_ID.get().is_none() || CLIENT_SECRET.get().is_none() {
        let client_id = dotenv!("SPOTIFY_CLIENT_ID");
        let client_secret = dotenv!("SPOTIFY_CLIENT_SECRET");

        CLIENT_ID.set(client_id.to_string()).expect("Missing client_id");
        CLIENT_SECRET.set(client_secret.to_string()).expect("Missing client_secret");
    }

    match TcpListener::bind("127.0.0.1:3431").await {
        Ok(_) => {}
        Err(e) => {
            eprintln!(
                "Port 3431 is already in use. Please close the application using it and try again."
            );
            return Ok(());
        }
    }

    HttpServer::new(|| App::new().service(login).service(callback).service(token))
        .bind(("127.0.0.1", 3431))?
        .run()
        .await
}

#[get("/auth/login")]
async fn login() -> impl Responder {
    let scope = "app-remote-control user-read-playback-state user-modify-playback-state user-read-currently-playing streaming";
    let state = random_str();

    let mut query_params = Url::parse("https://accounts.spotify.com/authorize/").unwrap();
    query_params
        .query_pairs_mut()
        .append_pair("response_type", "code")
        .append_pair("client_id", CLIENT_ID.get().unwrap())
        .append_pair("scope", scope)
        .append_pair("redirect_uri", "http://localhost:3431/auth/callback")
        .append_pair("state", &state);

    HttpResponse::Found()
        .append_header(("Location", query_params.to_string()))
        .finish()
}

#[tauri::command]
pub async fn spotify_login(window: tauri::Window) -> Result<(), Error> {
    let external_window = window.get_webview_window("external").unwrap();
    external_window
        .eval("window.location.href = 'http://127.0.0.1:3431/auth/login'")
        .expect("Failed to redirect");
    *EXT_WINDOW.lock().await = Some(window);
    Ok(())
}

#[tauri::command]
pub async fn connect() -> Result<(), Error> {
    if let Some(ref external_window) = *EXT_WINDOW.lock().await {
        let window = external_window.get_webview_window("external").unwrap();
        window
            .eval("window.location.href = 'http://127.0.0.1:3431/auth/login'")
            .expect("Failed to set page to /auth/login");
        window.show().unwrap();
    }
    Ok(())
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: String,
}

#[get("/auth/callback")]
async fn callback(query: web::Query<CallbackQuery>) -> impl Responder {
    let code = query.code.clone();

    let response: Result<tauri_plugin_http::reqwest::Response, tauri_plugin_http::reqwest::Error> = Client::new()
        .post("https://accounts.spotify.com/api/token")
        .header(
            tauri_plugin_http::reqwest::header::AUTHORIZATION,
            format!(
                "Basic {}",
                BASE64_STANDARD.encode(
                    format!(
                        "{}:{}",
                        CLIENT_ID.get().unwrap(),
                        CLIENT_SECRET.get().unwrap()
                    )
                    .as_bytes()
                )
            ),
        )
        .header(
            tauri_plugin_http::reqwest::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .form(&[
            ("grant_type", &"authorization_code".to_string()),
            ("code", &code),
            (
                "redirect_uri",
                &"http://127.0.0.1:3431/auth/callback".to_string(),
            ),
        ])
        .send()
        .await;

    match response {
        Ok(res) => {
            if res.status().is_success() {
                let body: serde_json::Value = res.json().await.unwrap();
                let access_token = body["access_token"].as_str().unwrap().to_string();
                *ACCESS_TOKEN.lock().await = Some(access_token);

                if let Some(ref external_window) = *EXT_WINDOW.lock().await {
                    let window = external_window.get_webview_window("external").unwrap();
                    window.hide().unwrap();
                }

                return HttpResponse::Found().finish();
            }

            return HttpResponse::InternalServerError().finish();
        }
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

#[get("/auth/token")]
async fn token() -> impl actix_web::Responder {
    let token = ACCESS_TOKEN.lock().await;
    match token.as_ref() {
        Some(token) => HttpResponse::Ok().json(serde_json::json!({
            "access_token": token
        })),
        None => HttpResponse::NotFound().finish(),
    }
}

fn random_str() -> String {
    let str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::rng();
    (0..16)
        .map(|_| str.chars().nth(rng.random_range(0..str.len())).unwrap())
        .collect()
}

#[derive(Deserialize)]
struct Item {
    album: Album,
    artists: Vec<Artist>,
    duration_ms: i64,
    name: String,
}

#[derive(Deserialize)]
struct Artist {
    name: String,
}

#[derive(Deserialize)]
struct Album {
    uri: String,
    images: Vec<Image>,
}

#[derive(Deserialize)]
struct CurrentlyPlaying {
    is_playing: bool,
    item: Item,
    progress_ms: i64,
}

#[derive(Deserialize)]
struct Image {
    url: String,
}

#[tauri::command]
pub async fn get_info() -> Result<String, Error> {
    if let Some(ref access_token) = *ACCESS_TOKEN.lock().await {
        let client = Client::new();
        let response = client
            .get("https://api.spotify.com/v1/me/player/currently-playing")
            .header(
                tauri_plugin_http::reqwest::header::AUTHORIZATION,
                format!("Bearer {}", access_token),
            )
            .send()
            .await
            .expect("Failed to fetch currently playing");
        let res = response.json().await;
        let current_info: CurrentlyPlaying = match res {
            Ok(info) => info,
            Err(_) => return Ok("{}".to_string()),
        };

        HttpResponse::Found().finish();

        let images = if current_info.item.album.images.len() == 0 {
            "https://via.placeholder.com/150"
        } else {
            &current_info.item.album.images[0].url.to_string()
        };
        Ok(format!(
            r#"{{
                "is_playing": {},
                "name": "{}",
                "artists": "{}",
                "image": "{}",
                "progress": {},
                "uri": "{}",
                "duration": {}
            }}"#,
            current_info.is_playing,
            current_info.item.name,
            current_info
                .item
                .artists
                .iter()
                .map(|artist| artist.name.clone())
                .collect::<Vec<String>>()
                .join(", "),
            images,
            current_info.progress_ms,
            current_info.item.album.uri,
            current_info.item.duration_ms
        ))
    } else {
        HttpResponse::InternalServerError().finish();
        Ok("{}".to_string())
    }
}

#[tauri::command]
pub async fn toggle_playback() -> Result<(), Error> {
    let info = get_info().await.unwrap();
    let info: serde_json::Value = serde_json::from_str(&info).unwrap();

    let client = Client::new();
    if info["is_playing"].as_bool().unwrap() {
        client
            .put("https://api.spotify.com/v1/me/player/pause")
            .header(
                tauri_plugin_http::reqwest::header::AUTHORIZATION,
                format!("Bearer {}", ACCESS_TOKEN.lock().await.as_ref().unwrap()),
            )
            .header(tauri_plugin_http::reqwest::header::CONTENT_LENGTH, 0)
            .send()
            .await
            .expect("Failed to pause playback");
    } else {
        client
            .put("https://api.spotify.com/v1/me/player/play")
            .header(
                tauri_plugin_http:: reqwest::header::AUTHORIZATION,
                format!("Bearer {}", ACCESS_TOKEN.lock().await.as_ref().unwrap()),
            )
            .header(tauri_plugin_http::reqwest::header::CONTENT_LENGTH, 0)
            .send()
            .await
            .expect("Failed to resume playback");
    }

    Ok(())
}

#[tauri::command]
pub async fn next() -> Result<(), Error> {
    if let Some(ref access_token) = *ACCESS_TOKEN.lock().await {
        let client = Client::new();
        client
            .post("https://api.spotify.com/v1/me/player/next")
            .header(
                reqwest::header::AUTHORIZATION,
                format!("Bearer {}", access_token),
            )
            .header(reqwest::header::CONTENT_LENGTH, 0)
            .send()
            .await
            .expect("Failed to skip to next track");
    }
    Ok(())
}

#[tauri::command]
pub async fn previous() -> Result<(), Error> {
    if let Some(ref access_token) = *ACCESS_TOKEN.lock().await {
        let client = Client::new();
        client
            .post("https://api.spotify.com/v1/me/player/previous")
            .header(
                tauri_plugin_http::reqwest::header::AUTHORIZATION,
                format!("Bearer {}", access_token),
            )
            .header(tauri_plugin_http::reqwest::header::CONTENT_LENGTH, 0)
            .send()
            .await
            .expect("Failed to skip to previous track");
    }
    Ok(())
}

#[tauri::command]
pub async fn set_time(time: u32) -> Result<(), Error> {
    if let Some(ref access_token) = *ACCESS_TOKEN.lock().await {
        let client = Client::new();
        let url = format!(
            "https://api.spotify.com/v1/me/player/seek?position_ms={}",
            time
        );
        let _ = client
            .put(url)
            .header(
                tauri_plugin_http::reqwest::header::AUTHORIZATION,
                format!("Bearer {}", access_token),
            )
            .header(tauri_plugin_http::reqwest::header::CONTENT_LENGTH, 0)
            .send()
            .await
            .expect("Failed to send seek request");
    }
    Ok(())
}

#[tauri::command]
pub async fn remove() -> Result<(), Error> {
    *ACCESS_TOKEN.lock().await = None;
    Ok(())
}
