<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import type User from "~/utils/types/User";
import { emitTo } from "@tauri-apps/api/event";
import Skeleton from "~/components/ui/skeleton/Skeleton.vue";

import {toast} from 'vue-sonner';

const loading = ref(true);
const maxSlots = 5;
const slots = ref<{ slot: number; game: any | null }[]>(
    Array.from({ length: maxSlots }, (v, k) => {
        return {
            slot: k,
            game: null,
        };
    })
);

var auth: {
    user: User | null;
    [key: string]: any;
};
var defaultBanner: typeof import("~/assets/img/default-banner.png");
var user: User | null;
let games: any[] = [];
var gamesShortcut: any[];

const launcherNames: { [key: string] : string } = {
    'Electronic Arts': 'EA',
    'Epic Games': 'Epic',
    'Ubisoft': 'Uplay',
    'Rockstar Games': 'Rockstar',
}

const editSlot = ref(false);
const editSlotValue = ref(-1);
const gameSlot = ref("");
const showDropdown = ref(false);

const onlineFriends: any[] = []; //user ? user.friends ? user.friends.filter(f => f.online) : [] : [];

onMounted(async () => {
    defaultBanner = await import("~/assets/img/default-banner.png");
    auth = await useAuth();
    
    user = auth.user;

    const { data: gamesData } = await useFetch(
        "http://localhost:5000/api/get_games"
    );
    games = (((gamesData.value as any).games || []) as any[]).sort((a, b) => a.display_name.localeCompare(b.display_name));
    gamesShortcut = games.filter(
        (game: any) => game.shortcut_slot !== -1 && game.shortcut_slot < maxSlots
    );
    gamesShortcut.sort((a: any, b: any) => b["shortcut_slot"] - a["shortcut_slot"]);
    for (const game of gamesShortcut) {
        if (game["shortcut_slot"] < maxSlots) {
            slots.value[game["shortcut_slot"]].game = game;
        }
    }
    loading.value = false;

    setRPC("home");
});

const timeToMMSS = (time: number) => {
    const t = time / 1000;
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
};

function updateGame(gameId: string, data: Record<string, any>) {
    const game = games.find((game: any) => game["game_id"] === gameId);
    Object.assign(game, data);

    useFetch("http://localhost:5000/api/update/" + gameId, {
        method: "POST",
        body: JSON.stringify(game),
    });
}

const setGame = async (gameName: string) => {
    gameSlot.value = gameName;
    showDropdown.value = false;
};

const launchGame = async (gameId: string, name: string) => {
    const res: any = await $fetch('http://127.0.0.1:5000/api/launch_game/' + gameId, {
        method: 'POST'
    });

    if (res.pid) {
        await invoke('add_game', { name: name, pid: `${res.pid}` });
        setRPC("playing")
    }
};

const getBanner = async (bannerId: string) => {
    const { data, error } = await useFetch(
        "http://localhost:5000/api/get_banner/" + bannerId
    );
    if (!data.value || error.value) return defaultBanner.default;
    return "http://localhost:5000/api/get_banner/" + bannerId;
};

const edit = (slot: number) => {
    editSlotValue.value = slot;
    editSlot.value = true;
};

const hideDropdown = () => {
    setTimeout(() => (showDropdown.value = false), 200);
};

const finishEdit = () => {
    if (editSlotValue.value === -1) return;
    const game = games.find((g) => g.name === gameSlot.value);
    if (!game) return;

    updateGame(game["game_id"], { shortcut_slot: editSlotValue.value });
    slots.value[editSlotValue.value].game = game;
    editSlot.value = false;
    gameSlot.value = "";
    //refreshNuxtData();
};

const deleteSlot = (slot: number) => {
    updateGame(slots.value[slot].game["game_id"], { shortcut_slot: -1 });
    slots.value[slot].game = null;
    //refreshNuxtData();
};

