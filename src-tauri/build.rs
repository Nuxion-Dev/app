fn main() {
    dotenv::dotenv().ok();

    let authium_key = std::env::var("AUTHIUM_API_KEY").unwrap_or_else(|_| "abc".to_string());
    let authium_id = std::env::var("AUTHIUM_APP_ID").unwrap_or_else(|_| "abc".to_string());
    let discord_id = std::env::var("DISCORD_CLIENT_ID").unwrap_or_else(|_| "123".to_string());

    println!("cargo:rustc-env=AUTHIUM_API_KEY={}", authium_key);
    println!("cargo:rustc-env=AUTHIUM_APP_ID={}", authium_id);
    println!("cargo:rustc-env=DISCORD_CLIENT_ID={}", discord_id);

    tauri_build::build()
}
