"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/settings-provider";
import { readDir, readTextFile, stat, readFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Spinner from "@/components/spinner";
import { useRouter } from "next/navigation";
import { Calendar, Clock, CloudUpload, FolderOpen, Play, Settings as SettingsIcon, Video } from "lucide-react";
import { join } from "@tauri-apps/api/path";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ErrorAlert from "@/components/error-alert";
import { Clip } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ClipPlayer } from "@/components/clip-player";
import { createClip } from "@/lib/clips";

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function ClipCard({ clip, onClick }: { clip: Clip; onClick: (clip: Clip) => void }) {
    const [duration, setDuration] = useState<number>(0);
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [videoSrc, setVideoSrc] = useState<string>("");
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let objectUrl: string | null = null;

        const loadVideo = async () => {
            try {
                // Remove file:// prefix if present for readFile
                const cleanPath = clip.path.replace(/^file:\/\/\/?/, "");
                const contents = await readFile(cleanPath);
                const blob = new Blob([contents], { type: "video/mp4" });
                objectUrl = URL.createObjectURL(blob);
                setVideoSrc(objectUrl);
            } catch (e) {
                console.error("Failed to load video blob", e);
            }
        };

        loadVideo();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [clip.path]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !videoSrc) return;

        const onLoadedMetadata = () => {
            setDuration(video.duration);
            video.currentTime = 0.1; // Seek to capture frame
        };

        const onSeeked = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                setThumbnail(canvas.toDataURL("image/jpeg"));
            } catch (e) {
                console.error("Failed to generate thumbnail", e);
            }
        };

        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("seeked", onSeeked);

        return () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("seeked", onSeeked);
        };
    }, [videoSrc]);

    return (
        <Card 
            className="overflow-hidden group border-border/50 hover:border-border transition-all cursor-pointer hover:shadow-md"
            onClick={() => onClick(clip)}
        >
            <CardContent className="p-0 relative aspect-video bg-black">
                {!thumbnail ? (
                    videoSrc && (
                        <video 
                            ref={videoRef}
                            src={videoSrc} 
                            className="w-full h-full object-contain opacity-0"
                            preload="metadata"
                            muted
                        />
                    )
                ) : (
                    <img src={thumbnail} alt={clip.name} className="w-full h-full object-cover" />
                )}
                
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <div className="bg-primary/90 rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="h-6 w-6 text-primary-foreground fill-current" />
                    </div>
                </div>

                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                    {duration ? formatDuration(duration) : "--:--"}
                </div>
            </CardContent>
            <div className="p-3 space-y-1">
                <h3 className="font-medium text-sm truncate" title={clip.name}>{clip.name}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(clip.metadata.created_at, "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(clip.metadata.created_at, "h:mm a")}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default function Clips() {
    const { settings, loading: settingsLoading } = useSettings();
    const [clips, setClips] = useState<Clip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
    const [playerSrc, setPlayerSrc] = useState<string | null>(null);
    const [desktopAudioSrc, setDesktopAudioSrc] = useState<string | null>(null);
    const [micAudioSrc, setMicAudioSrc] = useState<string | null>(null);
    
    const router = useRouter();

    const clip = async () => {
        try {
            // @ts-ignore
            const clip = await createClip(settings.clips);
            if (!clip) return;

            setClips((prev) => [clip, ...prev]);
        } catch (e) {
            console.error("Failed to create clip", e);
        }
    };

    useEffect(() => {
        if (!selectedClip) {
            setPlayerSrc(null);
            setDesktopAudioSrc(null);
            setMicAudioSrc(null);
            return;
        }

        let objectUrl: string | null = null;
        let desktopUrl: string | null = null;
        let micUrl: string | null = null;

        const loadPlayerVideo = async () => {
            try {
                const cleanPath = selectedClip.path.replace(/^file:\/\/\/?/, "");
                const contents = await readFile(cleanPath);
                const blob = new Blob([contents], { type: "video/mp4" });
                objectUrl = URL.createObjectURL(blob);
                setPlayerSrc(objectUrl);

                if (selectedClip.audioPaths?.desktop) {
                    const desktopPath = selectedClip.audioPaths.desktop.replace(/^file:\/\/\/?/, "");
                    const desktopContents = await readFile(desktopPath);
                    const desktopBlob = new Blob([desktopContents], { type: "audio/wav" });
                    desktopUrl = URL.createObjectURL(desktopBlob);
                    setDesktopAudioSrc(desktopUrl);
                }

                if (selectedClip.audioPaths?.mic) {
                    const micPath = selectedClip.audioPaths.mic.replace(/^file:\/\/\/?/, "");
                    const micContents = await readFile(micPath);
                    const micBlob = new Blob([micContents], { type: "audio/wav" });
                    micUrl = URL.createObjectURL(micBlob);
                    setMicAudioSrc(micUrl);
                }

            } catch (e) {
                console.error("Failed to load player media", e);
            }
        };

        loadPlayerVideo();

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            if (desktopUrl) URL.revokeObjectURL(desktopUrl);
            if (micUrl) URL.revokeObjectURL(micUrl);
        };
    }, [selectedClip]);

    useEffect(() => {
        if (settingsLoading || !settings) return;

        const loadClips = async () => {
            try {
                const dir = settings.clips.clips_directory;
                const clipsPath = await join(dir, "clips.json");
                const content = await readTextFile(clipsPath);
                const entries: Clip[] = JSON.parse(content).clips.map((clip: any) => {
                    const path = clip.path.replace(/^file:\/\/\/?/, "");
                    return {
                        ...clip,
                        src: path,
                        metadata: {
                            ...clip.metadata,
                            created_at: new Date(clip.metadata.created_at),
                        },
                    }
                });

                // Sort by date descending
                entries.sort((a, b) => b.metadata.created_at.getTime() - a.metadata.created_at.getTime());
                
                setError(null);
                setClips(entries);
            } catch (error) {
                setClips([]);
                setError("Failed to load clips.");
                console.error("Failed to load clips:", error);
            } finally {
                setLoading(false);
            }
        };

        loadClips();

        const listener = listen("clip:created", (event) => {
            console.log("Clip created event received:", event);
            //loadClips();
        });
        return () => {
            listener.then((unlisten) => unlisten());
        }
    }, [settings, settingsLoading]);

    if (settingsLoading || loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-6 space-y-6 w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clips</h1>
                    <p className="text-muted-foreground">
                        Manage your recorded game clips.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => clip()}>
                        Create Clip (TEST)
                    </Button>
                    <Button variant="outline" onClick={() => open(settings!.clips.clips_directory)}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Open Folder
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/settings?tab=clips")}>
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Settings
                    </Button>
                </div>
            </div>

            {error && <ErrorAlert>{error}</ErrorAlert>}

            {clips.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-lg p-12 text-center">
                    <Video className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No clips found</h3>
                    <p className="text-muted-foreground mb-4">
                        Start recording your gameplay to see clips here.
                    </p>
                    <Button onClick={() => router.push("/settings?tab=clips")}>
                        Configure Recording
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {clips.map((clip) => (
                        <ClipCard key={clip.name} clip={clip} onClick={setSelectedClip} />
                    ))}
                </div>
            )}

            <Dialog open={!!selectedClip} onOpenChange={(open) => !open && setSelectedClip(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-neutral-800">
                    <div className="relative aspect-video bg-black flex items-center justify-center">
                        {selectedClip && playerSrc ? (
                            <ClipPlayer 
                                videoSrc={playerSrc}
                                desktopAudioSrc={desktopAudioSrc}
                                micAudioSrc={micAudioSrc}
                                autoPlay
                            />
                        ) : (
                            <div className="text-white">Loading...</div>
                        )}
                    </div>
                    <div className="p-4 bg-background border-t border-border flex items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle>{selectedClip?.name}</DialogTitle>
                            <DialogDescription className="hidden">Clip Preview</DialogDescription>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="rounded-sm font-normal">
                                    Local Clip
                                </Badge>
                                <span>•</span>
                                <span>{selectedClip && format(selectedClip.metadata.created_at, "PPP p")}</span>
                                <span>•</span>
                                <span>{selectedClip && (selectedClip.metadata.size / (1024 * 1024)).toFixed(1)} MB</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button disabled variant="secondary">
                                <CloudUpload className="mr-2 h-4 w-4" />
                                Upload (Coming Soon)
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}