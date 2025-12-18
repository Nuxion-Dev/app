"use client";

import { useSettings } from "@/components/settings-provider";
import Spinner from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { CrosshairSettings } from "@/lib/types";
import Game from "@/types/game";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";

export default function GameToggler({
    games,
    ignoredGames,
    onToggle
}: {
    games: Game[],
    ignoredGames: string[],
    onToggle: (gameId: string, enabled: boolean) => void
}) {
    const [open, setOpen] = useState(false);

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
                                <Switch 
                                    id={`game-${game.game_id}`} 
                                    checked={!ignoredGames.includes(game.game_id)} 
                                    onCheckedChange={(v) => onToggle(game.game_id, v)} 
                                />
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