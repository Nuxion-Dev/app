export default interface User {
    id: string;
    displayName: string;
    email: string;
    created_at: Date;
    updated_at: Date;
    role: Role;
    subscriptions: Subscription[];
    friends: User[];
}

export type Role = "user" | "admin";

export interface Subscription {
    id: string;
    name: string;
    price: number;
    duration: number;
    created_at: Date;
    updated_at: Date;
}