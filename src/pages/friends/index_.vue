<script setup lang="ts">
import { sendNotification } from '@tauri-apps/plugin-notification';
import useWebsocket from '~/composables/useSocket';
import { emitTo, listen } from '@tauri-apps/api/event';
import Skeleton from '~/components/ui/skeleton/Skeleton.vue';
import type User from '~/utils/types/User';

let auth: any;
let user = ref<User | null>(null);

const friends = ref<User[]>([]);
const friendRequests = ref<User[]>([]);

const outgoingRequests = ref<User[]>([]);

const loading = ref(true);
let ws: any;

onMounted(async () => {
    auth = await useAuth();
    user.value = auth.user;
    if (!user.value) return;

    ws = await useWebsocket();
    if (!ws) return;

    const friendsList = await Promise.all(user.value.friends.map(async (id) => await auth.getUser(id)));
    friends.value = friendsList.filter((u) => u !== null) as User[];

    const friendRequestsList = await Promise.all(user.value.friendRequests.map(async (id) => await auth.getUser(id)));
    friendRequests.value = friendRequestsList.filter((u) => u !== null) as User[];

    const outgoingRequestsList = await Promise.all(user.value.outgoingFriendRequests.map(async (id) => await auth.getUser(id)));
    outgoingRequests.value = outgoingRequestsList.filter((u) => u !== null) as User[];

    loading.value = false;
});

async function update() {
    await auth.refresh();
    user = auth.user;
}

const userToAdd = ref("");
const add = async () => {
    if (!user.value) return;
    const u = user.value;

    const foundUser = await auth.getUser(userToAdd.value);
    if (!foundUser) {
        console.log("User not found");
        return;
    }

    if (foundUser.id === u.id) {
        return;
    }

    if (u.friends.includes(foundUser.id) || u.friendRequests.includes(foundUser.id) || u.outgoingFriendRequests.includes(foundUser.id)) {
        return;
    }

    userToAdd.value = "";
    await auth.update(foundUser.id, {
        friendRequests: [...u.friendRequests, u.id],
    });

    outgoingRequests.value.push(foundUser);
    ws.send({
        type: "friend_req",
        from: u.id,
        to: foundUser.id,
    });
};

const accept = async (u: any) => {
    if (!user.value) return;

    await auth.update(user.value.id, {
        friends: [...user.value.friends, u.id],
        friendRequests: user.value.friendRequests.filter((id: string) => id !== u.id),
    });

    await auth.update(u.id, {
        friends: [...u.friends, user.value.id],
        friendRequests: u.friendRequests.filter((id: string) => id !== user.value?.id),
    });

    friends.value.push(u);
    friendRequests.value = friendRequests.value!.filter((user: any) => user.id !== u.id);

    ws.send({
        type: "friend_accept",
        from: user.value.id,
        to: u.id,
    })
};

const notificationSettings = getSetting<NotificationSettings>("notifications") || DEFAULT_NOTIFICATIONS;
type FriendListener = {
    type: "friend_req" | "friend_accept" | "friend_decline" | "friend_remove" | "friend_status";
    from: string;
    online?: boolean;
}

