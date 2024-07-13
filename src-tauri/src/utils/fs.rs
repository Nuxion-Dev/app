use std::fs;
use std::io::{BufRead, BufReader};
use std::process::ChildStdout;
use std::path::Path;

use crate::Error;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, Error> {
    let content = fs::read_to_string(path).expect("Failed to read file");
    Ok(content)
}

#[tauri::command]
pub fn write_file(path: String, content: String) {
    println!("Writing to file: {}", path);
    fs::write(path, content).expect("Failed to write file");
}

#[tauri::command]
pub fn create_dir(path: &str) {
    fs::create_dir(path).expect("Failed to create directory");
}

#[tauri::command]
pub fn remove_dir(path: &str) {
    fs::remove_dir(path).expect("Failed to remove directory");
}

#[tauri::command]
pub fn remove_file(path: &str) {
    fs::remove_file(path).expect("Failed to remove file");
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) {
    fs::rename(old_path, new_path).expect("Failed to rename file");
}

#[tauri::command]
pub fn copy_file(src: &str, dest: &str) {
    fs::copy(src, dest).expect("Failed to copy file");
}

#[tauri::command]
pub fn exists(src: &str) -> bool {
    Path::new(&src).exists()
}

#[tauri::command]
pub fn create_dir_if_not_exists(path: &str) {
    if !Path::new(path).exists() {
        create_dir(path);
    }
}

#[tauri::command]
pub fn create_file_if_not_exists(path: String, content: String) {
    if !exists(&path) {
        write_file(path, content);
    }
}

pub fn read_line(stdout: ChildStdout) -> String {
    let mut reader = BufReader::new(stdout);
    let mut line = String::new();
    reader.read_line(&mut line).expect("Failed to read line");
    line
}

pub fn append_file(path: String, content: String) {
    let previous_content = read_file(path.clone()).expect("Failed to read file");
    fs::write(path, format!("{}{}", previous_content, content)).expect("Failed to append file");
}