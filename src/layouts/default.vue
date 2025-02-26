<script setup lang="ts">
import Toaster from '@/components/ui/toast/Toaster.vue'
import Sonner from '@/components/ui/sonner/Sonner.vue'
</script>

<template>
    <div id="container">
        <Titlebar />
        <slot></slot>
        <Toaster />
        <Sonner />
    </div>
</template>