const gamesFilter = computed(() =>
    games.filter((g) =>
        g.name.toLowerCase().startsWith(gameSlot.value.toLowerCase())
    )
);
</script>

<template>
    <NuxtLayout>
        <div class="sub-container">
            <Sidebar page="home" />
            <div class="content">
                <div class="wrapper">
                    <div id="left">
                        <div class="cards">
                            <div class="card">
                                <div
                                    class="header"
                                    style="justify-content: space-between"
                                >
                                    <h1>Shortcuts</h1>
                                </div>
                                <div class="card-content">
                                    <div v-if="loading" class="games" id="gamesShortcut">
                                        <Skeleton
                                            v-for="i in 5"
                                            :key="i"
                                            class="h-full w-full"
                                            :style="{
                                                'border-radius': '5px',
                                                'background-color': 'var(--color-background)',
                                            }"
                                        />
                                    </div>
                                    <div v-else class="games" id="gamesShortcut">
                                        <div
                                            class="game"
                                            v-for="slot in slots"
                                            :id="
                                                slot.game != null
                                                    ? slot.game['game_id']
                                                    : slot.slot
                                            "
                                            :key="slot.slot"
                                        >
                                            <div
                                                class="delete"
                                                v-if="slot.game != null"
                                            >
                                                <Icon
                                                    name="mdi:trash-can"
                                                    @click="deleteSlot(slot.slot)"
                                                />
                                            </div>
                                            <div class="banner" @click="() => launchGame(slot.game['game_id'], slot.game['name'])">
                                                <Image
                                                    class="image"
                                                    v-if="slot.game != null"
                                                    :src="getBanner(slot.game['game_id'])"
                                                    alt="Game banner"
                                                />
                                                <div
                                                    class="empty"
                                                    @click="() => edit(slot.slot)"
                                                    v-else
                                                >
                                                    <Icon
                                                        class="icon"
                                                        name="mdi:plus"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="card">
                                <div class="header">
                                    <h1>Online Friends</h1>
                                </div>
                                <div class="card-content flex flex-col gap-2" v-if="loading">
                                    <Skeleton
                                        v-for="i in 6"
                                        class="w-full h-full"
                                        :style="{
                                            'border-radius': '5px',
                                            'background-color': 'var(--color-background)',
                                        }"
                                    />
                                </div>
                                <div class="card-content" v-else>
                                    <p v-if="!user">
                                        Please
                                        <NuxtLink to="/login">log in</NuxtLink>
                                        first
                                    </p>
                                    <p
                                        v-if="
                                            user && onlineFriends.length === 0
                                        "
                                    >
                                        No friends online
                                    </p>
                                    <div class="friends" v-else></div>
                                </div>
                            </div>
                            <div class="card">
                                <div class="header">
                                    <h1>Recent Clips</h1>
                                </div>
                                <div class="card-content">
                                    <p>Coming soon...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="right">
                        <div class="card" id="spotify">
                            <div class="header">
                                <Icon
                                    name="mdi:spotify"
                                    :style="{
                                        fontSize: '20px',
                                        color: '	#1ED760',
                                    }"
                                />
                                <h3>Spotify - To be removed</h3>
                            </div>
                            <div class="card-content">
                                <p>Spotify integration is scheduled to be removed in the future.</p>
                            </div>
                        </div>
                        <iframe
                            src="https://discord.com/widget?id=1254753745632362548&theme=dark"
                            allowtransparency="true"
                            frameborder="0"
                            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                        ></iframe>
                    </div>
                </div>
            </div>
        </div>
        <UModal v-model="editSlot">
            <div class="edit-slot">
                <h1>Add Shortcut</h1>
                <p>Select a game to add to your shortcuts</p>

                <div class="form">
                    <UFormGroup label="Game" required>
                        <div class="input">
                            <input
                                v-model="gameSlot"
                                type="text"
                                id="gameSlot"
                                autocomplete="off"
                                @focus="showDropdown = true"
                                @focusout="hideDropdown()"
                            />
                            <div class="input-dropdown" v-if="showDropdown">
                                <div
                                    v-for="game in gamesFilter"
                                    :key="game['game_id']"
                                    class="game"
                                    @click="setGame(game['name'])"
                                >
                                    [{{ launcherNames[game['launcher_name']] || game['launcher_name'] }}] {{ game["display_name"] }}
                                </div>
                            </div>
                        </div>
                    </UFormGroup>
                    <button @click="finishEdit">Add</button>
                </div>
            </div>
        </UModal>
    </NuxtLayout>
