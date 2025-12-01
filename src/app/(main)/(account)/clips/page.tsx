"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/settings-provider";
import { readDir, stat } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Spinner from "@/components/spinner";
import { useRouter } from "next/navigation";
import { Calendar, Clock, CloudUpload, FolderOpen, Play, Settings as SettingsIcon, Video } from "lucide-react";
import { join } from "@tauri-apps/api/path";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Clip {
    name: string;
    path: string;
    src: string;
    date: Date;
    size: number;
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function ClipCard({ clip, onClick }: { clip: Clip; onClick: (clip: Clip) => void }) {
    const [duration, setDuration] = useState<number>(0);
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

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
    }, []);

    return (
        <Card 
            className="overflow-hidden group border-border/50 hover:border-border transition-all cursor-pointer hover:shadow-md"
            onClick={() => onClick(clip)}
        >
            <CardContent className="p-0 relative aspect-video bg-black">
                {!thumbnail ? (
                    <video 
                        ref={videoRef}
                        src={clip.src} 
                        className="w-full h-full object-contain opacity-0"
                        preload="metadata"
                        muted
                    />
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
                        <span>{format(clip.date, "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(clip.date, "h:mm a")}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default function Clips() {
    const { settings, loading: settingsLoading } = useSettings();
    const [clips, setClips] = useState<Clip[]>([
        // Mock data for testing
        {
            name: "Untitled",
            path: "/path/to/clip1.mp4",
            src: "file:///path/to/clip1.mp4",
            date: new Date(),
            size: 12345678
        },
        {
            name: "Gameplay Highlights",
            path: "/path/to/clip2.mp4",
            src: "file:///path/to/clip2.mp4",
            date: new Date(Date.now() - 86400000),
            size: 23456789
        }
    ]);
    const [loading, setLoading] = useState(true);
    const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (settingsLoading || !settings) return;

        const loadClips = async () => {
            try {
                const dir = settings.clips.clips_directory;
                const entries = await readDir(dir);
                
                const videoExtensions = [".mp4", ".mkv", ".avi", ".mov", ".webm"];
                const clipFiles = entries.filter(entry => 
                    entry.isFile && videoExtensions.some(ext => entry.name.toLowerCase().endsWith(ext))
                );

                const loadedClips = await Promise.all(clipFiles.map(async (entry) => {
                    const filePath = await join(dir, entry.name);
                    const fileStat = await stat(filePath);
                    
                    return {
                        name: entry.name,
                        path: filePath,
                        src: convertFileSrc(filePath),
                        date: fileStat.birthtime || new Date(),
                        size: fileStat.size
                    };
                }));

                // Sort by date descending
                loadedClips.sort((a, b) => b.date.getTime() - a.date.getTime());

                setClips(loadedClips);
            } catch (error) {
                console.error("Failed to load clips:", error);
            } finally {
                setLoading(false);
            }
        };

        loadClips();
    }, [settings, settingsLoading]);

    if (settingsLoading || loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clips</h1>
                    <p className="text-muted-foreground">
                        Manage your recorded game clips.
                    </p>
                </div>
                <div className="flex gap-2">
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
                        {selectedClip && (
                            <video 
                                src={selectedClip.src} 
                                className="w-full h-full"
                                controls
                                autoPlay
                            />
                        )}
                    </div>
                    <div className="p-4 bg-background border-t border-border flex items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle>{selectedClip?.name}</DialogTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="rounded-sm font-normal">
                                    Local Clip
                                </Badge>
                                <span>•</span>
                                <span>{selectedClip && format(selectedClip.date, "PPP p")}</span>
                                <span>•</span>
                                <span>{selectedClip && (selectedClip.size / (1024 * 1024)).toFixed(1)} MB</span>
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