"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomCrosshair } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface CrosshairCreatorProps {
    onSave: (crosshair: CustomCrosshair) => void;
    trigger?: React.ReactNode;
}

const CANVAS_SIZE = 300;

export default function CrosshairCreator({ onSave, trigger }: CrosshairCreatorProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("My Crosshair");
    const [gridSize, setGridSize] = useState(32);
    const [grid, setGrid] = useState<boolean[][]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawMode, setDrawMode] = useState<boolean>(true); // true = draw, false = erase

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initialize grid when size changes
    useEffect(() => {
        setGrid(Array(gridSize).fill(false).map(() => Array(gridSize).fill(false)));
    }, [gridSize]);

    // Draw canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !grid.length) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cellSize = CANVAS_SIZE / gridSize;

        // Clear
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw checkerboard background for better visibility
        const checkSize = 10;
        for (let i = 0; i < CANVAS_SIZE; i += checkSize) {
            for (let j = 0; j < CANVAS_SIZE; j += checkSize) {
                ctx.fillStyle = (i / checkSize + j / checkSize) % 2 === 0 ? "#f0f0f0" : "#ffffff";
                ctx.fillRect(i, j, checkSize, checkSize);
            }
        }
        
        // Draw cells
        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    ctx.fillStyle = "#000000"; // Active pixel color
                    ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
                }
            });
        });

        // Draw grid lines (optional, maybe only for small grids or low opacity)
        ctx.strokeStyle = "rgba(128, 128, 128, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= gridSize; i++) {
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, CANVAS_SIZE);
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(CANVAS_SIZE, i * cellSize);
        }
        ctx.stroke();

        // Draw center lines
        const center = CANVAS_SIZE / 2;
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.moveTo(center, 0);
        ctx.lineTo(center, CANVAS_SIZE);
        ctx.moveTo(0, center);
        ctx.lineTo(CANVAS_SIZE, center);
        ctx.stroke();

    }, [grid, gridSize]);

    const handleInteract = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellSize = CANVAS_SIZE / gridSize;
        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);

        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
            if (grid[row][col] !== drawMode) {
                const newGrid = [...grid];
                newGrid[row] = [...newGrid[row]];
                newGrid[row][col] = drawMode;
                setGrid(newGrid);
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        // Determine mode based on the cell we clicked
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cellSize = CANVAS_SIZE / gridSize;
        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);
        
        if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
            setDrawMode(!grid[row][col]);
            // Apply immediately
            const newGrid = [...grid];
            newGrid[row] = [...newGrid[row]];
            newGrid[row][col] = !grid[row][col];
            setGrid(newGrid);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        handleInteract(e);
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
    };

    const handleSave = () => {
        const newCrosshair: CustomCrosshair = {
            id: uuidv4(),
            name,
            grid
        };
        onSave(newCrosshair);
        setOpen(false);
        // Reset
        clearGrid();
        setName("My Crosshair");
    };

    const clearGrid = () => {
        setGrid(Array(gridSize).fill(false).map(() => Array(gridSize).fill(false)));
    };

    const onOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            // Reset when closing
            clearGrid();
            setName("My Crosshair");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {trigger || <Button>Create Custom Crosshair</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Create Custom Crosshair</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="size" className="text-right">
                            Grid Size
                        </Label>
                        <Select 
                            value={gridSize.toString()} 
                            onValueChange={(v) => setGridSize(Number(v))}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="16">16x16</SelectItem>
                                <SelectItem value="32">32x32</SelectItem>
                                <SelectItem value="64">64x64</SelectItem>
                                <SelectItem value="128">128x128</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative flex justify-center p-4 bg-muted/20 rounded-md border">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_SIZE}
                            height={CANVAS_SIZE}
                            className="cursor-crosshair bg-white border shadow-sm"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                        {!isDrawing && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/50 text-white text-sm px-2 py-1 rounded">Click and drag to draw</div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between">
                         <Button variant="outline" onClick={clearGrid}>Clear</Button>
                         <Button onClick={handleSave}>Save Crosshair</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
