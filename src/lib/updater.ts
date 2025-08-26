import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';

let failed = false;
export async function checkUpdate() {
    try {
        const update: Update | null = await check();
        if (update) {
            toast('Update available', {
                description: 'A new version of the app is available. Downloading...',
                duration: (30 * 1000),
                closeButton: true,
            });
            download(update);
        }
    } catch (e) {
        failed = true;
        console.error(e);
        toast('Update failed', {
            description: 'An error occurred while checking for updates. ',
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

function download(update: Update) {
    update.download((e) => {
        if (e.event == "Finished" && !failed) {
            toast('Update ready', {
                description: 'Please relaunch our app to apply the updates.',
                closeButton: true,
                duration: (24 * 60 * 60 * 1000),
                action: {
                    label: 'Relaunch',
                    onClick: async () => {
                        try {
                            await invoke('stop_service');
                            await update.install();
                            await relaunch();
                        } catch (e) {
                            console.error(e);
                            toast('Relaunch failed', {
                                description: 'An error occurred while relaunching the app. ',
                                duration: (24 * 60 * 60 * 1000),
                                closeButton: true,
                                action: {
                                    label: 'Retry',
                                    onClick: async () => {
                                        download(update);
                                    }
                                },
                            });
                        }
                    }
                },
                
            })
        }
    });
}