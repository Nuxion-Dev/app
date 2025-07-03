<script setup lang="ts">
import { cn } from '@/lib/utils';
import { emitTo, listen } from '@tauri-apps/api/event';
import { availableMonitors, primaryMonitor, getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
import type { CrosshairSettings } from '~/utils/settings';
import notifSound from '@/assets/audio/notification.mp3';

type Notification = {
    title: string;
    body: string;
    icon?: string;
}

const notif = ref<Notification[]>([]);

const display = ref()

const showCrosshair = ref(false);
const crosshairEnabled = ref(false);
const crosshairId = ref<string | null>(null);
const crosshairIcon = ref<any>(null);
const crosshairColor = ref('#000');
const crosshairSize = ref(20);
const offset = reactive({ x: 0, y: 0 });

onMounted(async () => {
    const crosshairSettings = getSetting<CrosshairSettings>('crosshair');
    if (!crosshairSettings) return;

    crosshairEnabled.value = crosshairSettings.enabled;
    crosshairId.value = crosshairSettings.selected;
    crosshairColor.value = crosshairSettings.color;
    crosshairSize.value = crosshairSettings.size;
    display.value = crosshairSettings.display;
    offset.x = crosshairSettings.offset.x;
    offset.y = crosshairSettings.offset.y;
    updateCrosshair();

    showNotif({
        title: 'Test',
        body: 'This is a test notification',
    });

    setTimeout(() => {
        showNotif({
            title: 'Test 2',
            body: 'This is another test notification',
        });
    }, 2000);
});

const current = getCurrentWindow();
const overlayVisible = ref(false);
const close = async () => {
    overlayVisible.value = false;
    current.setIgnoreCursorEvents(true);
}

listen<{
    visible: boolean;
}>('toggle-overlay', (event) => {
    overlayVisible.value = !overlayVisible.value;

    if (overlayVisible.value) {
        current.setIgnoreCursorEvents(false);
        current.setFullscreen(true);
        current.setFocus();
    } else {
        current.setIgnoreCursorEvents(true);
        current.setFullscreen(false);
        current.maximize();
    }
});

listen<boolean>('show-crosshair', (event) => {
    console.log('show-crosshair', event.payload);
    showCrosshair.value = event.payload;
});

listen<boolean>('toggle-crosshair', (event) => {
    crosshairEnabled.value = event.payload;
});

listen<{
    id: string;
    color: string;
    size: number;
    display: string;
    offset: { x: number; y: number };
}>("set-crosshair", (event) => {
    crosshairId.value = event.payload.id;
    crosshairColor.value = event.payload.color;
    crosshairSize.value = event.payload.size;
    display.value = event.payload.display;
    offset.x = event.payload.offset.x;
    offset.y = event.payload.offset.y;
    updateCrosshair();
});

const crosshairStyles = computed(() => ({
    '--crosshair-fill': crosshairColor.value,
    '--crosshair-size': `${crosshairSize.value}px`,
    '--crosshair-offset-x': `${offset.x}px`,
    '--crosshair-offset-y': `${offset.y}px`,
}));

function updateCrosshair() {
    const crosshairs = defaultCrosshairs;
    const selected = crosshairs.find((c) => c.id === crosshairId.value);
    if (selected) crosshairIcon.value = selected.content;
    else crosshairIcon.value = null;

    const crosshairSettings = getSetting<CrosshairSettings>('crosshair') || DEFAULT_CROSSHAIR;
    crosshairSettings.color = crosshairColor.value;
    crosshairSettings.size = crosshairSize.value;
    crosshairSettings.selected = crosshairId.value;
    crosshairSettings.display = display.value;
    crosshairSettings.offset = offset;

    availableMonitors().then(async (monitors) => {
        const selectedMonitor = monitors.find((m) => m.name === display.value) || await primaryMonitor();
        if (!selectedMonitor) return;

        const position = selectedMonitor.position;
        await current.setPosition(position);
        current.setShadow(false);
        const isMaximized = await current.isMaximized();
        if (!isMaximized) current.maximize();
    });

    setSetting('crosshair', crosshairSettings);
}

const audio = ref<HTMLAudioElement | null>(null)
function showNotif(payload: Notification) {
    notif.value.push(payload);
    if (notif.value.length > 5) notif.value.shift();
    if (audio.value) {
        audio.value.pause();
        audio.value.currentTime = 0;
        audio.value.play();
    }

    setTimeout(() => {
        if (notif.value.length > 0) notif.value.shift();
    }, 5000);
}

listen<Notification>('notification', (event) => {
    showNotif(event.payload);
});

onMounted(() => {
    const cards = document.querySelectorAll('.card');

    cards.forEach((card: any) => {
        const dragArea = card.querySelector('.drag-area');
        const content = card.querySelector('.content');

        dragArea.addEventListener('mousedown', (e: any) => {
            let offsetX = e.clientX - card.getBoundingClientRect().left;
            let offsetY = e.clientY - card.getBoundingClientRect().top;
            let isDragging = true;

            cards.forEach((c: any) => c.style.zIndex = 0);
            card.style.zIndex = 1;

            document.addEventListener('mousemove', (e: any) => {
                if (!isDragging) return;
                card.style.left = e.clientX - offsetX + 'px';
                card.style.top = e.clientY - offsetY + 'px';
            });

            document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', () => {});
                document.removeEventListener('mouseup', () => {});

                isDragging = false;
            });
        });
    });
})
</script>

