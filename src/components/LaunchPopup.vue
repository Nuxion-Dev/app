<script setup lang="ts">
const props = defineProps({
    game: {
        type: Object,
        required: true
    },
    close: {
        type: Function,
        required: true
    }
})
const defaultBanner = await import('@/assets/img/default-banner.jpg');

const getBanner = async (bannerId: string) => {
    const { data, error } = await useFetch('http://localhost:5000/api/get_banner/' + bannerId);
    if (!data.value || error.value) return defaultBanner.default;
    return 'http://localhost:5000/api/get_banner/' + bannerId;
}
</script>

<template>
    <div class="popup">
        <div class="popup-content">
            <Image class="banner" :src="getBanner(game['game_id'])" alt="Game Banner" />
            <div class="desc">
                <h1>Launching game...</h1>
                <h2>{{ game['display_name'] }}</h2>

                <div class="close" @click="close()">Close</div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.popup {
    position: fixed;
    font-family: 'Poppins', sans-serif;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 800;

    .popup-content {
        position: relative;
        background-color: var(--color-sidebar);
        padding: 1em;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, .5);
        display: flex;
        gap: 2em;
        min-width: 30svw;
        max-height: 90%;
        overflow-y: hidden;

        .desc {
            display: flex;
            flex-direction: column;
            gap: 1em;
            flex: 1;

            .close {
                color: white;
                cursor: pointer;
                padding: 4px;
                box-shadow: 0 4px 5px 0 rgba(0, 0, 0, .5);
                border-radius: 4px;
                background-color: var(--color-background);
                display: flex;
                justify-content: center;
                font-size: 1.5em;
                margin-bottom: 0;
                margin-top: auto;

                &:hover {
                    background-color: #333;
                }
            }

            h1 {
                margin: 0;
                font-size: 1.25em;
                font-weight: 500;
            }

            h2 {
                font-size: 2em;
                font-weight: 600;
            }
        }

        .banner {
            height: clamp(200px, 50%, 400px);
            border-radius: 5px;
            box-shadow: -4px 4px 10px 4px rgba(0, 0, 0, .5);
            max-height: 250px;
        }
    }
}
</style>