<script setup lang="tsx">
import { emitTo } from '@tauri-apps/api/event';
import Skeleton from '~/components/ui/skeleton/Skeleton.vue';
import { type CrosshairItem, defaultCrosshairs } from '~/utils/crosshair';
import type User from '~/utils/types/User';

const selectedCrosshair = ref<CrosshairItem | null>(null);
const selectedColor = ref<string>('#000');
const size = ref<number>(0);

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
    crosshairSettings.color = selectedColor.value;
    crosshairSettings.size = size.value;
    crosshairSettings.selected = selectedCrosshair.value?.id || defaultCrosshairs[0].id;
    emitTo('overlay', 'set-crosshair', {
        id: crosshairSettings.selected,
        color: crosshairSettings.color,
        size: crosshairSettings.size,
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
                    <h2>Preview</h2>
                    <div id="display" class="relative flex bg-black w-full h-[25svh]" :style="crosshairStyles">
                        <img :src="crosshairBg" v-if="crosshairBg" class="w-full h-full object-cover" />
                        <selectedCrosshair.content v-if="selectedCrosshair" class="svg-display" />
                    </div>
                    <div class="flex items-center">
                        <label for="color">Color</label>
                        <input type="color" id="color" v-model="selectedColor" />
                    </div>
                    <div class="flex items-center">
                        <label for="size">Size</label>
                        <input type="range" id="size" v-model="size" min="10" max="50" class="w-36" />
                        {{ size }}
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
                    <h2>Select Crosshair</h2>
                    <div class="flex gap-2">
                        <div v-for="crosshair in defaultCrosshairs" :key="crosshair.id" :class="'pointer rounded-md p-2 border border-solid border-gray-40' + (selectedCrosshair?.id == crosshair.id ? ' border-green-500' : '')" @click="select(crosshair)">
                            <div class="h-10 w-10">
                                <component class="max-h-10 max-w-10" :is="crosshair.content" :style="{ fill: 'rgb(0,0,0)', stroke: 'rgb(0,0,0)' }" />
                            </div>
                        </div>
                    </div>
                </div>
                <button class="btn" @click="save">Save</button>
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