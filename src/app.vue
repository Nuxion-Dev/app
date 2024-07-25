<script setup lang="ts">
import { toggle } from './utils/rpc';
import { register, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { window } from '@tauri-apps/api';
import {
	isPermissionGranted,
	requestPermission,
	sendNotification
} from '@tauri-apps/plugin-notification';

const auth = await useAuth();
if (auth.user) {
	const socket = await useSocket();
	watch(socket.data, async (data) => {
		if (data) {
			const d = JSON.parse(data);
			switch (d.type) {
				case 'message':
					const from = d.from;
					const message = d.message;

					const fromUser = await auth.getUser(from);
					sendNotification({
						title: fromUser?.displayName || from,
						body: message
					});
					break;
			}
		}
	});
}
onMounted(async () => {
	if (!(await isPermissionGranted())) {
		await requestPermission();
	}

	toggle(getSetting<boolean>("discord_rpc"));

	const registered = await isRegistered('CommandOrControl+Shift+I');
	if (!registered) {
		await register('CommandOrControl+Shift+I', (event) => {
			if (event.state === "Released") return;
			// open overlay window
			const windows = window.getAll();
			const overlay = windows.find((w: any) => w.label === 'overlay');

			if (overlay) overlay.show();
		});
	} else {
		console.log('shortcut already registered');
	}

	const theme = getSetting<Record<string, string>>('theme');
	const root = document.querySelector(':root') as any;
	if (!root) return;

	for (const [key, value] of Object.entries(theme)) {
		root.style.setProperty(`--color-${key}`, value);
	}

});


</script>

<template>
	<NuxtPage />
</template>

<style lang="scss">
@import "./assets/scss/main.scss";

:global(body) {
	background-color: transparent;
}

:root {
	--color-primary: #2e7d32;
	--color-secondary: #4caf50;
	--color-accent: #8bc34a;

	--color-background: #2c2c2c;
	--color-sidebar: #1f1f1f;
	--color-text: #f2f2f2;
}
</style>