"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Game from "@/types/game";
import { Plus } from "lucide-react";
import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { set } from "date-fns";
import path from "path";

export type CustomGameInfo = {
    name: string;
    exe: string;
    args: string;
    banner?: string;
}

export default function AddGameDialog({
    onAdd
}: {
    onAdd: (game: CustomGameInfo) => void;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [executable, setExecutable] = useState("");
    const [args, setArgs] = useState("");
    const [banner, setBanner] = useState<any>();
    const [bannerUrl, setBannerUrl] = useState<string>("");

    const handleSelectBanner = async () => {
        const result = await open({
            title: "Select a banner image",
            multiple: false,
            directory: false,
            filters: [
                { name: "Images", extensions: ["jpg", "jpeg", "png"] }
            ]
        });

        if (result) {
            setBanner(result);

            const file = await readFile(result);
            const blob = new Blob([new Uint8Array(file)], { type: "image/png" });
            setBannerUrl(URL.createObjectURL(blob));
        }
    }

    const handleSelectExecutable = async () => {
        const result = await open({
            title: "Select an executable file",
            filters: [
                { name: "Executables", extensions: ["exe", "app", "lnk"] }
            ]
        });

        if (result) {
            setExecutable(result);
            if (!name.trim())
                setName(result.substring(result.lastIndexOf("\\") + 1).split(".")[0]);
        }
    }

    return (
        <Dialog open={dialogOpen} onOpenChange={(o) => {
            if (!o) {
                setBannerUrl("");
                setBanner(undefined);
                setExecutable("");
                setName("");
            }
            
            setError(null);
            setDialogOpen(o);
        }}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2" />
                    Add Game
                </Button>
            </DialogTrigger>
            
            <DialogContent className="flex flex-col min-w-[600px]">
                {error && <p className="text-red-500 py-2">Error: {error}</p>}
                <DialogHeader>
                    <DialogTitle>Add Game</DialogTitle>
                </DialogHeader>
                <div className="flex gap-4 px-0.5">
                    <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="executable">Executable <span className="text-red-500">*</span></Label>
                            <div id="executable" onClick={handleSelectExecutable} className="cursor-pointer text-muted-foreground bg-neutral-800/70 rounded px-4 py-2 flex items-center justify-center hover:bg-neutral-800/85">
                                {executable ? (
                                    <span className="text-ellipsis overflow-hidden whitespace-nowrap max-w-64">{executable}</span>
                                ) : (
                                    <span>No file selected</span>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="args">Launch Arguments</Label>
                            <Input
                                id="args"
                                value={args}
                                onChange={(e) => setArgs(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-2/5">
                        <div className="h-[300px] relative rounded transition-colors ease-in-out duration-200 cursor-pointer bg-neutral-800/70 hover:bg-neutral-800/85" onClick={handleSelectBanner}>
                            {banner && bannerUrl ? (
                                <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover rounded" />
                            ) : (
                                <span className="text-muted-foreground absolute inset-0 flex items-center justify-center">No banner selected</span>
                            )}
                        </div>
                    </div>
                </div>

                <Button className="self-end mt-4" onClick={() => {
                    let missing: string[] = [];
                    if (!name.trim()) missing.push("name");
                    if (!executable) missing.push("executable");

                    if (missing.length > 0) {
                        setError(`Missing required fields: ${missing.join(", ")}`);
                        return;
                    }

                    onAdd({
                        name,
                        exe: executable,
                        args,
                        banner
                    });

                    setError(null);
                    setDialogOpen(false);
                    setBannerUrl("");
                    setBanner(undefined);
                    setName("")
                    setExecutable("");
                    setArgs("");
                }}>
                    Add Game
                </Button>   
            </DialogContent>
        </Dialog>
    )
}