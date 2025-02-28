import { invoke } from "@tauri-apps/api/core";

export async function useAppInfo() {
    const latestVersion: any = await invoke("get_version");
    APP_INFO.value.version = latestVersion.version;
    APP_INFO.value.build = latestVersion.build;
    return APP_INFO;
}