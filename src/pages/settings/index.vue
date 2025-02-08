<script setup lang="ts">
import type User from '@/utils/types/User';
import { DEFAULT_THEME } from '#imports';
import { invoke } from '@tauri-apps/api/core';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import { APP_INFO, type NotificationSettings } from '~/utils/settings';
import { open } from '@tauri-apps/plugin-shell'

type SettingPage = 'profile' | 'notifications' | 'preferences';
const auth = await useAuth();

if (!auth.user) {
    await navigateTo("/login");
}

const page = ref<SettingPage>('profile');
const loading = ref(false);

const user = auth.user as User;
const displayName = ref(user.displayName);
const pfp = ref<any>(null)
const { status, data: currentPfp, refresh } = await useAsyncData('pfp', async () => {
    if (pfp.value) {
        return pfp.value;
    }

    return await auth.getPfp() || (await import('~/assets/img/default-photo.png')).default;
})
const fileToUpload = ref<File | null>(null);

// Preferences
const rpc = ref(getSetting<boolean>('discord_rpc'));
const autoLaunch = ref(getSetting<boolean>('auto_launch'));
const spotify = ref(getSetting<boolean>('spotify'));
const autoUpdate = ref(getSetting<boolean>('auto_update'));

// Notifications
const notifSettings = reactive({
    ...getSetting<NotificationSettings>("notifications")!
});

// Theme settings
const theme = getSetting<Record<string, string>>('theme') || {};
const background = ref(theme.background);
const backgroundTwo = ref(theme.sidebar);
const primary = ref(theme.primary);
const secondary = ref(theme.secondary);
const accent = ref(theme.accent);
const text = ref(theme.text);

const error = ref('');
const success = ref('');
const tooltipText = ref('Click to copy information');

const copyBuildInfo = () => {
    navigator.clipboard.writeText(`${APP_INFO.name} v${APP_INFO.version} (${APP_INFO.build})`);
    tooltipText.value = 'Copied!';

    setTimeout(() => {
        tooltipText.value = 'Click to copy information';
    }, 2000);
}

const setPfp = (e: any) => {
    const file = e.target.files[0];
    pfp.value = URL.createObjectURL(file);
    fileToUpload.value = file;
    refresh();
}

const saveProfile = async () => {
    if (!user) {
        error.value = 'User not found';
        return;
    }

    if (displayName.value === '') {
        error.value = 'Please fill in all required fields';
        return;
    }

    const toUpdate: { [key: string]: any } = {
        displayName: displayName.value
    };
    if (pfp.value && pfp.value != user.photoUrl && fileToUpload.value) auth.setPfp(fileToUpload.value);
    await auth.update(user.id, toUpdate);

    error.value = '';
    success.value = 'Profile updated successfully';
    reloadNuxtApp();
}

const resetTheme = async () => {
    background.value = DEFAULT_THEME.background;
    backgroundTwo.value = DEFAULT_THEME.sidebar;
    primary.value = DEFAULT_THEME.primary;
    secondary.value = DEFAULT_THEME.secondary;
    accent.value = DEFAULT_THEME.accent;
    text.value = DEFAULT_THEME.text;
}

const logout = async () => {
    loading.value = true;
    await navigateTo('/auth/logout');
    loading.value = false;
}

const openAccount = () => {
    open('http://localhost:3000/account');
}

const saveNotifications = () => {
    setSetting('notifications', notifSettings);   
}

const savePreferences = async () => {
    if (spotify.value) {
        await invoke('spotify_login');
        await invoke('connect');
    } else {
        await invoke('remove');
    }

    const autoLaunchEnabled = await isEnabled();
    if (autoLaunch.value) {
        if (!autoLaunchEnabled) await enable();
    } else {
        if (autoLaunchEnabled) await disable();
    }

    setSetting('discord_rpc', rpc.value);
    setSetting('auto_launch', autoLaunch.value);
    setSetting('spotify', spotify.value);
    setSetting('auto_update', autoUpdate.value);
    setSetting('theme', {
        background: background.value,
        sidebar: backgroundTwo.value,
        primary: primary.value,
        secondary: secondary.value,
        accent: accent.value,
        text: text.value
    });
    reloadNuxtApp({
        force: true,
        path: '/settings'
    });
}
</script>

