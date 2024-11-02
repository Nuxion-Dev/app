import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getSetting } from './settings'

export async function checkUpdate() {
    const autoUpdate = getSetting<boolean>('auto_update', true);
    if (!autoUpdate) return;

    const update = await check();
    if (update) {
        await update.downloadAndInstall();
        await relaunch();
    }
}