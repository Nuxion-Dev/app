<script setup lang="ts">
import { window } from '@tauri-apps/api';
import { emitTo, listen } from '@tauri-apps/api/event';
import type { AudioHTMLAttributes } from 'vue';
import type { CrosshairSettings } from '~/utils/settings';

type Notification = {
    title: string;
    body: string;
    icon?: string;
}

let timeout: NodeJS.Timeout | null = null;
const notif = ref<Notification | null>(null);

const crosshairSettings = getSetting<CrosshairSettings>('crosshair');
const crosshairEnabled = crosshairSettings?.enabled || false;
const crosshairIcon = crosshairSettings?.icon || null;

const current = window.getCurrentWindow();
const overlayVisible = ref(false);
const close = async () => {
    overlayVisible.value = false;
    current.setIgnoreCursorEvents(true);
}

const showUnlisten = await listen<{
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

const audio = ref<HTMLAudioElement | null>(null)
function showNotif(payload: Notification) {
    notif.value = payload;
    if (audio.value) audio.value.play();

    timeout = setTimeout(() => {
        notif.value = null;
        if (timeout) clearTimeout(timeout);
    }, 5000);
}

const notificationListener = await listen<Notification>('notification', (event) => {
    if (notif.value) {
        notif.value = null;
        if (timeout) clearTimeout(timeout);
        setTimeout(showNotif, 500);
        return;
    }

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
        <audio ref="audio" src="assets/audio/notification.mp3"></audio>
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
        <div id="crosshair" v-if="!overlayVisible && crosshairEnabled && crosshairIcon">
            <div class="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[50%]">
                <img class="w-6 h-6" :src="crosshairIcon" alt="Crosshair" />
            </div>
        </div>
        <div id="notifications" class="absolute left-2 top-2 min-w-[300px]">
            <div class="flex notif bg-zinc-900 p-3" :class="{ 'show-notif': !!notif, 'hide-notif': !notif }">
                <img v-if="notif && notif.icon" class="h-[50px] w-[50px]" :src="notif.icon" alt="Notification" />
                <div class="ml-4" v-if="notif">
                    <h3 class="font-bold text-ellipsis ws-nowrap overflow-hidden">{{ notif.title }}</h3>
                    <p class="opacity-85 mt-1 text-sm text-ellipsis ws-nowrap overflow-hidden">{{ notif.body }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
#notifications {
    transition: all 0.3s ease;
    pointer-events: none;

    .notif {
        border-radius: 12px;
        transition: all 0.5s ease;

        &.show-notif {
            transform: translateY(0);
        }

        &.hide-notif {
            transform: translateY(-150%);
        }
    }

    img {
        border-radius: 8px;
    }
}

#crosshair {
    .line {
        width: 2px;
        height: 20px;
        background-color: white;
        margin: 0 auto;
        position: absolute;
    }

    .line:nth-child(1) {
        transform: translateY(-50%);
    }

    .line:nth-child(2) {
        transform: translateY(-50%) rotate(90deg);
    }

    .line:nth-child(3) {
        transform: translateY(-50%) rotate(45deg);
    }

    .line:nth-child(4) {
        transform: translateY(-50%) rotate(-45deg);
    }

    .line {
        &:not(:last-child) {
            margin-bottom: 5px;
        }
    }
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