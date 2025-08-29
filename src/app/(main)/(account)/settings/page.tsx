"use client";

import Spinner from "@/components/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioSettings, NotificationSettings, OverlaySettings, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { ArrowUpLeftFromSquare, Bell, LogOut, Palette, Settings2, User, Volume2, X, Zap } from "lucide-react";
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
import { logout } from "tauri-plugin-authium-api";

type Tab = "notifications" | "preferences" | "appearance" | "audio" | "performance" | "account";

const CARD_TITLES: Record<Tab, string> = {
    notifications: "Notification Settings",
    preferences: "Preferences",
    appearance: "Appearance",
    audio: "Audio",
    performance: "Performance",
    account: "Account",
};

const CARD_DESCRIPTIONS: Record<Tab, string> = {
    notifications: "Choose which notifications you want to receive.",
    preferences: "Manage your preferences.",
    appearance: "Customize the appearance of the app.",
    audio: "Adjust audio settings.",
    performance: "Optimize performance settings.",
    account: "Manage your account settings.",
};

export default function SettingsPage() {
    const search = useSearchParams();
    const [loading, setLoading] = useState(true);
    const { loading: l, getSetting, setSetting } = useSettings();

    /* Settings */
    const [rpc, setRpc] = useState<boolean>();
    const [autoLaunch, setAutoLaunch] = useState<boolean>();
    const [autoUpdate, setAutoUpdate] = useState<boolean>();
    const [notifications, setNotifications] = useState<NotificationSettings>();
    const [overlay, setOverlay] = useState<OverlaySettings>();
    const [audio, setAudio] = useState<AudioSettings>();

    const [tab, setTab] = useState<Tab>("notifications");
    const [highlight, setHighlight] = useState<string>();
    const [monitors, setMonitors] = useState<[string, boolean][]>([]);

    const router = useRouter();

    useEffect(() => {
        if (l) return;

        const load = async () => {
            const monitors = await availableMonitors();
            const primary = await primaryMonitor();
            setMonitors(monitors.filter(m => m.name).map(m => [m.name!, m.name === primary?.name]));

            setRpc(getSetting<boolean>("discord_rpc", true));
            setAutoLaunch(getSetting<boolean>("auto_launch", true));
            setAutoUpdate(getSetting<boolean>("auto_update", true));
            setNotifications(getSetting<NotificationSettings>("notifications"));
            setOverlay(getSetting<OverlaySettings>("overlay"));
            setAudio(getSetting<AudioSettings>("audio"));

            const tab = search.get("tab");
            if (tab) setTab(tab as Tab);

            const highlight = search.get("highlight");
            if (highlight) setHighlight(highlight);

            setLoading(false);
        };

        load();
    }, [l])

    useEffect(() => {
        if (loading) return;

        const abort = new AbortController();

        const update = async () => {
            const signal = abort.signal;
            setSetting("discord_rpc", rpc!, signal);
            setSetting("auto_launch", autoLaunch!, signal);
            setSetting("auto_update", autoUpdate!, signal);
            setSetting("notifications", notifications!, signal);
            setSetting("overlay", overlay!, signal);
            setSetting("audio", audio!, signal);

            emitTo("overlay", "toggle-overlay", overlay!.enabled);

            if (!signal.aborted) toggle(rpc!);

            const enabled = await isEnabled();
            if (signal.aborted) return;
            if (enabled && !autoLaunch) await disable();
            else if (!enabled && autoLaunch) await enable();
        }
        

        update();

        return () => {
            abort.abort();
        }
    }, [rpc, autoLaunch, autoUpdate, notifications, overlay]);

    useEffect(() => {
        setSetting("overlay", overlay!);
    }, [overlay]);

    if (loading) return (<Spinner />)

    return (
        <div className={cn("absolute inset-0 mt-8 bg-background z-30 p-6", styles.settings)}>
            <div className="mx-auto max-w-4xl h-[70%]">
                <div className="mb-6 flex justify-between">
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
                }} className="h-full space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
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
                        <TabsTrigger value="performance" className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Performance
                        </TabsTrigger>
                        <TabsTrigger value="account" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Account
                        </TabsTrigger>
                    </TabsList>
                    <Card className="max-h-full min-h-64 h-fit">
                        <CardHeader>
                            <CardTitle>{CARD_TITLES[tab]}</CardTitle>
                            <CardDescription>{CARD_DESCRIPTIONS[tab]}</CardDescription>
                        </CardHeader>
                        <ScrollArea className="h-full">
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
                                                Select the channel to receive updates from
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
                                        <Button variant="outline" className="flex items-center gap-2" onClick={() => open("https://authium.ezerium.com/dashboard")}>
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
                                        <Button className="flex items-center gap-2" variant="destructive" onClick={logout}>
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
        </div>
    );
}
