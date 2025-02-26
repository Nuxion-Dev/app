<script setup lang="ts">
import Input from '~/components/ui/input/Input.vue';

const loading = ref(false);
const cred = reactive({
    id: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
});

const error = ref("");

let auth: any = null;
const register = async () => {
    if (Object.values(cred).some(v => v === "")) {
        error.value = "Please fill in all fields";
        return;
    }

    if (cred.password.length < 8) {
        error.value = "Password must be at least 8 characters long";
        return;
    }

    if (cred.password.length > 32) {
        error.value = "Password must be at most 32 characters long";
        return;
    }

    if (!/^[a-z0-9_]+$/.test(cred.id)) {
        error.value = "ID must only contain lowercase letters, numbers, and underscores";
        return;
    }

    if (!/\d/.test(cred.password) || !/[a-z]/.test(cred.password) || !/[A-Z]/.test(cred.password)) {
        error.value = "Password must contain at least one number, one uppercase letter, and one lowercase letter";
        return;
    }

    if (cred.password !== cred.confirmPassword) {
        error.value = "Passwords do not match";
        return;
    }

    loading.value = true;
    const success = await auth.registerUser(cred.id, cred.email, cred.password, cred.displayName);
    loading.value = false;
    if (!success) {
        error.value = "User already exists";
        return;
    }

    await navigateTo("/");
};

onMounted(async () => {
    auth = await useAuth();
});
</script>
<template>
    <NuxtLayout>
        <div class="sub-container">
            <Loader :loading="loading" />
            <Sidebar page="register" />
            <div id="register" class="flex flex-col items-center justify-center w-[80%]">
                <div id="form" class="max-h-[80vh] bg-[var(--color-sidebar)] p-4 rounded-lg shadow-md">
                    <h1 class="font-bold text-xl">Register</h1>
                    <p v-if="error" class="error mb-4">Error: {{ error }}</p>
                    <form @submit.prevent="register" class="space-y-2 mt-2">
                        <div class="flex gap-4">
                            <div id="identification" class="space-y-2">
                                <div id="identifier" class="flex flex-col">
                                    <label for="id" class="flex items-center gap-2">ID 
                                        <UTooltip text="Pattern: [a-z0-9_]+" :popper="{
                                            placement: 'top'
                                        }">
                                            <Icon name="mdi:info" class="text-xs text-blue-500 hover:text-blue-600" />
                                        </UTooltip>
                                    </label>
                                    <Input v-model="cred.id" type="text" id="id" pattern="[a-z0-9_]+" class="bg-neutral-900 min-w-[20svw]" autocomplete="nope" spellcheck="false" />
                                </div>
                                <div id="name" class="flex flex-col">
                                    <label for="displayName">Display Name</label>
                                    <Input v-model="cred.displayName" type="text" id="displayName" class="bg-neutral-900 min-w-[20svw]" autocomplete="nope" spellcheck="false" />
                                </div>
                                <div id="email" class="flex flex-col">
                                    <label for="email">Email</label>
                                    <Input v-model="cred.email" type="email" id="email" class="bg-neutral-900 min-w-[20svw]" autocomplete="nope" spellcheck="false" />
                                </div>
                            </div>
                            <div id="password" class="space-y-2">
                                <div id="password" class="flex flex-col">
                                    <label for="password">Password</label>
                                    <Input v-model="cred.password" type="password" id="password" class="bg-neutral-900 min-w-[20svw]" />
                                </div>
                                <div id="confirm-password" class="flex flex-col">
                                    <label for="confirmPassword">Confirm Password</label>
                                    <Input v-model="cred.confirmPassword" type="password" id="confirmPassword" class="bg-neutral-900 min-w-[20svw]" />
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-center py-2">
                            <button type="submit" :disabled="loading" class="rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] transition-all ease-in-out duration-150 text-foreground font-semibold px-4 py-2 w-full text-sm">
                                <span v-if="loading" class="loader"></span>
                                Register
                            </button>
                        </div>
                    </form>
                    <div id="separator">
                        <hr class="border-neutral-600 w-[75%] mx-auto my-3" />
                    </div>
                    <div id="other">
                        <p class="text-center text-sm">
                            Already have an account?
                            <NuxtLink to="/auth/login" class="text-blue-500 transition-all ease-in-out duration-150 hover:text-blue-400 underline underline-offset-2">Log in here</NuxtLink>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </NuxtLayout>
</template>

<style lang="scss">
#login {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

.login-content {
    margin: auto;
    width: 100%;
    max-width: 400px;
    padding: 1rem;

    .login-form {
        background-color: var(--color-sidebar);
        padding: 1rem;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        width: 100%;

        .other {
            margin-top: 1rem;
            text-align: center;
            padding-top: 1rem;
            border-top: 1px solid #ccc;
            font-size: 0.9rem;

            a {
                color: #3498db;

                &:hover {
                    text-decoration: underline;
                }
            }
        }

        h1 {
            text-align: center;
            margin-bottom: 1rem;
            font-size: 1.5rem;
            font-weight: bold;
        }

        form {
            display: flex;
            flex-direction: column;

            .loader {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                margin: 2px 0;
                animation: spin 2s linear infinite;
            }

            input {
                padding: 0.5rem;
                margin-bottom: 1rem;
                border: 1px solid #ccc;
                border-radius: 5px;
                width: 100%;
            }

            button {
                margin-top: 1rem;
                padding: 0.5rem;
                border: none;
                background-color: var(--color-primary);
                color: #fff;
                border-radius: 5px;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;

                span {
                    margin-right: 0.5rem;
                }

                &:disabled {
                    cursor: not-allowed;
                }
            }
        }
    }
}
</style>
