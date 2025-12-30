import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getDefaultSettings, readSettingsFile } from "./settings";
import { invoke } from "@tauri-apps/api/core";

export interface NotificationOptions {
  title: string;
  message: string;
  icon?: string; // URL to image
  duration?: number;
}

export async function showNotification(options: NotificationOptions) {
    // Try to send to overlay first
    try {
        const handled = await invoke<boolean>("send_notification", {
            notification: {
                id: Math.random().toString(36).substring(7),
                title: options.title,
                message: options.message,
                duration: (options.duration || 5000) / 1000, // Rust expects seconds
                elapsed: 0.0
            }
        });

        if (handled) {
            console.log("Notification handled by overlay");
            return;
        }
    } catch (e) {
        console.error("Failed to send notification to overlay:", e);
    }

    let notificationWindow = await WebviewWindow.getByLabel("notification");
    
    const monitor = await currentMonitor();
    if (!monitor) return;

    // Get settings for position
    const defaults = await getDefaultSettings();
    const settings = await readSettingsFile(defaults);
    const position = settings.notifications.position;

    const scaleFactor = monitor.scaleFactor;
    // Initial small size (enough for one card)
    const width = 400 * scaleFactor;
    const height = 150 * scaleFactor; 
    const padding = 20 * scaleFactor;

    const screenWidth = monitor.size.width;
    const screenHeight = monitor.size.height;
    
    let x = 0;
    let y = 0;

    switch (position) {
        case "TopLeft":
            x = padding;
            y = padding;
            break;
        case "TopRight":
            x = screenWidth - width - padding;
            y = padding;
            break;
        case "BottomLeft":
            x = padding;
            y = screenHeight - height - padding;
            break;
        case "BottomRight":
        default:
            x = screenWidth - width - padding;
            y = screenHeight - height - padding;
            break;
    }

    x = Math.round(x);
    y = Math.round(y);

    if (!notificationWindow) {
        console.log("Creating notification window");
        
        await new Promise<void>((resolve, reject) => {
            // Create the window dynamically if it doesn't exist
            notificationWindow = new WebviewWindow("notification", {
                url: `/notification?pos=${position}`,
                transparent: true,
                decorations: false,
                alwaysOnTop: true,
                skipTaskbar: true,
                resizable: false,
                width: 400,
                height: 150,
                x: x / scaleFactor,
                y: y / scaleFactor,
                visible: false,
                shadow: false,
            });

            let resolved = false;
            const onCreated = () => {
                if (resolved) return;
                resolved = true;
                console.log("Notification window created event received");
                resolve();
            };

            // Listen for both potential creation events to be safe
            notificationWindow.once("tauri://created", onCreated);
            notificationWindow.once("tauri://window-created", onCreated);
            
            notificationWindow.once("tauri://error", (e) => {
                if (resolved) return;
                resolved = true;
                console.error("Error creating notification window:", e);
                reject(e);
            });

            // Fallback timeout in case events are missed
            setTimeout(() => {
                if (!resolved) {
                    console.warn("Window creation timed out, assuming created...");
                    resolved = true;
                    resolve();
                }
            }, 1000);
        });
    }

    if (!notificationWindow) {
        console.error("Failed to create or get notification window");
        return;
    }

    // Ensure position is correct (in case of monitor changes or initial creation)
    await notificationWindow.setPosition(new PhysicalPosition(x, y));
    
    // Show the window
    await notificationWindow.show();
    await notificationWindow.setAlwaysOnTop(true);
    //await notificationWindow.setFocus(); // Optional: bring to front

    // Send data to the window
    setTimeout(async () => {
        await emit("notify", { ...options, position });
    }, 500);
}

