"use client";

import { CrosshairItem, defaultCrosshairs } from "@/lib/crosshair";
import { useSettings } from "@/components/settings-provider";
import { Settings, type CrosshairSettings, type OverlaySettings } from "@/lib/types";
import { listen } from "@tauri-apps/api/event";
import { availableMonitors, getCurrentWindow, Window } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import { objEquals, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimatePresence, motion } from "framer-motion";

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  icon?: string;
  duration?: number;
  remaining?: number;
  action_path?: string;
}

export default function Overlay() {
    const [w, setW] = useState<Window | null>(null);
    let { loading, settings } = useSettings();

    const [crosshairSettings, setCrosshairSettings] = useState<CrosshairSettings>();
    const [crosshairStyles, setCrosshairStyles] = useState<React.CSSProperties>();
    const [crosshair, setCrosshair] = useState<CrosshairItem>();
    const [showCrosshair, setShowCrosshair] = useState<boolean>(false);
    
    const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
    const [isHovered, setIsHovered] = useState(false);

    const overlaySettingsRef = useRef<OverlaySettings | null>(null);

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
            listen<boolean>("show-crosshair", async (event) => {
                setShowCrosshair(event.payload);
            }),
            listen<NotificationPayload>("show-notification", async (event) => {
                const newNotif = {
                    ...event.payload,
                    id: Math.random().toString(36).substring(7),
                    duration: event.payload.duration || 5000,
                    remaining: (event.payload.duration || 5) * 1000, // Convert seconds to ms if needed, or assume ms
                };
                
                // Play sound
                try {
                    const audio = new Audio("/notification.mp3");
                    audio.volume = 0.5;
                    audio.play().catch(e => console.error("Failed to play notification sound:", e));
                } catch (e) {
                    console.error("Audio error:", e);
                }

                setNotifications((prev) => [...prev, newNotif]);
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

    // Timer logic for notifications
    useEffect(() => {
        const interval = setInterval(() => {
            if (isHovered) return;
            setNotifications((prev) => {
                return prev.map(n => ({
                    ...n,
                    remaining: (n.remaining || 0) - 100
                })).filter(n => (n.remaining || 0) > 0);
            });
        }, 100);
        return () => clearInterval(interval);
    }, [isHovered]);

    if (loading) return (<></>)

    const position = settings?.notifications?.position || "BottomRight";
    const isTop = position.includes("Top");
    const isLeft = position.includes("Left");

    return (
        <div className="flex w-full h-screen relative overflow-hidden">
            {(crosshair && crosshairSettings?.enabled && showCrosshair) && (
                <div
                    className="flex justify-center items-center pointer-events-none w-full h-full absolute inset-0"
                >
                    <crosshair.content className="" style={crosshairStyles} />
                </div>
            )}

            <div 
                className={cn(
                    "absolute inset-0 flex flex-col p-4 pointer-events-none overflow-hidden gap-2",
                    isTop ? "justify-start" : "justify-end",
                    isLeft ? "items-start" : "items-end"
                )}
            >
                <div 
                    className={cn("flex flex-col gap-2 pointer-events-auto transition-all w-[400px]", isTop ? "flex-col" : "flex-col-reverse")}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <AnimatePresence mode="popLayout">
                        {notifications.map((notification) => (
                            <motion.div
                                key={notification.id}
                                layout
                                initial={{ opacity: 0, x: isLeft ? -50 : 50, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                                <Card className="p-4 flex items-start gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-border/75 shadow-lg">
                                    {notification.icon && (
                                        <Avatar className="h-10 w-10 border border-border/75">
                                            <AvatarImage src={notification.icon} />
                                            <AvatarFallback>{notification.title.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className="flex-1 space-y-1">
                                        <h4 className="text-sm font-semibold leading-none">{notification.title}</h4>
                                        <p className="text-sm text-muted-foreground leading-snug">
                                            {notification.message}
                                        </p>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}