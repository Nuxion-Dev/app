<script setup lang="ts">
import { toggle } from './utils/rpc';
onMounted(() => {
	toggle(true);
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
	// green and dark-themed
	--color-primary: #2e7d32;
	--color-secondary: #4caf50;
	--color-accent: #8bc34a;

	--color-background: #2c2c2c;
	--color-sidebar: #1f1f1f;
	--color-text: #f2f2f2;
}
</style>