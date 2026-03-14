/**
 * Model Selection Composable
 * 
 * Provides reactive state management for pose estimation model selection,
 * loading, and switching. Integrates with the model registry for seamless
 * model management in Vue components.
 */

import { ref, computed, watch, onUnmounted } from 'vue';
import {
  modelRegistry,
  type ModelId,
  type ModelMetadata,
  type ModelLoadingProgress,
  type BasePoseModel,
  type ModelInitOptions,
  MODEL_CATEGORIES,
  USE_CASE_RECOMMENDATIONS,
} from '~/utils/pose/models';

// Storage key for persisting model preference
const STORAGE_KEY = 'physio-tracker-preferred-model';
const DEFAULT_MODEL: ModelId = 'mediapipe-pose-heavy';

export interface UseModelSelectionOptions {
  autoLoad?: boolean;
  persistPreference?: boolean;
  defaultModel?: ModelId;
  initOptions?: ModelInitOptions;
}

export function useModelSelection(options: UseModelSelectionOptions = {}) {
  const {
    autoLoad = false,
    persistPreference = true,
    defaultModel = DEFAULT_MODEL,
    initOptions = {},
  } = options;

  // Reactive state
  const selectedModelId = ref<ModelId>(loadPreferredModel() || defaultModel);
  const activeModel = ref<BasePoseModel | null>(null);
  const isLoading = ref(false);
  const loadingProgress = ref<ModelLoadingProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const error = ref<Error | null>(null);
  const showModelSelector = ref(false);

  // Computed properties
  const availableModels = computed(() => modelRegistry.getAllMetadata());
  
  const selectedModelMetadata = computed(() => 
    modelRegistry.getMetadata(selectedModelId.value)
  );

  const modelsByCategory = computed(() => {
    return MODEL_CATEGORIES.map(category => ({
      ...category,
      models: category.models
        .map(id => modelRegistry.getMetadata(id))
        .filter((m): m is ModelMetadata => m !== undefined),
    }));
  });

  const isModelReady = computed(() => 
    activeModel.value?.isReady() ?? false
  );

  const supportsSpineAnalysis = computed(() =>
    selectedModelMetadata.value?.supportsSpineAnalysis ?? false
  );

  const performanceInfo = computed(() => {
    const meta = selectedModelMetadata.value;
    if (!meta) return null;
    return {
      speed: meta.performance.speed,
      accuracy: meta.performance.accuracy,
      memory: meta.performance.memoryUsage,
      modelSize: meta.modelSize,
    };
  });

  // Load preferred model from storage
  function loadPreferredModel(): ModelId | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && modelRegistry.getMetadata(saved as ModelId)) {
        return saved as ModelId;
      }
    } catch {
      // Storage not available
    }
    return null;
  }

  // Save preferred model to storage
  function savePreferredModel(id: ModelId): void {
    if (!persistPreference || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Storage not available
    }
  }

  // Handle progress updates
  function handleProgress(progress: ModelLoadingProgress): void {
    loadingProgress.value = progress;
    
    if (progress.status === 'error' && progress.error) {
      error.value = progress.error;
      isLoading.value = false;
    } else if (progress.status === 'ready') {
      error.value = null;
      isLoading.value = false;
    }
  }

  // Select a model (optionally load it)
  async function selectModel(id: ModelId, load: boolean = true): Promise<void> {
    selectedModelId.value = id;
    savePreferredModel(id);
    
    if (load) {
      await loadModel(id);
    }
  }

  // Load the currently selected model
  async function loadModel(id?: ModelId): Promise<BasePoseModel> {
    const modelId = id || selectedModelId.value;
    
    if (modelRegistry.isActive(modelId) && modelRegistry.getActive()?.isReady()) {
      activeModel.value = modelRegistry.getActive();
      return activeModel.value!;
    }

    isLoading.value = true;
    error.value = null;
    loadingProgress.value = {
      status: 'loading',
      progress: 0,
      message: 'Starting model load...',
    };

    try {
      const model = await modelRegistry.load(modelId, initOptions, handleProgress);
      activeModel.value = model;
      return model;
    } catch (err: any) {
      error.value = err;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  // Switch to a different model
  async function switchModel(newId: ModelId): Promise<void> {
    if (newId === selectedModelId.value && activeModel.value?.isReady()) {
      return;
    }

    await selectModel(newId, true);
  }

  // Get model recommendations for a use case
  function getRecommendations(useCase: string): ModelMetadata[] {
    const ids = modelRegistry.getRecommendedForUseCase(useCase);
    return ids
      .map(id => modelRegistry.getMetadata(id))
      .filter((m): m is ModelMetadata => m !== undefined);
  }

  // Compare selected models
  function compareModels(ids: ModelId[]) {
    return modelRegistry.compareModels(ids);
  }

  // Get spine analysis capabilities
  function analyzeSpine() {
    if (!activeModel.value || !supportsSpineAnalysis.value) {
      return null;
    }
    // This would be called with landmarks in actual use
    return activeModel.value.analyzeSpine.bind(activeModel.value);
  }

  // Dispose current model
  function disposeModel(): void {
    modelRegistry.disposeActive();
    activeModel.value = null;
  }

  // Open model selector modal
  function openSelector(): void {
    showModelSelector.value = true;
  }

  // Close model selector modal
  function closeSelector(): void {
    showModelSelector.value = false;
  }

  // Quick select presets
  const presets = {
    fastest: () => switchModel('yolopose-nano'),
    balanced: () => switchModel('mediapipe-pose-full'),
    accurate: () => switchModel('mediapipe-pose-heavy'),
    highestAccuracy: () => switchModel('vitpose-large'),
    spineAnalysis: () => switchModel('rtmpose-body'),
    multiPerson: () => switchModel('yolopose-medium'),
    mobile: () => switchModel('mediapipe-pose-lite'),
  };

  // Watch for model changes and persist
  watch(selectedModelId, (newId) => {
    savePreferredModel(newId);
  });

  // Auto-load model if enabled
  if (autoLoad) {
    // Use nextTick or setTimeout to avoid blocking
    setTimeout(() => {
      loadModel().catch(console.error);
    }, 0);
  }

  // Cleanup on unmount
  onUnmounted(() => {
    // Don't dispose model here as it might be shared
    // The registry handles cleanup
  });

  return {
    // State
    selectedModelId,
    activeModel,
    isLoading,
    loadingProgress,
    error,
    showModelSelector,
    
    // Computed
    availableModels,
    selectedModelMetadata,
    modelsByCategory,
    isModelReady,
    supportsSpineAnalysis,
    performanceInfo,
    
    // Actions
    selectModel,
    loadModel,
    switchModel,
    disposeModel,
    getRecommendations,
    compareModels,
    analyzeSpine,
    openSelector,
    closeSelector,
    
    // Presets
    presets,
    
    // Constants
    categories: MODEL_CATEGORIES,
    useCases: USE_CASE_RECOMMENDATIONS,
  };
}

// Type export for external use
export type ModelSelectionReturn = ReturnType<typeof useModelSelection>;
