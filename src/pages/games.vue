<script setup lang="ts">
import { path } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir } from '@tauri-apps/api/path';
import * as fs from '@tauri-apps/plugin-fs';
import { hasPermium } from '~/utils/types/User';

const auth = await useAuth();
const user = auth.user;

const defaultBanner = await import('@/assets/img/default-banner.jpg');
const loading = ref(true);
const gameLauncherFilter = ref('All');
const gameSort = ref('A-Z');
const search = ref('')
const launchers = ref([
    "All",
    "Steam",
    "Epic Games",
    "Electronic Arts",
]);
const gamesSortList = ref([
    "A-Z",
    "Z-A",
    "Last Played",
    "Favourites"
]);

const showGame = ref(false);
const modifyGame = ref(false);
const gameToModify = ref<any>(null);
const showModal = ref(false);
const chosenFile = ref<any>(null);
const exeFile = ref<any>(null);
const name = ref<string>('');
const args = ref<string>('');

const error = ref<string | null>(null);

let launchingGame = ref<any | null>(null);

let gamesData: any[] = [];

const load = (async () => {
    const { data, error: fetchErr } = await useFetch('http://127.0.0.1:5000/api/get_games');
    if (fetchErr.value || !data.value) {
        error.value = fetchErr.value ? fetchErr.value.message : 'An error occurred while fetching games';
        loading.value = false;
        return;
    }

    if (data.value) {
        const v = data.value as any;
        gamesData.push(...sortFilter((v.games || []) as any[]));
    }

    setRPC("games", {
        total: gamesData.length
    });
    loading.value = false;
});
load();

function updateGame(gameId: string, data: Record<string, any>) {
    const game = gamesData.find((game: any) => game['game_id'] === gameId);
    Object.assign(game, data);

    useFetch('http://127.0.0.1:5000/api/update/' + gameId, {
        method: 'POST',
        body: JSON.stringify(game)
    });
}

function sortFilter(data: any[]): any[] {
    switch (gameSort.value) {
        case 'A-Z':
            data = data.sort((a, b) => a.display_name.localeCompare(b.display_name));
            break;
        case 'Z-A':
            data = data.sort((a, b) => b.display_name.localeCompare(a.display_name));
            break;
        case 'Last Played':
            data = data.sort((a, b) => b.last_played - a.last_played);
            break;
        case 'Favourites':
            data = data.sort((a, b) => b.favourite - a.favourite);
            break;
        default:
            break;
    }

    return data;
}

const games = computed(() => {
    let data = gamesData;
    if (search.value) {
        data = data.filter((game: any) => game.display_name.toLowerCase().includes(search.value.toLowerCase()));
    }
    
    data = sortFilter(data);
    if (gameLauncherFilter.value === 'All') return data;

    return data.filter((game: any) => game['launcher_name'] === gameLauncherFilter.value);
});

const favourite = async (gameId: string) => {
    const game = gamesData.find((game: any) => game['game_id'] === gameId);
    updateGame(gameId, { favourite: !game['favourite'] });
}

const launchGame = async (gameId: string) => {
    launchingGame.value = gamesData.find((game: any) => game['game_id'] === gameId);
    await useFetch('http://127.0.0.1:5000/api/launch_game/' + gameId, {
        method: 'POST'
    });
    updateGame(gameId, { last_played: Date.now() });

    setTimeout(() => launchingGame.value = null, 5000);
}

const getBanner = async (bannerId: string) => {
    const { data, error } = await useFetch('http://127.0.0.1:5000/api/get_banner/' + bannerId);
    if (!data.value || error.value) return defaultBanner.default;
    return 'http://127.0.0.1:5000/api/get_banner/' + bannerId;
}

const show = (id: string) => {
    showGame.value = true;
    modifyGame.value = false;
    gameToModify.value = gamesData.find(g => g['game_id'] == id);
}

const modify = () => {
    modifyGame.value = true;
    showGame.value = false;
}

