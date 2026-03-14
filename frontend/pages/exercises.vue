<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Exercise Library</h1>
        <p class="text-gray-600 mt-1">Browse and learn exercises</p>
      </div>
      <button 
        v-if="auth.isPhysio"
        @click="showCreateModal = true"
        class="btn-primary"
      >
        + Create Exercise
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-6">
      <button
        v-for="filter in filters"
        :key="filter.value"
        @click="activeFilter = filter.value"
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium transition-colors',
          activeFilter === filter.value
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        {{ filter.label }}
      </button>
    </div>

    <!-- Exercise Grid -->
    <div v-if="isLoading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="card p-6 animate-pulse">
        <div class="w-full h-40 bg-gray-200 rounded-lg mb-4" />
        <div class="h-6 bg-gray-200 rounded w-3/4 mb-2" />
        <div class="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>

    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="exercise in filteredExercises"
        :key="exercise.id"
        class="card-hover overflow-hidden cursor-pointer"
        @click="selectExercise(exercise)"
      >
        <div class="aspect-video bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
          <span class="text-6xl">🏋️</span>
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-lg">{{ exercise.name }}</h3>
            <span 
              v-if="exercise.isBuiltIn"
              class="badge-info text-xs"
            >
              Built-in
            </span>
          </div>
          <p class="text-sm text-gray-600 mb-3 line-clamp-2">
            {{ exercise.description || 'No description' }}
          </p>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500">{{ exercise.type }}</span>
            <div class="flex gap-1">
              <span 
                v-for="i in 5" 
                :key="i"
                :class="i <= exercise.difficulty ? 'text-amber-400' : 'text-gray-200'"
              >
                ★
              </span>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-1">
            <span 
              v-for="muscle in exercise.muscleGroups.slice(0, 3)"
              :key="muscle"
              class="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
            >
              {{ muscle }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Exercise Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="selectedExercise"
        class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        @click.self="selectedExercise = null"
      >
        <div class="bg-white w-full sm:max-w-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
            <h2 class="text-xl font-bold">{{ selectedExercise.name }}</h2>
            <button @click="selectedExercise = null" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6">
            <!-- Description -->
            <p class="text-gray-600 mb-6">{{ selectedExercise.description }}</p>

            <!-- Instructions -->
            <div class="mb-6">
              <h3 class="font-semibold mb-3">Instructions</h3>
              <ol class="list-decimal list-inside space-y-2 text-gray-600">
                <li v-for="(instruction, i) in selectedExercise.instructions" :key="i">
                  {{ instruction }}
                </li>
              </ol>
            </div>

            <!-- Coaching Cues -->
            <div v-if="selectedExercise.cues?.length" class="mb-6">
              <h3 class="font-semibold mb-3">Coaching Cues</h3>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="cue in selectedExercise.cues"
                  :key="cue"
                  class="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                >
                  {{ cue }}
                </span>
              </div>
            </div>

            <!-- Form Checks -->
            <div v-if="selectedExercise.formChecks?.length" class="mb-6">
              <h3 class="font-semibold mb-3">Form Analysis</h3>
              <div class="space-y-2">
                <div 
                  v-for="check in selectedExercise.formChecks"
                  :key="check.name"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div class="font-medium capitalize">{{ check.name.replace(/([A-Z])/g, ' $1') }}</div>
                    <div v-if="check.feedback" class="text-sm text-gray-500">{{ check.feedback }}</div>
                  </div>
                  <div class="text-sm text-gray-500">{{ Math.round(check.weight * 100) }}%</div>
                </div>
              </div>
            </div>

            <!-- Muscle Groups -->
            <div class="mb-6">
              <h3 class="font-semibold mb-3">Muscle Groups</h3>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="muscle in selectedExercise.muscleGroups"
                  :key="muscle"
                  class="px-3 py-1 bg-gray-100 rounded-full text-sm capitalize"
                >
                  {{ muscle }}
                </span>
              </div>
            </div>

            <!-- Action Button -->
            <NuxtLink 
              :to="`/session?exercise=${selectedExercise.id}`"
              class="btn-primary w-full py-3 text-center block"
            >
              Start Exercise
            </NuxtLink>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useExercisesStore } from '~/stores/exercises';
import { useAuthStore } from '~/stores/auth';
import type { Exercise } from '~/types';

const exercisesStore = useExercisesStore();
const auth = useAuthStore();

const isLoading = ref(true);
const activeFilter = ref('all');
const selectedExercise = ref<Exercise | null>(null);
const showCreateModal = ref(false);

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Repetition', value: 'REPETITION' },
  { label: 'Hold', value: 'HOLD' },
  { label: 'Lower Body', value: 'lower' },
  { label: 'Core', value: 'core' },
];

const filteredExercises = computed(() => {
  if (activeFilter.value === 'all') {
    return exercisesStore.exercises;
  }
  
  if (activeFilter.value === 'REPETITION' || activeFilter.value === 'HOLD') {
    return exercisesStore.exercises.filter(e => e.type === activeFilter.value);
  }
  
  if (activeFilter.value === 'lower') {
    return exercisesStore.exercises.filter(e => 
      e.muscleGroups.some(m => ['quadriceps', 'glutes', 'hamstrings', 'calves'].includes(m))
    );
  }
  
  if (activeFilter.value === 'core') {
    return exercisesStore.exercises.filter(e => 
      e.muscleGroups.includes('core')
    );
  }
  
  return exercisesStore.exercises;
});

function selectExercise(exercise: Exercise) {
  selectedExercise.value = exercise;
}

onMounted(async () => {
  await exercisesStore.fetchExercises();
  isLoading.value = false;
});

// Auth guard
definePageMeta({
  middleware: ['auth'],
});
</script>
