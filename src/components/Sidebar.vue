<script setup lang="ts">
import type User from "~/utils/types/User";

defineProps({
    page: String,
});

let auth = await useAuth();

let defaultImage = (await import("~/assets/img/default-photo.png")).default;
let user = ref<User | null>(auth.user);
let pfp = ref();

onMounted(async () => {
    pfp.value = defaultImage;
    if (user.value) pfp.value = (await auth.getPfp()) || defaultImage;
});
</script>

<template>
    <aside id="sidebar">
        <div class="header">
            <div class="user" v-if="user != null">
                <img :src="pfp" alt="User photo" />
                <h3>{{ user.displayName }}</h3>
                <div class="badges">
                    <UTooltip
                        :popper="{ arrow: true }"
                        text="Admin"
                        v-if="user.role === 'admin'"
                    >
                        <Icon
                            name="eos-icons:admin"
                            :style="{ color: '#3243fe' }"
                        />
                    </UTooltip>
                </div>
            </div>
            <div class="user" v-else>
                <img src="../assets/img/default-photo.png" alt="User photo" />
                <h3>Guest</h3>
            </div>
        </div>
        <div class="sections">
            <div class="section">
                <h2>General</h2>
                <div class="items">
                    <NuxtLink
                        to="/"
                        :class="{ item: true, active: page === 'home' }"
                    >
                        <Icon name="f7:house-fill" />
                        <span>Home</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/games"
                        :class="{ item: true, active: page === 'games' }"
                    >
                        <Icon name="f7:gamecontroller-fill" />
                        <span>Games</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/games/favourites"
                        :class="{ item: true, active: page === 'favourites' }"
                    >
                        <Icon name="mdi:heart" />
                        <span>Favourites</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/games/recent"
                        :class="{
                            item: true,
                            active: page === 'recent',
                        }"
                    >
                        <Icon name="mdi:clock" />
                        <span>Recently Launched</span>
                    </NuxtLink>
                </div>
            </div>
            <div class="section">
                <h2>Account</h2>
                <div class="items" v-if="user != null">
                    <NuxtLink
                        to="/friends"
                        :class="{ item: true, active: page === 'friends' }"
                    >
                        <div class="icon">
                            <Icon name="mdi:account-group" />
                            <div
                                class="alert"
                                v-if="(user?.friendRequests || []).length > 0"
                            ></div>
                        </div>
                        <span>Friends</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/messages"
                        :class="{ item: true, active: page === 'messages' }"
                    >
                        <div class="icon">
                            <Icon name="mdi:message" />
                            <div class="alert" v-if="false"></div>
                        </div>
                        <span>Messages</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/clips"
                        :class="{ item: true, active: page === 'clips' }"
                    >
                        <Icon name="mdi:film-open" />
                        <span>Clips</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/crosshair"
                        :class="{ item: true, active: page === 'crosshair' }"
                    >
                        <Icon name="ri:crosshair-fill" />
                        <span>Crosshair</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/settings"
                        :class="{ item: true, active: page === 'settings' }"
                    >
                        <Icon name="mdi:settings" />
                        <span>Settings</span>
                    </NuxtLink>
                </div>
                <div class="items" v-else>
                    <NuxtLink
                        to="/auth/login"
                        :class="{ item: true, active: page === 'login' }"
                    >
                        <Icon name="mdi:login" />
                        <span>Login</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/auth/register"
                        :class="{ item: true, active: page === 'register' }"
                    >
                        <Icon name="mdi:register" />
                        <span>Register</span>
                    </NuxtLink>
                    <NuxtLink
                        to="/settings"
                        :class="{ item: true, active: page === 'settings' }"
                    >
                        <Icon name="mdi:settings" />
                        <span>Settings</span>
                    </NuxtLink>
                </div>
            </div>
        </div>
    </aside>
</template>

<style lang="scss">
#sidebar {
    width: 250px;
    height: 100%;
    background-color: var(--color-sidebar);
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
    z-index: 900;
    transition: transform 0.3s;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);

    .header {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 20px;

        .user {
            display: flex;
            flex-direction: column;
            align-items: center;

            img {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                margin-bottom: 10px;
            }

            h3 {
                font-size: 1.5rem;
                font-weight: 700;
            }

            .badges {
                display: flex;
                gap: 10px;
                margin-top: 0.5em;
                font-size: 1.25rem;
            }
        }
    }

    .sections {
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 1em;

        .section {
            width: 100%;
            display: flex;
            flex-direction: column;
            margin-bottom: 20px;

            h2 {
                font-size: 1rem;
                font-weight: 500;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 10px;
            }

            .items {
                display: flex;
                flex-direction: column;
                gap: 4px;

                .item {
                    display: flex;
                    align-items: center;
                    padding: 0.5em 20px;
                    border-radius: 5px;
                    transition: background-color 0.3s;
                    color: rgba(255, 255, 255, 0.7);
                    gap: 10px;

                    &:hover {
                        background-color: rgba(255, 255, 255, 0.1);
                        color: var(--color-text);
                    }

                    &.active {
                        background-color: var(--color-primary);
                        color: var(--color-text);
                        box-shadow: inset 10px 10px 20px 2px rgba(0, 0, 0, 0.2);
                    }

                    .icon {
                        position: relative;

                        .alert {
                            position: absolute;
                            top: -2px;
                            right: -2px;
                            padding: 4px;
                            border-radius: 50%;
                            background-color: red;
                        }
                    }
                }
            }
        }
    }
}
</style>
