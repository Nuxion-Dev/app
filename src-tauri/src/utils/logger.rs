use std::{io::{Read, Write}, sync::Arc};

use tauri::{AppHandle, Manager};
use std::{fs::File, io::{Write as _, Read as _}, sync::Mutex};

use crate::utils::fs::{create_dir_if_not_exists, create_file_if_not_exists};
use lazy_static::lazy_static;

lazy_static! {
    static ref LOG_FILE: Arc<Mutex<Option<File>>> = Arc::new(Mutex::new(None));
    static ref ERR_FILE: Arc<Mutex<Option<File>>> = Arc::new(Mutex::new(None));
    static ref LOG: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
    static ref ERR_LOG: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
}

pub fn init(handle: &AppHandle) {
    let path = handle.path().app_data_dir().expect("Failed to get app data dir").join("logs");

    create_dir_if_not_exists(path.to_str().unwrap());

    let log_file_path = path.join("app.log");
    let err_file_path = path.join("app.err.log");
    create_file_if_not_exists(log_file_path.to_str().unwrap().to_string(), "[]".to_string());
    create_file_if_not_exists(err_file_path.to_str().unwrap().to_string(), "[]".to_string());

    let mut log_file = File::open(log_file_path).expect("Failed to open log file");
    let mut err_file = File::open(err_file_path).expect("Failed to open error file");

    let mut log = String::new();
    let mut err = String::new();
    log_file.read_to_string(&mut log).expect("Failed to read log file");
    err_file.read_to_string(&mut err).expect("Failed to read error file");

    *LOG.lock().unwrap() = log;
    *ERR_LOG.lock().unwrap() = err;

    *LOG_FILE.lock().unwrap() = Some(log_file);
    *ERR_FILE.lock().unwrap() = Some(err_file);
}

pub fn log(message: &str) {
    let log = LOG.lock().unwrap();
    let f = format!("[{}] INFO - {}", chrono::Utc::now().to_rfc3339(), message);
    if let Some(ref mut file) = *LOG_FILE.lock().unwrap() {
        let new_log = format!("{}\n{}", log, f);
        *LOG.lock().unwrap() = new_log.clone();
        file.write_all(new_log.as_bytes()).expect("Failed to write to log file");
    }
}

pub fn err(message: &str) {
    let err = ERR_LOG.lock().unwrap();
    let f = format!("[{}] ERROR - {}", chrono::Utc::now().to_rfc3339(), message);
    if let Some(ref mut file) = *ERR_FILE.lock().unwrap() {
        let new_err = format!("{}\n{}", err, f);
        *ERR_LOG.lock().unwrap() = new_err.clone();
        file.write_all(new_err.as_bytes()).expect("Failed to write to error file");
    }
}