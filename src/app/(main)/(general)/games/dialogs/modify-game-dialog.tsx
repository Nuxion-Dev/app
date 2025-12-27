import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Game from "@/types/game"
import { useState } from "react"
import { open as o } from "@tauri-apps/plugin-dialog"
import { readFile } from "@tauri-apps/plugin-fs"
import { Checkbox } from "@/components/ui/checkbox"
import { getBanner, refetchBanner, resetBanner } from "@/lib/daemon-helper"

export default function ModifyGameDialog({
    game,
    open,
    onOpenChange,
    onGameModified
}: {
    game: Game,
    open: boolean,
    onOpenChange: (open: boolean) => void,
    onGameModified: (updated: Game, reset: boolean, banner?: string) => void
}) {
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState(game.display_name);
    const [args, setArgs] = useState(game.launch_args);
    const [hidden, setHidden] = useState(game.hidden);
    const [banner, setBanner] = useState(game.banner);
    const [bannerUrl, setBannerUrl] = useState<string>();

    const handleSelectBanner = async () => {
        const result = await o({
            title: "Select a Banner",
            filters: [
                {
                    name: "Images",
                    extensions: ["jpg", "jpeg", "png"]
                }
            ]
        });

        if (result) {
            setBanner(result);

            const file = await readFile(result);
            const blob = new Blob([new Uint8Array(file)], { type: "image/png" });
            setBannerUrl(URL.createObjectURL(blob));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col min-w-[600px]">
                {error && <p className="text-red-500 py-2">Error: {error}</p>}

                <DialogHeader>
                    <DialogTitle>Modifying {game.name}</DialogTitle>
                </DialogHeader>

                <div className="flex gap-8">
                    <div className="space-y-4 w-3/5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="args">Launch Arguments</Label>
                            <Input id="args" value={args} onChange={(e) => setArgs(e.target.value)} />
                        </div>
                        <div className="flex items-center space-x-2 justify-end pt-2">
                            <Checkbox id="hidden" checked={hidden} onCheckedChange={(checked) => setHidden(checked as boolean)} />
                            <Label htmlFor="hidden">Hidden</Label>
                        </div>
                    </div>
                    <div className="w-2/5 relative">
                        <div className="h-[300px] relative rounded transition-colors ease-in-out duration-200 cursor-pointer bg-neutral-800/70 hover:bg-neutral-800/85" onClick={handleSelectBanner}>
                            {banner && bannerUrl ? (
                                <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover rounded" />
                            ) : (
                                <span className="text-muted-foreground absolute inset-0 flex items-center justify-center">No banner selected</span>
                            )}
                        </div>
                        {(game.custom_banner && game.launcher_name != "Custom") 
                            ? (<Button variant="link" size="sm" className="absolute left-0 top-0 z-10" onClick={async () => {
                                setError(null);
                                const banner = await resetBanner(game.game_id);
                                onGameModified({ ...game, custom_banner: false }, true, banner);

                                setBanner(undefined);
                                setBannerUrl(undefined);
                            }}>Reset Banner</Button>)
                            : game.launcher_name != "Custom" && (<Button variant="link" size="sm" className="absolute left-0 top-0 z-10" onClick={async () => {
                                setBanner(undefined);
                                setBannerUrl(undefined);
                                setError(null);

                                const banner = await refetchBanner(game.game_id);
                                onGameModified({ ...game }, true, banner);
                            }}>Redownload Banner</Button>)
                        }
                    </div>
                </div>

                <Button className="self-end" onClick={() => {
                    if (!name.trim()) {
                        setError("Please fill in all fields");
                        return;
                    }

                    setError(null);
                    onGameModified({ ...game, display_name: name, launch_args: args, banner, hidden, custom_banner: !!bannerUrl }, false, bannerUrl);

                    setBanner(undefined);
                    setBannerUrl(undefined);
                }}>Save Changes</Button>
            </DialogContent>
        </Dialog>
    )
}