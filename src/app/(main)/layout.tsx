"use client";

import Sidebar from "@/components/sidebar";
import Spinner from "@/components/spinner";
import Titlebar from "@/components/titlebar";
import { Toaster } from "@/components/ui/sonner";
import { toggle } from "@/lib/rpc";
import { useSettings } from "@/lib/settings";
import { checkUpdate } from "@/lib/updater";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { Suspense, useEffect } from "react";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { getSetting, loading } = useSettings();
    useEffect(() => {
        if (loading) return;

        const autoUpdate = getSetting<boolean>("auto_update", true);
        autoUpdate && checkUpdate();

        const rpc = getSetting<boolean>("discord_rpc", true);
        toggle(rpc!)

        const autoLaunch = getSetting<boolean>("auto_launch", false);
        autoLaunch ? enable() : disable();
    }, [loading])

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