"use client";

import Sidebar from "@/components/sidebar";
import Spinner from "@/components/spinner";
import Titlebar from "@/components/titlebar";
import { Toaster } from "@/components/ui/sonner";
import { toggle } from "@/lib/rpc";
import { useSettings } from "@/components/settings-provider";
import { checkUpdate } from "@/lib/updater";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { Suspense, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { settings, loading } = useSettings();
    useEffect(() => {
        if (loading || !settings) return;

        invoke("is_dev").then((isDev) => {
            if (!isDev)
                window.addEventListener("contextmenu", (e) => e.preventDefault());
        });

        const autoUpdate = settings.auto_update;
        autoUpdate && checkUpdate();

        const rpc = settings.discord_rpc;
        toggle(rpc!)

        const autoLaunch = settings.auto_launch;
        autoLaunch ? enable() : disable();
    }, [loading, settings])

    return (
        <div className={`bg-background text-foreground h-screen`}>
            <Titlebar />
            <div className="flex h-[calc(100%-32px)]">
                <Sidebar />
                <div className="flex h-full w-[calc(100%-256px)]">
                    <Suspense fallback={<Spinner />}>
                        {children}
                    </Suspense>
                    <Toaster />
                </div>
            </div>
        </div>
    )
}