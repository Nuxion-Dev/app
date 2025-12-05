"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Monitor, Mic, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClipPlayerProps {
    videoSrc: string;
    desktopAudioSrc: string | null;
    micAudioSrc: string | null;
    autoPlay?: boolean;
}

function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ClipPlayer({ videoSrc, desktopAudioSrc, micAudioSrc, autoPlay = false }: ClipPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const desktopRef = useRef<HTMLAudioElement>(null);
    const micRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);

    useEffect(() => {
        setTimeout(async () => {
            if (autoPlay) {
                await play();
            }
        }, 10);
    }, [autoPlay]);

    const play = async () => {
        videoRef.current?.play().catch(e => console.error("Playback failed", e));
    };

    const pause = () => {
        videoRef.current?.pause();
    };

    const togglePlay = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying]);

    const onSeek = (value: number[]) => {
        const time = value[0];
        if (videoRef.current) videoRef.current.currentTime = time;
        if (desktopRef.current) desktopRef.current.currentTime = time;
        if (micRef.current) micRef.current.currentTime = time;
        setCurrentTime(time);
    };

    // Handle audio playback state based on video state
    const onVideoPlay = () => {
        setIsPlaying(true);
        desktopRef.current?.play().catch(() => {});
        micRef.current?.play().catch(() => {});
    };

    const onVideoPause = () => {
        setIsPlaying(false);
        desktopRef.current?.pause();
        micRef.current?.pause();
    };

    // Ensure audio plays if it loads while video is already playing
    useEffect(() => {
        if (isPlaying) {
            desktopRef.current?.play().catch(() => {});
            micRef.current?.play().catch(() => {});
        }
    }, [desktopAudioSrc, micAudioSrc]);

    // Sync loop
    useEffect(() => {
        let animationFrame: number;
        
        const sync = () => {
            if (videoRef.current) {
                const targetTime = videoRef.current.currentTime;
                setCurrentTime(targetTime);
                
                // Drift correction
                const checkSync = (audio: HTMLAudioElement | null) => {
                    if (audio && !audio.paused) {
                        const diff = Math.abs(audio.currentTime - targetTime);
                        if (diff > 0.05) {
                            audio.currentTime = targetTime;
                        }
                    }
                };

                checkSync(desktopRef.current);
                checkSync(micRef.current);
            }
            animationFrame = requestAnimationFrame(sync);
        };
        
        if (isPlaying) {
            sync();
        }
        
        return () => cancelAnimationFrame(animationFrame);
    }, [isPlaying]);

    // Volume management
    useEffect(() => {
        const vol = isMuted ? 0 : volume;
        if (desktopRef.current) desktopRef.current.volume = vol;
        if (micRef.current) micRef.current.volume = vol;
    }, [volume, isMuted, desktopAudioSrc, micAudioSrc]);

    // Duration
    const onLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div 
            ref={containerRef}
            className="relative group bg-black w-full h-full flex flex-col justify-center overflow-hidden"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <video 
                ref={videoRef}
                src={videoSrc}
                autoPlay={autoPlay}
                className="w-full h-full object-contain"
                onLoadedMetadata={onLoadedMetadata}
                onClick={togglePlay}
                onPlay={onVideoPlay}
                onPause={onVideoPause}
                onEnded={onVideoPause}
            />
            {desktopAudioSrc && <audio ref={desktopRef} src={desktopAudioSrc} />}
            {micAudioSrc && <audio ref={micRef} src={micAudioSrc} />}

            {/* Controls Overlay */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0"
            )}>
                {/* Progress Bar */}
                <div className="mb-4 flex items-center gap-2">
                    <span className="text-xs text-white font-mono w-10 text-right">{formatTime(currentTime)}</span>
                    <Slider 
                        value={[currentTime]} 
                        max={duration} 
                        step={0.01}
                        onValueChange={onSeek}
                        className="flex-1 cursor-pointer"
                    />
                    <span className="text-xs text-white font-mono w-10">{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20">
                            {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                        </Button>

                        {/* Unified Volume Control */}
                        <div className="flex items-center gap-2 group/vol">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsMuted(!isMuted)}
                                className={cn("text-white hover:bg-white/20", isMuted && "text-red-400")}
                            >
                                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                            </Button>
                            <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                                <Slider 
                                    value={[isMuted ? 0 : volume]} 
                                    max={1} 
                                    step={0.01}
                                    onValueChange={(v) => {
                                        setVolume(v[0]);
                                        if (v[0] > 0) setIsMuted(false);
                                    }}
                                    className="w-20"
                                />
                            </div>
                        </div>
                    </div>

                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                        <Maximize className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
