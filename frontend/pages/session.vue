<template>
  <div class="h-screen flex flex-col bg-gray-900">
    <!-- Top Bar -->
    <div class="bg-gray-800 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button @click="handleBack" class="text-white hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="text-white">
          <div class="font-medium">{{ selectedExercise?.name || 'Select Exercise' }}</div>
          <div class="text-sm text-gray-400">{{ sessionState }}</div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Model Quick Select -->
        <ModelQuickSelect
          v-if="!sessionStarted"
          :model-id="currentModelId"
          :is-loading="isModelLoading"
          @select="handleModelSwitch"
          @open-advanced="showModelSelector = true"
        />
        <div class="text-sm text-gray-400">{{ fps }} FPS</div>
        <button 
          v-if="!sessionStarted"
          @click="showExerciseSelector = true"
          class="btn-secondary text-sm"
        >
          Change
        </button>
      </div>
    </div>

    <!-- Main Camera View -->
    <div class="flex-1 relative">
      <!-- Video Feed -->
      <video
        ref="videoElement"
        class="absolute inset-0 w-full h-full object-cover"
        playsinline
        muted
      />
      
      <!-- Skeleton Overlay -->
      <canvas
        ref="canvasElement"
        class="absolute inset-0 w-full h-full"
      />

      <!-- Loading Overlay -->
      <div 
        v-if="isInitializing || isModelLoading"
        class="absolute inset-0 bg-gray-900/80 flex items-center justify-center"
      >
        <div class="text-center text-white max-w-sm">
          <div class="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div class="mb-2">{{ modelLoadingProgress.message || 'Initializing camera...' }}</div>
          <div v-if="modelLoadingProgress.progress > 0" class="w-full bg-gray-700 rounded-full h-2 mt-3">
            <div 
              class="bg-primary-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${modelLoadingProgress.progress}%` }"
            />
          </div>
          <div v-if="modelMetadata" class="text-xs text-gray-400 mt-2">
            Loading {{ modelMetadata.name }} ({{ modelMetadata.modelSize }})
          </div>
        </div>
      </div>

      <!-- Error Overlay -->
      <div 
        v-if="error"
        class="absolute inset-0 bg-gray-900/80 flex items-center justify-center p-4"
      >
        <div class="bg-red-500/20 border border-red-500 rounded-xl p-6 max-w-md text-center">
          <div class="text-red-400 text-4xl mb-4">⚠️</div>
          <div class="text-white font-medium mb-2">Camera Error</div>
          <div class="text-red-200 text-sm mb-4">{{ error }}</div>
          <button @click="initializeCamera" class="btn-primary">
            Try Again
          </button>
        </div>
      </div>

      <!-- Rep Counter (large, bottom-right) -->
      <div class="absolute bottom-24 right-4 sm:bottom-8 sm:right-8">
        <div 
          :class="['w-24 h-24 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all', repAnimating ? 'scale-110' : 'scale-100']"
          :style="{ backgroundColor: formScoreColor + 'dd' }"
        >
          <div class="text-4xl sm:text-5xl font-bold text-white">{{ repCount }}</div>
          <div class="text-xs sm:text-sm text-white/80 uppercase tracking-wider">Reps</div>
        </div>
      </div>

      <!-- Form Score (bottom-left) -->
      <div v-if="formScores" class="absolute bottom-24 left-4 sm:bottom-8 sm:left-8">
        <div class="bg-gray-800/90 backdrop-blur rounded-xl p-4 min-w-[140px]">
          <div class="text-sm text-gray-400 mb-2">Form Score</div>
          <div class="text-3xl font-bold" :style="{ color: formScoreColor }">
            {{ formScores.overall }}%
          </div>
          <div class="mt-2 space-y-1 text-xs">
            <div class="flex justify-between">
              <span class="text-gray-400">Depth</span>
              <span class="text-white">{{ formScores.depth }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Knees</span>
              <span class="text-white">{{ formScores.kneeTracking }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Trunk</span>
              <span class="text-white">{{ formScores.trunkPosition }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Controls -->
    <div class="bg-gray-800 px-4 py-4 safe-area-pb">
      <div v-if="!sessionStarted" class="flex gap-3">
        <button 
          @click="startSession"
          :disabled="!selectedExercise || isInitializing"
          class="btn-primary flex-1 py-4 text-lg"
        >
          Start Session
        </button>
      </div>
      
      <div v-else class="flex gap-3">
        <button 
          @click="cancelSession"
          class="btn-danger flex-1 py-4"
        >
          Cancel
        </button>
        <button 
          @click="completeSession"
          class="btn-success flex-1 py-4"
        >
          Complete ({{ repCount }} reps)
        </button>
      </div>
    </div>

    <!-- Exercise Selector Modal -->
    <Teleport to="body">
      <div 
        v-if="showExerciseSelector"
        class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        @click.self="showExerciseSelector = false"
      >
        <div class="bg-white w-full sm:max-w-lg sm:rounded-xl max-h-[80vh] overflow-hidden">
          <div class="p-4 border-b flex items-center justify-between">
            <h3 class="text-lg font-semibold">Select Exercise</h3>
            <button @click="showExerciseSelector = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="overflow-y-auto max-h-[60vh]">
            <button
              v-for="exercise in exercises"
              :key="exercise.id"
              @click="selectExercise(exercise)"
              :class="[
                'w-full p-4 text-left border-b hover:bg-gray-50 flex items-center gap-4',
                selectedExercise?.id === exercise.id ? 'bg-primary-50' : ''
              ]"
            >
              <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                🏋️
              </div>
              <div class="flex-1">
                <div class="font-medium">{{ exercise.name }}</div>
                <div class="text-sm text-gray-500">{{ exercise.type }} • {{ getDifficultyLabel(exercise.difficulty) }}</div>
              </div>
              <div v-if="selectedExercise?.id === exercise.id" class="text-primary-600">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Session Complete Modal -->
    <Teleport to="body">
      <div 
        v-if="showCompleteModal"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      >
        <div class="bg-white rounded-xl max-w-md w-full p-6 text-center">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-2xl font-bold mb-2">Great Work!</h3>
          <p class="text-gray-600 mb-6">
            You completed {{ completedSession?.repsCompleted }} reps
            <span v-if="completedSession?.averageFormScore">
              with {{ Math.round(completedSession.averageFormScore) }}% form score
            </span>
          </p>
          
          <div v-if="completedSession?.formScores" class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div class="text-sm font-medium text-gray-700 mb-3">Form Breakdown</div>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>Depth</span>
                <span class="font-medium">{{ completedSession.formScores.depth }}%</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Knee Tracking</span>
                <span class="font-medium">{{ completedSession.formScores.kneeTracking }}%</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Trunk Position</span>
                <span class="font-medium">{{ completedSession.formScores.trunkPosition }}%</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Symmetry</span>
                <span class="font-medium">{{ completedSession.formScores.symmetry }}%</span>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button @click="goToDashboard" class="btn-secondary flex-1">
              Dashboard
            </button>
            <button @click="startAnotherSession" class="btn-primary flex-1">
              Another Set
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Model Selector Modal -->
    <ModelSelector
      :show="showModelSelector"
      :initial-model="currentModelId"
      @select="handleModelSwitch"
      @close="showModelSelector = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { usePoseDetection } from '~/composables/usePoseDetection';
import { useSessionStore } from '~/stores/session';
import { useExercisesStore } from '~/stores/exercises';
import { useAuthStore } from '~/stores/auth';
import { getScoreColor } from '~/utils/pose/config';
import type { Exercise, ExerciseSession } from '~/types';
import type { ModelId } from '~/utils/pose/models';

const auth = useAuthStore();
const sessionStore = useSessionStore();
const exercisesStore = useExercisesStore();
const router = useRouter();

const videoElement = ref<HTMLVideoElement | null>(null);
const canvasElement = ref<HTMLCanvasElement | null>(null);

const {
  currentModelId,
  isInitialized,
  isProcessing,
  isModelLoading,
  modelLoadingProgress,
  modelMetadata,
  error,
  currentState,
  repCount,
  formScores,
  feedback,
  fps,
  spineAnalysis,
  supportsSpineAnalysis,
  initialize,
  start,
  stop,
  reset,
  switchModel,
  setOnFrameCallback,
  getAverageFormScore,
} = usePoseDetection();

const isInitializing = ref(true);
const sessionStarted = ref(false);
const showExerciseSelector = ref(false);
const showCompleteModal = ref(false);
const showModelSelector = ref(false);
const selectedExercise = ref<Exercise | null>(null);
const completedSession = ref<ExerciseSession | null>(null);
const repAnimating = ref(false);
const previousRepCount = ref(0);

// Handle model switching
async function handleModelSwitch(modelId: ModelId) {
  try {
    await switchModel(modelId);
    // Re-initialize camera with new model if needed
    if (videoElement.value && canvasElement.value) {
      await initializeCamera();
    }
  } catch (err) {
    console.error('Failed to switch model:', err);
  }
}

const exercises = computed(() => exercisesStore.exercises);

const sessionState = computed(() => {
  if (!sessionStarted.value) return 'Ready';
  return currentState.value.charAt(0).toUpperCase() + currentState.value.slice(1);
});

const formScoreColor = computed(() => {
  if (!formScores.value) return '#6b7280';
  return getScoreColor(formScores.value.overall);
});

// Watch for rep count changes to animate
watch(repCount, (newVal) => {
  if (newVal > previousRepCount.value) {
    repAnimating.value = true;
    setTimeout(() => { repAnimating.value = false; }, 300);
  }
  previousRepCount.value = newVal;
});

function getDifficultyLabel(difficulty: number): string {
  const labels = ['Easy', 'Easy', 'Medium', 'Hard', 'Expert'];
  return labels[difficulty - 1] || 'Medium';
}

async function initializeCamera() {
  if (!videoElement.value || !canvasElement.value) return;
  
  isInitializing.value = true;
  
  try {
    // Set canvas size
    const container = videoElement.value.parentElement;
    if (container) {
      canvasElement.value.width = container.clientWidth;
      canvasElement.value.height = container.clientHeight;
    }

    await initialize(
      videoElement.value,
      canvasElement.value,
      selectedExercise.value?.defaultConfig
    );
  } finally {
    isInitializing.value = false;
  }
}

function selectExercise(exercise: Exercise) {
  selectedExercise.value = exercise;
  showExerciseSelector.value = false;
}

async function startSession() {
  if (!selectedExercise.value) {
    showExerciseSelector.value = true;
    return;
  }

  try {
    await sessionStore.startSession(selectedExercise.value.id);
    sessionStarted.value = true;
    reset();
    await start();

    // Set frame callback to store data
    setOnFrameCallback((frame) => {
      sessionStore.addFrame(frame);
      if (frame.feedback?.scores) {
        sessionStore.updateFormScore(frame.feedback.scores);
      }
    });
  } catch (err) {
    console.error('Failed to start session:', err);
  }
}

async function completeSession() {
  try {
    stop();
    const avgFormScore = getAverageFormScore();
    
    const session = await sessionStore.completeSession(
      avgFormScore ? {
        depth: avgFormScore.depth,
        kneeTracking: avgFormScore.kneeTracking,
        trunkPosition: avgFormScore.trunkPosition,
        symmetry: avgFormScore.symmetry,
      } : undefined
    );

    completedSession.value = {
      ...session!,
      formScores: avgFormScore || undefined,
    };
    showCompleteModal.value = true;
    sessionStarted.value = false;
  } catch (err) {
    console.error('Failed to complete session:', err);
  }
}

async function cancelSession() {
  stop();
  await sessionStore.cancelSession();
  sessionStarted.value = false;
  reset();
}

function handleBack() {
  if (sessionStarted.value) {
    if (confirm('Are you sure you want to cancel this session?')) {
      cancelSession();
      router.back();
    }
  } else {
    router.back();
  }
}

function goToDashboard() {
  showCompleteModal.value = false;
  router.push('/dashboard');
}

function startAnotherSession() {
  showCompleteModal.value = false;
  completedSession.value = null;
  reset();
  startSession();
}

onMounted(async () => {
  await exercisesStore.fetchExercises();
  
  // Auto-select first exercise if none selected
  if (!selectedExercise.value && exercises.value.length > 0) {
    selectedExercise.value = exercises.value[0];
  }

  await initializeCamera();
});

onUnmounted(() => {
  stop();
});

// Handle window resize
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (canvasElement.value && videoElement.value?.parentElement) {
      const container = videoElement.value.parentElement;
      canvasElement.value.width = container.clientWidth;
      canvasElement.value.height = container.clientHeight;
    }
  });
}

// Auth guard
definePageMeta({
  middleware: ['auth'],
});
</script>

<style scoped>
.safe-area-pb {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
</style>