</template>

<style lang="scss">
$height: calc(900px / 4);
$width: calc(600px / 4);

.edit-slot {
    border-radius: 5px;
    background-color: var(--color-background);
    padding: 1em;

    h1 {
        font-size: 24px;
        font-weight: 500;
        margin-bottom: 4px;
    }

    p {
        font-size: 15px;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 20px;
    }

    .form {
        display: flex;
        flex-direction: column;
        gap: 1em;

        button {
            padding: 0.5em 1.5em;
            border: none;
            outline: none;
            border-radius: 5px;
            background-color: var(--color-primary);
            color: var(--color-text);
            font-size: 14px;
            font-weight: 400;
            cursor: pointer;
            transition: ease-in-out 0.15s;
            width: fit-content;
            box-shadow: 20px -20px 12px 0 rgba(0, 0, 0, 0.2) inset;

            &:hover {
                background-color: var(--color-accent);
            }
        }

        input,
        select {
            padding: 0.5em;
            border: none;
            outline: none;
            border-radius: 5px;
            background-color: var(--color-sidebar);
            box-shadow: 20px -20px 12px 0 rgba(0, 0, 0, 0.2) inset;
            color: var(--color-text);
            font-size: 14px;
            font-weight: 400;
            transition: ease-in-out 0.15s;
            width: 50%;

            &:hover,
            &:focus {
                background-color: var(--color-primary);
            }

            & > option {
                background-color: var(--color-background);
                color: var(--color-text);
            }
        }

        .input {
            position: relative;

            .input-dropdown {
                position: absolute;
                top: 100%;
                display: flex;
                flex-direction: column;
                overflow: auto;
                width: 50%;
                max-height: 200px;
                background-color: var(--color-sidebar);
                border-radius: 5px;
                z-index: 1000;

                .game {
                    padding: 0.5em;
                    color: var(--color-text);
                    font-size: 14px;
                    font-weight: 400;
                    cursor: pointer;
                    transition: ease-in-out 0.15s;

                    &:hover {
                        background-color: var(--color-primary);
                    }
                }
            }
        }
    }
}