const addCustomGame = async () => {
    await useFetch('http://127.0.0.1:5000/api/add_custom_game', {
        method: 'POST',
        body: JSON.stringify({
            name: name.value,
            banner: chosenFile.value,
            exe: exeFile.value,
            args: args.value
        })
    });
    showModal.value = false;

    name.value = '';
    chosenFile.value = null;
    exeFile.value = null;
    args.value = '';
}

async function setExe(event: any) {
    const file = event.target.files[0];
    // get full path
    exeFile.value = file;
    console.log(file.path)
}

async function setImage(event: any) {
    const file = event.target.files[0];
    const dataFolder = "/temp";
    await invoke("create_dir_if_not_exists", {
        path: dataFolder
    });
    const tempPath = await path.join(dataFolder, file.name);

    const reader = new FileReader();
    reader.onload = async (res) => {
        const arrayBuffer = res.target?.result;
        if (!arrayBuffer || typeof arrayBuffer == "string") return;
        const uint8Array = new Uint8Array(arrayBuffer);

        await invoke("write_file_buffer", {
            path: tempPath,
            content: Array.from(uint8Array)
        });
        chosenFile.value = tempPath;
    }

    reader.readAsArrayBuffer(file);
}

const getChosenBanner = async () => {
    if (chosenFile.value == null) return defaultBanner.default;
    return chosenFile.value;
}

const refresh = async () => {
    loading.value = true;
    error.value = null;
    gamesData = [];
    await useFetch('http://127.0.0.1:5000/api/refresh');
    await load();
    await refreshNuxtData();
}

const getSize = (size: number) => {
    const megaBytes = size / 1024 / 1024;
    const gigabytes = megaBytes / 1024;
    if (gigabytes > 1.00) return `${gigabytes.toFixed(2)} GB`;
    return `${megaBytes.toFixed(2)} MB`;
}

const save = async () => {
    updateGame(gameToModify.value['game_id'], gameToModify.value);
    modifyGame.value = false;
    showGame.value = false;
}
</script>

