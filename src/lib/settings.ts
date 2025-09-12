"use client";

import { invoke } from '@tauri-apps/api/core';
import { path } from '@tauri-apps/api'
import { primaryMonitor } from '@tauri-apps/api/window';
import { useState, useEffect } from 'react';
import { fetch } from '@tauri-apps/plugin-http';
import { getVersion } from '@tauri-apps/api/app';
import Once from './once';

export type AppInfo = {
    name: "Nuxion";
    version: string;
    build: number;
}

export interface Settings {
    discord_rpc: boolean;
    auto_launch: boolean;
    auto_update: boolean;
    hour24_clock: boolean;
    minimize_to_tray: boolean;
    notifications: NotificationSettings;
    crosshair: CrosshairSettings;
    overlay: OverlaySettings;
    audio: AudioSettings;
    clips: ClipsSettings;
    defaultSort: Sort;
}

export type Sort = "name-asc" | "name-desc" | "last-played" | "favourites";

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
    offset: { x: number, y: number };
    ignoredGames: string[];
}

export interface OverlaySettings {
    enabled: boolean;
    display: string;
}

export interface AudioSettings {
    notification: boolean;
    outputDevice: string | null;
    volume: number;
}

export enum AudioSource {
    None = 0,
    Desktop = 1,
    Game = 2,
    GameAndDiscord = 3,
}

export interface ClipsSettings {
    fps: number;
    clip_length: number;
    audio_volume: number;
    microphone_volume: number;
    audio_mode: AudioSource;
    capture_microphone: boolean;
    noise_suppression: boolean;

    clips_directory: string;
    monitor_device_id: string;
    microphone_device_id: string;
}

const SUFFIX: "alpha" | "beta" | "rc" | "stable" = "alpha";

let SETTINGS: Settings | null = null;

export function useSettings(): {
    loading: boolean;
    getSetting: <T>(setting: keyof Settings, def?: T) => T | undefined;
    setSetting: <K extends keyof Settings>(setting: K, value: Settings[K], signal?: AbortSignal) => void;
    appInfo: AppInfo
} {
    const [settings, setSettings] = useState<Settings | null>(SETTINGS);
    const [loading, setLoading] = useState(settings === null);
    const [settingsPath, setSettingsPath] = useState<string | null>(null);
    const [appInfo, setAppInfo] = useState<AppInfo>({
        name: "Nuxion",
        version: "---",
        build: -1
    });

    const defaultCrosshair: CrosshairSettings = {
        enabled: false,
        selected: "svg1",
        color: "#000000",
        size: 20,
        offset: { x: 0, y: 48 },
        ignoredGames: []
    };

    const defaultNotifications: NotificationSettings = {
        friend_request: true,
        friend_accept: true,
        friend_online: false,
        message: true
    };
    const defaultAudio: AudioSettings = {
        notification: true,
        outputDevice: null,
        volume: 100
    };

    function checkSettings(settings: any, defaults: any) {
        for (const key in defaults) {
            if (typeof defaults[key] === "object" && defaults[key] !== null) {
                if (Array.isArray(defaults[key])) {
                    if (!Array.isArray(settings[key])) {
                        settings[key] = [...defaults[key]]; // clone array
                    }
                } else {
                    if (typeof settings[key] !== "object" || settings[key] === null || Array.isArray(settings[key])) {
                        settings[key] = {};
                    }
                    checkSettings(settings[key], defaults[key]); // recurse into objects
                }
            } else if (settings[key] === undefined) {
                settings[key] = defaults[key]; // copy primitive
            }
        }

        // remove extra keys not in defaults
        for (const key in settings) {
            if (!(key in defaults)) {
                delete settings[key];
            }
        }
    }

    useEffect(() => {
        const load = async () => {
            const appDataDir = await path.appDataDir();
            const settingsPath = `${appDataDir}\\settings.json`;
            setSettingsPath(settingsPath);

            const primary = await primaryMonitor();
            const defOverlay: OverlaySettings = {
                enabled: true,
                display: primary?.name || "err"
            };

            const clipsDir = `${appDataDir}\\Clips`;
            const defClips: ClipsSettings = {
                fps: 60,
                clip_length: 60,
                audio_volume: 1.0,
                microphone_volume: 1.0,
                audio_mode: AudioSource.Desktop,
                capture_microphone: false,
                noise_suppression: false,
                clips_directory: clipsDir,
                monitor_device_id: primary?.name || "err",
                microphone_device_id: ""
            };

            const def: Settings = {
                discord_rpc: true,
                auto_launch: false,
                auto_update: true,
                hour24_clock: true,
                minimize_to_tray: true,
                notifications: defaultNotifications,
                crosshair: defaultCrosshair,
                overlay: defOverlay,
                audio: defaultAudio,
                clips: defClips,
                defaultSort: "name-asc"
            };
            await invoke("create_file_if_not_exists", {
                path: settingsPath,
                content: JSON.stringify(def, null, 4)
            });

            try {
                const settingsData = await invoke<string>('read_file', { path: settingsPath });
                const s = JSON.parse(settingsData);
                checkSettings(s, def);
                setSettings(s);
<<<<<<< HEAD
                
                await invoke('write_file', { path: settingsPath, content: JSON.stringify(s, null, 4) }); // rewrite to ensure all keys are present
=======
                SETTINGS = s;
>>>>>>> main
            } catch (error) {
                console.error("Failed to load settings:", error);
                setSettings(null);
                SETTINGS = null;
            }

            /*try {
                const version = await getVersion();
                const data: Response = await fetch("https://api.nuxion.org/v1/versions", {
                    method: "GET",
                    headers: {
                        "Authorization": "Bearer " + process.env.NEXT_PUBLIC_API_TOKEN,
                    }
                });
                const all = await data.json();
                const current = all.filter((v: any) => v.version == version + (SUFFIX != "stable" ? "-" + SUFFIX : "")).sort((a: any, b: any) => b.build - a.build)[0];
                setAppInfo((prev) => ({ ...prev, version: current.version, build: current.build }));
            } catch (error) {
                console.error("Failed to fetch version info:", error);
            }*/

            setLoading(false);
        }

        if (!settings) load();
    }, []);

    function getSetting<T>(setting: keyof Settings, def?: T): T | undefined {
        if (!SETTINGS) return def;
        const res = SETTINGS[setting];
        return res === undefined ? def : res as T;
    }

    function setSetting<K extends keyof Settings>(setting: K, value: Settings[K], signal?: AbortSignal): void {
        if (!settings) return;
        if (signal && signal.aborted) return;
        setSettings((prev) => {
            if (!prev) return prev;
            const newSettings = { ...prev, [setting]: value };
            SETTINGS = newSettings;
            invoke('write_file', { path: settingsPath, content: JSON.stringify(newSettings, null, 4) });
            return newSettings;
        });
    }

    return {
        loading,
        getSetting,
        setSetting,
        appInfo
    };
}