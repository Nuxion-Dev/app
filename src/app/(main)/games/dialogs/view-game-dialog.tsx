import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getSize } from "@/lib/utils"
import Game from "@/types/game"

export default function ViewGameDialog({
    game,
    open,
    onOpenChange
}: {
    game: Game,
    open: boolean,
    onOpenChange: (open: boolean) => void
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Viewing {game.name}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h2 className="font-semibold">Display Name</h2>
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap">{game.display_name}</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">Launcher</h2>
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap">{game.launcher_name}</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">Game Size</h2>
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap">{getSize(game.game_size)}</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">Last Played</h2>
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap">{game.last_played == 0 ? "Not played yet" : new Date(game.last_played * 1000).toLocaleString().replace(",", "")}</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">Game ID</h2>
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap">{game.game_id}</p>
                    </div>
                    <div>
                        <h2 className="font-semibold">Arguments</h2>
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap">{game.launch_args || "None"}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}