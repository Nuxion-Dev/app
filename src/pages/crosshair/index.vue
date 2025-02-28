<script setup lang="tsx">
import { emitTo } from '@tauri-apps/api/event';
import { availableMonitors, type Monitor } from '@tauri-apps/api/window';
import Skeleton from '~/components/ui/skeleton/Skeleton.vue';
import { type CrosshairItem, defaultCrosshairs } from '~/utils/crosshair';
import type User from '~/utils/types/User';

const selectedCrosshair = ref<CrosshairItem | null>(null);
const selectedColor = ref<string>('#000');
const size = ref<number>(0);
const offset = reactive({ x: 0, y: 0 });
const displays = ref<Monitor[]>([]);
const selected = ref<Monitor>();

const loading = ref(true);
const user = ref<User | null>(null);

let crosshairBg: string | null = null;

const crosshairStyles = computed(() => ({
    '--crosshair-fill': selectedColor.value,
    '--crosshair-size': `${size.value}px`,
}));

const enabled = ref(false);
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

    loading.value = false;

    setRPC('crosshair')
})

function toggle() {
    enabled.value = !enabled.value;
    const crosshairSettings = getSetting<CrosshairSettings>('crosshair')!;
    crosshairSettings.enabled = !crosshairSettings.enabled;
    setSetting('crosshair', crosshairSettings);

    emitTo('overlay', 'toggle-crosshair', { enabled: enabled.value });
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
        <div class="sub-container">
            <Sidebar page="crosshair" />
            <div class="content space-y-4">
                <h1>Crosshair</h1>
                <div id="toggle" v-if="loading">
                    <Skeleton 
                        class="h-8 w-[10%]"
                        :style="{ backgroundColor: 'var(--color-sidebar)' }"
                    />
                </div>
                <div id="toggle" v-else>
                    <div class="flex items-center">
                        <label for="toggler">Enabled</label>
                        <UToggle :model-value="enabled" @change="toggle" />
                    </div>
                </div>
                <div id="crrsshair-preview" v-if="loading">
                    <Skeleton
                        class="w-full h-[25svh]"
                        :style="{ backgroundColor: 'var(--color-sidebar)' }"
                    />
                </div>
                <div id="crosshair-preview" v-else>
                    <h2 class="text-lg font-bold mb-2">Preview</h2>
                    <div id="display" class="relative flex bg-black w-full h-[25svh] rounded" :style="crosshairStyles">
                        <img :src="crosshairBg" v-if="crosshairBg" class="w-full h-full object-cover" />
                        <selectedCrosshair.content v-if="selectedCrosshair" class="svg-display" />
                    </div>
                    <div id="properties" class="flex gap-8 mt-2">
                        <div class="flex flex-col gap-2">
                            <label for="color" class="font-medium">Color</label>
                            <input type="color" id="color" v-model="selectedColor" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="size" class="font-medium">Size <span>({{ size }})</span></label>
                            <input type="range" id="size" v-model="size" min="5" max="50" step="1" class="w-36 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2 dark:bg-gray-700" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="offset"class="font-medium">Offset</label>
                            <div id="edit-offset" class="flex gap-2 items-center">
                                <div id="x" class="flex items-center gap-1">
                                    <label for="offset-x" class="font-medium text-sm">X:</label>
                                    <input type="number" id="offset-x" v-model="offset.x" class="w-20 px-2 py-1 rounded text-sm bg-[var(--color-sidebar)] outline-none focus:outline-green-500 border-none" autocomplete="off" required />
                                </div>
                                <div id="y" class="flex items-center gap-1">
                                    <label for="offset-y" class="font-medium text-sm">Y:</label>
                                    <input type="number" id="offset-y" v-model="offset.y"  class="w-20 px-2 py-1 rounded text-sm bg-[var(--color-sidebar)] outline-none focus:outline-green-500 border-none" autocomplete="off" required />
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="display" class="font-medium">Display</label>
                            <select id="display" v-model="selected" class="w-28 px-2 py-1 rounded text-sm bg-[var(--color-sidebar)] outline-none focus:outline-green-500 border-none">
                                <option v-for="display in displays" :key="display.name!" :value="display">{{ display.name!.replace("\\\\.\\", "") }}</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div id="crosshair-selection" v-if="loading">
                    <div class="space-y-4">
                        <Skeleton
                            class="w-36 h-8"
                            :style="{ backgroundColor: 'var(--color-sidebar)' }"
                        />

                        <div class="flex gap-2">
                            <Skeleton
                                class="w-20 h-20"
                                :style="{ backgroundColor: 'var(--color-sidebar)' }"
                                v-for="n in 5"
                                :key="n"
                            />
                        </div>
                    </div>
                </div>
                <div id="crosshair-selection" v-else>
                    <h2 class="font-bold text-lg mb-2">Select Crosshair</h2>
                    <div class="flex gap-2">
                        <div v-for="crosshair in defaultCrosshairs" :key="crosshair.id" :class="'pointer rounded-md p-2 border border-solid border-gray-40' + (selectedCrosshair?.id == crosshair.id ? ' border-green-500' : '')" @click="select(crosshair)">
                            <div class="h-10 w-10">
                                <component class="max-h-10 max-w-10" :is="crosshair.content" :style="{ fill: 'rgb(0,0,0)', stroke: 'rgb(0,0,0)' }" />
                            </div>
                        </div>
                    </div>
                </div>
                <button class="bg-[var(--color-primary)] py-2 px-4 rounded-md font-medium hover:bg-[var(--color-accent)] transition-all ease-in-out duration-200" @click="save">Save</button>
            </div>
        </div>
    </NuxtLayout>
</template>

<style lang="scss" scoped>
.content {
    h1 {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 1rem;
    }

    #toggle {
        margin-bottom: 1rem;

        label {
            margin-right: 1rem;
        }
    }

    #display {
        :global(.svg-display) {
            position: absolute;
            width: var(--crosshair-size); // size;
            height: var(--crosshair-size); // size;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }

        :global(.svg-display), :global(.svg-display *) {
            fill: var(--crosshair-fill); // selectedColor;
            stroke: var(--crosshair-fill); // selectedColor;
        }
    }
}

input[type="color"] {
    padding: 0;
    background-color: transparent;
    color: var(--color-text);
    font-size: 14px;
    width: 30px;

    &:focus {
        outline: solid 2px var(--color-primary);
    }
}
</style>