<template>
    <NuxtLayout>
        <Loader :loading="loading" />
        <div class="sub-container">
            <Sidebar page="settings" />
            <div class="content">
                <h2>Settings</h2>

                <div class="settings-container">
                    <aside class="settings-sidebar">
                        <div class="settings-nav">
                            <div class="nav-item" :class="{ active: page == 'profile' }" @click="page = 'profile'">
                                <span><Icon name="mdi:account-circle" class="icon" /> Profile</span>
                            </div>
                            <div class="nav-item" :class="{ active: page == 'notifications' }" @click="page = 'notifications'">
                                <span><Icon name="mdi:bell" class="icon" /> Notifications</span>
                            </div>
                            <div class="nav-item" :class="{ active: page == 'preferences' }" @click="page = 'preferences'">
                                <span><Icon name="mdi:settings" class="icon" /> Preferences</span>
                            </div>
                            <div class="nav-item" @click="openAccount()">
                                <span><Icon name="mdi:account" class="icon" /> Account</span> <Icon class="icon" style="opacity: .7;" name="majesticons:open" />
                            </div>
                            <div class="nav-item" @click="logout">
                                <span><Icon name="mdi:logout" class="icon" /> Logout</span>
                            </div>
                        </div>
                        <div class="app-info">
                            <UTooltip class="tooltip" :text="tooltipText" :popper="{
                                    placement: 'top'
                                }"
                                @click="copyBuildInfo"
                            >
                                <p>Name: {{ APP_INFO.name }}</p>
                                <p>Version: {{ APP_INFO.version }}</p>
                                <p>Build: {{ APP_INFO.build }}</p>
                            </UTooltip>
                        </div>
                    </aside>
                    <div class="settings-content">
                        <div id="profile" v-if="page == 'profile'">
                            <div class="success" v-if="success != ''">
                                Success: {{ success }}
                            </div>
                            <div class="error" v-if="error != ''">
                                Error: {{ error }}
                            </div>
                            <h2>Profile</h2>
                            <p>Update your profile information</p>
                            <form @submit.prevent="saveProfile">
                                <div class="form-content no-fill">
                                    <div class="form-section">
                                        <UFormGroup label="Profile Picture" class="pfp-group">
                                            <img :src="currentPfp" alt="Profile Picture" />
                                            <input class="input" type="file" id="pfp" accept="image/png,image/jpeg,image/gif" @change="setPfp" />
                                            <label for="pfp" class="choose-file">Choose Profile Picture</label>
                                        </UFormGroup>
                                    </div>
                                    <div class="form-section full">
                                        <UFormGroup label="Display Name" required>
                                            <input class="input" type="text" id="displayName" v-model="displayName" />
                                        </UFormGroup>
                                    </div>
                                </div>
                                <button class="btn" type="submit">Save</button>
                            </form>
                        </div>
                        <div id="notifications" v-else-if="page == 'notifications'">
                            <h2>Notifications</h2>
                            <p>Choose your notification settings</p>
                            <form @submit.prevent="saveNotifications">
                                <div class="form-content">
                                    <div class="form-section">
                                        <UFormGroup label="Friend Requests" description="Whether you'd like to receive notifications when a friend goes online">
                                            <UToggle v-model="notifSettings.friend_request" />
                                        </UFormGroup>
                                        <UFormGroup label="Friend Request Accepted" description="Whether you'd like to receive notifications when your friend request is accepted">
                                            <UToggle v-model="notifSettings.friend_accept" />
                                        </UFormGroup>
                                        <UFormGroup label="Friend Online" description="Whether you'd like to receive notifications when a friend goes online">
                                            <UToggle v-model="notifSettings.friend_online" />
                                        </UFormGroup>
                                    </div>
                                    <div class="form-section">
                                        <UFormGroup label="Messages" description="Whether you'd like to receive notifications when you receive a message">
                                            <UToggle v-model="notifSettings.message" />
                                        </UFormGroup>
                                    </div>
                                </div>
                                <button class="btn" type="submit">Save</button>
                            </form>
                        </div>
                        <div id="preferences" v-else-if="page == 'preferences'">
                            <h2>Preferences</h2>
                            <p>Choose your preferences</p>
                            <form>
                                <div class="form-content">
                                    <div class="form-section">
                                        <UFormGroup label="Discord Rich Presence">
                                            <UToggle v-model="rpc" />
                                        </UFormGroup>
                                        <UFormGroup label="Auto Launch">
                                            <UToggle v-model="autoLaunch" />
                                        </UFormGroup>
                                        <UFormGroup label="Spotify Integration">
                                            <UToggle v-model="spotify" />
                                        </UFormGroup>
                                    </div>
                                    <div class="form-section">
                                        <UFormGroup label="Theme" id="theme">
                                            <div class="color" id="background">
                                                <label for="background">Background Color</label>
                                                <input type="color" id="background" v-model="background" />
                                            </div>
                                            <div class="color" id="backgroundTwo">
                                                <label for="backgroundTwo">Background Color 2</label>
                                                <input type="color" id="backgroundTwo" v-model="backgroundTwo" />
                                            </div>
                                            <div class="color" id="primary">
                                                <label for="primary">Primary Color</label>
                                                <input type="color" id="primary" v-model="primary" />
                                            </div>
                                            <div class="color" id="secondary">
                                                <label for="secondary">Secondary Color</label>
                                                <input type="color" id="secondary" v-model="secondary" />
                                            </div>
                                            <div class="color" id="accent">
                                                <label for="accent">Accent Color</label>
                                                <input type="color" id="accent" v-model="accent" />
                                            </div>
                                            <div class="color" id="text">
                                                <label for="text">Text Color</label>
                                                <input type="color" id="text" v-model="text" />
                                            </div>
                                            <div class="reset">
                                                <label for="reset">Reset</label>
                                                <Icon class="reset-btn" id="reset" name="mdi:refresh" @click="resetTheme" />
                                            </div>
                                        </UFormGroup>
                                    </div>
                                </div>

                                <button class="btn" type="submit" @click.prevent="savePreferences()">Save</button>
                            </form>
                        </div>
                    </div>
                </div>
                <!--<div class="cards">
                    <div class="s-card">
                        <div class="head">
                            <h2>Profile</h2>
                            <p>Update your profile information</p>
                        </div>
                        <form>
                            <div class="form-group">
                                <label>Profile Picture</label>
                                <img :src="pfp" alt="Profile Picture" />
                                <input type="file" id="pfp" v-on:change="setPfp" />
                                <label for="pfp" class="choose-file">Choose Profile Picture</label>
                            </div>
                            <div class="form-group">
                                <label for="displayName">Display Name</label>
                                <input type="text" id="displayName" v-model="displayName" />
                            </div>
                            <button type="submit">Save</button>
                        </form>
                    </div>
                    <div class="s-card">
                        <div class="head">
                            <h2>Account</h2>
                            <p>Update your account information</p>
                        </div>
                        <form>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" v-model="email" />
                            </div>
                            <div class="form-group">
                                <label for="password">Password</label>
                                <input type="password" id="password" v-model="password" />
                            </div>
                            <button type="submit">Save</button>
                        </form>
                    </div>
                    <div class="s-card">
                        <div class="head">
                            <h2>Preferences</h2>
                            <p>Choose your preferences</p>
                        </div>
                        <form>

                            <button type="submit">Save</button>
                        </form>
                    </div>
                </div>-->
            </div>
        </div>
    </NuxtLayout>
