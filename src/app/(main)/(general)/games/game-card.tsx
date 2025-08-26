"use client";

import Game from "@/types/game"
import FallbackBanner from "@/assets/img/default-banner.png";
import { StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import { getBanner, launch, removeCustomGame, updateGame } from "@/lib/daemon-helper";
import { cn } from "@/lib/utils";
import Image from "next/image";
import styles from './game.module.scss';
import { Checkbox } from "@/components/ui/checkbox";
import { BarChartHorizontal, Eye, Heart, Menu, SquarePen, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ViewGameDialog from "./dialogs/view-game-dialog";
import ModifyGameDialog from "./dialogs/modify-game-dialog";

export default function GameCard({
    game: g,
    onClick,
    onDelete,
}: {
    game: Game,
    onClick: (banner: string) => void,
    onDelete: () => void
}) {
    const [game, setGame] = useState<Game>(g);
    const [banner, setBanner] = useState<string>(FallbackBanner.src);
    const [favourite, setFavourite] = useState<boolean>(game.favourite);

    const [viewOpen, setViewOpen] = useState<boolean>(false);
    const [modifyOpen, setModifyOpen] = useState<boolean>(false);

    useEffect(() => {
        const load = async () => {
            const b = await getBanner(game.game_id);
            setBanner(b);
        }

        load();
    }, [game]);

    return (
        <div className="flex flex-col rounded-lg bg-card shadow-neutral-900 shadow" id={`game-${game.game_id}`}>
            <div className="w-full bg-card cursor-pointer transition-all ease-in-out duration-150 brightness-75 hover:brightness-100" onClick={() => onClick(banner)}>
                <img id={`banner-${game.game_id}-${banner.replace(/[\:\/\s]+/gi, '-')}`} src={banner} alt={game.name} className={cn("rounded-t-lg", styles.banner)} />
            </div>
            <div className="flex justify-between bg-sidebar px-2 py-2 rounded-b-lg gap-4">
                <span className="text-sm font-medium select-text text-ellipsis overflow-hidden whitespace-nowrap">{game.display_name}</span>
                <div className="flex gap-2 items-center">
                    <Checkbox id={`favourite-${game.game_id}`} className="hidden" checked={favourite} onCheckedChange={(v) => {
                        if (typeof v !== "boolean") return;
                        setFavourite(v);
                        updateGame({ ...game, favourite: v });
                    }} />
                    <label htmlFor={`favourite-${game.game_id}`} className="cursor-pointer">
                        <Heart className={cn("h-4 w-4", { "text-primary": favourite })} fill={favourite ? "currentColor" : "none"} />
                    </label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="cursor-pointer">
                                <Menu className="h-4 w-4 text-muted-foreground" />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setViewOpen(true)} asChild>
                                <div className="w-full">
                                    <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                                    View
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setModifyOpen(true)} asChild>
                                <div className="w-full">
                                    <SquarePen className="mr-2 h-4 w-4 text-muted-foreground" />
                                    Modify
                                </div>
                            </DropdownMenuItem>
                            {game.launcher_name == "Custom" && (
                                <DropdownMenuItem onClick={() => {
                                    removeCustomGame(game.game_id, game.name)
                                    onDelete();
                                }} asChild>
                                    <div className="w-full text-destructive">
                                        <Trash className="mr-2 h-4 w-4" />
                                        Delete
                                    </div>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <ViewGameDialog open={viewOpen} onOpenChange={setViewOpen} game={game} />
            <ModifyGameDialog open={modifyOpen} onOpenChange={setModifyOpen} game={game} onGameModified={async (updated, banner) => {
                if (game.hidden != updated.hidden)
                    window.location.reload();
                await updateGame({ ...updated, banner: banner || game.banner });

                setModifyOpen(false);
                if (banner) setBanner(banner);
                setGame(updated);
            }} />
        </div>
    )
}