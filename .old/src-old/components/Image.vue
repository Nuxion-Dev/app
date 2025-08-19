<script setup lang="ts">
const props = defineProps({
    src: {
        type: Promise<String>,
        required: true
    },
    alt: {
        type: String,
        required: true
    },
    fallback: {
        type: Promise<String>,
        required: false
    }
})

const src = await props.src;
const image = ref((src || await props.fallback).toString());
</script>

<template>
    <img :src="image" :alt="alt" />
</template>