"use client";

import { cn } from '@/lib/utils';
import styles from './sidebar.module.scss';
import { User, getUser, signIn } from 'tauri-plugin-authium-api';
import { useEffect, useState } from 'react';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';
import { Clock, Crosshair, GamepadIcon, Heart, House, LogIn, MessageCircle, Settings, Users, Video } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [avatar, setAvatar] = useState<string | StaticImageData>();
    const [activePage, setActivePage] = useState<string | null>(null);

    const page = usePathname();

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
    }, []);

    useEffect(() => {
        setActivePage(page);
    }, [page]);

    return (
        <aside className={cn("w-64 h-full bg-sidebar text-white flex flex-col items-center py-5 z-50", styles.sidebar)}>
            <div className="w-full flex flex-col items-center mb-5">
                <div className="flex flex-col items-center">
                    {!loading && <Image unoptimized src={avatar!} alt="User Avatar" width={100} height={100} className="rounded-[50%] mb-2 h-24 w-24" />}
                    <h3 className="text-2xl font-semibold">{user?.username || 'Guest'}</h3>
                </div>
            </div>
            <div className="flex flex-col w-full gap-2 p-4">
                <div className="flex flex-col">
                    <h2 className="font-medium tracking-wider mb-2 text-muted-foreground">General</h2>
                    <div className="flex flex-col gap-2">
                        <Link href="/" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                            activePage === '/' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                        )}>
                            <House className="w-5 h-5" />
                            <span>Home</span>
                        </Link>
                        <Link href="/games" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                            activePage === '/games' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                        )}>
                            <GamepadIcon className="w-5 h-5" />
                            <span>Games</span>
                        </Link>
                        <Link href="/games/favourites" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                            activePage === '/games/favourites' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                        )}>
                            <Heart className="w-5 h-5" />
                            <span>Favourites</span>
                        </Link>
                        <Link href="/games/recent" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                            activePage === '/games/recent' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                        )}>
                            <Clock className="w-5 h-5" />
                            <span>Recent</span>
                        </Link>
                    </div>
                </div>
                <div className="flex flex-col mt-4">
                    <h2 className="font-medium tracking-wider mb-2 text-muted-foreground">Account</h2>
                    <div className="flex flex-col gap-2">
                        {user ? (
                            <>
                                <Link href="/friends" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                                    activePage === '/friends' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                                )}>
                                    <div className="relative">
                                        <Users className="w-5 h-5" />
                                        {/* Dummy notification */}
                                        {false && <span className="absolute -top-1 -right-1 text-xs text-white bg-destructive rounded-full p-1"></span>}
                                    </div>
                                    <span>Friends</span>
                                </Link>
                                <Link href="/messages" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                                    activePage === '/messages' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                                )}>
                                    <div className="relative">
                                        <MessageCircle className="w-5 h-5" />
                                        {/* Dummy notification */}
                                        {false && <span className="absolute -top-1 -right-1 text-xs text-white bg-destructive rounded-full p-1"></span>}
                                    </div>
                                    <span>Messages</span>
                                </Link>
                                <Link href="/clips" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                                    activePage === '/clips' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                                )}>
                                    <Video className="w-5 h-5" />
                                    <span>Clips</span>
                                </Link>
                            </>
                        ) : (
                            <div onClick={() => signIn(null)} className="flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50">
                                <LogIn className="w-5 h-5" />
                                <span>Login</span>
                            </div>
                        )}
                        <Link href="/crosshair" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                            activePage === '/crosshair' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                        )}>
                            <Crosshair className="w-5 h-5" />
                            <span>Crosshair</span>
                        </Link>
                        <Link href="/settings" className={cn("flex items-center rounded py-2 px-4 transition-colors duration-200 gap-2 text-white/50",
                            activePage === '/settings' ? "bg-primary text-primary-foreground" : "hover:bg-black/10 hover:text-white"
                        )}>
                            <Settings className="w-5 h-5" />
                            <span>Settings</span>
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}