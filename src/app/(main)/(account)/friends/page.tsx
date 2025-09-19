"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EventName } from "@/lib/websocket";
import { UserData } from "@/types/user";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Check, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function Friends() {
    const [friends, setFriends] = useState<UserData[]>([
        {
            id: 4,
            username: "TestUser",
            friends: [],
            incoming_requests: [],
            outgoing_requests: [],
        },
        {
            id: 5,
            username: "DemoUser",
            friends: [],
            incoming_requests: [],
            outgoing_requests: [],
        }
    ]);
    const [incomingRequests, setIncomingRequests] = useState<UserData[]>([
        {
            id: 1,
            username: "ExampleUser",
            friends: [4],
            incoming_requests: [],
            outgoing_requests: [],
        },
        {
            id: 3,
            username: "SampleUser",
            friends: [],
            incoming_requests: [],
            outgoing_requests: [],
        }
    ]);
    const [outgoingRequests, setOutgoingRequests] = useState<UserData[]>([
        {
            id: 2,
            username: "AnotherUser",
            friends: [],
            incoming_requests: [],
            outgoing_requests: [],
        }
    ]);

    const [usernameToAdd, setUsernameToAdd] = useState("");

    const addFriend = async () => {
        if (!usernameToAdd.trim()) return;

        await invoke("send", {
            event: EventName.UserSendFriendRequestEvent,
            data: [usernameToAdd.trim()]
        });
    }

    function filterMutualFriends(user: UserData) {
        return friends.filter(f => user.friends.includes(f.id));
    }

    useEffect(() => {
        const load = async () => {
            const unlisten = Promise.all([
                listen<string[]>(EventName.UserSendFriendRequestEvent, (event) => {
                    const friendId = event.payload[0];
                    // todo: fetch user data by id and add to incoming requests
                    // for now, just log it
                    console.log("Friend request sent to user ID:", friendId);
                    setIncomingRequests((prev) => [...prev]);
                })
            ]);

            return () => {
                unlisten.then(fn => fn.forEach(f => f()));
            }
        }

        const r = load();
        return () => {
            r.then(f => f());
        }
    }, [])

    return (
        <div className="flex h-full w-full">
            <div id="requests" className="w-1/4 border-r border-border p-4 bg-neutral-700/20 space-y-4">
                <h2 className="font-semibold text-lg">Friend Requests</h2>
                <div className="flex gap-2">
                    <Input
                        placeholder="Type in the username to add..."
                        value={usernameToAdd}
                        onChange={(e) => setUsernameToAdd(e.target.value)}
                    />
                    <Button
                        onClick={addFriend}
                        disabled={!usernameToAdd.trim()}
                    >
                        <UserPlus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-2">
                    {(incomingRequests.length === 0 && outgoingRequests.length === 0) && (
                        <p className="text-sm text-muted-foreground">No friend requests</p>
                    )}
                    <div>
                        {incomingRequests.map((user) => (
                            <div key={user.id} className="transition-all ease-in-out duration-150 rounded hover:bg-neutral-800/20 group">
                                <div className="w-[95%] mx-auto h-[1px] bg-neutral-800 group-hover:invisible transition-all ease-in-out duration-100"></div>
                                <div className="flex justify-between items-center p-2">
                                    <div className="flex gap-3 items-center">
                                        <Avatar>
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{user.username}</span>
                                            <span className="text-xs text-muted-foreground">{filterMutualFriends(user).length > 0 && `${filterMutualFriends(user).length} mutual friends • `}Incoming</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 text-sm text-muted-foreground/50">
                                        <span className="hover:text-green-400 transition-colors ease-in-out duration-150 cursor-pointer bg-neutral-800/50 hover:bg-neutral-800 p-2 rounded-full">
                                            <Check className="h-4 w-4" />
                                        </span>
                                        <span className="hover:text-red-400 transition-colors ease-in-out duration-150 cursor-pointer bg-neutral-800/50 hover:bg-neutral-800 p-2 rounded-full">
                                            <X className="h-4 w-4" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}