const unlisten = await listen<FriendListener>('friend', async (event) => {
    const payload = event.payload;

    switch (payload.type) {
        case "friend_req": {
            const userId = payload.from;
            const foundUser = await auth.getUser(userId);
            if (foundUser) friendRequests?.value?.push(foundUser);

            if (notificationSettings.friend_request) emitTo('overlay', 'notification', {
                title: "Friend request",
                body: `${foundUser!.displayName} sent you a friend request`,
            });
            return;
        }

        case "friend_accept": {
            const userId = payload.from;
            const foundUser = await auth.getUser(userId);
            if (foundUser) friends?.value?.push(foundUser);

            friendRequests.value = friendRequests.value!.filter((u: any) => u.id !== userId);
            outgoingRequests.value = outgoingRequests.value.filter((u: any) => u.id !== userId);

            if (notificationSettings.friend_accept) emitTo('overlay', 'notification', {
                title: "Friend request accepted",
                body: `${foundUser!.displayName} accepted your friend request`,
            })
            return;
        }

        case "friend_decline": {
            const userId = payload.from;
            friendRequests.value = friendRequests.value!.filter((u: any) => u.id !== userId);
            outgoingRequests.value = outgoingRequests.value.filter((u: any) => u.id !== userId);
            return;
        }

        case "friend_remove": {
            const userId = payload.from;
            friends.value = friends.value.filter((u: any) => u.id !== userId);
            return;
        }

        case "friend_status": {
            const userId = payload.from;
            const status = payload.online;
            
            friends.value = friends.value!.map((u: any) => u.id !== userId ? u : { ...u, online: status });
            if (status && notificationSettings.friend_online) {
                const foundUser = friends.value.find((u: any) => u.id === userId);
                emitTo('overlay', 'notification', {
                    title: "Friend online",
                    icon: await auth.getPfpOfUser(foundUser!.id),
                    body: `${foundUser!.displayName} is now online`,
                });
            }
            return;
        }
    }
})

const decline = async (u: any) => {
    if (!user.value) return;

    await auth.update(user.value.id, {
        friendRequests: user.value.friendRequests.filter((id: string) => id !== u.id),
    });

    friendRequests.value = friendRequests.value!.filter((user: any) => user.id !== u.id);
    ws.send({
        type: "friend_decline",
        from: user.value.id,
        to: u.id,
    });
}

const cancel = async (u: any) => {
    if (!user.value) return;

    await auth.update(user.value.id, {
        friendRequests: user.value.friendRequests.filter((id: string) => id !== u.id),
    });
    
    outgoingRequests.value = outgoingRequests.value.filter((user: any) => user.id !== u.id);
    ws.send({
        type: "friend_decline",
        from: user.value.id,
        to: u.id,
    });
}

const remove = async (u: any) => {
    if (!user.value) return;

    await auth.update(user.value.id, {
        friends: user.value.friends.filter((id: string) => id !== u.id),
    });

    await auth.update(u.id, {
        friends: u.friends.filter((id: string) => id !== user.value!.id),
    });

    friends.value = friends.value!.filter((user: any) => user.id !== u.id);
    ws.send({
        type: "friend_remove",
        from: user.value.id,
        to: u.id,
    });
}

const userDropdown = (u: any) => [
    [
        {
            label: "Message",
            icon: "mdi:message",
            click: () => {
            },
        },
        {
            label: "Remove",
            icon: "mdi:account-remove",
            click: () => {
                remove(u);
            },
        },
    ],
];
</script>