.friend {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 2px;

  .friend-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .friend-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;

    h4 {
      color: #23a559;
      font-size: 14px;
      font-weight: 500;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.wrapper {
    display: flex;
    gap: 1em;
    height: 100%;

    #left {
        flex: 1;
        height: 100%;

        h3 {
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 20px;
        }

        .cards {
            display: grid;
            height: 100%;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(2, auto);
            gap: 1em;

            .card:first-child {
                grid-column: span 3;
                height: 40svh;
            }

            .card:nth-child(2) {
                grid-row: span 1;
                height: 50svh;
            }

            .card:last-child {
                grid-column: span 2;
                height: 50svh;
            }
        }

        .games {
            display: flex;
            gap: 0.5em;
            overflow-x: hidden;
            height: 100%;

            .game {
                position: relative;
                display: flex;
                flex-direction: column;
                min-width: calc((100% / 5) - 6px);

                .delete {
                    display: none;
                    position: absolute;
                    z-index: 900;
                    top: 5px;
                    right: 5px;
                    color: red;
                    background-color: rgba(200, 30, 30, 0.2);
                    border: solid 1px red;
                    border-radius: 5px;
                    width: 30px;
                    height: 30px;
                    font-size: 20px;
                    align-items: center;
                    justify-content: center;
                    transition: ease-in-out 0.15s;

                    &:hover {
                        background-color: rgba(200, 30, 30, 0.4);
                    }
                }

                img {
                    filter: brightness(0.8);
                    transition: ease-in-out 0.15s;
                }

                &:hover {
                    .delete {
                        display: flex;
                        cursor: pointer;
                    }

                    img {
                        cursor: pointer;
                        filter: brightness(1);
                    }
                }

                .banner {
                    height: 100%;
                    .image {
                        width: 100%;
                        height: 100%;
                        border-radius: 5px;
                    }

                    .empty {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.2);
                        color: var(--color-text);
                        border-radius: 5px;
                        cursor: pointer;
                        transition: ease-in-out 0.15s;

                        &:not(.locked):hover {
                            background-color: rgba(0, 0, 0, 0.4);
                        }

                        &.locked {
                            cursor: not-allowed;
                        }

                        .icon {
                            position: absolute;
                            font-size: 40px;
                        }
                    }
                }
            }
        }
    }

    #right {
        display: flex;
        flex-direction: column;
        gap: 1em;
        width: 250px;

        iframe {
            flex: 1;
            height: 100%;
            width: 100%;
            border-radius: 8px;
        }
    }

    .card {
        background-color: var(--color-sidebar);
        color: var(--color-text);
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        padding: 1em;

        .header {
            display: flex;
            align-items: center;
            background-color: var(--color-sidebar);
            color: var(--color-text);
            font-size: 16px;
            font-weight: 500;

            h3 {
                margin-left: 1em;
            }
        }

        .card-content {
            height: 100%;
            padding: 1em 0;
            p {
                font-size: 14px;
                font-weight: 400;
                color: rgba(255, 255, 255, 0.7);
                text-align: center;
            }

            a {
                color: var(--color-text);

                &:hover {
                    text-decoration: underline;
                }
            }
        }
    }

    #spotify .card-content {
        min-height: 30svh;
        .player {
            display: flex;
            flex-direction: column;
            gap: 1em;

            .banner {
                align-self: center;
                img {
                    width: 150px;
                    height: 150px;
                    border-radius: 5px;
                }
            }

            .info {
                display: flex;
                flex-direction: column;
                gap: 1em;

                .name {
                    h3 {
                        font-size: 20px;
                        font-weight: 600;
                        text-align: center;
                    }

                    p {
                        font-size: 12px;
                        font-weight: 400;
                        color: rgba(255, 255, 255, 0.8);
                    }

                    h3,
                    p {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                }

                .actions {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1em;

                    .buttons {
                        display: flex;
                        gap: 1em;

                        .icon {
                            font-size: 20px;
                            transition: ease-in-out 0.15s;
                            border-radius: 50%;
                            cursor: pointer;
                            padding: 8px;

                            &:hover {
                                color: var(--color-accent);
                            }
                        }
                    }

                    .slider {
                        display: flex;
                        align-items: center;
                        gap: 1em;

                        span {
                            font-size: 14px;
                            font-weight: 400;
                        }

                        input {
                            width: 100%;
                            height: 5px;
                            background-color: var(--color-primary);
                            border-radius: 5px;
                            appearance: none;

                            &::-webkit-slider-thumb {
                                appearance: none;
                                width: 10px;
                                height: 10px;
                                border-radius: 50%;
                                background-color: var(--color-secondary);
                                cursor: pointer;

                                &:hover {
                                    background-color: var(--color-accent);
                                }

                                &:active {
                                    background-color: var(--color-accent);
                                }
                            }

                            &::-moz-range-thumb {
                                appearance: none;
                                width: 10px;
                                height: 10px;
                                border-radius: 50%;
                                background-color: var(--color-secondary);
                                cursor: pointer;

                                &:hover {
                                    background-color: var(--color-accent);
                                }

                                &:active {
                                    background-color: var(--color-accent);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
</style>
