<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
        Welcome back, {{ auth.user?.firstName }}! 👋
      </h1>
      <p class="text-gray-600 mt-1">Here's your exercise overview</p>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <NuxtLink to="/session" class="card-hover p-6 text-center group">
        <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
          <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="font-medium">Start Session</div>
      </NuxtLink>

      <NuxtLink to="/exercises" class="card-hover p-6 text-center group">
        <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div class="font-medium">Exercises</div>
      </NuxtLink>

      <NuxtLink to="/progress" class="card-hover p-6 text-center group">
        <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-200 transition-colors">
          <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div class="font-medium">Progress</div>
      </NuxtLink>

      <NuxtLink to="/profile" class="card-hover p-6 text-center group">
        <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
          <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div class="font-medium">Settings</div>
      </NuxtLink>
    </div>

    <!-- Stats Overview -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="card p-6">
        <div class="text-sm text-gray-500 mb-1">Total Sessions</div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.totalSessions }}</div>
      </div>
      <div class="card p-6">
        <div class="text-sm text-gray-500 mb-1">Total Reps</div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.totalReps }}</div>
      </div>
      <div class="card p-6">
        <div class="text-sm text-gray-500 mb-1">Avg Form Score</div>
        <div class="text-3xl font-bold" :class="getScoreClass(stats.avgFormScore)">
          {{ stats.avgFormScore ? `${stats.avgFormScore}%` : '--' }}
        </div>
      </div>
      <div class="card p-6">
        <div class="text-sm text-gray-500 mb-1">Current Streak</div>
        <div class="text-3xl font-bold text-amber-500">{{ stats.currentStreak }} days 🔥</div>
      </div>
    </div>

    <!-- Assigned Routines (for patients) -->
    <div v-if="auth.isPatient && assignedRoutines.length > 0" class="mb-8">
      <h2 class="text-xl font-semibold mb-4">Your Routines</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="assignment in assignedRoutines" 
          :key="assignment.id"
          class="card-hover p-6"
        >
          <h3 class="font-semibold text-lg mb-2">{{ assignment.routine.name }}</h3>
          <p class="text-sm text-gray-600 mb-3">{{ assignment.routine.description }}</p>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">{{ assignment.frequency || 'As needed' }}</span>
            <NuxtLink 
              :to="`/session?routine=${assignment.routineId}`"
              class="text-primary-600 font-medium hover:text-primary-700"
            >
              Start →
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Sessions -->
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">Recent Sessions</h2>
        <NuxtLink to="/progress" class="text-primary-600 text-sm font-medium hover:text-primary-700">
          View all →
        </NuxtLink>
      </div>

      <div v-if="recentSessions.length === 0" class="card p-8 text-center">
        <div class="text-4xl mb-4">🏋️</div>
        <h3 class="text-lg font-medium mb-2">No sessions yet</h3>
        <p class="text-gray-600 mb-4">Start your first exercise session to see your progress here.</p>
        <NuxtLink to="/session" class="btn-primary">
          Start Your First Session
        </NuxtLink>
      </div>

      <div v-else class="space-y-3">
        <div 
          v-for="session in recentSessions" 
          :key="session.id"
          class="card p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              🏋️
            </div>
            <div>
              <div class="font-medium">{{ session.exercise?.name || 'Exercise' }}</div>
              <div class="text-sm text-gray-500">
                {{ formatDate(session.startedAt) }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-semibold">{{ session.repsCompleted }} reps</div>
            <div 
              v-if="session.averageFormScore"
              class="text-sm"
              :class="getScoreClass(session.averageFormScore)"
            >
              {{ Math.round(session.averageFormScore) }}% form
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useSessionStore } from '~/stores/session';
import { useExercisesStore } from '~/stores/exercises';
import { useApi } from '~/composables/useApi';

const auth = useAuthStore();
const sessionStore = useSessionStore();
const exercisesStore = useExercisesStore();
const api = useApi();

const stats = ref({
  totalSessions: 0,
  totalReps: 0,
  avgFormScore: 0,
  currentStreak: 0,
});

const recentSessions = ref<any[]>([]);
const assignedRoutines = ref<any[]>([]);

function getScoreClass(score: number | null) {
  if (!score) return 'text-gray-400';
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-blue-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString();
}

onMounted(async () => {
  try {
    // Fetch achievements/stats
    const achievementsRes = await api.get<any>('/progress/achievements');
    if (achievementsRes.success) {
      stats.value = achievementsRes.data.stats;
    }

    // Fetch recent sessions
    await sessionStore.fetchRecentSessions();
    recentSessions.value = sessionStore.recentSessions;

    // Fetch assigned routines for patients
    if (auth.isPatient) {
      await exercisesStore.fetchAssignedRoutines();
      assignedRoutines.value = exercisesStore.assignedRoutines;
    }
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err);
  }
});

// Auth guard
definePageMeta({
  middleware: ['auth'],
});
</script>