<template>
    <NuxtLayout>
        <div class="sub-container">
            <Sidebar page="friends" />
            <div class="f-content">
                <div class="f-wrapper">
                    <div id="left" v-if="loading">
                        <div class="space-y-6">
                            <div class="flex gap-2">
                                <Skeleton 
                                    class="w-full h-12"
                                    :style="{ 'border-radius': '5px', 'background-color': 'var(--color-background)' }"
                                />
                                <Skeleton 
                                    class="w-12 h-12"
                                    :style="{ 'border-radius': '5px', 'background-color': 'var(--color-background)' }"
                                />
                            </div>
                            <div class="space-y-2">
                                <Skeleton 
                                    class="w-full h-6"
                                    :style="{ 'border-radius': '5px', 'background-color': 'var(--color-background)' }"
                                />
                                <Skeleton 
                                    class="w-[75%] h-6"
                                    :style="{ 'border-radius': '5px', 'background-color': 'var(--color-background)' }"
                                />
                            </div>
                        </div>
                    </div>
                    <div id="left" v-else>
                        <div class="add-friend">
                            <input
                                type="text"
                                placeholder="Search for friends..."
                                v-model="userToAdd"
                                autocomplete="off"
                            />
                            <button @click="add">
                                <Icon name="mdi:account-plus" />
                            </button>
                        </div>
                        <h2>Friend Requests</h2>
                        <div class="friends-requests" v-if="(friendRequests && friendRequests.length > 0) || outgoingRequests.length > 0">
                            <div class="friend-request" v-for="f in friendRequests">
                                <div class="friend-avatar">
                                    <Image
                                        :src="auth.getPfpOfUser(f.id)"
                                        :alt="f.id"
                                    />
                                </div>
                                <div class="friend-info">
                                    <h4>{{ f.displayName }}</h4>
                                    <p>Pending friend request</p>
                                </div>
                                <div class="actions">
                                    <div class="icon">
                                        <Icon
                                            class="green"
                                            name="material-symbols:check"
                                            @click="() => accept(f)"
                                        />
                                    </div>
                                    <div class="icon">
                                        <Icon
                                            class="red"
                                            name="material-symbols:close"
                                            @click="() => decline(f)"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div class="friend-request" v-for="f in outgoingRequests">
                                <div class="friend-avatar">
                                    <Image
                                        :src="auth.getPfpOfUser(f.id)"
                                        :alt="f.id"
                                    />
                                </div>
                                <div class="friend-info">
                                    <h4>{{ f.displayName }}</h4>
                                    <p>Outgoing request</p>
                                </div>
                                <div class="actions">
                                    <div class="icon">
                                        <Icon
                                            class="red"
                                            name="material-symbols:close"
                                            @click="() => cancel(f)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="no-pending" v-else>
                            <p>No pending friend requests</p>
                        </div>
                    </div>
                    <div id="right" v-if="loading">
                        <div class="space-y-6">
                            <Skeleton 
                                class="w-[25%] h-6"
                                :style="{ 'border-radius': '5px', 'background-color': 'var(--color-sidebar)' }"
                            />
                            <div class="flex gap-2">
                                <Skeleton 
                                    class="w-full h-10"
                                    :style="{ 'border-radius': '5px', 'background-color': 'var(--color-sidebar)' }"
                                />
                            </div>
                        </div>
                    </div> 
                    <div id="right" v-else>
                        <div class="friends">
                            <h2>Friends</h2>
                            <div class="filters">
                                <div class="search">
                                    <Icon name="mdi:magnify" />
                                    <input type="text" placeholder="Search" autocomplete="off" />
                                </div>
                            </div>
                            <div class="friends-list">
                                <div class="friend" v-for="f in friends">
                                    <div class="friend-avatar">
                                        <Image
                                            :src="auth.getPfpOfUser(f.id)"
                                            :alt="f.id"
                                        />
                                        <div class="status online" v-if="f.online"></div>
                                    </div>
                                    <div class="friend-info">
                                        <h4>{{ f.displayName }}</h4>
                                        <p v-if="f.online">Online</p>
                                        <p v-else>Offline</p>
                                    </div>
                                    <div class="actions">
                                        <div class="icon">
                                            <Icon name="mdi:message" />
                                        </div>
                                        <UDropdown :items="userDropdown(f)">
                                            <div class="icon">
                                                <Icon
                                                    name="heroicons:ellipsis-horizontal-20-solid"
                                                />
                                            </div>
                                        </UDropdown>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </NuxtLayout>
</template>

<style lang="scss">
.f-content {
    display: flex;
    background-color: var(--color-background);
    color: var(--color-text);
    overflow-y: auto;
    height: 100%;
    flex: 1;
}