</template>

<style lang="scss">
.content > h2 {
    font-weight: 600;
    font-size: 24px;
    margin-bottom: .5em;
}

.settings-container {
    position: relative;
    display: flex;
    background-color: var(--color-sidebar);
    color: var(--color-text);
    border-radius: 5px;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
    height: 86svh;

    .error {
        color: red;
        margin-bottom: 1em;
        background-color: rgba(255, 0, 0, 0.1);
        padding: 0.5em;
        border-radius: 5px;
        border: 1px solid red;
    }

    .success {
        color: white;
        margin-bottom: 1em;
        background-color: rgba(90, 255, 90, 0.1);
        padding: 0.5em;
        border-radius: 5px;
        border: 1px solid green;
    }

    .settings-sidebar {
        width: 250px;
        height: 100%;
        color: var(--color-text);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1em;
        z-index: 900;
        transition: transform 0.3s;
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);

        .settings-nav {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 4px;

            .nav-item {
                display: flex;
                align-content: center;
                justify-content: space-between;
                gap: 1em;
                padding: .5em 1em;
                border-radius: 5px;
                cursor: pointer;
                transition: ease-in-out .15s;
                font-weight: 400;

                span {
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    gap: 1em;
                }

                .icon {
                    font-size: 24px;
                }

                &:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }

                &.active {
                    background-color: var(--color-primary);
                }
            }
        }

        .app-info {
            align-self: flex-start;
            margin-top: auto;
            cursor: pointer;

            .tooltip {
                display: flex;
                flex-direction: column;

                p {
                    font-size: 12px;
                    font-weight: 400;
                    color: rgba(255, 255, 255, 0.5);
                }
            }
        }
    }

    .settings-content {
        flex: 1;
        padding: 1em 2em;

        h2 {
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 4px;
        }

        p {
            font-size: 14px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 1em;
        }

        form {
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 1em;

            .form-content {
                display: flex;
                gap: 4em;

                .form-section {
                    display: flex;
                    flex-direction: column;
                    gap: 1em;

                    &.full {
                        flex: 1;
                    }
                }

                &:not(.no-fill) .form-section {
                    flex: 1;
                }
            }

            .pfp-group > .mt-1 {
                display: flex;
                flex-direction: column;
                width: fit-content;

                img {
                    width: 108px;
                    height: 108px;
                    border-radius: 50%;
                    margin: 1em 0;
                    align-self: center;
                    justify-self: center;
                    box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
                }
            }

            #theme {
                width: max-content;
            }

            .input {
                padding: 0.5em 1em;
                border-radius: 5px;
                background-color: rgba(0, 0, 0, 0.5);
                color: var(--color-text);
                font-size: 14px;
                width: 100%;

                &:focus {
                    outline: solid 2px var(--color-primary);
                }

                &[type="file"] {
                    display: none;
                }
            }

            input[type="color"] {
                padding: 0;
                background-color: transparent;
                color: var(--color-text);
                font-size: 14px;
                width: 30px;

                &:focus {
                    outline: solid 2px var(--color-primary);
                }
            }

            .color, .reset {
                display: flex;
                align-items: center;
                gap: 1em;
                justify-content: space-between;

                label {
                    font-size: 14px;
                    font-weight: 400;
                    color: rgba(255, 255, 255, 0.7);
                }

                .reset-btn {
                    cursor: pointer;
                    font-size: 20px;
                    color: var(--color-text);
                    transition: ease-in-out .15s;
                    color: rgba(200, 20, 20);

                    &:hover {
                        color: rgba(255, 0, 0);
                    }
                }
            }

            .choose-file {
                padding: 0.5em 1em;
                border-radius: 5px;
                background-color: var(--color-primary);
                color: var(--color-text);
                width: fit-content;
                font-size: 13px;
                font-weight: 400;
                cursor: pointer;
                transition: ease-in-out .15s;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

                &:hover {
                    background-color: var(--color-secondary);

                }
            }

            .btn {
                padding: 0.5em 1em;
                border-radius: 5px;
                background-color: var(--color-primary);
                color: var(--color-text);
                width: fit-content;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: ease-in-out .15s;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

                margin-top: auto;
                margin-bottom: 0;

                &:hover {
                    background-color: var(--color-secondary);
                }
            }
        }
    }
}


.cards {
    display: flex;
    gap: 1em;
}

.s-card {
    display: flex;
    flex-direction: column;
    padding: 1em;
    background-color: var(--color-sidebar);
    color: var(--color-text);
    border-radius: 5px;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
    min-width: 32%;


    .head {
        margin-bottom: 1em;

        h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 4px;
        }

        p {
            font-size: 14px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.7);
        }
    }
}
</style>