import { invoke } from '@tauri-apps/api/core';
import { path } from '@tauri-apps/api'
import { primaryMonitor } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

const appDataDir = await path.appDataDir();

export const APP_INFO = ref({
    name: "Nuxion",
    version: "",
    build: -1
})

export interface Settings {
    discord_rpc: boolean;
    auto_launch: boolean;
    auto_update: boolean;
    hour24_clock: boolean;
    theme: Theme;
    notifications: NotificationSettings;
    crosshair: CrosshairSettings;
    defaultSort: Sort;
}

export type Sort = 0 | 1 | 2 | 3; // 0: A-Z, 1: Z-A, 2: Last Played, 3: Favorites

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
    ignoredGames: string[];
}

export interface Theme {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    sidebar: string;
    text: string;
}


export const DEFAULT_THEME: Theme = {
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
    offset: { x: 0, y: 48 },
    ignoredGames: []
}

let settings: Settings = {
    discord_rpc: true,
    auto_launch: false,
    auto_update: true,
    hour24_clock: false,
    theme: DEFAULT_THEME,
    notifications: DEFAULT_NOTIFICATIONS,
    crosshair: DEFAULT_CROSSHAIR,
    defaultSort: 0
};
const defaults: Settings = Object.assign({}, settings);
await invoke('create_dir_if_not_exists', { path: appDataDir });
const settingsPath = `${appDataDir}\\settings.json`;
const fileExists = await invoke('exists', { src: settingsPath });
if (!fileExists) {
    await invoke('write_file', { path: settingsPath, content: JSON.stringify(settings, null, 4)});
} else {
    try {
        settings = JSON.parse(await invoke('read_file', { path: settingsPath }));
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(error);
        }
    }   
}

function checkSettings(settings: any, defaults: any) {
    for (const key in defaults) {
        if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
            if (settings[key] === undefined) {
                settings[key] = {};
            }
            checkSettings(settings[key], defaults[key]);
        } else if (settings[key] === undefined) {
            settings[key] = defaults[key];
        }
    }
}
checkSettings(settings, defaults);

export function getSetting<T>(setting: keyof Settings, def?: T): T | undefined {
    const res = settings[setting] as T;
    return res === undefined ? def : res;
}

export function setSetting<K extends keyof Settings>(setting: K, value: Settings[K]): void {
    settings[setting] = value;
    invoke('write_file', { path: settingsPath, content: JSON.stringify(settings, null, 4) });
}