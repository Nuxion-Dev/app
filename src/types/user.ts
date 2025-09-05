export interface UserData {
    id: number;
    username: string;
    avatar?: string;

    status?: number; // Use Status enum from websocket.ts
    manual_status?: number; // Use Status enum from websocket.ts

    friends: number[];
    incoming_requests: number[];
    outgoing_requests: number[];
}