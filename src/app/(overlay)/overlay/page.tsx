"use client";

import { CrosshairItem, defaultCrosshairs } from "@/lib/crosshair";
import { useSettings } from "@/components/settings-provider";
import { Settings, type CrosshairSettings, type OverlaySettings } from "@/lib/types";
import { listen } from "@tauri-apps/api/event";
import { availableMonitors, getCurrentWindow, Window } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import { objEquals } from "@/lib/utils";

type Notification = {
    icon?: string;
    title: string;
    message: string;
}

export default function Overlay() {
    const [w, setW] = useState<Window | null>(null);
    let { loading, settings } = useSettings();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [crosshairSettings, setCrosshairSettings] = useState<CrosshairSettings>();
    const [crosshairStyles, setCrosshairStyles] = useState<React.CSSProperties>();
    const [crosshair, setCrosshair] = useState<CrosshairItem>();
    const [showCrosshair, setShowCrosshair] = useState<boolean>(true);

    const overlaySettingsRef = useRef<OverlaySettings | null>(null);

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

    const load = useCallback(async (overlay?: OverlaySettings, w?: Window | null) => {
        if (!overlay || !w) return;

        if (!overlay.enabled) {
            await w.hide();
            return;
        }

        const avail = await availableMonitors();
        const display = avail.find((m) => m.name === overlay.display);
        if (!display) return;

        const maximised = await w.isMaximized();
        if (maximised) await w.unmaximize();
        await w.setSize(display.size);
        await w.setPosition(display.position);
        await w.setSimpleFullscreen(false);
        await w.setDecorations(false);
        await w.setTitleBarStyle("transparent");
        await w.setIgnoreCursorEvents(true);
        await w.maximize();
        await w.show();
    }, []);

    const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        if (!overlaySettingsRef.current || !w) return;

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            load(overlaySettingsRef.current!, w);
        }, 200); // 200ms debounce
    }, [overlaySettingsRef.current, w, load]);


    useEffect(() => {
        if (loading || !settings) return;
        settings.overlay && (overlaySettingsRef.current = settings.overlay);
        settings.crosshair && updateCrosshair(settings.crosshair);
    }, [loading, settings]);

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
            }),
            listen<Settings>("settings-updated", async (event) => {
                const payload = event.payload;
                settings = payload;

                const eq = objEquals(overlaySettingsRef.current!, payload.overlay);
                if (!eq)
                    overlaySettingsRef.current = payload.overlay;

                updateCrosshair(payload.crosshair);
            })
        ])

        return () => {
            unlisten.then((fns) => fns.forEach((fn) => fn()));
        };
    }, []);

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