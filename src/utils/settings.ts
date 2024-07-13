import { invoke } from '@tauri-apps/api/core';
import { path } from '@tauri-apps/api'

const appDataDir = await path.appDataDir();

export const DEFAULT_THEME = {
    primary: "#2e7d32",
    secondary: "#4caf50",
    accent: "#8bc34a",
    background: "#2c2c2c",
    sidebar: "#1f1f1f",
    text: "#f2f2f2",
}

await invoke('create_dir_if_not_exists', { path: appDataDir });
const settingsPath = `${appDataDir}\\settings.json`;
const fileExists = await invoke('exists', { src: settingsPath });
if (!fileExists) {
    await invoke('write_file', { path: settingsPath, content: JSON.stringify({
        discord_rpc: true,
        auto_launch: true,
        theme: DEFAULT_THEME
    }, null, 4)});
}

let settings: Record<string, any> = {};

try {
    settings = JSON.parse(await invoke('read_file', { path: settingsPath }));
} catch (error: unknown) {
    if (error instanceof Error) {
        console.error(error);
    }
}

export function getSetting<T>(setting: string): T {
    return settings[setting] as T;
}

export function setSetting(setting: string, value: any) {
    settings[setting] = value;
    invoke('write_file', { path: settingsPath, contents: JSON.stringify(settings, null, 4) });
}