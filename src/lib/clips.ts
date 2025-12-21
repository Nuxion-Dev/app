import { readTextFile, stat, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { Clip, ClipsSettings } from "./types";
import { invoke } from "@tauri-apps/api/core";

export const createClip = async (clips: ClipsSettings) => {
    if (!clips.enabled) return;

    const isRecording = await invoke<boolean>('dxgi_is_recording');
    console.log("Is recording:", isRecording);
    if (!isRecording) return;

    const p = await invoke<string>('save_clip');
    console.log("Clip saved to:", p);
    const clipsFile = `${clips.clips_directory}\\clips.json`;

    // todo: play sound
    const clipData = await readTextFile(clipsFile);
    const clipJson = JSON.parse(clipData);

    const stats = await stat(p);
    const now = new Date();

    const desktopAudioPath = p.replace(".mp4", "_desktop.wav");
    const micAudioPath = p.replace(".mp4", "_mic.wav");
    
    const hasDesktopAudio = await exists(desktopAudioPath);
    const hasMicAudio = await exists(micAudioPath);

    const newClip: Clip = {
        name: p.split(/[/\\]/).pop() || "Unnamed Clip",
        path: p,
        audioPaths: {
            desktop: hasDesktopAudio ? desktopAudioPath : undefined,
            mic: hasMicAudio ? micAudioPath : undefined,
        },
        src: `file://${p.replace(/\\/g, "/")}`,
        metadata: {
            created_at: now,
            size: stats.size,
            resolution: { width: 0, height: 0 }, // TODO: get actual resolution
            duration: 0, // TODO: get actual duration
        }
    };

    clipJson.clips.push(newClip);
    await writeTextFile(clipsFile, JSON.stringify(clipJson, null, 4));
    return newClip;
};