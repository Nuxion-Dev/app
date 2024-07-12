<script setup lang="ts">
const maxSlots = 5;
const emptySlots = ref(
    Array(maxSlots - 1).fill(null)
);

onMounted(() => {
    setRPC("home");
})
</script>

<template>
    <NuxtLayout>
        <div class="sub-container">
            <Sidebar page="home" />
            <div class="content">
                <div class="wrapper">
                    <div id="left">
                        <h3>Games Shortcut</h3>
                        <div class="game-shortcuts">
                            <div class="game-shortcut">
                                <div class="banner">
                                    <div class="delete">
                                        <Icon name="mdi:trash-can" />
                                    </div>
                                    <img src="https://via.placeholder.com/150" alt="Game banner" />
                                </div>
                                <div class="info">
                                    <h3>Game Name</h3>
                                </div>
                            </div>
                            <div class="empty-game-shortcut" v-for="i in emptySlots" :key="i">
                                <Icon name="mdi:plus" class="icon" />
                            </div>
                        </div>
                    </div>
                    <div id="right">
                        <div class="card" id="spotify">
                            <div class="header">
                                <Icon name="mdi:spotify" :style="{ fontSize: '20px' }" />
                                <h3>Spotify</h3>
                            </div>
                            <div class="card-content">
                                <div class="player">
                                    <div class="banner">
                                        <img src="https://via.placeholder.com/150" alt="Spotify banner" />
                                    </div>
                                    <div class="info">
                                        <div class="name">
                                            <h3 id="song">Song Name</h3>
                                            <p id="artist">Artist Name</p>
                                        </div>
                                        <div class="actions">
                                            <div class="buttons">
                                                <Icon name="mdi:skip-previous" />
                                                <Icon name="mdi:play" />
                                                <Icon name="mdi:skip-next" />
                                            </div>
                                            <div class="slider">
                                                <span id="current-time">0:00</span>
                                                <input type="range" />
                                                <span id="duration">0:00</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </NuxtLayout>
</template>

<style lang="scss">
$height: calc(900px / 4);
$width: calc(600px / 4);

.wrapper {
    display: flex;
    gap: .5em;

    #left {
        flex: 1;

        h3 {
            font-size: 20px;
            font-weight: 500;
            margin-bottom: 20px;
        }

        .game-shortcuts {
            display: flex;
            gap: .5em;

            .game-shortcut {
                background-color: var(--color-sidebar);
                color: var(--color-text);
                border-radius: 5px;
                overflow: hidden;
                width: $width;

                .banner {
                    position: relative;
                    cursor: pointer;

                    .delete {
                        display: none;
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        background-color: rgba(0, 0, 0, 0.5);
                        border-radius: 8px;
                        border: solid 2px red;
                        color: red;

                        align-items: center;
                        justify-content: center;
                        width: 30px;
                        height: 30px;
                        cursor: pointer;

                        z-index: 500;

                        transition: ease-in-out .15s;
                        &:hover {
                            background-color: red;
                            color: white;
                        }
                    }

                    img {
                        width: 100%;
                        height: $height;
                        object-fit: cover;
                        transition: ease-in-out .15s;
                    }

                    &:hover {
                        .delete {
                            display: flex;
                        }

                        img {
                            filter: brightness(0.8);
                        }
                    }
                }

                .info {
                    padding: .5em 1em;

                    h3 {
                        font-size: 16px;
                        font-weight: 500;
                        margin-bottom: 2px;
                    }

                    p {
                        font-size: 12px;
                        font-weight: 400;
                        color: rgba(255, 255, 255, 0.8);
                    }
                }
            }
            
            .empty-game-shortcut {
                width: $width;
                height: calc($height + 2.6em);

                border-radius: 8px;
                border: solid 4px var(--color-accent);
                background-color: rgba(0, 0, 0, 0.2);

                display: flex;
                justify-content: center;
                align-items: center;

                cursor: pointer;

                .icon {
                    font-size: 3em;
                    color: var(--color-text);
                }
            }
        }
    }

    #right {
        width: 250px;
    }

    .card {
        background-color: var(--color-sidebar);
        color: var(--color-text);
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        overflow: hidden;
        padding: 1em;

        .header {
            display: flex;
            align-items: center;
            background-color: var(--color-sidebar);
            color: var(--color-text);
            font-size: 16px;
            font-weight: 500;

            h3 {
                margin-left: 1em;
            }
        }

        .card-content {
            padding: 1em 0;
        }
    }

    #spotify .card-content {
        .player {
            display: flex;
            flex-direction: column;
            gap: 1em;

            .banner {
                img {
                    width: 150px;
                    height: 150px;
                    border-radius: 5px;
                }
            }

            .info {
                display: flex;
                flex-direction: column;
                gap: 1em;

                .name {
                    h3 {
                        font-size: 20px;
                        font-weight: 600;
                    }

                    p {
                        font-size: 12px;
                        font-weight: 400;
                        color: rgba(255, 255, 255, 0.8);
                    }
                }

                .actions {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1em;

                    .buttons {
                        display: flex;
                        gap: 1em;
                    }

                    .slider {
                        display: flex;
                        align-items: center;
                        gap: 1em;

                        span {
                            font-size: 14px;
                            font-weight: 500;
                        }

                        input {
                            width: 100%;
                        }
                    }
                }
            }
        }
    }
}
</style>