<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navigation -->
    <nav class="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <NuxtLink to="/" class="flex items-center gap-2">
              <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold">PT</span>
              </div>
              <span class="font-bold text-xl text-gray-900 hidden sm:block">PhysioTracker</span>
            </NuxtLink>
          </div>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center gap-6" v-if="auth.isAuthenticated">
            <NuxtLink 
              to="/dashboard" 
              class="text-gray-600 hover:text-gray-900 font-medium"
              active-class="text-primary-600"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink 
              to="/exercises" 
              class="text-gray-600 hover:text-gray-900 font-medium"
              active-class="text-primary-600"
            >
              Exercises
            </NuxtLink>
            <NuxtLink 
              to="/session" 
              class="text-gray-600 hover:text-gray-900 font-medium"
              active-class="text-primary-600"
            >
              Start Session
            </NuxtLink>
            <NuxtLink 
              v-if="auth.isPhysio"
              to="/patients" 
              class="text-gray-600 hover:text-gray-900 font-medium"
              active-class="text-primary-600"
            >
              Patients
            </NuxtLink>
          </div>

          <!-- User Menu -->
          <div class="flex items-center gap-4">
            <template v-if="auth.isAuthenticated">
              <div class="hidden sm:block text-sm text-gray-600">
                {{ auth.user?.firstName }} {{ auth.user?.lastName }}
              </div>
              <button 
                @click="auth.logout"
                class="btn-secondary text-sm"
              >
                Logout
              </button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="btn-secondary text-sm">
                Login
              </NuxtLink>
              <NuxtLink to="/register" class="btn-primary text-sm">
                Sign Up
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <!-- Mobile Navigation -->
    <div 
      v-if="auth.isAuthenticated"
      class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
    >
      <div class="flex justify-around py-2">
        <NuxtLink 
          to="/dashboard" 
          class="flex flex-col items-center p-2 text-gray-600"
          active-class="text-primary-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="text-xs mt-1">Home</span>
        </NuxtLink>
        <NuxtLink 
          to="/exercises" 
          class="flex flex-col items-center p-2 text-gray-600"
          active-class="text-primary-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span class="text-xs mt-1">Exercises</span>
        </NuxtLink>
        <NuxtLink 
          to="/session" 
          class="flex flex-col items-center p-2"
        >
          <div class="w-12 h-12 -mt-6 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-xs mt-1 text-primary-600 font-medium">Start</span>
        </NuxtLink>
        <NuxtLink 
          to="/progress" 
          class="flex flex-col items-center p-2 text-gray-600"
          active-class="text-primary-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span class="text-xs mt-1">Progress</span>
        </NuxtLink>
        <NuxtLink 
          to="/profile" 
          class="flex flex-col items-center p-2 text-gray-600"
          active-class="text-primary-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="text-xs mt-1">Profile</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 pb-20 md:pb-0">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
</script>
