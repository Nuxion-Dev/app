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
    friends: string[];
    friendRequests: string[];
    outgoingFriendRequests: string[];
}

export type Role = "user" | "admin";