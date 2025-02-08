<script setup lang="ts">
import type User from '~/utils/types/User';
import useWebsocket from '~/composables/useSocket';
import Skeleton from '~/components/ui/skeleton/Skeleton.vue';

const loading = ref(true);
let auth;

let ws = null;
let user = ref<User | null>(null);

const search = ref('');
const showDropdown = ref(false);

type ChatForm = {
    chatId: string;
    users: string[];
}

type Chat = {
    chatId: string;
    users: User[];
    messages: Message[];
}

type Message = {
    messageId: string;
    chatId: string;
    from: string;
    message: string;

    sentAt: number;
    read: boolean;
}
const openChat = ref<Chat | null>(null);
const chats = ref<Chat[]>([]);
const message = ref('');

const runtimeConfig = useRuntimeConfig();
const API_URL = runtimeConfig.public.API_URL;
onMounted(async () => {
    auth = await useAuth();
    user.value = auth.user;
    if (!user.value) {
        await navigateTo('/login');
        return;
    }

    ws = await useWebsocket();
    if (!ws) return;

    watch(ws.data, (data: any) => {
        if (!data) return;
        const json = JSON.parse(data);
        switch (json.type) {
            case "message":
                const msg: Message = json.message;
                const chat = chats.value.find(c => c.chatId === msg.chatId);
                if (!chat) return;
                chat.messages.push(msg);
                break;
            case "read":
                const read: { chatId: string, messageId: string } = json.read;
                const c = chats.value.find(c => c.chatId === read.chatId);
                if (!c) return;
                const m = c.messages.find(m => m.messageId === read.messageId);
                if (!m) return;
                m.read = true;
                break;
        }
    });

    const res: ChatForm[] = await $fetch(API_URL + '/chats/' + user.id);
    for (const chat of res) {
        const messages: Message[] = await $fetch(API_URL + '/chat/' + chat.chatId + '/messages');
        const c: Chat = await parseChat(chat);
        c.messages = messages;
    }

    chats.value.sort((a, b) => {
        const aTime = a.messages[a.messages.length - 1].sentAt;
        const bTime = b.messages[b.messages.length - 1].sentAt;
        return aTime - bTime;
    });
    
    loading.value = false;
});

async function parseChat(chat: any): Promise<Chat> {
    const users = [];
    for (const u of chat.users.filter((u: any) => u !== user.id)) {
        const res = await auth.getUser(u);
        if (!res) continue;
        users.push(res);
    }
    return { chatId: chat.chatId, users, messages: [] };
}

function getNameOfMessage(chat: Chat, message: Message): string {
    const u = chat.users.find(u => u.id === message.from);
    if (!u) return '';
    return u.id == user.id ? 'You' : u.displayName;
}

function createNewChat(friend: User) {
    const foundChat = chats.value.find(c => c.users.map(u => u.id).includes(friend.id));
    if (foundChat) {
        openChat.value = foundChat;
        return;
    }

    const chat: Chat = {
        chatId: '',
        users: [user, friend],
        messages: [{ messageId: '', chatId: '', from: user.id, message: 'Hello!', sentAt: Date.now(), read: true }, { messageId: '', chatId: '', from: friend.id, message: 'Hi!', sentAt: Date.now(), read: true }]
    };
    chats.value.push(chat);
    openChat.value = chat;
}

function send() {
    console.log(openChat.value);
    if (!openChat.value) return;
    console.log(message.value);
    if (message.value.trim() == '') return;
    console.log('sending');

    const to = openChat.value.users.filter(u => u.id != user.id)[0].id;
    const msg = { to, chatId: openChat.value.chatId, message: message.value };
    ws.send(JSON.stringify({ type: "message", message: msg }));

    message.value = '';
}

const open = (chat: Chat) => {
    openChat.value = chat;
    openChat.value.messages.forEach(m => {
        if (!m.read) {
            ws.send(JSON.stringify({ type: "read", read: { chatId: chat.chatId, messageId: m.messageId } }));
        }
    });
}
</script>

