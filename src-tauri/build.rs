fn main() {
    println!("cargo:rustc-link-search=native=bin");
    tauri_build::build()
}
