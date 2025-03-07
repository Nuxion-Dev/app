import { fetch } from "@tauri-apps/plugin-http";

export async function useAppInfo() {
    const runtimeConfig = useRuntimeConfig();
    const data: Response = await fetch("https://api.nuxion.org/v1/versions/latest", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + runtimeConfig.public.API_TOKEN,
        }
    });
    const latestVersion = await data.json();
    APP_INFO.value.version = latestVersion.version;
    APP_INFO.value.build = latestVersion.build;
    return APP_INFO;
}