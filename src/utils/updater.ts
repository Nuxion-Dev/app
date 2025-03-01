import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getSetting } from './settings'
import { toast as sonner } from 'vue-sonner';
import { useToast } from '@/components/ui/toast/use-toast'
import { invoke } from '@tauri-apps/api/core';

const { toast } = useToast();

export async function checkUpdate() {
    const autoUpdate = getSetting<boolean>('auto_update', true);
    if (!autoUpdate) return;

    let failed = false;
    try {
        const update = await check();
        if (update?.available) {
            sonner('Update available', {
                description: 'A new version of the app is available. Downloading...',
                duration: (30 * 1000),
                closeButton: true,
            });
            await update.downloadAndInstall((e) => {
                if (e.event == "Finished" && !failed) {
                    sonner('Update finished', {
                        description: 'Please relaunch our app to apply the updates.',
                        closeButton: true,
                        duration: (24 * 60 * 60 * 1000),
                        action: {
                            label: 'Relaunch',
                            onClick: async () => {
                                await invoke('relaunch');
                            }
                        },
                        
                    })
                }
            });
        }
    } catch (e) {
        failed = true;
        console.error(e);
        sonner('Update failed', {
            description: 'An error occurred while checking for updates.',
            duration: (24 * 60 * 60 * 1000),
            closeButton: true,
            action: {
                label: 'Retry',
                onClick: async () => {
                    await checkUpdate();
                }
            },
        });
    }
}