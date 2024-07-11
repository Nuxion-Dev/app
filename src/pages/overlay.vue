<script setup lang="ts">
let appWindow: any = null;
onMounted(() => {
    // @ts-ignore
    appWindow = window.__TAURI__.window.appWindow;
    
})

const close = () => {
    if (appWindow) appWindow.close();
}
</script>

<template>
    <div id="overlay">
        <div class="overlay">
            <h1>Overlay Test - CLICK CLOSE</h1>
            <button @click="close">Close</button>
        </div>
    </div>
</template>

<style lang="scss">
.overlay {
    background-color: rgba(0, 0, 0, 0.2);
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    color: black;
}
</style>