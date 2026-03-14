<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <NuxtLink to="/" class="inline-flex items-center gap-2 mb-6">
          <div class="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <span class="text-white font-bold text-xl">PT</span>
          </div>
        </NuxtLink>
        <h2 class="text-3xl font-bold text-gray-900">Create your account</h2>
        <p class="mt-2 text-gray-600">Start tracking your exercises today</p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <div v-if="error" class="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
          {{ error }}
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                id="firstName"
                v-model="firstName"
                type="text"
                required
                class="input"
                placeholder="John"
              />
            </div>
            <div>
              <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                id="lastName"
                v-model="lastName"
                type="text"
                required
                class="input"
                placeholder="Doe"
              />
            </div>
          </div>

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
              minlength="8"
              class="input"
              placeholder="••••••••"
            />
            <p class="mt-1 text-xs text-gray-500">At least 8 characters</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              I am a...
            </label>
            <div class="grid grid-cols-2 gap-4">
              <button
                type="button"
                @click="role = 'PATIENT'"
                :class="[
                  'p-4 rounded-lg border-2 text-center transition-all',
                  role === 'PATIENT' 
                    ? 'border-primary-600 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                ]"
              >
                <div class="text-2xl mb-1">🏃</div>
                <div class="font-medium">Patient</div>
                <div class="text-xs text-gray-500">Track my exercises</div>
              </button>
              <button
                type="button"
                @click="role = 'PHYSIO'"
                :class="[
                  'p-4 rounded-lg border-2 text-center transition-all',
                  role === 'PHYSIO' 
                    ? 'border-primary-600 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                ]"
              >
                <div class="text-2xl mb-1">👨‍⚕️</div>
                <div class="font-medium">Physiotherapist</div>
                <div class="text-xs text-gray-500">Manage patients</div>
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="btn-primary w-full py-3"
        >
          <span v-if="isLoading">Creating account...</span>
          <span v-else>Create account</span>
        </button>

        <p class="text-center text-sm text-gray-600">
          Already have an account?
          <NuxtLink to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
            Sign in
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');
const role = ref<'PATIENT' | 'PHYSIO'>('PATIENT');
const error = ref('');
const isLoading = ref(false);

async function handleRegister() {
  error.value = '';
  isLoading.value = true;

  try {
    await auth.register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value,
      role: role.value,
    });
    router.push('/dashboard');
  } catch (err: any) {
    error.value = err.data?.error || err.message || 'Registration failed';
  } finally {
    isLoading.value = false;
  }
}

// Redirect if already authenticated
if (auth.isAuthenticated) {
  navigateTo('/dashboard');
}
</script>
