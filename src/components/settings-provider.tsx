"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getDefaultSettings, readSettingsFile, writeSettingsFile } from "@/lib/settings";
import type { Settings } from "@/lib/types.ts"; 
import { emit } from "@tauri-apps/api/event";

type SettingsContextValue = {
    settings: Settings | null;
    loading: boolean;
    setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);

    let debounce = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        (async () => {
            const defaults = await getDefaultSettings();
            const loaded = await readSettingsFile(defaults);
            setSettings(loaded);
            setLoading(false);
        })();
    }, []);

    const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        if (!settings) return;
        setSettings((prev) => {
            if (!prev) return prev;

            const clone: Settings = { ...prev };
            clone[key] = value;

            if (debounce.current) clearTimeout(debounce.current);
            debounce.current = setTimeout(() => {
                console.log("Writing settings:", clone);
                writeSettingsFile(clone);
                emit("settings-updated", clone);
            }, 500);

            return clone;
        });
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, setSetting }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
    return ctx;
}
