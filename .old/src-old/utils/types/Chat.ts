import type User from "./User";

export interface Chat {
    id: string;
    name: string;
    users: User[];
    messages: Message[];
}

export interface Message {
    id: string;
    content: string;
    created_at: Date;
    updated_at: Date;
    user: User;
}