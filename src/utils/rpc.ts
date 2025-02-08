import { invoke } from '@tauri-apps/api/core';

type RPC = { details: string; state?: string; largeText: string; smallText: string; }
const rpc: { [key: string]: RPC } = {
    home: {
        details: "Home",
        largeText: "Home",
        smallText: "Home"
    },
    games: {
        details: "Viewing games",
        state: "{total} games in library",
        largeText: "Games",
        smallText: "Games"
    },
    settings: {
        details: "Changing settings",
        largeText: "Settings",
        smallText: "Settings"
    },
    recentlyLaunched: {
        details: "Viewing recent games",
        state: "Recently launched {game}",
        largeText: "Recently launched",
        smallText: "Recently launched"
    },
    favourites: {
        details: "Viewing favourite games",
        state: "{total} favourite games",
        largeText: "Favourites",
        smallText: "Favourites"
    },
    friends: {
        details: "Viewing friends",
        largeText: "Friends",
        smallText: "Friends"
    },
    messages: {
        details: "Viewing messages",
        largeText: "Messages",
        smallText: "Messages"
    },
    crosshair: {
        details: "Editing crosshair",
        largeText: "Crosshair",
        smallText: "Crosshair"
    },
    keybinds: {
        details: "Viewing keybind settings",
        largeText: "Keybinds",
        smallText: "Keybinds"
    },
    about: {
        details: "Viewing about page",
        largeText: "About",
        smallText: "About"
    },
    profile: {
        details: "Viewing profile",
        largeText: "Profile",
        smallText: "Profile"
    },
    game: {
        details: "Viewing game",
        state: "Playing {game}",
        largeText: "Playing {game}",
        smallText: "Playing {game}"
    }
}


export function toggle(enable: boolean) {
    invoke('rpc_toggle', { enable });
}

export function setRPC(name: string, args: { [key: string]: string | number } = {}) {
    const selected: RPC = rpc[name];
    if (!selected) {
        throw new Error(`RPC ${name} not found`);
    }

    for (const [key, value] of Object.entries(selected)) {
        if (typeof value !== 'string') continue;
        for (const [argKey, argValue] of Object.entries(args)) {
            const argRegex = new RegExp(`{${argKey}}`, 'g');
            (selected as any)[key] = value.replace(argRegex, argValue as string);
        }
    }

    invoke('set_rpc', {
        ...selected,
        timestamp: Date.now()
    });
}