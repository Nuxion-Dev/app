<script setup lang="ts">
const count = ref(0);
</script>

<template>
    <div class="counter">
        <UCard>
            <template #header>
                <h1 class="text-2xl font-bold">Counter</h1>
            </template>

            <p>{{ count }}</p>
            <div class="actions">
                <UButton color="primary" @click="count++"><font-awesome-icon :icon="['fas', 'plus']" /> Increment</UButton>
                <UButton color="red" @click="count--"><font-awesome-icon :icon="['fas', 'minus']" />Decrement</UButton>
            </div>
        </UCard>
    </div>
</template>

<style lang="scss">
.counter {
    width: 500px;
    align-self: center;
    margin-top: 1em;

    p {
        font-size: 2em;
        text-align: center;
    }

    .actions {
        display: flex;
        gap: 2em;
        margin-top: 1em; 
        justify-content: center;
    }
}
</style>