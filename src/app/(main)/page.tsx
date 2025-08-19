"use client";

import { getGames } from '@/lib/daemon-helper';
import Game from '@/types/game';
import React, { type ReactNode, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

const MAX_SHORTCUT_SLOTS = 5;
const LAUNCHERS: { [key: string] : string } = {
    'Electronic Arts': 'EA',
    'Epic Games': 'Epic',
    'Ubisoft': 'Uplay',
    'Rockstar Games': 'Rockstar',
}

interface Slot {
    slot: number;
    game: Game | null;
}

export default function Page() {
    const [loading, setLoading] = useState(true);
    const [games, setGames] = useState<Game[]>();

    useEffect(() => {
        const load = async () => {
            const games = await getGames();
            setGames(games);
            setLoading(false);
        }

        load();
    }, []);

    return (
        <div>
            
        </div>
    );
}
