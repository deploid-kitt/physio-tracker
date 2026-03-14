<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <NuxtLink to="/" class="inline-flex items-center gap-2 mb-6">
          <div class="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <span class="text-white font-bold text-xl">PT</span>
          </div>
        </NuxtLink>
        <h2 class="text-3xl font-bold text-gray-900">Welcome back</h2>
        <p class="mt-2 text-gray-600">Sign in to your account</p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div v-if="error" class="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
          {{ error }}
        </div>

        <div class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="input"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="btn-primary w-full py-3"
        >
          <span v-if="isLoading">Signing in...</span>
          <span v-else>Sign in</span>
        </button>

        <p class="text-center text-sm text-gray-600">
          Don't have an account?
          <NuxtLink to="/register" class="text-primary-600 hover:text-primary-500 font-medium">
            Sign up
          </NuxtLink>
        </p>

        <!-- Demo accounts info -->
        <div class="bg-gray-100 rounded-lg p-4 text-sm">
          <p class="font-medium text-gray-700 mb-2">Demo Accounts:</p>
          <p class="text-gray-600">Patient: patient@demo.com / patient123</p>
          <p class="text-gray-600">Physio: physio@demo.com / physio123</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

async function handleLogin() {
  error.value = '';
  isLoading.value = true;

  try {
    await auth.login(email.value, password.value);
    router.push('/dashboard');
  } catch (err: any) {
    error.value = err.data?.error || err.message || 'Login failed';
  } finally {
    isLoading.value = false;
  }
}

// Redirect if already authenticated
if (auth.isAuthenticated) {
  navigateTo('/dashboard');
}
</script>
