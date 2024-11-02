<script setup lang="ts">
const loading = ref(false);
const cred = reactive({
    email: "",
    password: "",
});

const error = ref("");

const auth = await useAuth();
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
</script>
<template>
    <NuxtLayout>
        <div class="sub-container">
            <Sidebar page="login" />
            <div class="login-content" id="login">
                <div class="login-form">
                    <h1>Login</h1>
                    <p v-if="error" class="error mb-4">Error: {{ error }}</p>
                    <form @submit.prevent="login">
                        <UFormGroup label="Email" required>
                            <input type="email" v-model="cred.email" />
                        </UFormGroup>
                        <UFormGroup label="Password" required>
                            <input type="password" v-model="cred.password" />
                        </UFormGroup>
                        <button type="submit" :disabled="loading">
                            <div v-if="loading" class="loader"></div>
                            <span v-else>Login</span>
                        </button>
                    </form>
                    <div class="other">
                        <p>
                            Don't have an account?
                            <NuxtLink to="/register">Register here</NuxtLink>
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
