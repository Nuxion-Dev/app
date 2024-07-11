<script setup lang="ts">
let appWindow: any = null;
onMounted(() => {
    // @ts-ignore
    appWindow = window.__TAURI__.window.appWindow;
    
})

const close = () => {
    if (appWindow) appWindow.close();
}

const maximise = () => {
    if (appWindow) appWindow.isMaximized().then((maximized: any) => {
        if (maximized) {
            appWindow.unmaximize();
        } else {
            appWindow.maximize();
        }
    });
}

const minimise = () => {
    if (appWindow) appWindow.minimize();
}
</script>

<template>
    <div class="titlebar" data-tauri-drag-region>
        <div class="part" id="left">
            <div class="title">
                Nuxion
            </div>
            <Icon id="discord" name="ic:baseline-discord" />
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
    padding: 0 10px;
    background-color: var(--color-sidebar);
    color: var(--color-text);
    font-size: 14px;
    font-weight: 500;
    user-select: none;
    -webkit-app-region: drag;
    z-index: 1000;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    cursor: grab;

    .part {
        display: flex;
        align-items: center;

        &#left {
            gap: 1em;

            & > *:not(.title) {
                cursor: pointer;
            }
        }

        .title {
            cursor: default;
            font-family: 'Kode Mono', monospace;
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