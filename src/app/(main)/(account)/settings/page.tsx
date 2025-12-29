"use client";

import Spinner from "@/components/spinner";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AudioSettings, NotificationSettings, OverlaySettings, ClipsSettings, AudioSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowUpLeftFromSquare, Bell, LogOut, Settings2, User, Volume2, X, Zap, Clapperboard, Monitor, Mic, Folder, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import styles from './settings.module.scss';
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { setRPC, toggle } from "@/lib/rpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availableMonitors, primaryMonitor } from "@tauri-apps/api/window";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart"
import { open } from "@tauri-apps/plugin-shell";
import { Slider } from "@/components/ui/slider";
import { isLoggedIn, logout } from "tauri-plugin-authium-api";
import { useSettings } from "@/components/settings-provider";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';

type Tab = "notifications" | "preferences" | "appearance" | "audio" | "performance" | "account" | "clips" | "overlay";

const SIDEBAR_ITEMS = [
    {
        title: "General",
        items: [
            { id: "appearance", label: "Appearance", icon: Palette },
            { id: "preferences", label: "Preferences", icon: Settings2 },
            { id: "notifications", label: "Notifications", icon: Bell },
        ]
    },
    {
        title: "Features",
        items: [
            { id: "clips", label: "Clips", icon: Clapperboard },
            { id: "overlay", label: "Overlay", icon: Monitor },
        ]
    },
    {
        title: "System",
        items: [
            { id: "audio", label: "Audio", icon: Volume2 },
            { id: "performance", label: "Performance", icon: Zap },
        ]
    },
    {
        title: "User",
        items: [
            { id: "account", label: "Account", icon: User }
        ]
    }
] as const;

