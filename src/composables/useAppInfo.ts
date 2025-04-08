import { fetch } from "@tauri-apps/plugin-http";
import { getVersion } from "@tauri-apps/api/app";

export async function useAppInfo(suffix: "alpha" | "beta" | "stable") {
    try {
        const runtimeConfig = useRuntimeConfig();
        const version = await getVersion();
        const data: Response = await fetch("https://api.nuxion.org/v1/versions", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + runtimeConfig.public.API_TOKEN,
            }
        });
        const all = await data.json();
        const current = all.filter((v: any) => v.version == version + (suffix != "stable" ? "-" + suffix : "")).sort((a: any, b: any) => b.build - a.build)[0];

        APP_INFO.value.version = current.version;
        APP_INFO.value.build = current.build;
        return APP_INFO;
    } catch (error) {
        console.error("Failed to fetch app info:", error);
        return null;
    }
}