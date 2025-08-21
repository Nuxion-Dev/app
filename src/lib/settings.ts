"use client";

import { invoke } from '@tauri-apps/api/core';
import { path } from '@tauri-apps/api'
import { primaryMonitor } from '@tauri-apps/api/window';
import { useState, useEffect } from 'react';
import { fetch } from '@tauri-apps/plugin-http';
import { getVersion } from '@tauri-apps/api/app';

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
    notifications: NotificationSettings;
    crosshair: CrosshairSettings;
    overlay: OverlaySettings;
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

const SUFFIX: "alpha" | "beta" | "rc" | "stable" = "alpha";

export function useSettings(): {
    loading: boolean;
    getSetting: <T>(setting: keyof Settings, def?: T) => T | undefined;
    setSetting: <K extends keyof Settings>(setting: K, value: Settings[K]) => void;
    appInfo: AppInfo
} {
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [settingsPath, setSettingsPath] = useState<string | null>(null);
    const [appInfo, setAppInfo] = useState<AppInfo>({
        name: "Nuxion",
        version: "---",
        build: -1
    });

    const [defaultCrosshair, setDefaultCrosshair] = useState<CrosshairSettings>({
        enabled: false,
        selected: "svg1",
        color: "#000000",
        size: 20,
        offset: { x: 0, y: 48 },
        ignoredGames: []
    });

    const [defaultNotifications, setDefaultNotifications] = useState<NotificationSettings>({
        friend_request: true,
        friend_accept: true,
        friend_online: false,
        message: true
    });

    const [defaultOverlay, setDefaultOverlay] = useState<OverlaySettings>({
        enabled: false,
        display: ""
    });

    const [defaultSettings, setDefaultSettings] = useState<Settings | null>(null);

    function checkSettings(settings: any, defaults: any) {
        for (const key in defaults) {
            if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {https://store.steampowered.com/app/1172470
                if (settings[key] === undefined) {
                    settings[key] = {};
                }
                checkSettings(settings[key], defaults[key]);
            } else if (settings[key] === undefined) {
                settings[key] = defaults[key];
            }
        }

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
            setDefaultOverlay(defOverlay);

            const def: Settings = {
                discord_rpc: true,
                auto_launch: false,
                auto_update: true,
                hour24_clock: true,
                notifications: defaultNotifications,
                crosshair: defaultCrosshair,
                overlay: defOverlay,
                defaultSort: "name-asc"
            };
            await invoke("create_file_if_not_exists", {
                path: settingsPath,
                content: JSON.stringify(def, null, 4)
            });

            setDefaultSettings(def);
            checkSettings(settings, defaultSettings);
            try {
                const settingsData = await invoke<string>('read_file', { path: settingsPath });
                setSettings(JSON.parse(settingsData));
            } catch (error) {
                console.error("Failed to load settings:", error);
                setSettings(null);
            }

            try {
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
            }

            setLoading(false);
        }

        load();
    }, []);

    function getSetting<T>(setting: keyof Settings, def?: T): T | undefined {
        if (!settings) return def;
        const res = settings[setting] as T;
        return res === undefined ? def : res;
    }

    function setSetting<K extends keyof Settings>(setting: K, value: Settings[K]): void {
        if (!settings) return;
        settings[setting] = value;
        invoke('write_file', { path: settingsPath, content: JSON.stringify(settings, null, 4) });
    }

    return {
        loading,
        getSetting,
        setSetting,
        appInfo
    };
}