import { invoke } from '@tauri-apps/api/core';

let time = 0;

const rpc: Record<string, Record<string, string | number>> = {
    home: {
        details: "Home",
        largeText: "Home",
        smallText: "Home",
        timestamp: time
    },
    games: {
        details: "Viewing games",
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
        largeText: "Recently launched",
        smallText: "Recently launched",
        timestamp: time
    },
    favourites: {
        details: "Viewing favourite games",
        largeText: "Favourites",
        smallText: "Favourites",
        timestamp: time
    },
}


export function toggle(enable: boolean) {
    if (enable) {
        time = Date.now();
    }

    invoke('rpc_toggle', { enable });
}

export function setRPC(name: string) {
    const selected = rpc[name];
    if (!selected) {
        throw new Error(`RPC ${name} not found`);
    }

    selected.timestamp = time;

    invoke('set_rpc', selected);
}