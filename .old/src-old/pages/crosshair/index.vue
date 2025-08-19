<script setup lang="tsx">
import { emitTo } from '@tauri-apps/api/event';
import { availableMonitors, type Monitor } from '@tauri-apps/api/window';
import Skeleton from '~/components/ui/skeleton/Skeleton.vue';
import { type CrosshairItem, defaultCrosshairs } from '~~/src-old/utils/crosshair';
import type User from '~~/src-old/utils/types/User';
import { getSetting } from '~~/src-old/utils/settings';

const selectedCrosshair = ref<CrosshairItem | null>(null);
const selectedColor = ref<string>('#000');
const size = ref<number>(0);
const offset = reactive({ x: 0, y: 0 });
const displays = ref<Monitor[]>([]);
const selected = ref<Monitor>();

const toggleModal = ref(false);
const loading = ref(true);
const user = ref<User | null>(null);

let crosshairBg: string | null = null;

const crosshairStyles = computed(() => ({
    '--crosshair-fill': selectedColor.value,
    '--crosshair-size': `${size.value}px`,
}));

const overlayEnabled = ref(getSetting<boolean>('enable_overlay', true));

const enabled = ref(false);
const gamesData = ref<{ id: string; name: string; enabled: boolean }[]>([]);
onMounted(async () => {
    user.value = (await useAuth()).user;
    const crosshairSettings = getSetting<CrosshairSettings>('crosshair');

    const available = await availableMonitors();
    for (const display of available) {
        if (display?.name === crosshairSettings?.display) selected.value = display;
        displays.value.push(display);
    }

    offset.x = crosshairSettings?.offset.x || 0;
    offset.y = crosshairSettings?.offset.y || 0;

    crosshairBg = (await import('~/assets/img/crosshair-bg-1.png')).default;

    if (crosshairSettings) {
        enabled.value = crosshairSettings.enabled;
        selectedColor.value = crosshairSettings.color;
        size.value = crosshairSettings.size;
        selectedCrosshair.value = defaultCrosshairs.find(c => c.id === crosshairSettings.selected) || defaultCrosshairs[0];
    }

    console.log('selectedColor', selectedColor.value);

    const ignoredGames = crosshairSettings?.ignoredGames || [];
    const data: any = await $fetch('http://127.0.0.1:5000/api/get_games');
    if (data) {
        gamesData.value = [];
        gamesData.value.push(...data['games'].map((game: any) => ({
            id: game['game_id'],
            name: game['display_name'],
            enabled: !ignoredGames.includes(game['game_id']),
        })));
    }

    loading.value = false;

    setRPC('crosshair')
})

function toggleForGame(game: { id: string; name: string; enabled: boolean }) {
    game.enabled = !game.enabled;
    const crosshairSettings = getSetting<CrosshairSettings>('crosshair') || DEFAULT_CROSSHAIR;
    if (!game.enabled) 
        crosshairSettings.ignoredGames.push(game.id);
    else 
        crosshairSettings.ignoredGames = crosshairSettings.ignoredGames.filter(g => g !== game.id);
    
    setSetting('crosshair', crosshairSettings);
}

function toggle() {
    enabled.value = !enabled.value;
    const crosshairSettings = getSetting<CrosshairSettings>('crosshair')!;
    crosshairSettings.enabled = !crosshairSettings.enabled;
    setSetting('crosshair', crosshairSettings);

    emitTo('overlay', 'toggle-crosshair', enabled.value);
}

function select(crosshair: CrosshairItem) {
    selectedCrosshair.value = crosshair;
    save();
}

function save() {
    const crosshairSettings = getSetting<CrosshairSettings>('crosshair') || DEFAULT_CROSSHAIR;
    crosshairSettings.enabled = enabled.value;
    crosshairSettings.color = selectedColor.value;
    crosshairSettings.size = size.value;
    crosshairSettings.selected = selectedCrosshair.value?.id || defaultCrosshairs[0].id;
    crosshairSettings.display = selected.value?.name!;
    crosshairSettings.offset = offset;

    emitTo('overlay', 'set-crosshair', {
        id: crosshairSettings.selected,
        color: crosshairSettings.color,
        size: crosshairSettings.size,
        display: crosshairSettings.display,
        offset: crosshairSettings.offset,
    });
}

