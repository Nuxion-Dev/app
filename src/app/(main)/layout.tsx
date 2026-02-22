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

        // Force ready after a timeout if daemon is unreachable but we want UI to work (dev/fallback)
        setTimeout(() => setReady(true), 5000); 

        return () => {
            unlisten.then((f) => f());
        }
    }, []);

    // Bypass ready check for debugging if needed, or if sidebar needs to be interactive even if main content isn't.
    // Ideally, sidebar is outside this <AppLayout> ready check? No, <Base> wraps Sidebar.
    // We should render <Base> with Sidebar even if not ready.
    if (!ready) {
        return (
            <Base>
                <div className="flex h-full w-full items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Spinner />
                        <p className="text-muted-foreground text-sm">Connecting to background service...</p>
                    </div>
                </div>
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