<template>
    <div id="overlay">
        <audio ref="audio" :src="notifSound" preload="auto"></audio>
        <div class="overlay" :class="{ 'hidden': !overlayVisible }">
            <div class="close" @click="close">
                <Icon name="codicon:chrome-close" />
            </div>
            <div class="cards">
                <div class="card">
                    <div class="drag-area">
                        <span class="line"></span>
                    </div>
                    
                    <div class="content">
                        <h2>Card 1</h2>
                        <p>Content 1</p>
                    </div>
                </div>
                <div class="card">
                    <div class="drag-area">
                        <span class="line"></span>
                    </div>
                    
                    <div class="content">
                        <h2>Card 2</h2>
                        <p>Content 2</p>
                    </div>
                </div>
                <div class="card">
                    <div class="drag-area">
                        <span class="line"></span>
                    </div>
                    
                    <div class="content">
                        <h2>Card 3</h2>
                        <p>Content 3</p>
                    </div>
                </div>
            </div>
        </div>
        <div id="crosshair" v-if="!overlayVisible && crosshairEnabled && crosshairIcon && showCrosshair">
            <component :is="crosshairIcon" class="crosshair-svg" :style="crosshairStyles" />
        </div>
        <div class="notifications">
            <div v-for="(notification, index) in notif.toReversed()" :key="index" 
                :class="cn('notif notif-' + index)"
            >
                <img v-if="notification.icon" :src="notification.icon" alt="Notification Icon" />
                <div class="flex flex-col max-w-full max-h-full">
                    <h3 class="font-bold text-md">{{ notification.title }}</h3>
                    <!-- trailing dots if it goes out of card -->
                    <p class="text-sm truncate text-muted-foreground">{{ notification.body }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
@keyframes show-notif {
    0% {
        opacity: 0;
        transform: translateY(-20px);
    }
    
    10% {
        opacity: 1;
        transform: translateY(0);
    }

    90% {
        opacity: 1;
        transform: translateY(0);
    }

    100% {
        opacity: 0;
        transform: translateY(-20px);
    }
}

.notif {
    box-shadow: 0 0 28px rgba(0, 0, 0, 0.6) inset, 0 0 10px rgba(0, 0, 0, 0.3);
    border: solid 1px rgba(0, 0, 0, 0.2);
    position: absolute;
    border-radius: var(--radius);
    padding: 0.5rem 1rem;
    color: var(--color-text);
    background-color: var(--color-sidebar);
    display: flex;
    width: 300px;
    animation: show-notif 7s ease-in-out;
    animation-fill-mode: forwards;
    animation-delay: calc(0.1s * var(--notif-index, 0));

    @for $i from 0 through 5 {
        &.notif-#{$i} {
            top: calc(8px + #{$i * 8}px);
            left: calc(8px + #{$i * 8}px);
            z-index: calc(100 + #{5 - $i});
        }
    }

    &:hover {
        position: relative;
        flex-direction: column;
        gap: 0.5rem;
    }
}

#crosshair {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100svh;
    width: 100svw;
}

.crosshair-svg {
    margin-top: var(--crosshair-offset-y);
    margin-left: var(--crosshair-offset-x);
    width: var(--crosshair-size);
    height: var(--crosshair-size);
}

.crosshair-svg, .crosshair-svg * {
    fill: var(--crosshair-fill);
    stroke: var(--crosshair-fill);
}

.overlay {
    background-color: rgba(0, 0, 0, 0.4);
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    color: white;
    font-weight: 500;

    .close {
        position: absolute;
        top: 10px;
        right: 10px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        border-radius: 5px;
        background-color: #444;
        font-size: 20px;
        color: #ccc;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;

        &:hover {
            background-color: #333;
            color: white;
        }
    }

    .cards {
        .card {
            position: absolute;
            top: 0;
            left: 0;

            width: 300px;
            height: 200px;
            background-color: var(--color-background);
            color: var(--color-text);
            border-radius: 5px;
            box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.5); 

            .drag-area {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 2em;
                cursor: move;
                background-color: var(--color-sidebar);
                border-radius: 5px 5px 0 0;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

                .line {
                    width: 50%;
                    height: 2px;
                    background-color: var(--color-text);
                }
            }

            .content {
                padding: .5em 1em;

                h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                }

                p {
                    font-size: 1rem;
                    font-weight: 500;
                }
            }
        }
    }
}
</style>