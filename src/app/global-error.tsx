"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Titlebar from "@/components/titlebar";
import Sidebar from "@/components/sidebar";
import { SettingsProvider } from "@/components/settings-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Error({
    error,
    reset,
}: {
    error?: Error & { digest?: string }
    reset?: () => void
}) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark bg-transparent text-foreground min-h-screen`}>
                <SettingsProvider>
                    <div className={`bg-background text-foreground h-screen`}>
                        <Titlebar />
                        <div className="flex h-[calc(100%-32px)]">
                            <Sidebar />
                            <div className="relative flex flex-col h-full w-[calc(100%-256px)] items-center justify-center">
                                <h1 className="font-semibold text-xl">Error - An unexpected error has occurred.</h1>
                                <pre>{error?.message || "Unknown error"}</pre>
                            </div>
                        </div>
                    </div>
                </SettingsProvider>
            </body>
        </html>
    );
}
