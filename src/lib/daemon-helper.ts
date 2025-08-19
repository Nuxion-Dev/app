import Game from "@/types/game";

const DAEMON_URL = "http://localhost:5000/api";

export async function getGames(): Promise<Game[]> {
    try {
        const response = await fetch(`${DAEMON_URL}/get_games`);
        if (!response.ok) {
            throw new Error("Failed to fetch games");
        }
        return await response.json() as Game[];
    } catch (error) {
        console.error("Error fetching games:", error);
        return [];
    }
}
