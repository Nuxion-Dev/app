import { useState, useEffect } from 'react';
import { BaseDirectory, exists, readFile, writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { fetch } from '@tauri-apps/plugin-http';

export function useCachedImage(url: string, filename: string, fallbackSrc: any) {
    const [src, setSrc] = useState<string | any>(fallbackSrc);

    useEffect(() => {
        let active = true;
        let objectUrl: string | null = null;

        const loadImage = async () => {
            try {
                const cacheDir = 'cache';
                const filePath = `${cacheDir}/${filename}`;
                
                // Ensure cache directory exists
                const cacheExists = await exists(cacheDir, { baseDir: BaseDirectory.AppData });
                if (!cacheExists) {
                    await mkdir(cacheDir, { baseDir: BaseDirectory.AppData, recursive: true });
                }

                const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
                let localData: Uint8Array | null = null;

                if (fileExists) {
                    localData = await readFile(filePath, { baseDir: BaseDirectory.AppData });
                    const array = new Uint8Array(localData);
                    const blob = new Blob([array.buffer]);
                    objectUrl = URL.createObjectURL(blob);
                    if (active) setSrc(objectUrl);
                }

                // Fetch from network to check for updates
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        const newData = new Uint8Array(buffer);
                        
                        // Check if data changed
                        let hasChanged = true;
                        if (localData && localData.length === newData.length) {
                            hasChanged = false;
                            for(let i = 0; i < localData.length; i++) {
                                if (localData[i] !== newData[i]) {
                                    hasChanged = true;
                                    break;
                                }
                            }
                        }

                        if (hasChanged) {
                            await writeFile(filePath, newData, { baseDir: BaseDirectory.AppData });
                            
                            const array = new Uint8Array(newData);
                            const blob = new Blob([array.buffer]);
                            if (objectUrl) URL.revokeObjectURL(objectUrl);
                            objectUrl = URL.createObjectURL(blob);
                            if (active) setSrc(objectUrl);
                        }
                    }
                } catch (e) {
                    // Ignore network errors if we have a cache, otherwise it stays as fallback
                    if (!fileExists) console.error("Failed to fetch image", e);
                }
            } catch (error) {
                console.error("Failed to load cached image", error);
            }
        };

        loadImage();

        return () => {
            active = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [url, filename, fallbackSrc]);

    return src;
}
