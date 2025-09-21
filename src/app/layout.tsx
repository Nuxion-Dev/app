"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/components/settings-provider";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { Event, EventName, Status } from "@/lib/websocket";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    let isInitial = true;
    useEffect(() => {
        const unlisten = Promise.all([
            listen("websocket:connected", () => {
                console.log("WebSocket connected");
                load();
            }),
            // global event listener for all websocket messages, redirect if necessary
            listen<Event>("websocket:message", (event) => {
                const data = event.payload;
                emit(data.event, data.value);
            })
        ]);

        const r = () => {
            unlisten.then(fn => fn.forEach(f => f()));
        };
        if (!isInitial) return r;

        const load = async () => {
            const connected = await invoke<boolean>("ws_connected");
            if (!connected) return;

            await invoke("send", {
                event: EventName.RequestUserDataEvent,
                value: []
            });
        }

        isInitial = false;

        load();
        return r;
    }, []);

    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark bg-transparent text-foreground min-h-screen`}>
                <SettingsProvider>
                    {children}
                </SettingsProvider>
            </body>
        </html>
    )
}
