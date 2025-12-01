"use client";

import Spinner from "@/components/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioSettings, AudioSource, ClipsSettings, NotificationSettings, OverlaySettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowUpLeftFromSquare, Bell, Clapperboard, Film, LogOut, Palette, Settings2, User, Volume2, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import styles from './settings.module.scss';
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { setRPC, toggle } from "@/lib/rpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availableMonitors, primaryMonitor } from "@tauri-apps/api/window";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart"
import { emit, emitTo } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { Slider } from "@/components/ui/slider";
import { isLoggedIn, logout, refresh } from "tauri-plugin-authium-api";
import { useSettings } from "@/components/settings-provider";
import { useDebounce } from "@/composables/useDebounce";
import { writeSettingsFile } from "@/lib/settings";
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { invoke } from "@tauri-apps/api/core";

type Tab = "notifications" | "preferences" | "appearance" | "audio" | "clips" | "performance" | "account";

const CARD_TITLES: Record<Tab, string> = {
    notifications: "Notification Settings",
    preferences: "Preferences",
    appearance: "Appearance",
    audio: "Audio",
    clips: "Clips",
    performance: "Performance",
    account: "Account",
};

const CARD_DESCRIPTIONS: Record<Tab, string> = {
    notifications: "Choose which notifications you want to receive.",
    preferences: "Manage your preferences.",
    appearance: "Customize the appearance of the app.",
    audio: "Adjust audio settings.",
    clips: "Manage your clip settings.",
    performance: "Optimize performance settings.",
    account: "Manage your account settings.",
};

const AUDIO_MODE: Record<AudioSource, string> = {
    [AudioSource.Desktop]: "Desktop Audio",
    [AudioSource.Game]: "Game Audio",
    [AudioSource.GameAndDiscord]: "Game and Discord Audio",
    [AudioSource.None]: "No Audio",
};

