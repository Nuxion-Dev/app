<script setup lang="ts">
const auth = useFirebaseAuth();
auth.logout();
</script>

<template>
    <h2>Logging out...</h2>
</template>