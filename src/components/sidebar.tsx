"use client";

import { cn } from '@/lib/utils';
import styles from './sidebar.module.scss';
import { User, getUser } from 'tauri-plugin-authium-api';
import { useEffect, useState } from 'react';
import Image, { StaticImageData } from 'next/image';

export default function Sidebar() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [avatar, setAvatar] = useState<string | StaticImageData>();

    let defaultAvatar: StaticImageData;
    useEffect(() => {
        const load = async () => {
            defaultAvatar = (await import('@/assets/img/default-photo.png')).default;

            const user = await getUser();
            user && setUser(user);

            setAvatar(user?.avatar || defaultAvatar);
            setLoading(false);
        }
        load();
    }, [])

    return (
        <aside className={cn("w-64 h-full bg-gray-800 text-white flex flex-col items-center py-5 z-50", styles.sidebar)}>
            <div className="w-full flex flex-col items-center mb-5">
                <div className="flex flex-col items-center">
                    {!loading && <Image unoptimized src={avatar!} alt="User Avatar" width={100} height={100} className="rounded-[50%] mb-2" />}
                    <h3 className="text-2xl font-semibold">{user?.username || 'Guest'}</h3>
                </div>
            </div>
        </aside>
    );
}