<script setup lang="ts">
import { open } from "@tauri-apps/plugin-shell";
import { getCurrentWindow } from "@tauri-apps/api/window";
import nuxionlogo from "assets/img/nuxion-logo.png";
import { exit } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
let appWindow = getCurrentWindow();

const close = async () => {
    await invoke("stop");
};

const maximise = () => {
    if (appWindow)
        appWindow.isMaximized().then((maximized) => {
            if (maximized) appWindow.unmaximize();
            else appWindow.maximize();
        });
};

const minimise = () => {
    if (appWindow) appWindow.minimize();
};

const discordInvite = useRuntimeConfig().public.DISCORD_INVITE;
</script>

<template>
    <div class="titlebar" data-tauri-drag-region>
        <div class="part flex items-center" id="left">
            <img
                id="discord"
                :src="nuxionlogo"
                @click="open(discordInvite)"
                height="18"
                width="18"
                alt="Nuxion Icon"
            />
            <div class="title">Nuxion</div>
        </div>
        <div class="part">
            <div id="minimise" @click="minimise">
                <Icon name="codicon:chrome-minimize" />
            </div>
            <div id="maximise" @click="maximise">
                <Icon name="codicon:chrome-maximize" />
            </div>
            <div id="close" @click="close">
                <Icon name="codicon:chrome-close" />
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.titlebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 30px;
    background-color: var(--color-sidebar);
    color: var(--color-text);
    font-size: 14px;
    font-weight: 500;
    user-select: none;
    z-index: 1000;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    cursor: grab;

    .part {
        display: flex;
        align-items: center;

        &#left {
            gap: 0.4em;
            padding: 0 10px;

            & > *:not(.title) {
                cursor: pointer;
            }
        }

        .title {
            cursor: default;
            font-family: "Kode Mono", monospace;
        }

        #minimise,
        #maximise,
        #close {
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            cursor: pointer;

            &:hover {
                background-color: rgba(0, 0, 0, 0.1);
            }
        }

        #close {
            &:hover {
                background-color: #ff5252;
            }
        }
    }
}
</style>
