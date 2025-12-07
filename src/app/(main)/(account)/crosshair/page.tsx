"use client";

import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CrosshairSettings, OverlaySettings, CustomCrosshair } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GameToggler from "./game-toggler";
import Game from "@/types/game";
import { getGames } from "@/lib/daemon-helper";
import CrosshairBackground from "@/assets/img/crosshair-bg-1.png";
import Image from "next/image";
import { CrosshairItem, defaultCrosshairs, renderCustomCrosshair } from "@/lib/crosshair";
import { cn, objEquals } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useDebounce } from "@/composables/useDebounce";
import { emitTo } from "@tauri-apps/api/event";
import { setRPC } from "@/lib/rpc";
import { useSettings } from "@/components/settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CrosshairCreator from "./crosshair-creator";
import { Plus } from "lucide-react";

export default function Crosshair() {
    const [loading, setLoading] = useState(true);
    const { settings, setSetting, loading: l } = useSettings();
    const router = useRouter();

    const [overlay, setOverlay] = useState<OverlaySettings>();
    const [crosshair, setCrosshair] = useState<CrosshairSettings>();
    const [customCrosshairs, setCustomCrosshairs] = useState<CustomCrosshair[]>([]);

    const [selected, setSelected] = useState<CrosshairItem>()
    const [color, setColor] = useState<string>("black");
    const [size, setSize] = useState<number>(24);
    const [offset, setOffset] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0
    });

    const c = useDebounce(color, 1000);
    const s = useDebounce(size, 100);
    const o = useDebounce(offset, 1000);

    const defaultStyles: React.CSSProperties = {
        "fill": "black",
        "stroke": "black",
        "width": "24px",
        "height": "24px"
    };
    const [styles, setStyles] = useState<React.CSSProperties>({ ...defaultStyles });

    const [games, setGames] = useState<Game[]>([]);

    useEffect(() => {
        if (l) return;

        const load = async () => {
            const crosshair = settings?.crosshair;
            const overlay = settings?.overlay;
            setCrosshair(crosshair);
            setOverlay(overlay);
            
            const customs = crosshair?.customCrosshairs || [];
            setCustomCrosshairs(customs);

            const allCrosshairs = [
                ...defaultCrosshairs,
                ...customs.map(c => ({
                    id: c.id,
                    content: (props: any) => renderCustomCrosshair(c.grid, props)
                }))
            ];

            setSelected(allCrosshairs.find((c) => c.id === crosshair?.selected) || defaultCrosshairs[0]);

            setColor(crosshair?.color || "black");
            setSize(crosshair?.size || 24);
            setOffset(crosshair?.offset || { x: 0, y: 0 });

            const games = await getGames();
            setGames(games.sort((a, b) => a.display_name.localeCompare(b.display_name)));

            setRPC("crosshair")
            setLoading(false);
        };

        load();
    }, [l]);

    useEffect(() => {
        if (!selected || !crosshair) return;
        if (crosshair.selected === selected.id) return;

        setCrosshair((prev) => ({ ...prev!, selected: selected.id }));
    }, [selected]);

    useEffect(() => {
        if (!crosshair) return;
        
        if (crosshair.color === c && crosshair.size === s && 
            crosshair.offset?.x === o.x && crosshair.offset?.y === o.y) return;

        setStyles({
            "fill": c,
            "stroke": c,
            "width": s + "px",
            "height": s + "px"
        });

        setCrosshair((prev) => ({ ...prev!, color: c, size: s, offset: o }));
    }, [c, s, o]);

    useEffect(() => {
        if (!crosshair || loading) return;

        if (!objEquals(defaultStyles, styles)) emitTo("overlay", "update-crosshair", crosshair);
        setSetting("crosshair", crosshair);
    }, [crosshair, loading, styles]);

    const handleSaveCustom = (newCrosshair: CustomCrosshair) => {
        const updated = [...customCrosshairs, newCrosshair];
        setCustomCrosshairs(updated);
        
        const updatedSettings = { ...crosshair!, customCrosshairs: updated };
        setCrosshair(updatedSettings);
        setSetting("crosshair", updatedSettings);

        setSelected({
             id: newCrosshair.id,
             content: (props) => renderCustomCrosshair(newCrosshair.grid, props)
        });
    };

    if (loading) return (<Spinner />)

    const allCrosshairs = [
        ...defaultCrosshairs,
        ...customCrosshairs.map(c => ({
            id: c.id,
            content: (props: any) => renderCustomCrosshair(c.grid, props)
        }))
    ];

    return (
        <div className="relative flex flex-col w-full h-full overflow-hidden">
            {!overlay?.enabled && (
                <div className="absolute inset-0 flex items-center justify-center flex-col space-y-2 bg-background/80 backdrop-blur-sm z-50">
                    <h1 className="text-2xl font-bold text-foreground">Overlay is disabled</h1>
                    <p className="text-muted-foreground">Please enable the overlay to use this feature.</p>
                    <Button onClick={() => router.push("/settings?tab=preferences&highlight=overlay")}>
                        Enable Overlay
                    </Button>
                </div>
            )}

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Crosshair</h1>
                        <p className="text-muted-foreground">Customize your in-game crosshair.</p>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2">
                            <Switch
                                id="crosshair-toggle"
                                disabled={!crosshair || !overlay?.enabled}
                                checked={crosshair?.enabled}
                                onCheckedChange={(checked) => {
                                    const updated = { ...crosshair!, enabled: checked };
                                    setCrosshair(updated);
                                    setSetting("crosshair", updated);
                                }}
                            />
                            <Label htmlFor="crosshair-toggle" className="font-medium">Enable</Label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden border shadow-inner bg-black">
                                    <Image 
                                        src={CrosshairBackground} 
                                        alt="Crosshair Background" 
                                        fill
                                        className="object-cover opacity-80" 
                                    />
                                    {selected && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <selected.content style={styles} />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Configuration</CardTitle>
                                <CardDescription>Adjust the appearance of your crosshair.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Color</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="color" 
                                                className="w-12 h-10 p-1 cursor-pointer" 
                                                value={color} 
                                                onChange={(e) => setColor(e.target.value)} 
                                            />
                                            <Input 
                                                type="text" 
                                                value={color} 
                                                onChange={(e) => setColor(e.target.value)} 
                                                className="font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label>Size</Label>
                                            <span className="text-sm text-muted-foreground">{size}px</span>
                                        </div>
                                        <Slider 
                                            min={2} 
                                            max={100} 
                                            step={1} 
                                            value={[size]} 
                                            onValueChange={(v) => setSize(v[0])} 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Offset (X, Y)</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Horizontal</Label>
                                            <Input 
                                                type="number" 
                                                value={offset.x} 
                                                onChange={(e) => setOffset({ ...offset, x: Number(e.target.value) })} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Vertical</Label>
                                            <Input 
                                                type="number" 
                                                value={offset.y} 
                                                onChange={(e) => setOffset({ ...offset, y: Number(e.target.value) })} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Selection & Games */}
                    <div className="space-y-6">
                        <Card className="flex flex-col h-[500px]">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-semibold">Library</CardTitle>
                                <CrosshairCreator 
                                    onSave={handleSaveCustom} 
                                    trigger={
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                            <Plus className="h-4 w-4" />
                                            <span className="sr-only">Add Custom</span>
                                        </Button>
                                    }
                                />
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-2">
                                <div className="grid grid-cols-5 gap-2">
                                    {allCrosshairs.map((item) => (
                                        <div 
                                            key={item.id}
                                            onClick={() => setSelected(item)}
                                            className={cn(
                                                "aspect-square flex items-center justify-center rounded-md border-2 cursor-pointer hover:bg-muted/50 transition-colors p-2",
                                                selected?.id === item.id ? "border-primary bg-muted/50" : "border-transparent bg-muted/20"
                                            )}
                                        >
                                            <div className="w-full h-full flex items-center justify-center text-foreground fill-current">
                                                <item.content className="w-full h-full" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Game Visibility</CardTitle>
                                <CardDescription>Toggle crosshair per game.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GameToggler games={games} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}