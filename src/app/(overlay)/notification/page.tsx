"use client";

import { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, primaryMonitor } from "@tauri-apps/api/window";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  icon?: string;
  duration?: number;
  remaining?: number;
  position?: "TopLeft" | "TopRight" | "BottomLeft" | "BottomRight";
}

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<"TopLeft" | "TopRight" | "BottomLeft" | "BottomRight">("BottomRight");
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Debounce hover to prevent flickering
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pos = params.get("pos");
      if (pos) {
        setPosition(pos as any);
      }
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();

    const unlisten = listen<Omit<NotificationPayload, "id">>("notify", async (event) => {
      const newNotif = {
        ...event.payload,
        id: Math.random().toString(36).substring(7),
        duration: event.payload.duration || 5000,
        remaining: event.payload.duration || 5000,
      };

      if (event.payload.position) {
        setPosition(event.payload.position);
      }

      try {
        const audio = new Audio("/notification.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Failed to play notification sound:", e));
      } catch (e) {
          console.error("Audio error:", e);
      }

      setNotifications((prev) => [...prev, newNotif]);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // Timer logic
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const interval = setInterval(() => {
        if (isHovered) return;

        setNotifications((prev) => {
            const next = prev.map(n => ({
                ...n,
                remaining: (n.remaining || 0) - 100
            })).filter(n => (n.remaining || 0) > 0);

            if (prev.length > 0 && next.length === 0) {
                appWindow.close();
            }
            
            return next;
        });
    }, 100);

    return () => clearInterval(interval);
  }, [isHovered]);

  const isTop = position.includes("Top");
  const isLeft = position.includes("Left");

  // Dynamic Window Resizing
  useEffect(() => {
    if (!isInitialized) return;

    const updateWindowSize = async () => {
        const appWindow = getCurrentWindow();
        const monitor = await primaryMonitor();
        if (!monitor) return;
        
        const scaleFactor = monitor.scaleFactor;
        const cardHeight = 120; // Increased to prevent cutting off content
        const gap = 10;
        const padding = 32; // 16px top + 16px bottom

        let contentHeight = 0;
        if (notifications.length === 0) {
            contentHeight = 0;
        } else if (isHovered) {
            // Expanded: Sum of all cards + gaps
            contentHeight = (notifications.length * cardHeight) + ((notifications.length - 1) * gap) + padding;
        } else {
            // Stacked: 1 card + small peek for others
            contentHeight = cardHeight + ((notifications.length - 1) * 10) + padding;
        }

        // Minimum height to avoid glitches
        const height = Math.max(150, contentHeight) * scaleFactor;
        const width = 400 * scaleFactor;

        // If Bottom aligned, we need to adjust Y position to keep anchor fixed
        if (!isTop) {
            const screenHeight = monitor.size.height;
            const currentPos = await appWindow.outerPosition();
            // Calculate new Y: ScreenHeight - NewHeight - Padding(20)
            // Ensure we don't go off-screen
            const newY = Math.max(0, screenHeight - height - (20 * scaleFactor));
            await appWindow.setPosition(new PhysicalPosition(currentPos.x, Math.round(newY)));
        }

        await appWindow.setSize(new PhysicalSize(width, Math.round(height)));
    };

    updateWindowSize();
  }, [notifications.length, isHovered, isTop, isInitialized]);

  return (
    <div 
      className={cn(
        "flex flex-col p-4 h-screen w-screen overflow-hidden bg-transparent gap-2 transition-all",
        isTop ? "justify-start" : "justify-end",
        isLeft ? "items-start" : "items-end"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => {
          // Calculate stack index (0 is newest/front)
          const stackIndex = notifications.length - 1 - index;
          
          // Visual offset for stacking
          // If Top: Stack downwards (positive Y)
          // If Bottom: Stack upwards (negative Y)
          const stackOffset = isTop ? 10 : -10;
          
          return (
            <motion.div
              layout
              key={notification.id}
              initial={{ opacity: 0, x: isLeft ? -50 : 50, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: isHovered ? 1 : 1 - stackIndex * 0.05,
                // When hovered: 0 offset.
                // When stacked: Offset by index.
                y: isHovered ? 0 : stackIndex * stackOffset,
                zIndex: notifications.length - stackIndex,
              }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm"
              style={{
                // When hovered: Normal flow (margin 0).
                // When stacked: Negative margin to pull them into a pile.
                // We use absolute positioning simulation via negative margins.
                // For the last item (newest), we don't want negative margin if bottom-aligned, 
                // otherwise it pushes the content below the container.
                marginBottom: isHovered ? 0 : (index === notifications.length - 1 ? 0 : -70), 
              }}
            >
              <Card className="p-4 flex items-start gap-4 shadow-lg border-border bg-background backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <Avatar className="h-10 w-10 rounded-lg border">
                  <AvatarImage src={notification.icon} alt="Icon" />
                  <AvatarFallback className="rounded-lg">NX</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <h4 className="text-sm font-semibold leading-none">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
