"use client";

import { Button } from "@/components/ui/button";
import Combobox from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getBanner, launch } from "@/lib/daemon-helper";
import Game from "@/types/game";
import { Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import FallbackBanner from "@/assets/img/default-banner.png";
import { cn } from "@/lib/utils";
import styles from './home.module.scss';

const LAUNCHERS: { [key: string] : string } = {
    'Electronic Arts': 'EA',
    'Epic Games': 'Epic',
    'Ubisoft': 'Uplay',
    'Rockstar Games': 'Rockstar',
}

export default function GameSlot({ game: g, allGames, onChange }: { game: Game | null, allGames: Game[], onChange?: (game: Game | null) => void }) {
    const [game, setGame] = useState<Game | null>(g);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const options = allGames.map(g => ({ value: g.game_id, label: `[${LAUNCHERS[g.launcher_name] || g.launcher_name}] ${g.display_name}` }));
    const [open, setOpen] = useState(false);

    const [banner, setBanner] = useState<any>(FallbackBanner.src);

    useEffect(() => {
        const load = async () => {
            if (game) {
                const banner = await getBanner(game.game_id);
                setBanner(banner);
            }
        }

        load();
    }, [game]);

    if (!game) return (
        <Popover onOpenChange={(o) => {
            setSelectedGame(null);
            setOpen(o);
        }} open={open}>
            <PopoverTrigger asChild>
                <div className="bg-neutral-950 rounded h-full flex items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors duration-200 flex-1">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
            </PopoverTrigger>
            <PopoverContent>
                <div className="flex flex-col gap-2">
                    <Combobox
                        className="w-full"
                        options={options}
                        value={selectedGame?.game_id}
                        onChange={(value) => {
                            const game = allGames.find(g => g.game_id === value.value) || null;
                            setSelectedGame(game);
                        }}
                    />
                    <Button onClick={() => {
                        setGame(selectedGame);
                        setSelectedGame(null);
                        setOpen(false);
                        onChange?.(selectedGame);
                    }}>
                        Update
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );

    return (
        <div className={cn("flex-1 relative aspect-auto", styles.banner)}>
            <div className={cn("absolute z-10 top-2 right-2", styles.delete)}>
                <Button variant="destructive" size="icon" onClick={() => {
                    setGame(null);
                    onChange?.(null);
                }}>
                   <Trash className="h-4 w-4" />
                </Button>
            </div>
            <img src={banner} className="rounded object-cover h-full w-full brightness-75 hover:brightness-100 transition-all duration-200" alt={game.display_name} onClick={() => {
                launch(game.game_id, game.display_name);
            }} />
        </div>
    )
}
