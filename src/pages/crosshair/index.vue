<script setup lang="ts">
import { emitTo } from '@tauri-apps/api/event';
import { hasPermium } from '~/utils/types/User';

const loading = ref(false);
const auth = await useAuth();
const user = auth.user;

const crosshairSettings = getSetting<CrosshairSettings>('crosshair')!;
const enabled = ref(crosshairSettings.enabled);

function toggle() {
    enabled.value = !enabled.value;
    crosshairSettings.enabled = !crosshairSettings.enabled;
    setSetting('crosshair', crosshairSettings);

    emitTo('overlay', 'toggle-crosshair', { enabled: enabled.value });
}
</script>

<template>
    <NuxtLayout>
        <Loader :loading="loading" />
        <div class="sub-container">
            <Sidebar page="crosshair" />
            <div class="content">
                <h1>Crosshair</h1>
                <div id="toggle">
                    <UTooltip class="flex" text="Purchase premium to unlock this feature" v-if="!hasPermium(user)">
                        <p for="toggler">Enabled</p>
                        <UToggle id="toggler" name="toggler" disabled />
                    </UTooltip>
                    <div class="flex items-center" v-else>
                        <label for="toggler">Enabled</label>
                        <UToggle :model-value="enabled" @change="toggle" />
                    </div>
                </div>
            </div>
        </div>
    </NuxtLayout>
</template>

<style lang="scss" scoped>
</style>