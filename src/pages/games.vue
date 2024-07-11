<script setup lang="ts">
const loading = ref(true);
const gameLauncherFilter = ref('All');
const launchers = ref([
    "All",
    "Steam"
]);

const gamesData: any[] = [];

(async () => {
    const { data } = await useFetch('http://localhost:5000/api/get_games');
    gamesData.push(...(data.value || []) as any[]);
    loading.value = false;
})();

function updateGame(gameId: string, data: Record<string, any>) {
    const game = gamesData.find((game: any) => game['gameId'] === gameId);
    Object.assign(game, data);

    useFetch('http://localhost:5000/api/update/' + gameId, {
        method: 'POST',
        body: JSON.stringify(game)
    });
}

const games = computed(() => {
    if (gameLauncherFilter.value === 'All') return gamesData;

    return gamesData.filter((game: any) => game['launcherName'] === gameLauncherFilter.value);
});

const favourite = async (gameId: string) => {
    const game = gamesData.find((game: any) => game['gameId'] === gameId);
    updateGame(gameId, { favourite: !game['favourite'] });
}

const launchGame = async (gameId: string) => {
    await useFetch('http://localhost:5000/api/launch_game/' + gameId, {
        method: 'POST'
    });
    updateGame(gameId, { lastPlayed: Date.now() });
}
</script>

<template>
    <div class="sub-container">
        <Loader :loading="loading" />
        <Sidebar page="games" />
        <div class="content">
            <h2>Your Games</h2>
            <div class="filters">
                <select v-model="gameLauncherFilter">
                    <option v-for="launcher in launchers" :key="launcher" :value="launcher">{{ launcher }}</option>
                </select>
            </div>
            <div class="games">
                <div class="game" v-for="game in games" :key="game['gameId']" :id="game['gameId']">
                    <div class="banner" @click="launchGame(game['gameId'])">
                        <img :src="'http://localhost:5000/api/get_banner/' + game['gameId']" alt="Game banner" />
                    </div>
                    <div class="info">
                        <div class="name">
                            <h3>{{ game['displayName'] }}</h3>
                        </div>
                        <div class="actions">
                            <div class="favourite-toggle">
                                <Icon :name="'mdi:heart' + (game['favourite'] ? '' : '-outline')" @click="favourite(game['gameId'])" 
                                :style="{ color: game['favourite'] ? 'var(--color-accent)' : '' }"/>
                            </div>
                            <div class="information">
                                <Icon name="uil:bars" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.content {
    flex: 1;
    padding: .5em 1em;
    background-color: var(--color-background);
    color: var(--color-text);
    overflow-y: auto;

    h2 {
        font-size: 24px;
        font-weight: 500;
        margin-bottom: 20px;
    }

    .filters {
        margin-bottom: 20px;

        select {
            padding: 4px 8px;
            border: 1px solid var(--color-primary);
            border-radius: 4px;
            background-color: var(--color-background);
            color: var(--color-text);
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;

            &:focus {
                outline: none;
                border-color: var(--color-secondary);
            }

            option {
                background-color: var(--color-background);
                color: var(--color-text);
            }
        }
    }

    .games {
        display: flex;
        gap: 1em;

        .game {
            background-color: var(--color-sidebar);
            color: var(--color-text);
            border-radius: 5px;
            overflow: hidden;
            width: calc(600px / 4);
            transition: ease-in-out .15s;

            &:hover {
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                transform: translateY(-5px);
                background-color: var(--color-primary);
            }

            .banner {
                width: 100%;
                height: calc(900px / 4);
                background-color: #333;
                cursor: pointer;
                transition: ease-in-out .15s;
                
                img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                &:hover {
                    filter: brightness(0.8);
                }
            }

            .info {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px;

                .name {
                    h3 {
                        font-size: 16px;
                        font-weight: 500;
                    }
                }

                .actions {
                    display: flex;
                    align-items: center;
                    gap: .5em;

                    & > * {
                        display: flex;
                        align-items: center;
                    }
                    .favourite-toggle {
                        cursor: pointer;

                        input {
                            display: none;
                        }
                    }

                    .information {
                        cursor: pointer;
                    }
                }
            }
        }
    }
}

</style>