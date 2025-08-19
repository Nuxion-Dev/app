<script setup lang="ts">
import Loader from '~/components/Loader.vue';

onMounted(async () => {
    const auth = await useAuth();
    await auth.logout();

    await navigateTo("/");
})
</script>

<template>
    <Loader loading />
</template>