import Game from "@/types/game";
import { useEffect, useState } from "react";
import FallbackBanner from "@/assets/img/default-banner.png";
import { getBanner } from "@/lib/daemon-helper";
import { Button } from "@/components/ui/button";

export default function GamePopup({
    game,
    banner,
    onClick
}: {
    game: Game;
    banner: string;
    onClick: () => void;
}) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="flex gap-8 h-[40vh] bg-card rounded p-4">
                <div className="shadow-md">
                    <img src={banner} alt={game.display_name} className="rounded-md object-cover h-full" />
                </div>
                <div className="flex flex-col justify-between min-w-64">
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-lg font-medium">Launching</p>
                        <h2 className="text-3xl font-semibold">{game.display_name}</h2>
                    </div>
                    <Button className="w-full" variant="outline" size="lg" onClick={onClick}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    )
}