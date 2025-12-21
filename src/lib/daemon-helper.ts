import Game from "@/types/game";
import { invoke } from "@tauri-apps/api/core";
import { setRPC } from "./rpc";
import { readFile } from "@tauri-apps/plugin-fs";
import { emit, emitTo } from "@tauri-apps/api/event";

const DAEMON_URL = "http://localhost:5000/api";

export async function ping(): Promise<boolean> {
    try {
        console.log("Pinging daemon...");
        const start = Date.now();
        const response = await fetch(`${DAEMON_URL}/ping`);
        const duration = Date.now() - start;
        console.log(`Ping response time: ${duration}ms`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

export async function getGames(): Promise<Game[]> {
    const response = await fetch(`${DAEMON_URL}/get_games`);
    if (!response.ok) {
        throw new Error("Failed to fetch games");
    }
    const res = await response.json();
    return res.games as Game[];
}

export async function getBanner(id: string) {
    const response = await fetch(`${DAEMON_URL}/get_banner/${encodeURIComponent(id)}`, {
        cache: "no-cache"
    });
    if (!response.ok) {
        throw new Error("Failed to fetch banner");
    }
    
    const res = await response.blob()
    return URL.createObjectURL(res);
}

export async function launch(id: string, name?: string): Promise<void> {
    const response = await fetch(`${DAEMON_URL}/launch_game/${id}`, { method: "POST" });
    if (!response.ok) {
        throw new Error("Failed to launch game");
    }

    const res = await response.json();
    if (res.pid) {
        void emit("game:start", { id, pid: res.pid, name });
        await invoke("add_game", {
            id,
            name: name || "Unknown Game",
            pid: `${res.pid}`
        });
        setRPC("playing");
    }
}

export async function updateGame(game: Game): Promise<void> {
    const response = await fetch(`${DAEMON_URL}/update/${game.game_id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(game)
    });

    if (!response.ok) {
        throw new Error("Failed to update game");
    }

    if (game.banner && !game.banner.startsWith("banners/")) {
        try {
            const data = await fetch(game.banner);
            const blob = await data.blob();
            console.log("Fetched banner blob:", blob);

            const reader = new FileReader();
            reader.onload = async (res) => {
                const buffer = res.target?.result;
                if (!buffer || typeof buffer === "string") return;

                const array = new Uint8Array(buffer);
                console.log("Banner array data:", array);
                const r = await fetch(`${DAEMON_URL}/update_banner/${game.game_id}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        banner: Array.from(array),
                    })
                });
                console.log(await r.json());
            }
            reader.readAsArrayBuffer(blob);
        } catch (error) {
            // assume the banner is not updated, ignore
        }
    }
}

export async function resetBanner(id: string) {
    const response = await fetch(`${DAEMON_URL}/reset_banner/${encodeURIComponent(id)}`, {
        method: "POST"
    });

    if (!response.ok) {
        throw new Error("Failed to reset banner");
    }

    const res = await response.blob()
    return URL.createObjectURL(res);
}

export async function addCustomGame(name: string, exe: string, args: string, banner?: string): Promise<Game> {
    if (!name || !exe) {
        throw new Error("Name and executable path are required");
    }

    let bannerData: any[] = [];
    if (banner) {
        const file = await readFile(banner);
        const blob = new Blob([new Uint8Array(file)], { type: "image/png" });
        bannerData = Array.from(new Uint8Array(await blob.arrayBuffer()));
    }

    const response = await fetch(`${DAEMON_URL}/custom_game`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            game: {
                name,
                display_name: name,
                game_dir: exe.substring(0, exe.lastIndexOf("\\")),
                exe_file: exe.substring(exe.lastIndexOf("\\") + 1),
                launch_args: args,
                launch_command: '"$DIR\\$EXE" $ARGS'
            },
            banner: bannerData
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error("Failed to add custom game");
    }

    return data.game as Game;
}

export async function removeCustomGame(id: string, name: string): Promise<void> {
    const response = await fetch(`${DAEMON_URL}/remove`, {
        method: "POST",
        body: JSON.stringify({ game_id: id, name }),
    });

    if (!response.ok) {
        throw new Error("Failed to remove custom game");
    }
}

export async function refresh() {
    await fetch(`${DAEMON_URL}/refresh`);
}