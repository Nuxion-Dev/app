"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface HotkeyRecorderProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function HotkeyRecorder({ value, onChange, disabled }: HotkeyRecorderProps) {
    const [recording, setRecording] = useState(false);

    useEffect(() => {
        if (!recording) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // Ignore standalone modifier presses for the final value, 
            // but we could display them if we wanted a live preview.
            if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
                return;
            }

            const modifiers = [];
            if (e.ctrlKey) modifiers.push("Ctrl");
            if (e.shiftKey) modifiers.push("Shift");
            if (e.altKey) modifiers.push("Alt");
            if (e.metaKey) modifiers.push("Super");

            let key = e.key.toUpperCase();
            
            // Handle special keys
            if (key === " ") key = "Space";
            if (key === "ESCAPE") {
                setRecording(false);
                return;
            }

            // If no modifiers and it's a character, just use it
            // But usually we want at least one modifier or a function key
            
            const hotkey = [...modifiers, key].join("+");
            onChange(hotkey);
            setRecording(false);
        };

        // Use capture to ensure we get the event before others
        window.addEventListener("keydown", handleKeyDown, true);
        
        return () => {
            window.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [recording, onChange]);

    return (
        <div className="flex items-center gap-2">
            <Button 
                variant={recording ? "destructive" : "outline"}
                className={cn("min-w-[140px] justify-center font-mono", recording && "animate-pulse")}
                onClick={() => !disabled && setRecording(!recording)}
                disabled={disabled}
            >
                {recording ? "Press keys..." : (value || "Click to set")}
            </Button>
            {value && !recording && !disabled && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onChange("")}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
