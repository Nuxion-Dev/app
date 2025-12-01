"use client";

import Sidebar from "@/components/sidebar";
import Spinner from "@/components/spinner";
import Titlebar from "@/components/titlebar";
import { Toaster } from "@/components/ui/sonner";
import { setPrevRPC, toggle } from "@/lib/rpc";
import { useSettings } from "@/components/settings-provider";
import { checkUpdate } from "@/lib/updater";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { Suspense, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ping } from "@/lib/daemon-helper";
import { listen } from "@tauri-apps/api/event";
import { ClipsSettings } from "@/lib/types";
import { mkdir, exists, writeTextFile } from '@tauri-apps/plugin-fs'
import path from "path";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { settings, loading } = useSettings();
    const [ready, setReady] = useState(false);
    
    useEffect(() => {
        if (loading || !settings) return;

        invoke("is_dev").then((isDev) => {
            if (isDev) {
                return;
            }
            
            window.addEventListener("contextmenu", (e) => e.preventDefault());
            const autoUpdate = settings.auto_update;
            autoUpdate && checkUpdate();

            const autoLaunch = settings.auto_launch;
            autoLaunch ? enable() : disable();
        });

        const setupClips = async () => {
            const clips: ClipsSettings = settings!.clips;
            console.log("Setting up clips:", clips);

            const clipsFile = path.join(clips.clips_directory, "clips.json");
            const storedClips = path.join(clips.clips_directory, "media");

            const dirExists = await exists(storedClips);
            const fileExists = await exists(clipsFile);
            console.log({dirExists, fileExists, clipsFile, storedClips});
            if (!dirExists) await mkdir(storedClips, { recursive: true });
            if (!fileExists) await writeTextFile(clipsFile, JSON.stringify({ clips: [] }, null, 2));

            if (settings.clips.enabled) {
                await invoke('initialize_capture', {
                    config: clips
                });
            }
        }

        setupClips();

        const rpc = settings.discord_rpc;
        toggle(rpc!);
    }, [loading, settings])

    useEffect(() => {
        async function checkDaemon(): Promise<void> {
            let retries = 0;
            const maxRetries = 20;
            while (true) {
                const ok = await ping();
                if (ok) {
                    setReady(true);
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** retries, 30000)));
                retries++;
                if (retries > maxRetries) {
                    break;
                }
            }
        }

        checkDaemon();

        const unlisten = listen("game:stop", () => {
            setPrevRPC();
        });

        return () => {
            unlisten.then((f) => f());
        }
    }, []);

    if (!ready) {
        return (
            <Base>
                <Spinner />
            </Base>
        )
    }

    return (
        <Base>
            <Suspense fallback={<Spinner />}>
                {children}
            </Suspense>
            <Toaster />
        </Base>
    )
}

const Base = ({ children }: { children: React.ReactNode }) => (
    <div className={`bg-background text-foreground h-screen`}>
       <Titlebar />
       <div className="flex h-[calc(100%-32px)]">
           <Sidebar />
           <div className="flex h-full w-[calc(100%-256px)]">
               {children}
           </div>
       </div>
   </div>
);