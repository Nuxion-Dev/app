import type { Badge } from "./Badge";

export default interface User {
    id: string;
    photoUrl?: string;
    displayName: string;
    email: string;
    password: string;
    created_at: number;
    updated_at: number;
    online: boolean;
    experience: number;
    level: number;
    role: Role;
    badges: Badge[];
    subscriptions: Subscription[];
    friends: string[];
    friendRequests: string[];
    outgoingFriendRequests: string[];
}

export type Role = "user" | "admin";
export function hasPermium(user: User | null) {
    if (!user) return false;
    if (user.subscriptions.length) {
        for (const subscription of user.subscriptions) {
            if (subscription.id === "premium") return true;
        }
    }

    return true;
}

export interface Subscription {
    id: string;
    name: string;
    price: number;
    duration: number;
    created_at: Date;
    updated_at: Date;
}
