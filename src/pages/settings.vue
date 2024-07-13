<script setup lang="ts">
import { type User, updateProfile } from 'firebase/auth';

type SettingPage = 'profile' | 'account' | 'preferences';
const auth = useFirebaseAuth();

if (!auth.user) {
    await navigateTo("/login");
}

const page = ref<SettingPage>('profile');

const user = auth.user.value as User;
const displayName = ref(user.displayName);
const pfp = ref((await import(user.photoURL || '../assets/img/default-photo.png')).default);

const email = ref(user.email);
const password = ref('');

const rpc = ref(getSetting<boolean>('discord_rpc'));

const theme = getSetting<Record<string, string>>('theme');
const background = ref(theme.background);
const backgroundTwo = ref(theme.background_2);
const primary = ref(theme.primary);
const secondary = ref(theme.secondary);
const accent = ref(theme.accent);
const text = ref(theme.text);

const error = ref('');
const success = ref('');

const setPfp = async (e: any) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        pfp.value = (await import(e.target?.result as string)).default;
    }
    reader.readAsDataURL(file);
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

    await auth.update({
        displayName: displayName.value || "",
        photoURL: pfp.value
    });

    error.value = '';
    success.value = 'Profile updated successfully';
}

const savePreferences = async () => {
    setSetting('discord_rpc', rpc.value);
}
</script>

<template>
    <NuxtLayout>
        <div class="sub-container">
            <Sidebar page="settings" />
            <div class="content">
                <h2>Settings</h2>

                <div class="settings-container">
                    <aside class="settings-sidebar">
                        <div class="settings-nav">
                            <div class="nav-item" :class="{ active: page == 'profile' }" @click="page = 'profile'">
                                <Icon name="mdi:account-circle" class="icon" /> Profile
                            </div>
                            <div class="nav-item" :class="{ active: page == 'account' }" @click="page = 'account'">
                                <Icon name="mdi:account" class="icon" /> Account
                            </div>
                            <div class="nav-item" :class="{ active: page == 'preferences' }" @click="page = 'preferences'">
                                <Icon name="mdi:settings" class="icon" /> Preferences
                            </div>
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
                                <UFormGroup label="Profile Picture">
                                    <img :src="pfp" alt="Profile Picture" />
                                    <input class="input" type="file" id="pfp" v-on:change="setPfp" />
                                    <label for="pfp" class="choose-file">Choose Profile Picture</label>
                                </UFormGroup>
                                <UFormGroup label="Display Name" required>
                                    <input class="input" type="text" id="displayName" v-model="displayName" />
                                </UFormGroup>
                                <button class="btn" type="submit">Save</button>
                            </form>
                        </div>
                        <div id="account" v-else-if="page == 'account'">
                            <h2>Account</h2>
                            <p>Update your account information</p>
                            <form>
                                <UFormGroup label="Email" required>
                                    <input class="input" type="email" id="email" v-model="email" />
                                </UFormGroup>
                                <UFormGroup label="Password" description="Leave empty to keep the same password">
                                    <input class="input" type="password" id="password" v-model="password" />
                                </UFormGroup>
                                <button class="btn" type="submit">Save</button>
                            </form>
                        </div>
                        <div id="preferences" v-else-if="page == 'preferences'">
                            <h2>Preferences</h2>
                            <p>Choose your preferences</p>
                            <form>
                                <UFormGroup label="Discord Rich Presence">
                                    <UToggle v-model="rpc" />
                                </UFormGroup>
                                <UFormGroup label="Theme">
                                    <div class="color" id="background">
                                        <label for="background">Background Color</label>
                                        <input type="color" id="background" />
                                    </div>
                                </UFormGroup>

                                <button class="btn" type="submit">Save</button>
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
                gap: 1em;
                padding: .5em 1em;
                border-radius: 5px;
                cursor: pointer;
                transition: ease-in-out .15s;
                font-weight: 400;

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

            img {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                margin: 1em 0;
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

            .color {
                display: flex;
                align-items: center;
                gap: .5em;

                label {
                    font-size: 14px;
                    font-weight: 400;
                    color: rgba(255, 255, 255, 0.7);
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