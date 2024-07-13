<script setup lang="ts">
const loading = ref(false);
const cred = reactive({
    email: '',
    password: ''
})

const error = ref('');

const auth = useFirebaseAuth();
const login = async () => {
    if (cred.email === '' || cred.password === '') {
        error.value = 'Please fill in all fields';
        return;
    }

    loading.value = true;
    const success = await auth.login(cred.email, cred.password);
    if (!success) {
        error.value = 'Invalid credentials';
        loading.value = false;
        return;
    }

    await navigateTo("/");
    loading.value = false;
}
</script>
<template>
    <NuxtLayout>
        <Loader :loading="loading" />
        <div class="sub-container">
            <Sidebar page="login" />
            <div class="content" id="login">
                <form class="login-form" @submit.prevent="login">
                    <div class="error" v-if="error != ''">
                        Error: {{ error }}
                    </div>
                    <h2>Login</h2>
                    <div class="form-group">
                        <label for="email">Email <span style="color: red">*</span></label>
                        <input v-model="cred.email" type="email" id="email">
                    </div>
                    <div class="form-group">
                        <label for="password">Password <span style="color: red">*</span></label>
                        <input v-model="cred.password" type="password" id="password">
                    </div>
                    <button type="submit">Login</button>
                </form>
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

.login-form {
  background: var(--color-sidebar);
  padding: 2.2rem;
  border-radius: 15px;
  width: 45%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  .error {
    color: red;
    margin-bottom: 1rem;
    background-color: rgba(255, 0, 0, 0.1);
    padding: 0.5rem;
    border-radius: 5px;
    border: 1px solid red;
  }


  &:hover {
    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.3);
  }

  h2 {
    margin-bottom: 1rem;
    color: #ffffff;
    text-align: center;
    font-size: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 1rem;
      color: #ffffff;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      transition: box-shadow 0.3s ease;

      &:focus {
        box-shadow: 0 0 5px var(--color-primary);
        outline: none;
      }
    }
  }

  button {
    display: block;
    width: 100%;
    background-color: var(--color-primary);
    color: white;
    padding: 0.75rem 0;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1rem;
    text-align: center;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: #57a957;
    }
  }
}
</style>