.f-wrapper {
    display: flex;
    flex: 1;

    #left {
        display: flex;
        flex-direction: column;
        background-color: #242424;
        height: 100%;
        width: 320px;
        padding: 1em;
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
        overflow-y: auto;

        &::-webkit-scrollbar {
            width: 4px;
        }

        .add-friend {
            display: flex;
            gap: 4px;

            input {
                padding: 0.5em;
                outline: none;
                border-radius: 5px;
                background-color: #333;
                color: var(--color-text);
                border: solid 1px #333;
                font-size: 14px;
                font-weight: 400;
                flex: 1;
                transition: ease-in-out 0.15s;

                &:focus {
                    border: solid 1px var(--color-primary);
                }
            }

            button {
                width: 36px;
                border-radius: 5px;
                background-color: var(--color-primary);
                color: var(--color-text);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: background-color 0.2s;

                &:hover {
                    background-color: var(--color-accent);
                }
            }
        }

        h2 {
            font-size: 1.1em;
            font-weight: 500;
            margin: 20px 0 16px 0;
        }

        .no-pending {
            text-align: center;
            color: #bbb;
        }

        .friend-request {
            display: flex;
            gap: 1em;
            border-top: solid 1px var(--color-background);
            padding: 1em 0;
            align-items: center;

            .friend-avatar {
                img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                }
            }

            .friend-info {
                flex: 1;

                h4 {
                    margin: 0;
                    font-weight: 500;
                }

                p {
                    margin: 0;
                    color: #bbb;
                    font-size: 13px;
                }
            }

            .actions {
                display: flex;
                gap: 4px;
                align-self: center;

                .icon {
                    cursor: pointer;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: var(--color-sidebar);
                    transition: background-color 0.1s ease-in-out;

                    & > div {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        width: 100%;
                    }

                    &:hover {
                        background-color: var(--color-background);
                        .green {
                            color: rgb(60, 215, 52);
                        }

                        .red {
                            color: rgb(225, 50, 50);
                        }
                    }
                }
            }
        }
    }

    #right {
        padding: 1em;
        flex: 1;

        h2 {
            font-size: 1.1em;
            font-weight: 500;
            margin-bottom: 1em;
        }

        .friends {
            overflow: hidden;
            width: 100%;

            .filters {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 1em;

                .search {
                    display: flex;
                    align-items: center;
                    background-color: var(--color-sidebar);
                    border: solid 1px var(--color-sidebar);
                    padding: 4px 0.5em;
                    border-radius: 5px;
                    width: 100%;

                    input {
                        border: none;
                        background-color: transparent;
                        margin-left: 0.5em;
                        color: var(--color-text);
                        outline: none;
                    }

                    &:has(input:focus) {
                        border: solid 1px var(--color-primary);
                    }
                }
            }

            .friends-list {
                overflow: auto;
                display: flex;
                flex-wrap: wrap;
                gap: 1em;

                .friend {
                    border-radius: 5px;
                    display: flex;
                    gap: 1em;
                    width: 100%;
                    cursor: pointer;
                    padding: 0.5em 1em;
                    border-radius: 5px;

                    &:hover {
                        background-color: rgba(0, 0, 0, 0.2);
                    }

                    .friend-avatar {
                        position: relative;
                        img {
                            width: 50px;
                            height: 50px;
                            border-radius: 50%;
                        }

                        .status {
                            width: 16px;
                            height: 16px;
                            border-radius: 50%;
                            position: absolute;
                            bottom: 0;
                            right: 0;
                            border: solid 2px var(--color-background);

                            &.online {
                                background-color: rgb(60, 215, 52);
                            }

                            &.offline {
                                background-color: transparent;
                            }
                        }
                    }

                    .friend-info {
                        flex: 1;

                        h4 {
                            margin: 0;
                            font-weight: 500;
                        }

                        p {
                            margin: 0;
                            color: #bbb;
                            font-size: 13px;
                        }
                    }

                    .actions {
                        display: flex;
                        gap: 8px;
                        align-self: center;

                        .icon {
                            cursor: pointer;
                            border-radius: 50%;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background-color: rgb(20, 20, 20);
                            transition: background-color 0.1s ease-in-out;
                            color: white;

                            &:hover {
                                background-color: rgb(10, 10, 10);
                                color: rgb(220, 220, 220);
                            }
                        }
                    }
                }
            }
        }
    }
}
</style>
