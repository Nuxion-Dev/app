import { invoke } from '@tauri-apps/api/core';

let time = 0;

type RPC = { details: string; state?: string; largeText: string; smallText: string; timestamp: number }
const rpc: { [key: string]: RPC } = {
    home: {
        details: "Home",
        largeText: "Home",
        smallText: "Home",
        timestamp: time
    },
    games: {
        details: "Viewing games",
        state: "{total} games in library",
        largeText: "Games",
        smallText: "Games",
        timestamp: time
    },
    settings: {
        details: "Changing settings",
        largeText: "Settings",
        smallText: "Settings",
        timestamp: time
    },
    recentlyLaunched: {
        details: "Viewing recent games",
        state: "Recently launched {game}",
        largeText: "Recently launched",
        smallText: "Recently launched",
        timestamp: time
    },
    favourites: {
        details: "Viewing favourite games",
        state: "{total} favourite games",
        largeText: "Favourites",
        smallText: "Favourites",
        timestamp: time
    },
    friends: {
        details: "Viewing friends",
        state: "",
        largeText: "Friends",
        smallText: "Friends",
        timestamp: time
    },
    messages: {
        details: "Viewing messages",
        state: "",
        largeText: "Messages",
        smallText: "Messages",
        timestamp: time
    },
}


export function toggle(enable: boolean) {
    if (enable) {
        time = Date.now();
    }

    invoke('rpc_toggle', { enable });
}

export function setRPC(name: string, args: { [key: string]: string | number } = {}) {
    const selected: RPC = rpc[name];
    if (!selected) {
        throw new Error(`RPC ${name} not found`);
    }

    selected.timestamp = time;
    for (const [key, value] of Object.entries(selected)) {
        if (typeof value !== 'string') continue;
        for (const [argKey, argValue] of Object.entries(args)) {
            const argRegex = new RegExp(`{${argKey}}`, 'g');
            (selected as any)[key] = value.replace(argRegex, argValue as string);
        }
    }

    invoke('set_rpc', selected);
}