<template>
    <NuxtLayout>
        <div class="sub-container">
            <Sidebar page="messages" />
            <div class="content no-padding">
                <div class="messages-container">
                    <div class="contacts">
                        <h1>Chats</h1>
                        <div class="actions" v-if="!loading">
                            <div class="search">
                                <label for="search">
                                    <Icon name="mdi:magnify" />
                                </label>
                                <input type="search" v-model="search" id="search" name="search" autocomplete="off" placeholder="Search...">
                            </div>
                            <div class="add">
                                <div class="add-btn" @click="showDropdown = !showDropdown">
                                    <Icon name="mdi:account-plus" />
                                    New
                                </div>
                                <SelectFriend v-if="showDropdown" :create="(u: User) => {
                                    showDropdown = false;
                                    createNewChat(u);
                                }" />
                            </div>
                        </div>
                        <div class="actions" v-else>
                            <div class="flex gap-2 w-full">
                                <Skeleton 
                                    class="w-full h-12" 
                                    :style="{
                                        'border-radius': '0.5rem',
                                        'background-color': 'var(--color-background)',
                                    }"
                                />
                                <Skeleton 
                                    class="w-32 h-12" 
                                    :style="{
                                        'border-radius': '0.5rem',
                                        'background-color': 'var(--color-background)',
                                    }"
                                />
                            </div>
                        </div>
                        <div class="contact-list" v-if="!loading">
                            <div class="contact" :class="{ open: openChat?.chatId === chat.chatId }" v-for="chat of chats" @click="open(chat)">
                                <div class="avatar">
                                    <Image :src="auth.getPfpOfUser(chat.users.filter(u => u.id != user.id)[0].id)" alt="User avatar" />
                                </div>
                                <div class="info">
                                    <h3>{{ chat.users.filter(u => u.id != user.id).map(u => u.displayName).join(", ") }}</h3>
                                    <div class="last_message" v-if="chat.messages.length > 0">
                                        <p>{{ getNameOfMessage(chat, chat.messages[chat.messages.length - 1]) }}: {{ chat.messages[chat.messages.length - 1].message }}</p>
                                    </div>
                                </div>
                                <small v-if="chat.messages.length > 0">{{ millisToTime(chat.messages[chat.messages.length - 1].sentAt) }} <span class="unread" v-if="chat.messages.find(m => !m.read)"></span></small>
                            </div>
                        </div>
                        <div v-else>
                            <div class="space-y-2">
                                <Skeleton
                                    :key="i"
                                    v-for="i in 5"
                                    class="w-full h-24"
                                    :style="{
                                        'border-radius': '0.5rem',
                                        'background-color': 'var(--color-background)',
                                    }"
                                />
                            </div>
                        </div>
                    </div>
                    <div class="message-content" v-if="!loading && openChat != null">
                        <div class="contact">
                            <div class="info">
                                <div class="avatar">
                                    <Image :src="auth.getPfpOfUser(openChat.users.filter(u => u.id != user.id)[0].id)" alt="User avatar" />
                                </div>
                                <h3>{{ openChat.users.filter(u => u.id != user.id)[0].displayName }}</h3>
                            </div>
                            <div class="actions" v-if="false">
                                <Icon name="mdi:phone" />
                                <Icon name="mdi:video" />
                            </div>
                        </div>
                        <div class="messages">
                            <div class="message" :class="{ sent: msg.from === user.id, received: msg.from !== user.id }" v-for="msg of openChat.messages">
                                <div class="msg-content">
                                    <p>{{ msg.message }}</p>
                                    <small>{{ millisToTime(msg.sentAt) }} <Icon name="mdi:check" style="margin-left: .5em;" v-if="msg.read && msg.from === user.id" /></small>
                                </div>
                            </div>
                        </div>
                        <div class="message-input">
                            <input type="text" placeholder="Type a message..." v-model="message" />
                            <button @click="send()">
                                <Icon name="mdi:send" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </NuxtLayout>
</template>

