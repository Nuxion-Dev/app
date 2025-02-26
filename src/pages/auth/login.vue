<script setup lang="ts">
const loading = ref(false);
const cred = reactive({
    email: "",
    password: "",
});

const error = ref("");

let auth: any = null;
const login = async () => {
    if (cred.email === "" || cred.password === "") {
        error.value = "Please fill in all fields";
        return;
    }

    loading.value = true;
    const success = await auth.login(cred.email, cred.password);
    if (!success) {
        error.value = "Invalid credentials";
        loading.value = false;
        return;
    }

    await navigateTo("/");
    loading.value = false;
};

onMounted(async () => {
    auth = await useAuth();
});
</script>
<template>
    <NuxtLayout>
        <div class="sub-container">
            <Loader :loading="loading" />
            <Sidebar page="login" />
            <div id="login" class="flex flex-col items-center justify-center w-[80%]">
                <div id="form" class="max-h-[80vh] bg-[var(--color-sidebar)] p-4 rounded-lg shadow-md">
                    <h1 class="font-bold text-xl">Log In</h1>
                    <p v-if="error" class="error mb-4">Error: {{ error }}</p>
                    <form @submit.prevent="login" class="space-y-2 mt-2">
                        <div class="space-y-2">
                            <div id="email" class="flex flex-col">
                                <label for="email">Email</label>
                                <Input v-model="cred.email" type="email" id="email" class="bg-neutral-900 min-w-[25svw]" autocomplete="nope" spellcheck="false" />
                            </div>
                            <div id="password" class="flex flex-col">
                                <label for="password">Password</label>
                                <Input v-model="cred.password" type="password" id="password" class="bg-neutral-900 min-w-[25svw]" autocomplete="new-password" />
                            </div>
                        </div>
                        <div class="flex justify-center py-2">
                            <button type="submit" :disabled="loading" class="rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] transition-all ease-in-out duration-150 text-foreground font-semibold px-4 py-2 w-full text-sm">
                                <span v-if="loading" class="loader"></span>
                                Log In
                            </button>
                        </div>
                    </form>
                    <div id="separator">
                        <hr class="border-neutral-600 w-[75%] mx-auto my-3" />
                    </div>
                    <div id="other">
                        <p class="text-center text-sm">
                            Don't have an account? <NuxtLink to="/auth/register" class="text-blue-500 transition-all ease-in-out duration-150 hover:text-blue-400 underline underline-offset-2">Register here</NuxtLink>
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
