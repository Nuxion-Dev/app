"use client";

import { CrosshairItem, defaultCrosshairs } from "@/lib/crosshair";
import { CrosshairSettings, OverlaySettings, useSettings } from "@/lib/settings"
import { listen } from "@tauri-apps/api/event";
import { availableMonitors, getCurrentWindow, Window } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";

type Notification = {
    icon?: string;
    title: string;
    message: string;
}

export default function Overlay() {
    const [w, setW] = useState<Window | null>(null);
    const { loading, getSetting } = useSettings();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [crosshairSettings, setCrosshairSettings] = useState<CrosshairSettings>();
    const [crosshairStyles, setCrosshairStyles] = useState<React.CSSProperties>();
    const [crosshair, setCrosshair] = useState<CrosshairItem>();
    const [showCrosshair, setShowCrosshair] = useState<boolean>(true);

    const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>();

    const notificationRef = useRef<HTMLDivElement>(null);

    const updateCrosshair = (crosshair: CrosshairSettings) => {
        setCrosshairSettings(crosshair);
        setCrosshairStyles({
            width: crosshair.size + "px",
            height: crosshair.size + "px",
            fill: crosshair.color,
            stroke: crosshair.color,
            marginTop: crosshair.offset.y + "px",
            marginLeft: crosshair.offset.x + "px",
        });
        setCrosshair(defaultCrosshairs.find((c) => c.id === crosshair.selected));
    }
    useEffect(() => {
        if (loading) return;
        
        const settings = getSetting<OverlaySettings>("overlay");
        const crosshair = getSetting<CrosshairSettings>("crosshair");
        settings && setOverlaySettings(settings);
        crosshair && updateCrosshair(crosshair);
    }, [loading]);

    useEffect(() => {
        const w = getCurrentWindow();
        w && setW(w);

        const unlisten = Promise.all([
            listen<boolean>("toggle-overlay", async (event) => {
                if (!w) return;
                event.payload ? await w.show() : await w.hide();
            }),
            listen<CrosshairSettings>("update-crosshair", async (event) => {
                if (!w) return;
                updateCrosshair(event.payload);
            })
        ])

        return () => {
            unlisten.then((fns) => fns.forEach((fn) => fn()));
        };
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
            await w.setSize(display.size);
            await w.setPosition(display.position);
            await w.setSimpleFullscreen(false);
            await w.setDecorations(false);
            await w.setTitleBarStyle("transparent");
            await w.setIgnoreCursorEvents(true);
            await w.maximize();
            await w.show();
        };

        load();
    }, [overlaySettings, w])

    if (loading) return (<></>)

    return (
        <div className="flex w-full h-screen relative">
            <div id="notifications" ref={notificationRef} className="absolute top-4 left-4">
                <div className="relative">
                    {notifications.map((n, i) => (
                        <div key={i} onClick={() => console.log("abc")} className={`absolute bg-sidebar p-2 rounded shadow flex gap-4 w-[300px] pointer-events-auto`}>
                            <img className="rounded shadow" src="https://placehold.co/64" alt="Notification" />
                            <div className="space-y-1">
                                <h2 className="font-bold text-muted-foreground">{n.title}</h2>
                                <p className="text-muted-foreground text-sm">{n.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {(crosshair && crosshairSettings?.enabled && showCrosshair) && (
                <div
                    className="flex justify-center items-center pointer-events-none w-full h-full"
                >
                    <crosshair.content className="" style={crosshairStyles} />
                </div>
            )}
        </div>
    )
}