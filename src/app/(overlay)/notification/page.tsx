"use client";

import { useEffect, useState } from "react";
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
        const cardHeight = 80; // Approx height of one card
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
            const newY = screenHeight - height - (20 * scaleFactor);
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
                marginBottom: isHovered ? 0 : -70, // Card height approx 80-90, so -70 overlaps most of it
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
