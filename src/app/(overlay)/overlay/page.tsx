"use client";

import { OverlaySettings, useSettings } from "@/lib/settings"
import { availableMonitors, getCurrentWindow, Window } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export default function Overlay() {
    const [w, setW] = useState<Window | null>(null);
    const { loading, getSetting } = useSettings();

    const [overlaySettings, setOverlaySettings] = useState<OverlaySettings | null>(null);

    useEffect(() => {
        if (loading) return;
        console.log(overlaySettings, loading);
        
        const settings = getSetting<OverlaySettings>("overlay");
        settings && setOverlaySettings(settings);
    }, [loading]);

    useEffect(() => {
        const w = getCurrentWindow();
        w && setW(w);
    }, []);

    useEffect(() => {

        const load = async () => {
            if (!overlaySettings || !w) return;
            if (!overlaySettings.enabled) {
                await w.hide();
                return;
            } 

            const avail = await availableMonitors();
            const display = avail.find((m) => m.name === overlaySettings.display);
            if (!display) return;

            const maximised = await w.isMaximized();
            if (maximised) w.unmaximize();
            await w.setPosition(display.position);
            if (!maximised) w.maximize();
        };

        load();
    }, [overlaySettings, w])

    if (loading) return (<></>)

    return (
        <>
            
        </>
    )
}