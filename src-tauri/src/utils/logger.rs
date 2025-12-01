use std::{
    io::{Read, Write},
    sync::Arc,
};

use std::{fs, sync::Mutex};
use tauri::{AppHandle, Manager};

use lazy_static::lazy_static;

lazy_static! {
    static ref LOG_FILE: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    static ref ERR_FILE: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    static ref LOG: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    static ref ERR_LOG: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
}

pub fn init(handle: &AppHandle) {
    let path = handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir")
        .join("logs");

    if !path.exists() {
        fs::create_dir_all(&path).expect("Failed to create log directory");
    }

    let now = chrono::Utc::now()
        .to_rfc3339()
        .replacen(":", "", 2)
        .replacen("+", "", 1)
        .replacen(".", "", 1)
        .replacen("00:00", "", 1);
    let log_file_path = path.join(format!("LauncherLog-{}.log", now));
    let err_file_path = path.join(format!("LauncherErr-{}.log", now));
    if !log_file_path.exists() {
        fs::write(log_file_path.clone(), "").expect("Failed to create log file");
    }
    if !err_file_path.exists() {
        fs::write(err_file_path.clone(), "").expect("Failed to create error file");
    }

    let log = fs::read_to_string(log_file_path.clone()).expect("Failed to read log file");
    let err = fs::read_to_string(err_file_path.clone()).expect("Failed to read error file");

    *LOG.lock().unwrap() = log;
    *ERR_LOG.lock().unwrap() = err;

    *LOG_FILE.lock().unwrap() = Some(log_file_path.to_str().unwrap().to_string());
    *ERR_FILE.lock().unwrap() = Some(err_file_path.to_str().unwrap().to_string());
}

pub fn log(message: &str) -> Result<(), std::io::Error> {
    let log = LOG.lock().unwrap().clone();
    let f = format!("[{}] INFO - {}", chrono::Utc::now().to_rfc3339(), message);
    if let Some(ref mut file) = *LOG_FILE.lock().unwrap() {
        let new_log = format!("{}\n{}", log, f);
        *LOG.lock().unwrap() = new_log.clone();
        fs::write(file, new_log).expect("Failed to write to log file");
        Ok(())
    } else {
        Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Log file not found",
        ))
    }
}

pub fn err(message: &str) -> Result<(), std::io::Error> {
    let err = ERR_LOG.lock().unwrap().clone();
    let f = format!("[{}] ERROR - {}", chrono::Utc::now().to_rfc3339(), message);
    if let Some(ref mut file) = *ERR_FILE.lock().unwrap() {
        let new_err = format!("{}\n{}", err, f);
        *ERR_LOG.lock().unwrap() = new_err.clone();
        fs::write(file, new_err).expect("Failed to write to error file");
    }

    Ok(())
}
