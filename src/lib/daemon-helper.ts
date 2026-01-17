import Game from "@/types/game";
import { invoke } from "@tauri-apps/api/core";
import { setRPC } from "./rpc";
import { readFile } from "@tauri-apps/plugin-fs";

// Helper function for IPC requests
async function ipcRequest<T>(type: string, payload: any = {}): Promise<T> {
    return await invoke("ipc_request", { msgType: type, payload });
}

export async function ping(): Promise<boolean> {
    try {
        console.log("Pinging daemon...");
        const start = Date.now();
        await ipcRequest("ping");
        const duration = Date.now() - start;
        console.log(`Ping response time: ${duration}ms`);
        return true;
    } catch (error) {
        return false;
    }
}

export async function getGames(): Promise<Game[]> {
    try {
        const res = await ipcRequest<{ games: Game[] }>("get_games");
        return res.games || [];
    } catch (e) {
        throw new Error("Failed to fetch games");
    }
}

export async function getBanner(id: string) {
    try {
        // Assuming the daemon returns { banner: "base64..." } or { banner: "path/to/image" }
        // The original code used blob URL. If it's base64, we can usage it directly if it has prefix
        // or prepend data:image/png;base64,
        const res = await ipcRequest<{ banner: string }>("get_banner", { id });
        return res.banner;
    } catch (e) {
        throw new Error("Failed to fetch banner");
    }
}

export async function launch(id: string, name?: string): Promise<void> {
    try {
        const res = await ipcRequest<{ pid: number }>("launch_game", { id });
        if (res.pid) {
            await invoke("add_game", {
                id,
                name: name || "Unknown Game",
                pid: `${res.pid}`
            });
            setRPC("playing");
        }
    } catch (e) {
        throw new Error("Failed to launch game");
    }
}

export async function updateGame(game: Game): Promise<void> {
    try {
        // Payload is the game object itself for update_game
        await ipcRequest("update_game", game);

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
                    await ipcRequest("update_banner", {
                         id: game.game_id,
                         banner: Array.from(array)
                    });
                }
                reader.readAsArrayBuffer(blob);
            } catch (error) {
                // assume the banner is not updated, ignore
            }
        }
    } catch (e) {
        throw new Error("Failed to update game");
    }
}

export async function resetBanner(id: string) {
    try {
        const res = await ipcRequest<{ banner: string }>("reset_banner", { id });
        return res.banner;
    } catch (e) {
        throw new Error("Failed to reset banner");
    }
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

    try {
        const res = await ipcRequest<{ game: Game }>("custom_game", {
            game: {
                name,
                display_name: name,
                game_dir: exe.substring(0, exe.lastIndexOf("\\")),
                exe_file: exe.substring(exe.lastIndexOf("\\") + 1),
                launch_args: args,
                launch_command: '"$DIR\\$EXE" $ARGS'
            },
            banner: bannerData
        });
        return res.game;
    } catch (e) {
        throw new Error("Failed to add custom game");
    }
}

export async function removeCustomGame(id: string, name: string): Promise<void> {
    try {
        await ipcRequest("remove_game", { game_id: id, name });
    } catch (e) {
        throw new Error("Failed to remove custom game");
    }
}

export async function refresh() {
    // mapped to detect_games as per user provided handlers list which doesn't have refresh
    await ipcRequest("detect_games");
}

export async function refetchBanner(id: string) {
    try {
        const res = await ipcRequest<{ banner: string }>("refetch_banner", { id });
        return res.banner;
    } catch (e) {
        throw new Error("Failed to refetch banner");
    }
}
