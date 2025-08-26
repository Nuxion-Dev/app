"use client";

import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CrosshairSettings, OverlaySettings, useSettings } from "@/lib/settings";
import { useRouter } from "next/navigation";
import { Component, useEffect, useState } from "react";
import GameToggler from "./game-toggler";
import Game from "@/types/game";
import { getGames } from "@/lib/daemon-helper";
import CrosshairBackground from "@/assets/img/crosshair-bg-1.png";
import Image from "next/image";
import { CrosshairItem, defaultCrosshairs } from "@/lib/crosshair";
import { cn, objEquals } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useDebounce } from "@/composables/useDebounce";
import { emitTo } from "@tauri-apps/api/event";

export default function Crosshair() {
    const [loading, setLoading] = useState(true);
    const { getSetting, setSetting, loading: l } = useSettings();
    const router = useRouter();

    const [overlay, setOverlay] = useState<OverlaySettings>();
    const [crosshair, setCrosshair] = useState<CrosshairSettings>();

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
            const crosshair = getSetting<CrosshairSettings>("crosshair");
            const overlay = getSetting<OverlaySettings>("overlay");
            setCrosshair(crosshair);
            setOverlay(overlay);
            setSelected(defaultCrosshairs.find((c) => c.id === crosshair?.selected));

            setColor(crosshair?.color || "black");
            setSize(crosshair?.size || 24);
            setOffset(crosshair?.offset || { x: 0, y: 0 });

            const games = await getGames();
            setGames(games.sort((a, b) => a.display_name.localeCompare(b.display_name)));

            setLoading(false);
        };

        load();
    }, [l]);

    useEffect(() => {
        if (!selected) return;

        setCrosshair((prev) => ({ ...prev!, selected: selected.id }));
    }, [selected]);

    useEffect(() => {
        if (!crosshair) return;

        setStyles({
            "fill": c,
            "stroke": c,
            "width": s + "px",
            "height": s + "px"
        });

        setCrosshair((prev) => ({ ...prev!, color: c, size: s, offset: o }));
    }, [c, s, o]);

    useEffect(() => {
        if (!crosshair) return;

        const eql = objEquals(styles, defaultStyles);
        console.log("Styles equal:", eql, styles, defaultStyles);
        if (!objEquals(defaultStyles, styles)) emitTo("overlay", "update-crosshair", crosshair);
        setSetting("crosshair", crosshair);
    }, [crosshair]);

    if (loading) return (<Spinner />)

    return (
        <div className="relative flex flex-col w-full">
            {!overlay?.enabled && (
                <div className="absolute inset-0 flex items-center justify-center flex-col space-y-2 bg-neutral-950/80 z-20">
                    <h1 className="text-2xl font-bold text-muted-foreground">Overlay is disabled</h1>
                    <p className="text-muted-foreground">Please enable the overlay to use this feature.</p>
                    <Button variant="ghost" onClick={() => router.push("/settings?tab=preferences&highlight=overlay")}>
                        Enable it here
                    </Button>
                </div>
            )}

            <div className="flex-1 p-4 space-y-6">
                <div className="flex justify-between">
                    <h2 className="text-xl font-bold">Crosshair</h2>
                    <Button variant="outline" onClick={() => router.push("/settings?tab=preferences&highlight=overlay")}>
                        Overlay Settings
                    </Button>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 items-center">
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
                        <Label htmlFor="crosshair-toggle" className="text-muted-foreground font-medium">Enable Crosshair</Label>
                    </div>
                    <GameToggler games={games} />
                </div>

                <div id="preview" className="w-full space-y-2">
                    <h2 className="text-lg font-bold">Preview</h2>
                    <div className="relative flex bg-black w-full h-[20vh] rounded-lg shadow-md">
                        <Image src={CrosshairBackground} alt="Crosshair Background" layout="responsive" className="w-full h-full object-cover rounded-lg object-center" />
                        {selected && (<selected.content className="z-10 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" style={styles} />)}
                    </div>
                </div>


                <div className="space-y-2">
                    <h2 className="font-bold text-lg">Properties</h2>
                    <div className="grid grid-cols-3 justify-between gap-6">
                        <div className="space-y-1">
                            <Label htmlFor="crosshair-color" className="text-muted-foreground font-medium">Color</Label>
                            <Input id="crosshair-color" type="color" className="max-w-12" value={color} onChange={(e) => setColor(e.target.value)} />
                        </div>
                        <div className="space-y-4 mr-2">
                            <Label htmlFor="crosshair-size" className="text-muted-foreground font-medium">Size ({size})</Label>
                            <Slider id="crosshair-size" min={2} max={50} step={1} value={[size]} onValueChange={(v) => setSize(v[0])} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-muted-foreground font-medium">Offset</Label>
                            <div className="flex gap-8 items-center">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="crosshair-offset-x" className="text-muted-foreground font-medium">X:</Label>
                                    <Input id="crosshair-offset-x" type="number" step="1" value={offset.x} onChange={(e) => setOffset({ ...offset, x: Number(e.target.value) })} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="crosshair-offset-y" className="text-muted-foreground font-medium">Y:</Label>
                                    <Input id="crosshair-offset-y" type="number" step="1" value={offset.y} onChange={(e) => setOffset({ ...offset, y: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-lg font-bold">Select Crosshair</h2>
                    <div className="flex gap-3 flex-wrap">
                        {defaultCrosshairs.map((crosshair) => (
                            <div className={cn("cursor-pointer rounded-md p-3 border-2 border-solid", selected?.id === crosshair.id && "border-primary")} 
                                key={crosshair.id} onClick={() => { setSelected(crosshair) }}
                            >
                                <div className="h-10 w-10 fill-muted-foreground">
                                    <crosshair.content />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}