<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <Transition name="slide-up">
          <div
            v-if="show"
            class="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
          >
            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                  Pose Estimation Model
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Select a model optimized for your use case
                </p>
              </div>
              <button
                @click="emit('close')"
                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Tabs -->
            <div class="border-b border-gray-200 dark:border-gray-700">
              <nav class="flex px-6 -mb-px">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  @click="activeTab = tab.id"
                  :class="[
                    'px-4 py-3 text-sm font-medium border-b-2 transition',
                    activeTab === tab.id
                      ? 'text-primary-600 border-primary-600 dark:text-primary-400'
                      : 'text-gray-500 border-transparent hover:text-gray-700 dark:text-gray-400'
                  ]"
                >
                  {{ tab.name }}
                </button>
              </nav>
            </div>

            <!-- Content -->
            <div class="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
              <!-- All Models Tab -->
              <div v-if="activeTab === 'all'" class="space-y-6">
                <div
                  v-for="category in modelsByCategory"
                  :key="category.id"
                  class="space-y-3"
                >
                  <div>
                    <h3 class="font-semibold text-gray-900 dark:text-white">
                      {{ category.name }}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ category.description }}
                    </p>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ModelCard
                      v-for="model in category.models"
                      :key="model.id"
                      :model="model"
                      :selected="selectedModelId === model.id"
                      :loading="isLoading && selectedModelId === model.id"
                      @select="handleSelectModel(model.id)"
                    />
                  </div>
                </div>
              </div>

              <!-- By Use Case Tab -->
              <div v-if="activeTab === 'usecase'" class="space-y-6">
                <div
                  v-for="rec in useCases"
                  :key="rec.useCase"
                  class="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h4 class="font-semibold text-gray-900 dark:text-white capitalize">
                        {{ rec.useCase.replace(/-/g, ' ') }}
                      </h4>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ rec.description }}
                      </p>
                    </div>
                    <span class="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs rounded-full">
                      {{ rec.recommendedModels.length }} models
                    </span>
                  </div>
                  
                  <p class="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                    💡 {{ rec.reason }}
                  </p>

                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="modelId in rec.recommendedModels"
                      :key="modelId"
                      @click="handleSelectModel(modelId)"
                      :class="[
                        'px-3 py-1.5 text-sm rounded-lg transition font-medium',
                        selectedModelId === modelId
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      ]"
                    >
                      {{ getModelName(modelId) }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Compare Tab -->
              <div v-if="activeTab === 'compare'" class="space-y-4">
                <div class="flex flex-wrap gap-2 mb-4">
                  <button
                    v-for="model in availableModels"
                    :key="model.id"
                    @click="toggleCompareModel(model.id)"
                    :class="[
                      'px-3 py-1.5 text-sm rounded-lg transition border',
                      compareSelection.includes(model.id)
                        ? 'bg-primary-100 dark:bg-primary-900 border-primary-500 text-primary-700 dark:text-primary-300'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-500'
                    ]"
                  >
                    {{ model.name }}
                  </button>
                </div>

                <div v-if="compareSelection.length >= 2" class="overflow-x-auto">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr>
                        <th class="text-left py-2 px-3 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-tl-lg">
                          Feature
                        </th>
                        <th
                          v-for="modelId in compareSelection"
                          :key="modelId"
                          class="text-left py-2 px-3 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium"
                        >
                          {{ getModelName(modelId) }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr>
                        <td class="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">Speed</td>
                        <td
                          v-for="modelId in compareSelection"
                          :key="modelId"
                          class="py-2 px-3"
                        >
                          <PerformanceBadge :value="getModelMeta(modelId)?.performance.speed" type="speed" />
                        </td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">Accuracy</td>
                        <td
                          v-for="modelId in compareSelection"
                          :key="modelId"
                          class="py-2 px-3"
                        >
                          <PerformanceBadge :value="getModelMeta(modelId)?.performance.accuracy" type="accuracy" />
                        </td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">Memory</td>
                        <td
                          v-for="modelId in compareSelection"
                          :key="modelId"
                          class="py-2 px-3"
                        >
                          <PerformanceBadge :value="getModelMeta(modelId)?.performance.memoryUsage" type="memory" />
                        </td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">Model Size</td>
                        <td
                          v-for="modelId in compareSelection"
                          :key="modelId"
                          class="py-2 px-3 text-sm text-gray-700 dark:text-gray-300"
                        >
                          {{ getModelMeta(modelId)?.modelSize }}
                        </td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">Keypoints</td>
                        <td
                          v-for="modelId in compareSelection"
                          :key="modelId"
                          class="py-2 px-3 text-sm text-gray-700 dark:text-gray-300"
                        >
                          {{ getModelMeta(modelId)?.landmarkCount }}
                        </td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">Spine Analysis</td>
                        <td
                          v-for="modelId in compareSelection"
                          :key="modelId"
                          class="py-2 px-3"
                        >
                          <span
                            :class="[
                              'text-sm',
                              getModelMeta(modelId)?.supportsSpineAnalysis
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-400'
                            ]"
                          >
                            {{ getModelMeta(modelId)?.supportsSpineAnalysis ? '✓ Yes' : '✗ No' }}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td class="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">Multi-Person</td>
                        <td
                          v-for="modelId in compareSelection"
                          :key="modelId"
                          class="py-2 px-3"
                        >
                          <span
                            :class="[
                              'text-sm',
                              getModelMeta(modelId)?.capabilities.includes('multi-person')
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-400'
                            ]"
                          >
                            {{ getModelMeta(modelId)?.capabilities.includes('multi-person') ? '✓ Yes' : '✗ No' }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p v-else class="text-center text-gray-500 dark:text-gray-400 py-8">
                  Select at least 2 models to compare
                </p>
              </div>

              <!-- Current Model Info Tab -->
              <div v-if="activeTab === 'current'" class="space-y-6">
                <div v-if="selectedModelMeta" class="space-y-4">
                  <div class="flex items-start gap-4">
                    <div class="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center">
                      <span class="text-2xl">🤖</span>
                    </div>
                    <div class="flex-1">
                      <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                        {{ selectedModelMeta.name }}
                      </h3>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        Version {{ selectedModelMeta.version }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {{ selectedModelMeta.description }}
                      </p>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Speed</div>
                      <div class="font-semibold text-gray-900 dark:text-white capitalize mt-1">
                        {{ selectedModelMeta.performance.speed }}
                      </div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Accuracy</div>
                      <div class="font-semibold text-gray-900 dark:text-white capitalize mt-1">
                        {{ selectedModelMeta.performance.accuracy }}
                      </div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Memory</div>
                      <div class="font-semibold text-gray-900 dark:text-white capitalize mt-1">
                        {{ selectedModelMeta.performance.memoryUsage }}
                      </div>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div class="text-xs text-gray-500 dark:text-gray-400 uppercase">Size</div>
                      <div class="font-semibold text-gray-900 dark:text-white mt-1">
                        {{ selectedModelMeta.modelSize }}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-2">Capabilities</h4>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="cap in selectedModelMeta.capabilities"
                        :key="cap"
                        class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full capitalize"
                      >
                        {{ cap.replace(/-/g, ' ') }}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-2">Best For</h4>
                    <ul class="space-y-1">
                      <li
                        v-for="(useCase, idx) in selectedModelMeta.useCases"
                        :key="idx"
                        class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                      >
                        <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                        {{ useCase }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer with Loading Progress -->
            <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div v-if="isLoading" class="mb-3">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ loadingProgress.message }}
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ loadingProgress.progress }}%
                  </span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${loadingProgress.progress}%` }"
                  />
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Selected: <span class="font-medium text-gray-900 dark:text-white">{{ getModelName(selectedModelId) }}</span>
                </div>
                <div class="flex gap-3">
                  <button
                    @click="emit('close')"
                    class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    @click="handleConfirm"
                    :disabled="isLoading"
                    class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    {{ isLoading ? 'Loading...' : 'Apply' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useModelSelection } from '~/composables/useModelSelection';
import type { ModelId, ModelMetadata } from '~/utils/pose/models';

const props = defineProps<{
  show: boolean;
  initialModel?: ModelId;
}>();

const emit = defineEmits<{
  close: [];
  select: [modelId: ModelId];
}>();

const {
  selectedModelId,
  isLoading,
  loadingProgress,
  availableModels,
  selectedModelMetadata,
  modelsByCategory,
  loadModel,
  useCases,
} = useModelSelection();

const activeTab = ref<'all' | 'usecase' | 'compare' | 'current'>('all');
const compareSelection = ref<ModelId[]>([]);

const tabs = [
  { id: 'all' as const, name: 'All Models' },
  { id: 'usecase' as const, name: 'By Use Case' },
  { id: 'compare' as const, name: 'Compare' },
  { id: 'current' as const, name: 'Current Model' },
];

const selectedModelMeta = computed(() => selectedModelMetadata.value);

function getModelName(id: ModelId): string {
  const meta = availableModels.value.find(m => m.id === id);
  return meta?.name || id;
}

function getModelMeta(id: ModelId): ModelMetadata | undefined {
  return availableModels.value.find(m => m.id === id);
}

function handleSelectModel(id: ModelId): void {
  selectedModelId.value = id;
}

function toggleCompareModel(id: ModelId): void {
  const idx = compareSelection.value.indexOf(id);
  if (idx >= 0) {
    compareSelection.value.splice(idx, 1);
  } else if (compareSelection.value.length < 4) {
    compareSelection.value.push(id);
  }
}

async function handleConfirm(): Promise<void> {
  try {
    await loadModel(selectedModelId.value);
    emit('select', selectedModelId.value);
    emit('close');
  } catch (err) {
    console.error('Failed to load model:', err);
  }
}

// Reset comparison when modal opens
watch(() => props.show, (show) => {
  if (show) {
    activeTab.value = 'all';
    if (props.initialModel) {
      selectedModelId.value = props.initialModel;
    }
  }
});
</script>

<!-- Sub-components -->
<script lang="ts">
// ModelCard component
const ModelCard = defineComponent({
  name: 'ModelCard',
  props: {
    model: { type: Object as () => ModelMetadata, required: true },
    selected: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  emits: ['select'],
  setup(props, { emit }) {
    return () => h('button', {
      onClick: () => emit('select'),
      class: [
        'text-left p-4 rounded-xl border-2 transition-all',
        props.selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700',
      ],
    }, [
      h('div', { class: 'flex items-start justify-between' }, [
        h('div', { class: 'flex-1' }, [
          h('div', { class: 'flex items-center gap-2' }, [
            h('span', { class: 'font-medium text-gray-900 dark:text-white' }, props.model.name),
            props.selected && h('span', { class: 'text-primary-600 dark:text-primary-400' }, '✓'),
            props.loading && h('span', { class: 'w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin' }),
          ]),
          h('p', { class: 'text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2' }, props.model.description),
        ]),
      ]),
      h('div', { class: 'flex items-center gap-2 mt-3' }, [
        h('span', {
          class: [
            'text-xs px-2 py-0.5 rounded-full',
            props.model.performance.speed === 'fast' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
            props.model.performance.speed === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
            'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
          ],
        }, props.model.performance.speed),
        h('span', { class: 'text-xs text-gray-400 dark:text-gray-500' }, props.model.modelSize),
      ]),
    ]);
  },
});

// PerformanceBadge component
const PerformanceBadge = defineComponent({
  name: 'PerformanceBadge',
  props: {
    value: { type: String, default: '' },
    type: { type: String as () => 'speed' | 'accuracy' | 'memory', required: true },
  },
  setup(props) {
    const colorClass = computed(() => {
      if (props.type === 'memory') {
        // Inverted for memory (low is good)
        return props.value === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
               props.value === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
               'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      }
      return props.value === 'fast' || props.value === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
             props.value === 'medium' || props.value === 'standard' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
             'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    });

    return () => h('span', {
      class: ['text-xs px-2 py-0.5 rounded-full capitalize', colorClass.value],
    }, props.value);
  },
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
