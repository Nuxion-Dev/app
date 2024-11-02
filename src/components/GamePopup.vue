<template>
    <div class="popup">
        <div class="popup-content">

        </div>
    </div>
</template>

<style lang="scss">
.popup {
    position: fixed;
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
        flex-direction: column;
        align-items: center;
        min-width: 30svw;
        max-height: 90%;
        overflow-y: hidden;

        .close {
            color: white;
            position: absolute;
            top: 1em;
            right: 1em;
            cursor: pointer;
            width: 30px;
            height: 30px;
            border-radius: 5px;
            background-color: var(--color-background);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;

            &:hover {
                background-color: #333;
            }
        }

        h1 {
            margin: 0;
            font-size: 1.5em;
            font-weight: 800;
            margin-bottom: 1em;
        }

        .banner {
            height: clamp(200px, 50%, 400px);
            border-radius: 5px;
            border: solid 2px var(--color-primary);
            box-shadow: -4px 4px 10px 4px rgba(0, 0, 0, .5);
        }

        h2 {
            font-size: 1.2em;
            margin-top: 1em;
            font-weight: 400;
        }
    }
}
</style>