</script>

<template>
    <NuxtLayout>
        <div class="flex h-screen">
            <Sidebar page="crosshair" class="w-64" />
            <div class="relative flex flex-1 h-screen">
                <div class="absolute w-full h-full bg-zinc-950/70 z-10" v-if="!overlayEnabled">
                    <div class="flex flex-col items-center justify-center h-full">
                        <h1 class="text-2xl font-bold text-[var(--color-text)]">Overlay is disabled</h1>
                        <p class="text-sm text-[var(--color-text)] mt-2">Please enable the overlay in settings to use the crosshair feature.</p>
                    </div>
                </div>
                <div class="content flex-1 p-4 bg-[var(--color-background)] text-[var(--color-text)] overflow-auto">
                    <h2 class="text-2xl font-extrabold mb-4">Crosshair</h2>
                    <div id="toggle" v-if="loading" class="mb-4">
                        <Skeleton class="h-6 w-[8%]" :style="{ backgroundColor: 'var(--color-sidebar)' }"/>
                    </div>
                    <div id="toggle" v-else class="flex items-center justify-between mb-4">
                        <div class="flex items-center">
                            <label for="toggler" class="mr-3 text-base">Enabled</label>
                            <UToggle :model-value="enabled" @change="toggle"/>
                        </div>
                        <button class="bg-[var(--color-primary)] py-2 px-4 rounded-md text-sm font-medium hover:bg-[var(--color-accent)] transition-all ease-in-out duration-150" @click="toggleModal = true">
                            Game List
                        </button>
                    </div>
            
                    <div id="crrsshair-preview" v-if="loading" class="mb-4">
                        <Skeleton class="w-full h-[15svh]" :style="{ backgroundColor: 'var(--color-sidebar)' }"/>
                    </div>
                    <div id="crosshair-preview" v-else class="mb-5">
                        <h2 class="text-lg font-bold mb-3">Preview</h2>
                        <div id="display" class="relative flex bg-black w-full h-[15svh] rounded-lg shadow-md" :style="crosshairStyles">
                            <img :src="crosshairBg" v-if="crosshairBg" class="w-full h-full object-cover rounded-lg"/>
                            <selectedCrosshair.content v-if="selectedCrosshair" class="svg-display"/>
                        </div>
                
                        <div id="properties" class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                            <div class="flex flex-col gap-3">
                                <label for="color" class="font-medium text-base">Color</label>
                                <input type="color" id="color" v-model="selectedColor" class="w-12 h-12 p-0 border-2 border-[var(--color-primary)] rounded-md cursor-pointer"/>
                            </div>
                            <div class="flex flex-col gap-3">
                                <label for="size" class="font-medium text-base">Size <span>({{ size }})</span></label>
                                <input type="range" id="size" v-model="size" min="5" max="50" step="1" class="w-full h-2 bg-gray-200 rounded-lg cursor-pointer dark:bg-gray-700"/>
                            </div>
                            <div class="flex flex-col gap-3">
                                <label for="offset" class="font-medium text-base">Offset</label>
                                <div id="edit-offset" class="flex gap-3">
                                    <div id="x" class="flex items-center gap-2">
                                        <label for="offset-x" class="font-medium text-xs">X:</label>
                                        <input type="number" id="offset-x" v-model="offset.x" class="w-16 px-3 py-2 rounded-md bg-[var(--color-sidebar)] text-xs border-none outline-none focus:outline-[var(--color-primary)]"/>
                                    </div>
                                    <div id="y" class="flex items-center gap-2">
                                        <label for="offset-y" class="font-medium text-xs">Y:</label>
                                        <input type="number" id="offset-y" v-model="offset.y" class="w-16 px-3 py-2 rounded-md bg-[var(--color-sidebar)] text-xs border-none outline-none focus:outline-[var(--color-primary)]"/>
                                    </div>
                                </div>
                            </div>
                            <div class="flex flex-col gap-3">
                                <label for="display" class="font-medium text-base">Display</label>
                                <select id="display" v-model="selected" class="w-28 px-3 py-2 rounded-md bg-[var(--color-sidebar)] text-xs border-none outline-none focus:outline-[var(--color-primary)]">
                                    <option v-for="display in displays" :key="display.name!" :value="display">{{ display.name!.replace("\\\\.\\", "") }}</option>
                                </select>
                            </div>
                        </div>
                    </div>
            
                    <div id="crosshair-selection" v-if="loading" class="mb-5">
                        <Skeleton class="w-32 h-6" :style="{ backgroundColor: 'var(--color-sidebar)' }"/>
                        <div class="flex gap-3 mt-4">
                            <Skeleton class="w-18 h-18" :style="{ backgroundColor: 'var(--color-sidebar)' }" v-for="n in 5" :key="n"/>
                        </div>
                    </div>
            
                    <div id="crosshair-selection" v-else class="mb-5">
                        <h2 class="text-lg font-bold mb-4">Select Crosshair</h2>
                        <div class="flex gap-3 flex-wrap">
                            <div v-for="crosshair in defaultCrosshairs" :key="crosshair.id" :class="'cursor-pointer rounded-md p-3 border-2 border-solid' + (selectedCrosshair?.id == crosshair.id ? ' border-[var(--color-primary)]' : '')" @click="select(crosshair)">
                                <div class="h-10 w-10">
                                    <component class="max-h-10 max-w-10" :is="crosshair.content" :style="{ fill: 'rgb(0,0,0)', stroke: 'rgb(0,0,0)' }"/>
                                </div>
                            </div>
                        </div>
                    </div>
            
                    <button class="bg-[var(--color-primary)] py-2 px-4 rounded-md font-medium hover:bg-[var(--color-accent)] transition-all ease-in-out duration-150" @click="save">Save</button>
                </div>
            </div>
        </div>
        <UModal v-model="toggleModal">
            <!-- a list of the games installed, whether the crosshair will be shown when playing the game or not -->
            <div class="relative p-4 rounded-md bg-[var(--color-background)] text-[var(--color-text)] h-[80svh]">
                <h2 class="text-2xl font-bold mb-4">Game List</h2>
                <div class="grid grid-cols-2 gap-4 overflow-y-auto h-[70svh] rounded-md pr-1">
                    <div v-for="game in gamesData" :key="game.id" class="flex items-center justify-between p-3 bg-[var(--color-sidebar)] rounded-md shadow-md" :class="game.enabled ? 'border-[var(--color-primary)]' : 'border-red-500'">
                        <span class="text-sm">{{ game.name }}</span>
                        <UToggle :model-value="game.enabled" @change="() => toggleForGame(game)"/>
                    </div>
                </div>
            </div>
        </UModal>
    </NuxtLayout>
  </template>
  
  <style lang="scss" scoped>
  .content {

    #display {
        position: relative;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);

        :global(.svg-display) {
            position: absolute;
            width: var(--crosshair-size);
            height: var(--crosshair-size);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        :global(.svg-display), :global(.svg-display *) {
            fill: var(--crosshair-fill);
            stroke: var(--crosshair-fill);
        }
    }
  
    input[type="color"] {
        padding: 0;
        background-color: transparent;
        border: 2px solid var(--color-accent);
        width: 40px;
        height: 40px;
        cursor: pointer;
    }
  
    select {
        font-size: 14px;
        padding: 0.5rem;
        border-radius: 8px;
        background-color: var(--color-sidebar);
        color: var(--color-text);
        border: 2px solid var(--color-primary);
    }
  }
  </style>