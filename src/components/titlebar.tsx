"use client";

import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import { cn } from "@/lib/utils"
import styles from "./titlebar.module.scss"
import nuxionlogo from "@/assets/img/nuxion-logo.png";
import Image from "next/image";
import { Maximize, Minimize, Minus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";
import { invoke } from "@tauri-apps/api/core";

export default function Titlebar() {
    const { getSetting } = useSettings();

    const [win, setWindow] = useState<Window>();
    const [maximized, setMaximized] = useState(false);
    const close = () => {
        if (!win) return;

        const minimizeToTray = getSetting<boolean>("minimize_to_tray", true);
        console.log("Minimize to tray:", minimizeToTray);
        minimizeToTray ? win.hide() : invoke("stop");
    }

    const maximize = async () => {
        if (!win) return;

        const isMaximized = await win.isMaximized();
        const isMaximizable = await win.isMaximizable();
        if (!isMaximizable) return;

        setMaximized(!isMaximized);
        isMaximized ? await win.unmaximize() : await win.maximize();
    }

    const minimize = async () => {
        if (!win) return;

        const isMinimizable = await win.isMinimizable();
        if (!isMinimizable) return;

        await win.minimize();
    }

    useEffect(() => {
        setWindow(getCurrentWindow());
        
        if (!win) return;
        const updateMaximizedState = async () => {
            const isMaximized = await win.isMaximized();
            setMaximized(isMaximized);
        };

        updateMaximizedState();
        const unlisten = win.onResized(() => {
            updateMaximizedState();
        });

        return () => {
            unlisten.then((fn) => {
                fn();
            });
        };
    }, []);

    return (
        <div className={cn("flex justify-between items-center h-8 bg-sidebar text-sidebar-foreground text-sm font-medium select-none", styles.titlebar)} data-tauri-drag-region>
            <div className="flex items-center gap-2.5 px-2.5">
                <Image src={nuxionlogo} onClick={() => {}} className="cursor-pointer" alt="Nuxion Logo" width={18} height={18} />
                <span className={cn("cursor-default", styles.title)}>Nuxion</span>
            </div>
            <div className="flex items-center">
                <div onClick={minimize} className={cn("flex justify-center items-center", styles.btn)}>
                    <Minus className="h-4 w-4" />
                </div>
                <div onClick={maximize} className={cn("flex justify-center items-center", styles.btn)}>
                    {maximized 
                        ? <Minimize className="h-4 w-4" />
                        : <Maximize className="h-4 w-4" />
                    }
                </div>
                <div onClick={close} className={cn("flex justify-center items-center", styles.btn, styles.btn_red)}>
                    <X className="h-4 w-4" />
                </div>
            </div>
        </div>
    )
}