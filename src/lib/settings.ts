import { invoke } from "@tauri-apps/api/core";
import { path } from "@tauri-apps/api";
import { primaryMonitor } from "@tauri-apps/api/window";
import type { Settings, OverlaySettings, ClipsSettings } from "./types";
import { AudioSource } from "./types";
import { readTextFile, writeFile, writeTextFile } from "@tauri-apps/plugin-fs";

export async function getDefaultSettings(): Promise<Settings> {
    const appDataDir = await path.appDataDir();
    const primary = await primaryMonitor();

    const defOverlay: OverlaySettings = {
        enabled: true,
        display: primary?.name || "primary",
    };

    const defClips: ClipsSettings = {
        enabled: false,
        hotkey: "F12",
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
            customCrosshairs: [],
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
  console.log("Settings path:", settingsPath);

  await invoke("create_file_if_not_exists", {
    path: settingsPath,
    content: JSON.stringify(defaults, null, 4),
  });

  try {
    const data = await readTextFile(settingsPath);
    const parsed = data ? JSON.parse(data) : {};
    console.log("Read settings:", parsed);
    const m = mergeDefaults(parsed, defaults);
    console.log("Merged settings:", m);
    return m;
  } catch (err) {
    console.error("Failed to read settings:", err);
    return defaults;
  }
}

export async function writeSettingsFile<T>(settings: T): Promise<void> {
    const settingsPath = await getSettingsPath();
    await writeTextFile(settingsPath, JSON.stringify(settings, null, 4));
}

type MergeOptions = { preserveArrayExtra?: boolean };

/** recursively merges defaults into given object */
function mergeDefaults<T>(obj: any, defaults: T, opts?: MergeOptions): T {
  const preserveArrayExtra = !!opts?.preserveArrayExtra;

  function cloneDeep<V>(val: V): V {
    if (val === null || typeof val !== "object") return val;
    if (Array.isArray(val)) return val.map(cloneDeep) as unknown as V;
    const out: any = {};
    for (const k in val) out[k] = cloneDeep((val as any)[k]);
    return out;
  }

  function inner(o: any, d: any): any {
    // primitive default: keep o if present, otherwise default
    if (d === null || typeof d !== "object") {
      return o === undefined ? cloneDeep(d) : o;
    }

    // array defaults
    if (Array.isArray(d)) {
      if (!Array.isArray(o)) return cloneDeep(d); // replace non-array obj with default array clone

      // if (!preserveArrayExtra && o.length > d.length) o.length = d.length; // drop extras if requested

      for (let i = 0; i < d.length; i++) {
        if (i in o) {
          o[i] = inner(o[i], d[i]);
        } else {
          o[i] = cloneDeep(d[i]);
        }
      }
      return o;
    }

    // object defaults
    if (typeof o !== "object" || o === null || Array.isArray(o)) {
      // replace non-object o with a new object cloned from defaults
      const res: any = {};
      for (const k in d) res[k] = cloneDeep(d[k]);
      return res;
    }

    // remove keys in o that aren't in defaults
    for (const k in o) {
      if (!(k in d)) delete o[k];
    }
    // ensure all default keys exist and merge recursively
    for (const k in d) {
      if (k in o) {
        o[k] = inner(o[k], d[k]);
      } else {
        o[k] = cloneDeep(d[k]);
      }
    }
    return o;
  }

  return inner(obj, defaults) as T;
}