<style scoped lang="scss">
.messages-container {
    display: flex;
    height: 100%;

    .contacts {
        width: 30%;
        background-color: #242424;
        color: var(--text);
        padding: 1rem;
        border-right: solid 1px #555;

        h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
            //padding: 1rem 1rem 0 1rem;
        }

        .actions {
            display: flex;
            //padding: 0 1rem;
            gap: .5em;
            width: 100%;
            margin-bottom: 20px;

            .search {
                display: flex;
                align-items: center;
                background-color: #333333;
                border-radius: 5px;
                border: solid 1px #494949;
                flex: 1;

                label {
                    display: flex;
                    align-items: center;
                    padding: 0.5rem;
                }

                input {
                    background-color: transparent;
                    border: none;
                    color: var(--text);
                    font-size: 16px;
                    width: 100%;
                    outline: none;
                    padding: 0.5rem;
                }
            }

            .add {
                position: relative;
                display: flex;

                .add-btn {
                    display: flex;
                    align-items: center;
                    gap: .5em;
                    background-color: #333;
                    border-radius: 5px;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    transition: background-color .2s;

                    &:hover, &:active, &:focus {
                        background-color: var(--color-secondary);
                    }
                }
            }
        }

        .contact-list {
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            gap: 4px;

            &::-webkit-scrollbar {
                width: 0;
            }

            .contact {
                display: flex;
                align-items: center;
                gap: 1rem;
                border-radius: 5px;
                padding: 1rem;
                cursor: pointer;
                width: 100%;

                &:hover {
                    background-color: #494949;
                }

                &.open {
                    background-color: #333;
                }

                .avatar {
                    min-width: 50px;
                    min-height: 50px;
                    max-height: 50px;
                    max-width: 50px;
                    border-radius: 50%;
                    overflow: hidden;

                    img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                }

                .info {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    width: 100%;
                    max-width: 50%;

                    h3 {
                        font-size: 18px;
                        font-weight: 700;
                        margin-bottom: 5px;
                    }

                    .last_message {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 14px;
                        color: #bebebe;
                        width: 100%;

                        p {
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }
                    }
                }
                small {
                    display: flex;
                    align-items: center;
                    font-size: 12px;
                    color: #999999;
                    white-space: nowrap;
                    justify-self: flex-end;
                    gap: 0.5em;

                    .unread {
                        background-color: var(--color-secondary);
                        border-radius: 50%;
                        display: inline-block;
                        height: 10px;
                        width: 10px;
                    }
                }
            }
        }
    }

    .message-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        
        .contact {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-bottom: solid 1px #555;

            .info {
                display: flex;
                align-items: center;
                gap: 1rem;

                .avatar {
                    min-width: 50px;
                    min-height: 50px;
                    max-height: 50px;
                    max-width: 50px;
                    border-radius: 50%;
                    overflow: hidden;

                    img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                }

                h3 {
                    font-size: 18px;
                    font-weight: 700;
                }
            }

            .actions {
                display: flex;
                gap: 1rem;
                margin-left: auto;

                button {
                    background-color: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 50%;
                    transition: background-color .2s;

                    &:hover {
                        background-color: #333;
                    }
                }
            }
        }

        .messages {
            display: flex;
            flex-direction: column;
            gap: .5em;
            padding: 1rem;
            overflow-y: auto;
            flex: 1;

            &::-webkit-scrollbar {
                width: 0;
            }

            .message {
                display: flex;
                flex-direction: row;
                gap: .5em;
                background-color: #333;
                border-radius: 8px;
                max-width: 70%;
                align-self: flex-start;
                padding: .5em 1em;

                .msg-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    width: 100%;

                    p {
                        font-size: 16px;
                        color: var(--text);
                        user-select: text;
                    }

                    small {
                        font-size: 12px;
                        opacity: .8;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                    }
                }

                &.sent {
                    align-self: flex-end;
                    background-color: color-mix(in oklab, var(--color-secondary) 20%, var(--color-primary) 80%);
                    
                    &:has(+ .message.sent) {
                        .msg-content {
                            small {
                                display: none;
                            }
                        }
                    }
                }

                &.received:has(+ .message.received) {
                    .msg-content {
                        small {
                            display: none;
                        }
                    }
                }
            }
        }

        .message-input {
            width: 100%;
            display: flex;
            align-items: center;
            border-top: 1px solid #555;
            padding: 1em;
            gap: .5em;

            input {
                flex: 1;
                padding: 0.5rem;
                border: solid 1px #555;
                border-radius: 5px;
                background-color: #333;
                color: var(--text);
                font-size: 16px;
                outline: none;

                &::placeholder {
                    color: #a8a8a8;
                    font-size: 14px;
                }

                &:focus {
                    border-color: var(--color-secondary);
                }
            }

            button {
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: var(--color-primary);
                color: #fff;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 5px;
                cursor: pointer;
                transition: background-color .2s;

                &:hover {
                    background-color: var(--color-accent);
                }
            }
        }
    }
}
</style>