"use client";

import { getGames, updateGame } from '@/lib/daemon-helper';
import Game from '@/types/game';
import React, { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

import styles from './home.module.scss';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GameSlot from './game-slot';
import Spinner from '@/components/spinner';
import { setRPC } from '@/lib/rpc';

const MAX_SHORTCUT_SLOTS = 5;

interface Slot {
    slot: number;
    game: Game | null;
}

export const dynamicParams = false;

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [games, setGames] = useState<Game[]>([]);
    const [shortcuts, setShortcuts] = useState<Slot[]>(Array.from({ length: MAX_SHORTCUT_SLOTS }, (_, i) => ({ slot: i, game: null })));

    useEffect(() => {
        const load = async () => {
            const games = await getGames();
            setGames(games);
            for (let i = 0; i < games.length; i++) {
                const game = games[i];
                if (game.shortcut_slot != -1 && game.shortcut_slot < MAX_SHORTCUT_SLOTS) {
                    setShortcuts(prev => {
                        const newSlots = [...prev];
                        newSlots[game.shortcut_slot] = { slot: game.shortcut_slot, game };
                        return newSlots;
                    });
                }
            }

            setRPC("home");
            setLoading(false);
        }

        load();
    }, []);

    if (loading) return (<Spinner />);

    return (
        <div className={cn("p-4", styles.container)}>
            <div className="flex flex-col gap-4 flex-1">
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle>Shortcuts</CardTitle>
                    </CardHeader>
                    <CardContent className="flex h-5/6 gap-2 relative">
                        {shortcuts.map((slot) => (
                            <GameSlot key={slot.game?.game_id || slot.slot} allGames={games} game={slot.game} onChange={(g) => {
                                if (!g) {
                                    return setShortcuts(prev => {
                                        const newSlots = [...prev];
                                        const game = shortcuts[slot.slot].game;
                                        if (game) updateGame({ ...game, shortcut_slot: -1 }).catch(console.error);

                                        newSlots[slot.slot] = { slot: slot.slot, game: null };
                                        return newSlots;
                                    });
                                }

                                setShortcuts(prev => {
                                    const newSlots = [...prev];
                                    const i = newSlots.findIndex(s => s.game?.game_id == g.game_id);
                                    if (i !== -1) newSlots[i] = { slot: i, game: null };

                                    newSlots[slot.slot] = { slot: slot.slot, game: g };
                                    return newSlots;
                                });
                                updateGame({ ...g, shortcut_slot: slot.slot }).catch(console.error);
                            }} />
                        ))}
                    </CardContent>
                </Card>
                <div className="flex gap-4 flex-1">
                    <Card className="flex-[1_1_20%]">
                        <CardHeader>
                            <CardTitle>Online Friends</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center">No online friends</p>
                        </CardContent>
                    </Card>
                    <Card className="flex-[1_1_50%]">
                        <CardHeader>
                            <CardTitle>Recent Clips</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center">Coming soon</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className={styles.discord}>
                <iframe
                    src="https://discord.com/widget?id=1254753745632362548&theme=dark"
                    allowTransparency
                    frameBorder="0"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                ></iframe>
            </div>
        </div>
    );
}
