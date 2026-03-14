<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Back Button -->
    <NuxtLink to="/patients" class="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Patients
    </NuxtLink>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card p-8 text-center">
      <div class="text-4xl mb-4">😕</div>
      <h3 class="text-xl font-semibold mb-2">Patient Not Found</h3>
      <p class="text-gray-600 mb-4">{{ error }}</p>
      <NuxtLink to="/patients" class="btn-primary">
        Return to Patients
      </NuxtLink>
    </div>

    <template v-else-if="patient">
      <!-- Patient Header -->
      <div class="card p-6 mb-8">
        <div class="flex items-start gap-6">
          <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-2xl">
            {{ getInitials(patient) }}
          </div>
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-gray-900">
              {{ patient.firstName }} {{ patient.lastName }}
            </h1>
            <p class="text-gray-600">{{ patient.email }}</p>
            <p class="text-sm text-gray-500 mt-2">
              Patient since {{ formatDate(patient.createdAt) }}
            </p>
            <div v-if="patient.notes" class="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              <strong>Notes:</strong> {{ patient.notes }}
            </div>
          </div>
          <div class="text-right">
            <button @click="showAssignRoutine = true" class="btn-primary">
              Assign Routine
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="grid sm:grid-cols-4 gap-4 mb-8">
        <div class="card p-6 text-center">
          <div class="text-3xl font-bold text-gray-900">{{ stats.totalSessions }}</div>
          <div class="text-sm text-gray-500">Total Sessions</div>
        </div>
        <div class="card p-6 text-center">
          <div class="text-3xl font-bold text-gray-900">{{ stats.totalReps }}</div>
          <div class="text-sm text-gray-500">Total Reps</div>
        </div>
        <div class="card p-6 text-center">
          <div class="text-3xl font-bold" :class="getScoreClass(stats.avgFormScore)">
            {{ stats.avgFormScore ? `${stats.avgFormScore}%` : '--' }}
          </div>
          <div class="text-sm text-gray-500">Avg Form Score</div>
        </div>
        <div class="card p-6 text-center">
          <div class="text-3xl font-bold text-amber-500">{{ stats.activeDays }}</div>
          <div class="text-sm text-gray-500">Active Days</div>
        </div>
      </div>

      <!-- Recent Sessions -->
      <div>
        <h2 class="text-xl font-semibold mb-4">Recent Sessions</h2>

        <div v-if="recentSessions.length === 0" class="card p-8 text-center">
          <div class="text-4xl mb-4">📊</div>
          <h3 class="text-lg font-medium mb-2">No sessions yet</h3>
          <p class="text-gray-600">This patient hasn't completed any exercise sessions yet.</p>
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
                  {{ formatDateTime(session.startedAt) }}
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
              <div v-if="session.duration" class="text-xs text-gray-400">
                {{ formatDuration(session.duration) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Assign Routine Modal -->
    <Teleport to="body">
      <div 
        v-if="showAssignRoutine"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="showAssignRoutine = false"
      >
        <div class="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold">Assign Routine</h3>
            <button @click="showAssignRoutine = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="routines.length === 0" class="text-center py-8">
            <div class="text-4xl mb-4">📋</div>
            <p class="text-gray-600">No routines available. Create a routine first.</p>
          </div>

          <div v-else class="space-y-3">
            <button
              v-for="routine in routines"
              :key="routine.id"
              @click="assignRoutine(routine.id)"
              :disabled="isAssigning"
              class="w-full p-4 text-left border rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <div class="font-medium">{{ routine.name }}</div>
              <div class="text-sm text-gray-600">{{ routine.description }}</div>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useApi } from '~/composables/useApi';

interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  notes?: string;
  createdAt: string;
  calibrationData?: any;
  recentSessions?: any[];
}

interface Session {
  id: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  repsCompleted: number;
  averageFormScore?: number;
  exercise?: {
    name: string;
  };
}

interface Routine {
  id: string;
  name: string;
  description?: string;
}

const route = useRoute();
const api = useApi();

const patient = ref<Patient | null>(null);
const recentSessions = ref<Session[]>([]);
const routines = ref<Routine[]>([]);
const isLoading = ref(true);
const error = ref('');
const showAssignRoutine = ref(false);
const isAssigning = ref(false);

const stats = ref({
  totalSessions: 0,
  totalReps: 0,
  avgFormScore: 0,
  activeDays: 0,
});

function getInitials(p: Patient): string {
  return `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase() || '?';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function getScoreClass(score: number | null): string {
  if (!score) return 'text-gray-400';
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-blue-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

async function fetchPatient() {
  const patientId = route.params.id as string;
  
  try {
    const response = await api.get<Patient>(`/users/patients/${patientId}`);
    if (response.success && response.data) {
      patient.value = response.data;
      recentSessions.value = response.data.recentSessions || [];
      
      // Calculate stats from sessions
      if (recentSessions.value.length > 0) {
        stats.value.totalSessions = recentSessions.value.length;
        stats.value.totalReps = recentSessions.value.reduce((sum, s) => sum + s.repsCompleted, 0);
        
        const sessionsWithScore = recentSessions.value.filter(s => s.averageFormScore);
        if (sessionsWithScore.length > 0) {
          stats.value.avgFormScore = Math.round(
            sessionsWithScore.reduce((sum, s) => sum + s.averageFormScore!, 0) / sessionsWithScore.length
          );
        }
        
        const uniqueDays = new Set(recentSessions.value.map(s => 
          new Date(s.startedAt).toDateString()
        ));
        stats.value.activeDays = uniqueDays.size;
      }
    }
  } catch (err: any) {
    error.value = err.data?.error || 'Failed to load patient';
  }
}

async function fetchRoutines() {
  try {
    const response = await api.get<Routine[]>('/routines');
    if (response.success && response.data) {
      routines.value = response.data;
    }
  } catch (err) {
    console.error('Failed to fetch routines:', err);
  }
}

async function assignRoutine(routineId: string) {
  if (!patient.value) return;
  
  isAssigning.value = true;
  try {
    await api.post(`/routines/${routineId}/assign`, {
      patientId: patient.value.id,
    });
    showAssignRoutine.value = false;
    // Show success toast/notification
  } catch (err) {
    console.error('Failed to assign routine:', err);
  } finally {
    isAssigning.value = false;
  }
}

onMounted(async () => {
  isLoading.value = true;
  await Promise.all([fetchPatient(), fetchRoutines()]);
  isLoading.value = false;
});

// Auth guard
definePageMeta({
  middleware: ['auth'],
});
</script>
