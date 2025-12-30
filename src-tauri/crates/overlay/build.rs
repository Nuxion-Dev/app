fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").unwrap() == "windows" {
        println!("cargo:rustc-link-arg=delayimp.lib");
        println!("cargo:rustc-link-arg=/DELAYLOAD:Ultralight.dll");
        println!("cargo:rustc-link-arg=/DELAYLOAD:AppCore.dll");
        println!("cargo:rustc-link-arg=/DELAYLOAD:WebCore.dll");
    }
}
