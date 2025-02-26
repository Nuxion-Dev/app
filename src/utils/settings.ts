import { invoke } from '@tauri-apps/api/core';
import { path } from '@tauri-apps/api'
import { primaryMonitor } from '@tauri-apps/api/window';

const appDataDir = await path.appDataDir();

export const APP_INFO = {
    name: "Nuxion",
    version: "0.0.1-alpha",
    build: "1"
}

export interface NotificationSettings {
    friend_request: boolean;
    friend_accept: boolean;
    friend_online: boolean;
    message: boolean;
}

export interface CrosshairSettings {
    enabled: boolean;
    selected: string | null;
    color: string;
    size: number;
    display: string;
    offset: { x: number, y: number };
}

export const DEFAULT_THEME = {
    primary: "#2e7d32",
    secondary: "#4caf50",
    accent: "#8bc34a",
    background: "#2c2c2c",
    sidebar: "#1f1f1f",
    text: "#f2f2f2",
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
    friend_request: true,
    friend_accept: true,
    friend_online: true,
    message: true
}

const primary = await primaryMonitor();
export const DEFAULT_CROSSHAIR: CrosshairSettings = {
    enabled: false,
    selected: "svg1",
    color: "#000000",
    size: 20,
    display: primary?.name || "err",
    offset: { x: 0, y: 48 }
}

await invoke('create_dir_if_not_exists', { path: appDataDir });
const settingsPath = `${appDataDir}\\settings.json`;
const fileExists = await invoke('exists', { src: settingsPath });
if (!fileExists) {
    await invoke('write_file', { path: settingsPath, content: JSON.stringify({
        discord_rpc: true,
        auto_launch: true,
        spotify: false,
        auto_update: true,
        hour24_clock: false,
        theme: DEFAULT_THEME,
        notifications: DEFAULT_NOTIFICATIONS,
        crosshair: DEFAULT_CROSSHAIR
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

export function getSetting<T>(setting: string, def?: T): T | undefined {
    const res = settings[setting] as T;
    return res === undefined ? def : res;
}

export function setSetting(setting: string, value: any) {
    settings[setting] = value;
    invoke('write_file', { path: settingsPath, content: JSON.stringify(settings, null, 4) });
}