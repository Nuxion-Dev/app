"use client";

import Spinner from "@/components/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationSettings, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Bell, Palette, Settings2, User, Volume2, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import styles from './settings.module.scss';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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
    const [loading, setLoading] = useState(true);
    const { loading: l, getSetting, setSetting } = useSettings();
    const [notifications, setNotifications] = useState<NotificationSettings>();
    const [tab, setTab] = useState<Tab>("notifications");

    const router = useRouter();

    useEffect(() => {
        if (l) return;

        setNotifications(getSetting<NotificationSettings>("notifications"));
        setLoading(false);
    }, [l])

    useEffect(() => {
        setSetting("notifications", notifications!);
    }, [notifications]);

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

                <Tabs defaultValue={tab} onValueChange={(t) => setTab(t as Tab)} className="h-full space-y-6">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="notifications" className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="preferences" className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Preferences
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            Appearance
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
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="friend-requests" className="flex flex-col gap-1">
                                            <span>Friend Requests</span>
                                            <span className="text-sm text-muted-foreground">
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
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="friend-accept" className="flex flex-col gap-1">
                                            <span>Friend Request Accepted</span>
                                            <span className="text-sm text-muted-foreground">
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
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="friend-online" className="flex flex-col gap-1">
                                            <span>Friend Online</span>
                                            <span className="text-sm text-muted-foreground">
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
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="messages" className="flex flex-col gap-1">
                                            <span>Messages</span> 
                                            <span className="text-sm text-muted-foreground">
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
                                    </CardContent>
                                </TabsContent>
                        </ScrollArea>
                    </Card>
                </Tabs>
            </div>
        </div>
    );
}
