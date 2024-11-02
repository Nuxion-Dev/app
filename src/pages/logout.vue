<script setup lang="ts">
const auth = await useAuth();
auth.logout();
</script>

<template>
    <h2>Logging out...</h2>
</template>