export default function SettingsPage() {
    const search = useSearchParams();
    const [loading, setLoading] = useState(true);
    const { loading: l, settings, setSetting } = useSettings();

    const [loggedIn, setLoggedIn] = useState<boolean>(false);
    const [isPremium, setIsPremium] = useState<boolean>(false);

    /* Settings */
    const [rpc, setRpc] = useState<boolean>();
    const [autoLaunch, setAutoLaunch] = useState<boolean>();
    const [autoUpdate, setAutoUpdate] = useState<boolean>();
    const [minimizeToTray, setMinimizeToTray] = useState<boolean>();
    const [notifications, setNotifications] = useState<NotificationSettings>();
    const [overlay, setOverlay] = useState<OverlaySettings>();
    const [audio, setAudio] = useState<AudioSettings>();
    const [clips, setClips] = useState<ClipsSettings>();

    const [tab, setTab] = useState<Tab>("notifications");
    const [highlight, setHighlight] = useState<string>();
    const [monitors, setMonitors] = useState<[string, boolean][]>([]);
    const [microphones, setMicrophones] = useState<{ id: string, name: string }[]>([]);

    const router = useRouter();

    useEffect(() => {
        if (l || !settings) return;

        const load = async () => {
            console.log("loading")
            const monitors = await availableMonitors();
            const primary = await primaryMonitor();
            setMonitors(monitors.filter(m => m.name).map(m => [m.name!, m.name === primary?.name]));

            try {
                const mics = await invoke<{ id: string, name: string }[]>("get_microphones");
                setMicrophones(mics);
            } catch (e) {
                console.error("Failed to get microphones", e);
            }

            setRpc(settings?.discord_rpc);
            setAutoLaunch(settings?.auto_launch);
            setAutoUpdate(settings?.auto_update);
            setMinimizeToTray(settings?.minimize_to_tray);
            setNotifications(settings?.notifications);
            setOverlay(settings?.overlay);
            setAudio(settings?.audio);
            setClips(settings?.clips);

            const tab = search.get("tab");
            if (tab) setTab(tab as Tab);

            const highlight = search.get("highlight");
            if (highlight) setHighlight(highlight);

            const loggedIn = await isLoggedIn();
            setLoggedIn(loggedIn);

            setRPC("settings")
            setLoading(false);
        };

        load();
    }, [l])

    useEffect(() => {
        if (loading) return;

        const update = async () => {
            setSetting("discord_rpc", rpc!);
            setSetting("auto_launch", autoLaunch!);
            setSetting("auto_update", autoUpdate!);
            setSetting("minimize_to_tray", minimizeToTray!);
            setSetting("notifications", notifications!);
            setSetting("audio", audio!);
            setSetting("overlay", overlay!);
            setSetting("clips", clips!);

            toggle(rpc!);
            setRPC("settings");

            const enabled = await isEnabled();
            if (enabled && !autoLaunch) await disable();
            else if (!enabled && autoLaunch) await enable();
        }
        
        update();
    }, [rpc, autoLaunch, autoUpdate, minimizeToTray, notifications, overlay, audio, clips]);

    const signOut = async () => {
        await logout();
        location.reload();
    };

    if (loading) return (<Spinner />)

    return (
        <motion.div className={cn("absolute inset-0 mt-8 bg-background z-30 p-6 flex flex-col", styles.settings)} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}>
            <div className="mx-auto max-w-4xl w-full flex flex-col h-full">
                <div className="mb-6 flex justify-between shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                        <p className="text-muted-foreground">Manage your application settings here.</p>
                    </div>
                    <div>
                        <Button size="icon" variant="ghost" onClick={() => router.back()}>
                            <X />
                        </Button>
                    </div>
                </div>

                <Tabs value={tab} onValueChange={(t) => {
                    setTab(t as Tab)
                }} className="flex flex-col flex-1 min-h-0 space-y-6">
                    <TabsList className="grid w-full grid-cols-6 shrink-0">
                        <TabsTrigger value="notifications" className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="preferences" className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Preferences
                        </TabsTrigger>
                        <TabsTrigger value="audio" className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4" />
                            Audio
                        </TabsTrigger>
                        <TabsTrigger value="clips" className="flex items-center gap-2">
                            <Clapperboard className="h-4 w-4" />
                            Clips
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Performance
                        </TabsTrigger>
                        <TabsTrigger value="account" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Account
                        </TabsTrigger>
                    </TabsList>
                    <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <CardHeader className="shrink-0">
                            <CardTitle>{CARD_TITLES[tab]}</CardTitle>
                            <CardDescription>{CARD_DESCRIPTIONS[tab]}</CardDescription>
                        </CardHeader>
                        <ScrollArea className="flex-1">
                        <TabsContent value="notifications">
                            <CardContent className="space-y-6 mt-2">
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "friend-requests" })}>
                                    <Label htmlFor="friend-requests" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "friend-requests" })}>Friend Requests</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Get notified when someone sends you a friend request
                                        </span>
                                    </Label>
                                    <Switch
                                        id="friend-requests"
                                        checked={notifications?.friend_request}
                                        onCheckedChange={(v) => setNotifications({ ...notifications!, friend_request: v })}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "friend-accept" })}>
                                    <Label htmlFor="friend-accept" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "friend-accept" })}>Friend Request Accepted</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Get notified when someone accepts your friend request
                                        </span>
                                    </Label>
                                    <Switch
                                        id="friend-accept"
                                        checked={notifications?.friend_accept}
                                        onCheckedChange={(v) => setNotifications({ ...notifications!, friend_accept: v })}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "friend-online" })}>
                                    <Label htmlFor="friend-online" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "friend-online" })}>Friend Online</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Get notified when someone comes online
                                        </span>
                                    </Label>
                                    <Switch
                                        id="friend-online"
                                        checked={notifications?.friend_online}
                                        onCheckedChange={(v) => setNotifications({ ...notifications!, friend_online: v })}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "messages" })}>
                                    <Label htmlFor="messages" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "messages" })}>Messages</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Get notified when someone sends you a message
                                        </span>
                                    </Label>
                                    <Switch
                                        id="messages"
                                        checked={notifications?.message}
                                        onCheckedChange={(v) => setNotifications({ ...notifications!, message: v })}
                                    />
                                </div>
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="preferences">
                            <CardContent className="space-y-6 mt-2">
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "rpc" })}>
                                    <Label htmlFor="rpc" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "rpc" })}>Discord Rich Presence</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Enable or disable Discord Rich Presence integration
                                        </span>
                                    </Label>
                                    <Switch
                                        id="rpc"
                                        checked={rpc}
                                        onCheckedChange={(v) => setRpc(v)}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "minimize-to-tray" })}>
                                    <Label htmlFor="minimize-to-tray" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "minimize-to-tray" })}>Minimize to Tray</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Whether the app should minimize to the system tray instead of closing on exit
                                        </span>
                                    </Label>
                                    <Switch
                                        id="minimize-to-tray"
                                        checked={minimizeToTray}
                                        onCheckedChange={(v) => setMinimizeToTray(v)}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center font-normal justify-between", { "bg-primary/50": highlight === "auto-start" })}>
                                    <Label htmlFor="auto-start" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "auto-start" })}>Auto Start</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Toggle whether the app should start automatically on system boot
                                        </span>
                                    </Label>
                                    <Switch
                                        id="auto-start"
                                        checked={autoLaunch}
                                        onCheckedChange={(v) => setAutoLaunch(v)}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "auto-update" })}>
                                    <Label htmlFor="auto-update" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "auto-update" })}>Auto Update</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Toggle whether the app should detect and install updates automatically
                                        </span>
                                    </Label>
                                    <Switch
                                        id="auto-update"
                                        checked={autoUpdate}
                                        onCheckedChange={(v) => setAutoUpdate(v)}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "border border-primary/50 rounded p-2": highlight === "overlay" })}>
                                    <Label htmlFor="overlay" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "overlay" })}>Enable Overlay</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Toggle the in-game overlay and select which monitor to display it on
                                        </span>
                                    </Label>
                                    <div className="flex gap-4 items-center">
                                        <Select defaultValue={overlay?.display || "fallback"} onValueChange={(v) => setOverlay({ ...overlay!, display: v })}>
                                            <SelectTrigger className="w-[200px]" disabled={!overlay?.enabled}>
                                                <SelectValue placeholder="Select your monitor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(!overlay || !overlay.display) && <SelectItem value="fallback">Oops! A problem occurred</SelectItem>}
                                                {monitors.map(([monitor, isPrimary]) => (
                                                    <SelectItem key={monitor} value={monitor}>
                                                        {monitor.replace(/^\\\\.\\/g, "")} {isPrimary && "(primary)"}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Switch
                                            id="overlay"
                                            checked={overlay?.enabled}
                                            onCheckedChange={(v) => setOverlay({ ...overlay!, enabled: v })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="audio">
                            <CardContent className="space-y-6 mt-2">
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "notif-audio" })}>
                                    <Label htmlFor="notif-audio" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "notif-audio" })}>Notification Sound</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Toggle whether to play a sound when a notification is received
                                        </span>
                                    </Label>
                                    <Switch
                                        id="notif-audio"
                                        checked={audio?.notification}
                                        onCheckedChange={(v) => setAudio({ ...audio!, notification: v })}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "audio-volume" })}>
                                    <Label className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "audio-volume" })}>Audio Volume</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Adjust the volume sounds
                                        </span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {audio?.volume || 0}
                                        </span>
                                        <Slider
                                            value={[audio?.volume || 0]}
                                            onValueChange={(v) => setAudio({ ...audio!, volume: v[0] })}
                                            className="w-64"
                                            step={1}
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="clips">
                            <CardContent className="space-y-6 mt-2">
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "clip-enabled" })}>
                                    <Label htmlFor="clip-enabled" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "clip-enabled" })}>Enable Clip Recording</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Toggle whether clip recording is enabled
                                        </span>
                                    </Label>
                                    <Switch
                                        id="clip-enabled"
                                        checked={clips?.enabled}
                                        onCheckedChange={(v) => setClips({ ...clips!, enabled: v })}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "clip-fps" })}>
                                    <Label htmlFor="clip-fps" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "clip-fps" })}>FPS</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Set the frames per second for recorded clips
                                        </span>
                                    </Label>
                                    <Select defaultValue={String(clips?.fps || 60)} onValueChange={(v) => setClips({ ...clips!, fps: Number(v) })}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Select FPS" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="15">15 FPS</SelectItem>
                                            <SelectItem value="30">30 FPS</SelectItem>
                                            <SelectItem value="60">60 FPS</SelectItem>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <SelectItem value="90" className="!text-red-400">90 FPS</SelectItem>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>90 FPS may decrease performance, cause stutters, and increase file size.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <SelectItem value="120" className="!text-red-400">120 FPS</SelectItem>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>120 FPS may decrease performance, cause stutters, and increase file size.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <SelectItem value="144" className="!text-red-400">144 FPS</SelectItem>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>144 FPS may decrease performance, cause stutters, and increase file size.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "clip-length" })}>
                                    <Label htmlFor="clip-length" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "clip-length" })}>Clip Length</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Set the default length for recorded clips (in seconds)
                                        </span>
                                    </Label>
                                    <Select defaultValue={String(clips?.clip_length || 30)} onValueChange={(v) => setClips({ ...clips!, clip_length: Number(v) })}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Select length" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="15">15 seconds</SelectItem>
                                            <SelectItem value="30">30 seconds</SelectItem>
                                            <SelectItem value="60">60 seconds</SelectItem>
                                            <SelectItem value="120" className="!text-red-400">120 seconds</SelectItem>
                                            <SelectItem value="180" className="!text-red-400">180 seconds</SelectItem>
                                            <SelectItem value="300" className="!text-red-400">300 seconds</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "clip-folder" })}>
                                    <Label htmlFor="clip-folder" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "clip-folder" })}>Clips Folder</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Choose the folder where recorded clips will be saved
                                        </span>
                                    </Label>
                                    <Button variant="outline" onClick={async () => {
                                        await emit("open-clip-folder");
                                    }}>
                                        <Film className="h-4 w-4 mr-2" />
                                        Open Folder
                                    </Button>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "clip-hotkey" })}>
                                    <Label htmlFor="clip-hotkey" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "clip-hotkey" })}>Hotkey</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Set the hotkey to start/stop clip recording
                                        </span>
                                    </Label>
                                    <Tooltip>
                                        <TooltipTrigger className="cursor-default">
                                            <Button variant="outline" disabled>
                                                Set Hotkey
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Hotkey customization coming soon!</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "auto-clipping" })}>
                                    <Label htmlFor="auto-clipping" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "auto-clipping" })}>Auto Clipping</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Automatically record clips when certain in-game events occur
                                        </span>
                                    </Label>
                                    <Tooltip>
                                        <TooltipTrigger className="cursor-default">
                                            <Button variant="outline" disabled>
                                                Configure
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Auto clipping is not available yet.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "audio-mode" })}>
                                    <Label htmlFor="clip-audio" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "audio-mode" })}>Audio Mode</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Choose which audio source to include in recorded clips
                                        </span>
                                    </Label>
                                    <Select defaultValue={clips?.audio_mode.toString() || AudioSource.Desktop.toString()} onValueChange={(v) => setClips({ ...clips!, audio_mode: Number(v) as AudioSource })}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select audio mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(AUDIO_MODE).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "microphone" })}>
                                    <Label htmlFor="clip-microphone" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "microphone" })}>Capture Microphone</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Toggle whether to include microphone audio in recorded clips
                                        </span>
                                    </Label>
                                    <Switch
                                        id="clip-microphone"
                                        checked={clips?.capture_microphone}
                                        onCheckedChange={(v) => setClips({ ...clips!, capture_microphone: v })}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "microphone-volume" })}>
                                    <Label className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "microphone-volume" })}>Microphone Volume</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Adjust the volume of microphone audio in recorded clips
                                        </span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {Math.round((clips?.microphone_volume || 0) * 100)}%
                                        </span>
                                        <Slider
                                            value={[Math.round((clips?.microphone_volume || 0) * 100)]}
                                            onValueChange={(v) => setClips({ ...clips!, microphone_volume: v[0] / 100 })}
                                            className="w-64"
                                            step={1}
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "microphone-device" })}>
                                    <Label htmlFor="microphone-device" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "microphone-device" })}>Microphone Device</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Select which microphone to use for recording clips
                                        </span>
                                    </Label>
                                    <Select defaultValue={clips?.microphone_device_id || "default"} onValueChange={(v) => setClips({ ...clips!, microphone_device_id: v })}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select your microphone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Default Microphone</SelectItem>
                                            {microphones.map((mic) => (
                                                <SelectItem key={mic.id} value={mic.id}>
                                                    {mic.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "noise-suppression" })}>
                                    <Label htmlFor="noise-suppression" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "noise-suppression" })}>Noise Suppression</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Enable noise suppression for microphone audio in recorded clips
                                        </span>
                                    </Label>
                                    <Switch
                                        id="noise-suppression"
                                        checked={clips?.noise_suppression}
                                        onCheckedChange={(v) => setClips({ ...clips!, noise_suppression: v })}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "audio-volume" })}>
                                    <Label className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "audio-volume" })}>Audio Volume</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Adjust the volume of desktop/game audio in recorded clips
                                        </span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {Math.round((clips?.audio_volume || 0) * 100)}%
                                        </span>
                                        <Slider
                                            value={[Math.round((clips?.audio_volume || 0) * 100)]}
                                            onValueChange={(v) => setClips({ ...clips!, audio_volume: v[0] / 100 })}
                                            className="w-64"
                                            step={1}
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "monitor-device" })}>
                                    <Label htmlFor="monitor-device" className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "monitor-device" })}>Monitor</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Select which monitor to record clips from (for full desktop capture)
                                        </span>
                                    </Label>
                                    <Select defaultValue={clips?.monitor_device_id || "default"} onValueChange={(v) => setClips({ ...clips!, monitor_device_id: v })}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select your monitor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Default Monitor</SelectItem>
                                            {monitors.map(([monitor, isPrimary]) => (
                                                <SelectItem key={monitor} value={monitor}>
                                                    {monitor.replace(/^\\\\.\\/g, "")} {isPrimary && "(primary)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                            </CardContent>
                        </TabsContent>
                        <TabsContent value="performance">
                            <CardContent className="space-y-6 mt-2">
                                <h2 className="text-center text-muted-foreground text-lg font-bold">Coming Soon</h2>
                            </CardContent>
                        </TabsContent>
                        <TabsContent value="account">
                            <CardContent className="space-y-6 mt-2">
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "account" })}>
                                    <Label className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "account" })}>Your Account</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            View and manage your account details
                                        </span>
                                    </Label>
                                    <Button variant="outline" className="flex items-center gap-2" disabled={!loggedIn} onClick={() => open("https://authium.ezerium.com/dashboard")}>
                                        <ArrowUpLeftFromSquare />
                                        Account
                                    </Button>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/50": highlight === "logout" })}>
                                    <Label className="flex flex-col gap-1">
                                        <span className={cn({ "text-primary": highlight === "logout" })}>Logout</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            Sign out of your account
                                        </span>
                                    </Label>
                                    <Button className="flex items-center gap-2" variant="destructive" disabled={!loggedIn} onClick={signOut}>
                                        <LogOut />
                                        Log Out
                                    </Button>
                                </div>
                            </CardContent>
                        </TabsContent>
                        </ScrollArea>
                    </Card>
                </Tabs>
            </div>
        </motion.div>
    );
}