export default function SettingsPage() {
    const search = useSearchParams();
    const [loading, setLoading] = useState(true);
    const { loading: l, settings, setSetting } = useSettings();

    const [loggedIn, setLoggedIn] = useState<boolean>(false);

    /* Settings */
    const [rpc, setRpc] = useState<boolean>();
    const [autoLaunch, setAutoLaunch] = useState<boolean>();
    const [autoUpdate, setAutoUpdate] = useState<boolean>();
    const [minimizeToTray, setMinimizeToTray] = useState<boolean>();
    const [notifications, setNotifications] = useState<NotificationSettings>();
    const [overlay, setOverlay] = useState<OverlaySettings>();
    const [audio, setAudio] = useState<AudioSettings>();
    const [clips, setClips] = useState<ClipsSettings>();

    const [tab, setTab] = useState<Tab>("preferences");
    const [highlight, setHighlight] = useState<string>();
    const [monitors, setMonitors] = useState<[string, boolean][]>([]);

    const router = useRouter();

    useEffect(() => {
        if (l || !settings) return;

        const load = async () => {
            const monitors = await availableMonitors();
            const primary = await primaryMonitor();
            setMonitors(monitors.filter(m => m.name).map(m => [m.name!, m.name === primary?.name]));

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
    }, [rpc, autoLaunch, autoUpdate, minimizeToTray, notifications, overlay, clips, audio]);

    const signOut = async () => {
        await logout();
        location.reload();
    };

    if (loading) return (<Spinner />)

    const renderContent = () => {
        switch (tab) {
            case "appearance":
                // Pre-made themes that can be selected in the future, managed by the admin dashboard. Some are premium only.
                return (
                    <div className="flex items-center justify-center h-64">
                        <h2 className="text-muted-foreground text-lg font-bold">Coming Soon</h2>
                    </div>
                );
            case "notifications":
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Friend Notifications</h3>
                            <div className="space-y-4">
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "friend-requests" })}>
                                    <Label htmlFor="friend-requests" className="flex flex-col gap-1">
                                        <span>Friend Requests</span>
                                        <span className="text-sm font-normal text-muted-foreground">Get notified when someone sends you a friend request</span>
                                    </Label>
                                    <Switch id="friend-requests" checked={notifications?.friend_request} onCheckedChange={(v) => setNotifications({ ...notifications!, friend_request: v })} />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "friend-accept" })}>
                                    <Label htmlFor="friend-accept" className="flex flex-col gap-1">
                                        <span>Friend Request Accepted</span>
                                        <span className="text-sm font-normal text-muted-foreground">Get notified when someone accepts your friend request</span>
                                    </Label>
                                    <Switch id="friend-accept" checked={notifications?.friend_accept} onCheckedChange={(v) => setNotifications({ ...notifications!, friend_accept: v })} />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "friend-online" })}>
                                    <Label htmlFor="friend-online" className="flex flex-col gap-1">
                                        <span>Friend Online</span>
                                        <span className="text-sm font-normal text-muted-foreground">Get notified when someone comes online</span>
                                    </Label>
                                    <Switch id="friend-online" checked={notifications?.friend_online} onCheckedChange={(v) => setNotifications({ ...notifications!, friend_online: v })} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-4">Message Notifications</h3>
                            <div className="space-y-4">
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "messages" })}>
                                    <Label htmlFor="messages" className="flex flex-col gap-1">
                                        <span>Messages</span>
                                        <span className="text-sm font-normal text-muted-foreground">Get notified when someone sends you a message</span>
                                    </Label>
                                    <Switch id="messages" checked={notifications?.message} onCheckedChange={(v) => setNotifications({ ...notifications!, message: v })} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "preferences":
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">General</h3>
                            <div className="space-y-4">
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "rpc" })}>
                                    <Label htmlFor="rpc" className="flex flex-col gap-1">
                                        <span>Discord Rich Presence</span>
                                        <span className="text-sm font-normal text-muted-foreground">Enable or disable Discord Rich Presence integration</span>
                                    </Label>
                                    <Switch id="rpc" checked={rpc} onCheckedChange={(v) => setRpc(v)} />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "minimize-to-tray" })}>
                                    <Label htmlFor="minimize-to-tray" className="flex flex-col gap-1">
                                        <span>Minimize to Tray</span>
                                        <span className="text-sm font-normal text-muted-foreground">Minimize to system tray instead of closing</span>
                                    </Label>
                                    <Switch id="minimize-to-tray" checked={minimizeToTray} onCheckedChange={(v) => setMinimizeToTray(v)} />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "auto-start" })}>
                                    <Label htmlFor="auto-start" className="flex flex-col gap-1">
                                        <span>Auto Start</span>
                                        <span className="text-sm font-normal text-muted-foreground">Start automatically on system boot</span>
                                    </Label>
                                    <Switch id="auto-start" checked={autoLaunch} onCheckedChange={(v) => setAutoLaunch(v)} />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "auto-update" })}>
                                    <Label htmlFor="auto-update" className="flex flex-col gap-1">
                                        <span>Auto Update</span>
                                        <span className="text-sm font-normal text-muted-foreground">Detect and install updates automatically</span>
                                    </Label>
                                    <Switch id="auto-update" checked={autoUpdate} onCheckedChange={(v) => setAutoUpdate(v)} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "clips":
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Clipping</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>Clip Length</span>
                                        <span className="text-sm font-normal text-muted-foreground">Duration of the clip in seconds</span>
                                    </Label>
                                    <Input 
                                        type="number" 
                                        className="w-24" 
                                        value={clips?.clip_length || 30} 
                                        onChange={(e) => setClips({ ...clips!, clip_length: parseInt(e.target.value) })} 
                                    />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>FPS</span>
                                        <span className="text-sm font-normal text-muted-foreground">Frames per second for the clip</span>
                                    </Label>
                                    <Select value={clips?.fps?.toString() || "60"} onValueChange={(v) => setClips({ ...clips!, fps: parseInt(v) })}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue placeholder="60" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="30">30</SelectItem>
                                            <SelectItem value="60">60</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>Clips Directory</span>
                                        <span className="text-sm font-normal text-muted-foreground">Where clips are saved</span>
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            className="w-64" 
                                            value={clips?.clips_directory || ""} 
                                            onChange={(e) => setClips({ ...clips!, clips_directory: e.target.value })} 
                                        />
                                        <Button size="icon" variant="outline" onClick={() => open(clips?.clips_directory || "")}>
                                            <Folder className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-4">Audio</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>Audio Mode</span>
                                        <span className="text-sm font-normal text-muted-foreground">What audio to capture</span>
                                    </Label>
                                    <Select value={clips?.audio_mode?.toString() || "1"} onValueChange={(v) => setClips({ ...clips!, audio_mode: parseInt(v) })}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Desktop" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">None</SelectItem>
                                            <SelectItem value="1">Desktop</SelectItem>
                                            <SelectItem value="2">Game</SelectItem>
                                            <SelectItem value="3">Game & Discord</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>System Volume</span>
                                        <span className="text-sm font-normal text-muted-foreground">Volume of system audio in clips</span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground w-8">{Math.round((clips?.audio_volume || 1) * 100)}%</span>
                                        <Slider
                                            value={[(clips?.audio_volume || 1) * 100]}
                                            onValueChange={(v) => setClips({ ...clips!, audio_volume: v[0] / 100 })}
                                            className="w-48"
                                            step={1}
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>Capture Microphone</span>
                                        <span className="text-sm font-normal text-muted-foreground">Include microphone audio in clips</span>
                                    </Label>
                                    <Switch checked={clips?.capture_microphone} onCheckedChange={(v) => setClips({ ...clips!, capture_microphone: v })} />
                                </div>
                                {clips?.capture_microphone && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <Label className="flex flex-col gap-1">
                                                <span>Microphone Volume</span>
                                                <span className="text-sm font-normal text-muted-foreground">Volume of microphone audio</span>
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground w-8">{Math.round((clips?.microphone_volume || 1) * 100)}%</span>
                                                <Slider
                                                    value={[(clips?.microphone_volume || 1) * 100]}
                                                    onValueChange={(v) => setClips({ ...clips!, microphone_volume: v[0] / 100 })}
                                                    className="w-48"
                                                    step={1}
                                                    min={0}
                                                    max={100}
                                                />
                                            </div>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <Label className="flex flex-col gap-1">
                                                <span>Noise Suppression</span>
                                                <span className="text-sm font-normal text-muted-foreground">Reduce background noise</span>
                                            </Label>
                                            <Switch checked={clips?.noise_suppression} onCheckedChange={(v) => setClips({ ...clips!, noise_suppression: v })} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-4">Capture</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="flex flex-col gap-1">
                                        <span>Monitor</span>
                                        <span className="text-sm font-normal text-muted-foreground">Which monitor to capture</span>
                                    </Label>
                                    <Select value={clips?.monitor_device_id || "default"} onValueChange={(v) => setClips({ ...clips!, monitor_device_id: v })}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Default" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Default</SelectItem>
                                            {monitors.map(([monitor, isPrimary]) => (
                                                <SelectItem key={monitor} value={monitor}>
                                                    {monitor.replace(/^\\\\.\\/g, "")} {isPrimary && "(primary)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "overlay":
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Overlay Settings</h3>
                            <div className="space-y-4">
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "overlay" })}>
                                    <Label htmlFor="overlay" className="flex flex-col gap-1">
                                        <span>Enable Overlay</span>
                                        <span className="text-sm font-normal text-muted-foreground">Show overlay on selected monitor</span>
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
                            </div>
                        </div>
                    </div>
                );
            case "audio":
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Audio Settings</h3>
                            <div className="space-y-4">
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "notif-audio" })}>
                                    <Label htmlFor="notif-audio" className="flex flex-col gap-1">
                                        <span>Notification Sound</span>
                                        <span className="text-sm font-normal text-muted-foreground">Play sound on notification</span>
                                    </Label>
                                    <Switch
                                        id="notif-audio"
                                        checked={audio?.notification}
                                        onCheckedChange={(v) => setAudio({ ...audio!, notification: v })}
                                    />
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "audio-volume" })}>
                                    <Label className="flex flex-col gap-1">
                                        <span>Audio Volume</span>
                                        <span className="text-sm font-normal text-muted-foreground">Adjust application volume</span>
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground w-8">
                                            {audio?.volume || 0}%
                                        </span>
                                        <Slider
                                            value={[audio?.volume || 0]}
                                            onValueChange={(v) => setAudio({ ...audio!, volume: v[0] })}
                                            className="w-48"
                                            step={1}
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "performance":
                return (
                    <div className="flex items-center justify-center h-64">
                        <h2 className="text-muted-foreground text-lg font-bold">Coming Soon</h2>
                    </div>
                );
            case "account":
                return (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-medium mb-4">Account Management</h3>
                            <div className="space-y-4">
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "account" })}>
                                    <Label className="flex flex-col gap-1">
                                        <span>Your Account</span>
                                        <span className="text-sm font-normal text-muted-foreground">View and manage your account details</span>
                                    </Label>
                                    <Button variant="outline" className="flex items-center gap-2" disabled={!loggedIn} onClick={() => open("https://authium.ezerium.com/dashboard")}>
                                        <ArrowUpLeftFromSquare className="h-4 w-4" />
                                        Account
                                    </Button>
                                </div>
                                <Separator />
                                <div className={cn("flex items-center justify-between", { "bg-primary/10 p-2 rounded": highlight === "logout" })}>
                                    <Label className="flex flex-col gap-1">
                                        <span>Logout</span>
                                        <span className="text-sm font-normal text-muted-foreground">Sign out of your account</span>
                                    </Label>
                                    <Button className="flex items-center gap-2" variant="destructive" disabled={!loggedIn} onClick={signOut}>
                                        <LogOut className="h-4 w-4" />
                                        Log Out
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <motion.div 
            className={cn("absolute inset-0 mt-8 bg-background z-30 flex", styles.settings)} 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }} 
            transition={{ duration: 0.3 }}
        >
            {/* Sidebar */}
            <div className="w-64 border-r bg-muted/10 flex flex-col">
                <div className="p-6 pb-4">
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                </div>
                <ScrollArea className="flex-1 px-4">
                    <div className="space-y-6 pb-4">
                        {SIDEBAR_ITEMS.map((group) => (
                            <div key={group.title}>
                                <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {group.title}
                                </h4>
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <Button
                                            key={item.id}
                                            variant={tab === item.id ? "secondary" : "ghost"}
                                            className={cn("w-full justify-start gap-2", tab === item.id && "bg-secondary")}
                                            onClick={() => setTab(item.id as Tab)}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex justify-end p-4">
                    <Button size="icon" variant="ghost" onClick={() => router.back()}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <ScrollArea className="flex-1 px-8 pb-8">
                    <div className="max-w-3xl mx-auto">
                        {renderContent()}
                    </div>
                </ScrollArea>
            </div>
        </motion.div>
    );
}
