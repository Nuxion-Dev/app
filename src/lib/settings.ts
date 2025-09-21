import { invoke } from "@tauri-apps/api/core";
import { path } from "@tauri-apps/api";
import { primaryMonitor } from "@tauri-apps/api/window";
import type { Settings, OverlaySettings, ClipsSettings } from "./types";
import { AudioSource } from "./types";

export async function getDefaultSettings(): Promise<Settings> {
    const appDataDir = await path.appDataDir();
    const primary = await primaryMonitor();

    const defOverlay: OverlaySettings = {
        enabled: true,
        display: primary?.name || "primary",
    };

    const defClips: ClipsSettings = {
        fps: 60,
        clip_length: 60,
        audio_volume: 1.0,
        microphone_volume: 1.0,
        audio_mode: AudioSource.Desktop,
        capture_microphone: false,
        noise_suppression: false,
        clips_directory: `${appDataDir}\\Clips`,
        monitor_device_id: primary?.name || "default",
        microphone_device_id: "",
    };

    return {
        discord_rpc: true,
        auto_launch: false,
        auto_update: true,
        hour24_clock: true,
        minimize_to_tray: true,
        notifications: {
            friend_request: true,
            friend_accept: true,
            friend_online: false,
            message: true,
        },
        crosshair: {
            enabled: false,
            selected: "svg1",
            color: "#000000",
            size: 20,
            offset: { x: 0, y: 48 },
            ignoredGames: [],
        },
        overlay: defOverlay,
        audio: {
            notification: true,
            outputDevice: null,
            volume: 100,
        },
        clips: defClips,
        defaultSort: "name-asc",
    };
}

export async function getSettingsPath(): Promise<string> {
  const appDataDir = await path.appDataDir();
  return `${appDataDir}\\settings.json`;
}

export async function readSettingsFile<T>(defaults: T): Promise<T> {
  const settingsPath = await getSettingsPath();

  await invoke("create_file_if_not_exists", {
    path: settingsPath,
    content: JSON.stringify(defaults, null, 4),
  });

  try {
    const data = await invoke<string>("read_file", { path: settingsPath });
    const parsed = JSON.parse(data);
    return mergeDefaults(parsed, defaults);
  } catch (err) {
    console.error("Failed to read settings:", err);
    return defaults;
  }
}

export async function writeSettingsFile<T>(settings: T): Promise<void> {
  const settingsPath = await getSettingsPath();
  await invoke("write_file", {
    path: settingsPath,
    content: JSON.stringify(settings, null, 4),
  });
}

/** recursively merges defaults into given object */
function mergeDefaults<T>(obj: any, defaults: T): T {
  if (typeof defaults !== "object" || defaults === null) return defaults;

  const clone: any = Array.isArray(defaults) ? [] : {};
  for (const key in defaults) {
    if (obj && key in obj) {
      clone[key] = mergeDefaults(obj[key], (defaults as any)[key]);
    } else {
      clone[key] = (defaults as any)[key];
    }
  }
  return clone as T;
}
