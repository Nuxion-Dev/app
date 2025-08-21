"use client";

import Spinner from "@/components/spinner";
import { addCustomGame, getGames, launch, refresh as r } from "@/lib/daemon-helper";
import Game from "@/types/game";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { set } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import GameCard from "../game-card";
import { cn } from "@/lib/utils";
import styles from '../game.module.scss';
import GamePopup from "../game-popup";
import AddGameDialog, { CustomGameInfo } from "../dialogs/add-game-dialog";
import { useDebounce } from "@/composables/useDebounce";
import ErrorAlert from "@/components/error-alert";
import { useSettings } from "@/lib/settings";

const SORTING = {
    'name-asc': 'Name (A-Z)',
    'name-desc': 'Name (Z-A)',
    'favourites': 'Favourites',
    'last-played': 'Last Played',
}

const LAUNCHER_FILTER = {
    'all': 'All',
    'steam': 'Steam',
    'epic': 'Epic Games',
    'ea': 'EA',
    'rockstar': 'Rockstar Games',

}

export default function RecentGames() {
    const { getSetting, setSetting } = useSettings();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    type SortingType = keyof typeof SORTING;
    const [games, setGames] = useState<Game[]>([]);

    const [searchInput, setSearchInput] = useState("");
    const search = useDebounce(searchInput, 300);

    const [sort, setSort] = useState<SortingType>("last-played");
    const [launcher, setLauncher] = useState<keyof typeof LAUNCHER_FILTER>("all");
    const [showHidden, setShowHidden] = useState<boolean>(false);

    const [launchingGame, setLaunchingGame] = useState<[Game, string] | null>(null);
    let popup: NodeJS.Timeout | null = null;

    const load = async () => {
        const games = await getGames();
        if (!games) {
            setError("Failed to load games");
            setLoading(false);
            return;
        }

        setGames(games);
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, [])

    const filteredGames = useMemo(() => {
        if (!games || games.length === 0) return [];
        let updatedGames = games.filter(game => game.last_played);

        if (search) updatedGames = updatedGames.filter(game => game.display_name.toLowerCase().includes(search.toLowerCase()));
        if (launcher !== "all") updatedGames = updatedGames.filter(game => game.launcher_name === launcher);
        if (!showHidden) updatedGames = updatedGames.filter(game => !game.hidden);

        switch (sort) {
            case "name-asc":
                updatedGames = updatedGames.sort((a, b) => a.display_name.localeCompare(b.display_name));
                break;
            case "name-desc":
                updatedGames = updatedGames.sort((a, b) => b.display_name.localeCompare(a.display_name));
                break;
            case "last-played":
                updatedGames = updatedGames.sort((a, b) => (b.last_played || 0) - (a.last_played || 0));
                break;
        }

        return updatedGames;
    }, [sort, search, launcher, showHidden, games])

    const refresh = async () => {
        setLoading(true);
        setError(null);
        setGames([])
        await r();
        load();
        setLoading(false);
    }

    if (loading) return (<Spinner />)

    return (
        <div className="flex flex-col p-4 pb-0 w-full h-full space-y-4 select-none">
            <div className="flex justify-between items-center">
                <h1 className="font-bold text-xl">Games</h1>
                <div className="flex gap-2 items-center">
                    <Button variant="outline" onClick={refresh}>
                        <RefreshCw />
                    </Button>
                </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg bg-card w-full px-4 py-2 border-border border shadow-sm">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search games..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-10 text-muted-foreground"
                        />
                    </div>
                </div>

                <div className="relative">
                    <Select value={sort} onValueChange={(value) => setSort(value as keyof typeof SORTING)}>
                        <SelectTrigger className="w-40 text-muted-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(SORTING).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Select value={launcher} onValueChange={(value) => setLauncher(value as keyof typeof LAUNCHER_FILTER)}>
                    <SelectTrigger className="w-40 text-muted-foreground">
                        <SelectValue placeholder="Filter by launcher..." />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(LAUNCHER_FILTER).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                    <Checkbox id="show-hidden" checked={showHidden} onCheckedChange={(v) => setShowHidden(v as boolean)} />
                    <Label htmlFor="show-hidden" className="text-sm text-muted-foreground">Show Hidden</Label>
                </div>
            </div>

            {error && (<ErrorAlert message={error} />)}

            <div className="flex-1 min-h-0">
                <ScrollArea className="pr-4 rounded-t h-full">
                    <div className={cn("grid auto-rows-auto flex-wrap gap-4", styles.game_rows)}>
                        {filteredGames.map((game) => (
                            <GameCard key={game.game_id} game={game} onClick={(banner) => {
                                                            setLaunchingGame([game, banner]);
                                launch(game.game_id, game.display_name);

                                if (popup) clearTimeout(popup);
                                popup = setTimeout(() => {
                                    setLaunchingGame(null);
                                }, 5000);
                            }} onDelete={() => setGames(games.filter((g) => g.game_id !== game.game_id))} />
                        ))}
                    </div>
                    <div className="h-4 w-4"></div>
                </ScrollArea>
            </div>

            {launchingGame && (<GamePopup game={launchingGame[0]} banner={launchingGame[1]} onClick={() => {
                setLaunchingGame(null);
                if (popup) clearTimeout(popup);
            }} />)}
        </div>
    );
}