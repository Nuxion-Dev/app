export interface Settings {
    discord_rpc: boolean;
    auto_launch: boolean;
    auto_update: boolean;
    hour24_clock: boolean;
    minimize_to_tray: boolean;
    defaultSort: string;
    notifications: NotificationSettings;
    crosshair: CrosshairSettings;
    overlay: OverlaySettings;
    audio: AudioSettings;
    clips: ClipsSettings;
}

export interface NotificationSettings {
    friend_request: boolean;
    friend_accept: boolean;
    friend_online: boolean;
    message: boolean;
}

export interface CrosshairSettings {
    enabled: boolean;
    selected: string;
    color: string;
    size: number;
    offset: { x: number; y: number };
    ignoredGames: string[];
}

export interface OverlaySettings {
    enabled: boolean;
    display: string; // "primary" or monitor name
}

export interface AudioSettings {
    notification: boolean;
    outputDevice: string | null; // null for default device
    volume: number; // 0 to 100
}

export enum AudioSource {
    None = 0,
    Desktop = 1,
    Game = 2,
    GameAndDiscord = 3,
}

export interface ClipsSettings {
    enabled: boolean;
    fps: number;
    clip_length: number; // in seconds
    audio_volume: number; // 0.0 to 1.0
    microphone_volume: number; // 0.0 to 1.0
    audio_mode: AudioSource;
    capture_microphone: boolean;
    noise_suppression: boolean;
    clips_directory: string;
    monitor_device_id: string; // monitor name or "default"
    microphone_device_id: string; // device id or empty for default
}