<template>
    <NuxtLayout>
        <div class="sub-container">
            <Loader :loading="loading" />
            <Sidebar page="games" />
            <div class="content-g">
                <LaunchPopup :game="launchingGame" v-if="launchingGame != null" :close="() => launchingGame = null" />
                <div class="header">
                    <h2>Your Games</h2>
                    <p>Total Games: {{ gamesData.length }}</p>
                </div>
                <div class="buttons">
                    <div class="filters">
                        <select v-model="gameLauncherFilter">
                            <option v-for="launcher in launchers" :key="launcher" :value="launcher">{{ launcher }}</option>
                        </select>
                        <select v-model="gameSort">
                            <option v-for="sort in gamesSortList" :key="sort" :value="sort">{{ sort }}</option>
                        </select>
                        <div class="search">
                            <Icon class="icon" name="mdi:magnify" for="search" />
                            <input type="search" v-model="search" placeholder="Search..." id="search" name="search" autocomplete="off">
                        </div>
                        <div class="refresh" @click="refresh">
                            <Icon class="icon" name="fa:refresh" />
                        </div>
                    </div>
                    <div class="add-button" @click="showModal = true">
                        <Icon name="mdi:plus" />
                        Add
                    </div>
                </div>
                <div v-if="error != null" class="error">
                    <p>{{ error }}</p>
                </div>
                <div class="games">
                    <div class="game" v-for="game in games" :key="game['game_id']" :id="game['game_id']">
                        <div class="banner" @click="launchGame(game['game_id'])">
                            <Image :src="getBanner(game['game_id'])" alt="Game banner" />
                        </div>
                        <div class="info">
                            <div class="name">
                                <h3>{{ game['display_name'] }}</h3>
                            </div>
                            <div class="actions">
                                <div class="favourite-toggle">
                                    <Icon :name="'mdi:heart' + (game['favourite'] ? '' : '-outline')" @click="favourite(game['game_id'])" 
                                    :style="{ color: game['favourite'] ? 'var(--color-accent)' : '' }"/>
                                </div>
                                <div class="information">
                                    <Icon name="uil:bars" @click="show(game['game_id'])" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <UModal v-model="showModal">
                <div class="add-game-modal">
                    <h1>Add Custom Game</h1>
                    <div class="form">
                        <div id="side1">
                            <UFormGroup class="group" label="Game Name" required>
                                <input type="text" placeholder="Type the game name..." />
                            </UFormGroup>
                            <UFormGroup class="group" label="Executable File" required>
                                <div class="input">
                                    <label class="label" for="exe" v-if="exeFile == null">Select Executable</label>
                                    <label class="label" for="exe" v-if="exeFile != null">
                                       {{ exeFile }}
                                    </label>
                                </div>
                                <input type="file" accept=".exe" id="exe" @change.prevent="setExe" />
                            </UFormGroup>
                            <UFormGroup class="group" label="Launch Arguments (OPTIONAL)">
                                <input type="text" v-model="args" placeholder="Add launch arguments..." />
                            </UFormGroup>
                            <button type="submit" @click="addCustomGame">Add Game</button>
                        </div>
                        <div id="side2">
                            <div class="fake-image">
                                <img v-if="chosenFile != null" :src="chosenFile" alt="Banner" />
                                <label for="banner">
                                    Select an image
                                </label>
                            </div>
                            <input type="file" accept="image/png,image/jpeg" id="banner" @change.prevent="setImage" />
                        </div>
                    </div>
                </div>
            </UModal>
            <UModal v-model="showGame">
                <div class="modify-game-modal">
                    <h1>Showing Game - {{ gameToModify.name }}</h1>
                    <div class="game-information">
                        <div class="info">
                            <h3>Display Name</h3>
                            <p>{{ gameToModify.display_name }}</p>
                        </div>
                        <div class="info">
                            <h3>Launcher</h3>
                            <p>{{ gameToModify.launcher_name }}</p>
                        </div>
                        <div class="info">
                            <h3>Game Size</h3>
                            <p>{{ getSize(gameToModify.game_size) }}</p>
                        </div>
                        <div class="info">
                            <h3>Last Played</h3>
                            <p>{{ gameToModify.last_played == 0 ? "Not played yet" : new Date(gameToModify.last_played * 1000).toLocaleString() }}</p>
                        </div>
                        <div class="info">
                            <h3>Game ID</h3>
                            <p>{{ gameToModify.game_id }}</p>
                        </div>
                        <div class="info">
                            <h3>Arguments</h3>
                            <p>{{ gameToModify.launch_args || "None" }}</p>
                        </div>
                    </div>
                    <button @click="modify()">Edit</button>
                </div>
            </UModal>
            <UModal v-model="modifyGame">
                <div class="modify-game-modal">
                    <h1>Modifying Game - {{ gameToModify.name }}</h1>
                    <div class="form">
                        <div id="side1">
                            <UFormGroup class="group" label="Display Name" required>
                                <input type="text" v-model="gameToModify.display_name" :disabled="!hasPermium(user)" />
                            </UFormGroup>
                            <UFormGroup class="group" label="Launch Arguments">
                                <input type="text" v-model="gameToModify.launch_args" />
                            </UFormGroup>
                            <div class="buttons">
                                <button type="submit" @click="save()">Save</button>
                                <button type="submit" @click="show(gameToModify['game_id'])">View Game</button>
                            </div>
                        </div>
                        <div id="side2">
                            <div class="fake-image">
                                <img v-if="chosenFile != null" :src="chosenFile" alt="Banner" />
                                <label for="banner">
                                    Select an image
                                </label>
                            </div>
                            <input type="file" accept="image/png,image/jpeg" id="banner" @change.prevent="setImage" />
                        </div>
                    </div>
                </div>
            </UModal>
        </div>
    </NuxtLayout>
</template>

