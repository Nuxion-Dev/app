<script setup lang="ts">
import { toggle } from './utils/rpc';
import { register, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { window } from '@tauri-apps/api';
import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import {
	isPermissionGranted,
	requestPermission
} from '@tauri-apps/plugin-notification';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import { checkUpdate } from './utils/updater';
import useWebsocket from './composables/useSocket';

useWebsocket().then((socket) => {
	if (!socket) return;

	watch(socket.data, async (newData: any) => {
		if (!newData) return;

		const json = JSON.parse(newData);
		if (json.type.startsWith("friend")) emitTo('main', 'friend', json);
	});
});

const spotifyEnabled = getSetting<boolean>('spotify');
if (spotifyEnabled) {
    await invoke("spotify_login");
}

const autoLaunch = getSetting<boolean>('auto_launch');
const autoLaunchEnabled = await isEnabled();
if (autoLaunch) {
	if (!autoLaunchEnabled) enable();
} else {
	if (autoLaunchEnabled) disable();
}

listen('game:stop', async () => {
	const route = useRoute();
	const path = route.path.split("/");
	const rpcName = path[path.length - 1] == "" ? "home" : path[path.length - 1];

	const d: { [key: string]: any } = {}
	if (rpcName == "games" || rpcName == "recent" || rpcName == "favourites") {
		const data: any = await $fetch('http://127.0.0.1:5000/api/get_games')
		const games = data.games;

		if (rpcName == "games") d['total'] = games.length;
		else if (rpcName == "recent") d['game'] = games.filter((game: any) => game.last_played > 0).sort((a: any, b: any) => b.last_played - a.last_played)[0];
		else if (rpcName == "favourites") d['total_fav'] = games.filter((game: any) => game.favourite).length;
	}

	setRPC(rpcName, d);
});

onMounted(async () => {
	if (!(await isPermissionGranted())) {
		await requestPermission();
	}

	const useRpc = getSetting<boolean>('discord_rpc') || false;
	toggle(useRpc);

	/*const registered = await isRegistered('CommandOrControl+Shift+I');
	if (!registered) {
		await register('CommandOrControl+Shift+I', async (event) => {
			if (event.state === "Released") return;
			console.log('shortcut pressed');
			emitTo('overlay', 'toggle-overlay', {});
		});
	} else {
		console.log('shortcut already registered');
	}*/

	const theme = getSetting<Record<string, string>>('theme') || {};
	const root = document.querySelector(':root') as any;
	if (!root) return;

	for (const [key, value] of Object.entries(theme)) {
		root.style.setProperty(`--color-${key}`, value);
	}

	invoke<boolean>('is_dev').then((isDev: boolean) => {
		if (!isDev) {
			checkUpdate();
			disableContextMenu();
		}
	});

	// disable context menu
	function disableContextMenu() {
		document.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			return false;
		}, {
			capture: true
		});

		document.addEventListener('selectstart', (event) => {
			event.preventDefault();
			return false;
		}, {
			capture: true
		});
	}

	useAppInfo();
});

</script>

<template>
	<NuxtPage />
</template>

<style lang="scss">
@use "~/assets/scss/main.scss" as *;

:root {
	--color-primary: #2e7d32;
	--color-secondary: #4caf50;
	--color-accent: #8bc34a;

	--color-background: #2c2c2c;
	--color-sidebar: #1f1f1f;
	--color-text: #f2f2f2;
}

:global(body) {
	background-color: transparent;
	color: var(--color-text);
}
</style>