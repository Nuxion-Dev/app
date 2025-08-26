"use client";

import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { CrosshairSettings, useSettings } from "@/lib/settings";
import Game from "@/types/game";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

export default function GameToggler({
    games
}: {
    games: Game[]
}) {
    const { getSetting, setSetting, loading } = useSettings();
    const [open, setOpen] = useState(false);
    const [crosshair, setCrosshair] = useState<CrosshairSettings>();

    const handleSwitch = (game: Game, enable: boolean) => {
        setCrosshair((prev) => {
            if (!prev) return;

            const updatedIgnoredGames = enable
                ? prev.ignoredGames.filter((id) => id !== game.game_id)
                : [...prev.ignoredGames, game.game_id];

            const updated = {
                ...prev,
                ignoredGames: updatedIgnoredGames
            };
            setSetting("crosshair", updated);

            return updated;
        });
    };

    useEffect(() => {
        if (loading) return;

        setCrosshair(getSetting<CrosshairSettings>("crosshair"));
    }, [loading]);

    if (loading) return <Spinner />;

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
        >
            <DialogTrigger asChild>
                <Button>
                    Game List
                </Button>
            </DialogTrigger>
            <DialogContent className="h-3/6">
                <DialogHeader>
                    <DialogTitle>
                        Game List
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Select which games to show the crosshair in.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="mt-1">
                    <div className="grid grid-cols-2 gap-4 gap-y-8">
                        {games.map((game) => (
                            <div className="flex items-center gap-2" key={game.game_id}>
                                <Switch id={`game-${game.game_id}`} checked={!crosshair?.ignoredGames.includes(game.game_id)} onCheckedChange={(v) => handleSwitch(game, v)} />
                                <Label htmlFor={`game-${game.game_id}`} className="text-ellipsis overflow-hidden whitespace-nowrap">
                                    {game.display_name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}