<style lang="scss" scoped>
.content-g {
    flex: 1;
    padding: .5em 1em;
    background-color: var(--color-background);
    color: var(--color-text);
    overflow-y: auto;

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
        margin-bottom: 20px;

        h2 {
            font-size: 24px;
            font-weight: 500;
        }

        p {
            font-size: 14px;
            font-weight: 400;
            color: var(--color-text);
        }
    }

    .buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        .refresh {
            display: flex;
            align-items: center;
            cursor: pointer;
            color: var(--color-primary);
            transition: ease-in-out .15s;
            font-size: 1em;

            &:hover {
                color: var(--color-accent);
            }
        }

        .filters {
            display: flex;
            gap: 1em;

            select {
                padding: 4px 8px;
                border-radius: 4px;
                background-color: var(--color-sidebar);
                color: var(--color-text);
                font-size: 16px;
                font-weight: 400;
                cursor: pointer;
                box-shadow: 16px -16px 12px 0 rgba(0, 0, 0, 0.2) inset;
                transition: ease-in-out .15s;

                &:hover, &:focus {
                    background-color: var(--color-primary);
                    outline: none;
                }

                & > option {
                    background-color: var(--color-background);
                    color: var(--color-text);
                }
            }

            .search {
                display: flex;
                align-items: center;
                border-radius: 4px;
                background-color: var(--color-sidebar);
                color: var(--color-text);
                font-size: 16px;
                font-weight: 400;
                box-shadow: 16px -16px 12px 0 rgba(0, 0, 0, 0.2) inset;
                transition: ease-in-out .15s;
                outline: none;

                &:has(input:focus) {
                    background-color: var(--color-primary);
                }

                input {
                    border: none;
                    background-color: transparent;
                    color: var(--color-text);
                    font-size: 14px;
                    font-weight: 400;
                    width: 100%;
                    padding: .5em 1em;
                    border-radius: 4px;
                    transition: ease-in-out .15s;
                    outline: none;
                }
                
                .icon {
                    cursor: pointer;
                    margin-left: .5em;
                }
            }
        }

        .add-button {
            display: flex;
            align-items: center;
            gap: .5em;
            padding: .5em 1em;
            border-radius: 4px;
            background-color: var(--color-primary);
            color: var(--color-text);
            font-size: 14px;
            font-weight: 400;
            cursor: pointer;
            box-shadow: 16px -16px 12px 0 rgba(0, 0, 0, 0.2) inset;
            transition: ease-in-out .15s;

            &:hover {
                background-color: var(--color-accent);
            }
        }
    }

    .games {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(calc(600px / 3), 1fr));
        grid-auto-rows: auto;
        flex-wrap: wrap;
        gap: 1rem;

        .game {
            background-color: var(--color-sidebar);
            color: var(--color-text);
            border-radius: 5px;
            overflow: hidden;
            max-width: calc(600px / 2);
            width: 100%;
            transition: ease-in-out .15s;
            &:hover {
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                transform: translateY(-5px);
                background-color: var(--color-primary);

                .banner {
                    filter: brightness(1);
                }
            }

            .banner {
                width: 100%;
                background-color: #333;
                cursor: pointer;
                transition: ease-in-out .15s;
                filter: brightness(.8);
                
                img {
                    image-rendering: auto;
                    object-fit: cover;
                    aspect-ratio: 2/3;
                    height: 100%;
                    object-fit: cover;
                }

        
            }

            .info {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px;

                .name {
                    max-width: 75%;
                    h3 {
                        font-size: 14px;
                        font-weight: 400;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        overflow: hidden;
                    }
                }

                .actions {
                    display: flex;
                    align-items: center;
                    gap: .5em;

                    & > * {
                        display: flex;
                        align-items: center;
                    }
                    .favourite-toggle {
                        cursor: pointer;

                        input {
                            display: none;
                        }
                    }

                    .information {
                        cursor: pointer;
                    }
                }
            }
        }
    }
}

.add-game-modal {
    display: flex;
    flex-direction: column;
    border-radius: 5px;
    background-color: var(--color-background);
    padding: 1em;

    h1 {
        font-size: 1.25em;
        font-weight: 500;
        padding-bottom: .5em;
        margin-bottom: 1em;
        border-bottom: 1px solid var(--color-text);
    }

}

