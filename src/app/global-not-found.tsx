"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Titlebar from "@/components/titlebar";
import Sidebar from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function NotFound({
    error,
    reset,
}: {
    error?: Error & { digest?: string }
    reset?: () => void
}) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark bg-transparent text-foreground min-h-screen`}>
               <div className={`bg-background text-foreground h-screen`}>
                    <Titlebar />
                    <div className="flex h-[calc(100%-32px)]">
                        <Sidebar />
                        <div className="relative flex flex-col gap-2 h-full w-[calc(100%-256px)] items-center justify-center">
                            <h1 className="font-semibold text-xl">404 - Page Not Found</h1>
                            <p className="text-muted-foreground text-center">The page you are looking for does not exist.</p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
