<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Progress Tracking</h1>
      <p class="text-gray-600 mt-1">Track your exercise journey over time</p>
    </div>

    <!-- Time Range Selector -->
    <div class="flex gap-2 mb-6">
      <button
        v-for="range in timeRanges"
        :key="range.value"
        @click="selectedRange = range.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          selectedRange === range.value
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        {{ range.label }}
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="card p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-gray-500 text-sm">Sessions</span>
        </div>
        <div class="text-3xl font-bold text-gray-900">{{ totals.totalSessions }}</div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="text-gray-500 text-sm">Total Reps</span>
        </div>
        <div class="text-3xl font-bold text-gray-900">{{ totals.totalReps }}</div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-gray-500 text-sm">Total Time</span>
        </div>
        <div class="text-3xl font-bold text-gray-900">{{ formatDuration(totals.totalDuration) }}</div>
      </div>

      <div class="card p-6">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-gray-500 text-sm">Avg Form</span>
        </div>
        <div class="text-3xl font-bold" :class="getScoreClass(totals.avgFormScore)">
          {{ totals.avgFormScore ? `${Math.round(totals.avgFormScore)}%` : '--' }}
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid lg:grid-cols-2 gap-6 mb-8">
      <!-- Activity Chart -->
      <div class="card p-6">
        <h3 class="font-semibold mb-4">Activity Over Time</h3>
        <div class="h-64">
          <canvas ref="activityChart" />
        </div>
      </div>

      <!-- Form Score Chart -->
      <div class="card p-6">
        <h3 class="font-semibold mb-4">Form Score Trend</h3>
        <div class="h-64">
          <canvas ref="formChart" />
        </div>
      </div>
    </div>

    <!-- Achievements -->
    <div class="card p-6 mb-8">
      <h3 class="font-semibold mb-4">Achievements</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div 
          v-for="achievement in achievements"
          :key="achievement.id"
          class="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl"
        >
          <div class="text-3xl mb-2">🏆</div>
          <div class="font-medium text-sm">{{ achievement.name }}</div>
          <div class="text-xs text-gray-500">{{ achievement.description }}</div>
        </div>
        
        <div 
          v-if="achievements.length === 0"
          class="col-span-full text-center py-8 text-gray-500"
        >
          Complete more exercises to unlock achievements!
        </div>
      </div>
    </div>

    <!-- Session History -->
    <div class="card">
      <div class="p-4 border-b">
        <h3 class="font-semibold">Session History</h3>
      </div>
      <div class="divide-y">
        <div 
          v-for="snapshot in snapshots"
          :key="snapshot.id"
          class="p-4 hover:bg-gray-50"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium">{{ formatDate(snapshot.date) }}</div>
              <div class="text-sm text-gray-500">
                {{ snapshot.totalSessions }} sessions • {{ snapshot.totalReps }} reps
              </div>
            </div>
            <div class="text-right">
              <div 
                v-if="snapshot.averageFormScore"
                class="font-semibold"
                :class="getScoreClass(snapshot.averageFormScore)"
              >
                {{ Math.round(snapshot.averageFormScore) }}%
              </div>
              <div class="text-sm text-gray-500">
                {{ formatDuration(snapshot.totalDuration) }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="snapshots.length === 0" class="p-8 text-center text-gray-500">
          No activity data yet. Start exercising to see your progress here!
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useApi } from '~/composables/useApi';
import { Chart, registerables } from 'chart.js';
import type { ProgressSnapshot, Achievement } from '~/types';

Chart.register(...registerables);

const api = useApi();

const selectedRange = ref(30);
const snapshots = ref<ProgressSnapshot[]>([]);
const achievements = ref<Achievement[]>([]);
const totals = ref({
  totalSessions: 0,
  totalReps: 0,
  totalDuration: 0,
  avgFormScore: 0,
});

const activityChart = ref<HTMLCanvasElement | null>(null);
const formChart = ref<HTMLCanvasElement | null>(null);
let activityChartInstance: Chart | null = null;
let formChartInstance: Chart | null = null;

const timeRanges = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

function getScoreClass(score: number | null) {
  if (!score) return 'text-gray-400';
  if (score >= 90) return 'text-green-500';
  if (score >= 75) return 'text-blue-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

async function fetchProgress() {
  try {
    const response = await api.get<any>(`/progress?days=${selectedRange.value}`);
    if (response.success) {
      snapshots.value = response.data.snapshots;
      totals.value = response.data.totals;
      updateCharts();
    }

    const achievementsRes = await api.get<any>('/progress/achievements');
    if (achievementsRes.success) {
      achievements.value = achievementsRes.data.achievements;
    }
  } catch (err) {
    console.error('Failed to fetch progress:', err);
  }
}

function updateCharts() {
  const labels = snapshots.value.map(s => formatDate(s.date));
  const repsData = snapshots.value.map(s => s.totalReps);
  const formData = snapshots.value.map(s => s.averageFormScore || 0);

  // Activity Chart
  if (activityChart.value) {
    if (activityChartInstance) activityChartInstance.destroy();
    
    activityChartInstance = new Chart(activityChart.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Reps',
          data: repsData,
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }

  // Form Chart
  if (formChart.value) {
    if (formChartInstance) formChartInstance.destroy();
    
    formChartInstance = new Chart(formChart.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Form Score',
          data: formData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { 
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });
  }
}

watch(selectedRange, fetchProgress);

onMounted(fetchProgress);

// Auth guard
definePageMeta({
  middleware: ['auth'],
});
</script>
