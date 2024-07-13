<script setup lang="ts">
const loading = ref(false);
const registration = reactive({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
})

const error = ref('');

const auth = useFirebaseAuth();
const register = async () => {
    if (registration.displayName === '' || registration.email === '' || registration.password === '' || registration.confirmPassword === '') {
        error.value = 'Please fill in all fields';
        return;
    }

    if (registration.password !== registration.confirmPassword) {
        error.value = 'Passwords do not match';
        return;
    }

    loading.value = true;
    const success = await auth.registerUser(registration.email, registration.password, registration.displayName);
    if (!success) {
        error.value = 'An user with this email already exists';
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
            <Sidebar page="register" />
            <div class="content" id="register">
                <form class="register-form" @submit.prevent="register">
                    <div class="error" v-if="error != ''">
                        Error: {{ error }}
                    </div>
                    <h2>Register</h2>
                    <div class="form-group">
                        <label for="displayName">Display Name <span style="color: red">*</span></label>
                        <input v-model="registration.displayName" type="text" id="displayName">
                    </div>
                    <div class="form-group">
                        <label for="email">Email <span style="color: red">*</span></label>
                        <input v-model="registration.email" type="email" id="email">
                    </div>
                    <div class="form-group">
                        <label for="password">Password <span style="color: red">*</span></label>
                        <input v-model="registration.password" type="password" id="password">
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password <span style="color: red">*</span></label>
                        <input v-model="registration.confirmPassword" type="password" id="confirmPassword">
                    </div>
                    <button type="submit">Register</button>
                </form>
            </div>
        </div>
    </NuxtLayout>
</template>

<style lang="scss">
#register {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.register-form {
  background: var(--color-sidebar);
  padding: 2.2rem;
  border-radius: 15px;
  width: 45%;
  height: auto;
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