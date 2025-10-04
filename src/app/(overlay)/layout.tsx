"use client";

import Spinner from '@/components/spinner';
import './overlay.scss';
import { useEffect, useState } from 'react';
import { ping } from '@/lib/daemon-helper';

export default function OverlayLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        async function checkDaemon(): Promise<void> {
            let retries = 0;
            const maxRetries = 20;
            while (true) {
                const ok = await ping();
                if (ok) {
                    setReady(true);
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** retries, 30000)));
                retries++;
                if (retries > maxRetries) {
                    break;
                }
            }
        }

        checkDaemon();
    }, []);

    const Base = ({ children }: { children: React.ReactNode }) => (
        <div className="bg-transparent text-foreground">
            {children}
        </div>
    );

    if (!ready) {
        return (
            <Base>
                <Spinner />
            </Base>
        )
    }
    return (
      <Base>
        {children}
      </Base>
    )
}