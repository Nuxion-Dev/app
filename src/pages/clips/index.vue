<script setup lang="ts">
</script>

<template>
    <NuxtLayout>
        <div class="sub-container">
            <Sidebar page="clips" />
            <div class="content">
                <div class="c-wrapper">
                    <h1>Coming Soon</h1>
                </div>
            </div>
        </div>
    </NuxtLayout>
</template>

<style lang="scss" scoped>
.c-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    h1 {
        font-size: 3em;
        font-weight: 700;
        color: rgba(255, 255, 255, .7);
    }
}
</style>