<template>
  <div class="relative">
    <!-- Trigger Button -->
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm"
      :disabled="isLoading"
    >
      <span v-if="isLoading" class="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      <span v-else class="w-2 h-2 rounded-full" :class="statusColor" />
      <span class="text-white font-medium truncate max-w-[120px]">
        {{ currentModelName }}
      </span>
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute top-full right-0 mt-2 w-72 bg-gray-800 rounded-xl shadow-xl border border-gray-700 z-50 overflow-hidden"
      >
        <!-- Quick Presets -->
        <div class="p-2 border-b border-gray-700">
          <div class="text-xs text-gray-400 px-2 mb-2">Quick Select</div>
          <div class="grid grid-cols-2 gap-1">
            <button
              v-for="preset in presets"
              :key="preset.id"
              @click="selectPreset(preset.id)"
              :class="[
                'px-3 py-1.5 text-xs rounded-lg transition text-left',
                currentModelId === preset.modelId
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              <div class="font-medium">{{ preset.label }}</div>
              <div class="text-[10px] opacity-75">{{ preset.description }}</div>
            </button>
          </div>
        </div>

        <!-- Model List -->
        <div class="max-h-64 overflow-y-auto p-2">
          <div class="text-xs text-gray-400 px-2 mb-2">All Models</div>
          <button
            v-for="model in groupedModels"
            :key="model.id"
            @click="selectModel(model.id)"
            :class="[
              'w-full px-3 py-2 text-left rounded-lg transition mb-1',
              currentModelId === model.id
                ? 'bg-primary-600/20 border border-primary-500'
                : 'hover:bg-gray-700'
            ]"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm text-white font-medium">{{ model.name }}</span>
              <div class="flex items-center gap-1">
                <span :class="speedBadgeClass(model.performance.speed)" class="text-[10px] px-1.5 py-0.5 rounded">
                  {{ model.performance.speed }}
                </span>
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-0.5">
              {{ model.modelSize }} • {{ model.landmarkCount }} keypoints
            </div>
          </button>
        </div>

        <!-- Advanced Settings Link -->
        <div class="p-2 border-t border-gray-700">
          <button
            @click="openAdvanced"
            class="w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Advanced Model Settings
          </button>
        </div>
      </div>
    </Transition>

    <!-- Click outside to close -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { modelRegistry, type ModelId, type ModelMetadata } from '~/utils/pose/models';

const props = defineProps<{
  modelId: ModelId;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  select: [modelId: ModelId];
  openAdvanced: [];
}>();

const isOpen = ref(false);

// Presets for quick selection
const presets = [
  { id: 'fastest', label: '⚡ Fastest', description: 'Real-time priority', modelId: 'yolopose-nano' as ModelId },
  { id: 'balanced', label: '⚖️ Balanced', description: 'Best overall', modelId: 'mediapipe-pose-full' as ModelId },
  { id: 'accurate', label: '🎯 Accurate', description: 'High precision', modelId: 'mediapipe-pose-heavy' as ModelId },
  { id: 'spine', label: '🦴 Spine', description: 'Posture analysis', modelId: 'rtmpose-body' as ModelId },
];

const currentModelId = computed(() => props.modelId);

const currentModelName = computed(() => {
  const meta = modelRegistry.getMetadata(currentModelId.value);
  return meta?.name || currentModelId.value;
});

const statusColor = computed(() => {
  const meta = modelRegistry.getMetadata(currentModelId.value);
  if (!meta) return 'bg-gray-500';
  
  switch (meta.performance.accuracy) {
    case 'high': return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    default: return 'bg-blue-500';
  }
});

const groupedModels = computed(() => {
  return modelRegistry.getAllMetadata().sort((a, b) => {
    // Sort by family, then by accuracy
    const familyOrder = ['mediapipe', 'rtmpose', 'vitpose', 'yolopose'];
    const aFamily = a.id.split('-')[0];
    const bFamily = b.id.split('-')[0];
    const aIdx = familyOrder.indexOf(aFamily);
    const bIdx = familyOrder.indexOf(bFamily);
    
    if (aIdx !== bIdx) return aIdx - bIdx;
    
    // Within family, sort by accuracy (high first)
    const accOrder = { high: 0, medium: 1, standard: 2 };
    return (accOrder[a.performance.accuracy] || 2) - (accOrder[b.performance.accuracy] || 2);
  });
});

function speedBadgeClass(speed: string): string {
  switch (speed) {
    case 'fast': return 'bg-green-500/20 text-green-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'slow': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function selectPreset(presetId: string): void {
  const preset = presets.find(p => p.id === presetId);
  if (preset) {
    selectModel(preset.modelId);
  }
}

function selectModel(id: ModelId): void {
  isOpen.value = false;
  emit('select', id);
}

function openAdvanced(): void {
  isOpen.value = false;
  emit('openAdvanced');
}

// Close on escape
function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
