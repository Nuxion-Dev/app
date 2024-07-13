<script setup lang="ts">
import { register } from '@tauri-apps/plugin-global-shortcut';
import { window } from '@tauri-apps/api';

/*await register('CommandOrCtrl+Alt+T', () => {
	// open overlay window
	const windows = window.getAll();
    const overlay = windows.find((w: any) => w.label === 'overlay');

    if (overlay) overlay.show();
});*/
</script>

<template>
    <div class="container">
        <Titlebar />
        <slot></slot>
    </div>
</template>