.add-game-modal, .modify-game-modal {
    .form {
        display: flex;
        gap: 1em;

        #side1, #side2 {
            display: flex;
            flex-direction: column;
            gap: 1em;
            width: 50%;
            overflow: hidden;
        }

        .group {
            display: flex;
            flex-direction: column;
            gap: .5em;
        }

        .input {
            display: flex;
            gap: .5em;
            align-items: center;
        }

        input[type="text"] {
            padding: .5em 1em;
            border-radius: 5px;
            background-color: var(--color-sidebar);
            color: var(--color-text);
            font-size: 14px;
            font-weight: 400;
            transition: ease-in-out .15s;
            width: 100%;
            box-shadow: 16px -16px 12px 0 rgba(0, 0, 0, 0.2) inset;

            &:hover:not(:disabled), &:focus {
                background-color: var(--color-primary);
                outline: none;
            }

            &:disabled {
                color: rgba(255, 255, 255, 0.5);
                cursor: not-allowed;
            }
        }

        input[type="file"] {
            display: none;
        }

        .label {
            font-size: 14px;
            font-weight: 400;
            color: var(--color-text);
            background-color: var(--color-sidebar);
            padding: 6px;
            border-radius: 5px;
            cursor: pointer;
            transition: ease-in-out .15s;
            box-shadow: 16px -16px 12px 0 rgba(0, 0, 0, 0.2) inset;
            width: 100%;
            text-align: center;

            &:hover {
                background-color: var(--color-primary);
            }
        }

        p {
            font-size: 14px;
            font-weight: 400;
            color: var(--color-text);
        }

        button {
            padding: 6px 12px;
            border-radius: 5px;
            background-color: var(--color-primary);
            color: var(--color-text);
            font-size: 14px;
            font-weight: 400;
            cursor: pointer;
            transition: ease-in-out .15s;
            width: fit-content;
            box-shadow: 16px -16px 12px 0 rgba(0, 0, 0, 0.2) inset;
            margin-bottom: 0;
            margin-top: auto;

            &:hover {
                background-color: var(--color-secondary);
            }
        }

        .fake-image {
            position: relative;
            display: flex;
            background-color: rgba($color: #4caf50, $alpha: .2);
            border-radius: 5px;
            height: 100%;
            width: 100%;
            cursor: pointer;
            align-items: center;
            justify-content: center;
            transition: ease-in-out .15s;

            label {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            &:hover {
                background-color: rgba($color: #4caf50, $alpha: .3);
            }

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            &:has(img) {
                transition: ease-in-out .15s;
                label {
                    display: none;
                    z-index: 900;
                    color: rgba(255, 255, 255, .87);
                }

                &:hover label {
                    display: block;
                }
            }

            &:not(:has(img)) {
                label {
                    display: block;
                    color: rgba(255, 255, 255, .87);
                }
            }
        }
    }
}
.modify-game-modal {
    display: flex;
    flex-direction: column;
    border-radius: 5px;
    background-color: var(--color-background);
    padding: 1em;
    gap: 1em;

    h1 {
        font-size: 1.25em;
        font-weight: 500;
        padding-bottom: .5em;
        border-bottom: 1px solid var(--color-text);
    }

    .game-information {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: .5em;

        .info {
            display: flex;
            flex-direction: column;
            gap: 2px;

            h3 {
                font-size: 14px;
                font-weight: 600;
            }

            p {
                font-size: 14px;
                font-weight: 400;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }
    }

    button {
        padding: 6px 12px;
        border-radius: 5px;
        background-color: var(--color-primary);
        color: var(--color-text);
        font-size: 14px;
        font-weight: 400;
        cursor: pointer;
        transition: ease-in-out .15s;
        width: fit-content;
        box-shadow: 16px -16px 12px 0 rgba(0, 0, 0, 0.2) inset;

        &:hover {
            background-color: var(--color-secondary);
        }
    }

    .buttons {
        display: flex;
        width: 100%;
        gap: .5em;
        
        button {
            width: 100%;
        }
    }
}
</style>