/**
 * Pose Detection Composable
 * 
 * Main composable for pose detection functionality.
 * Integrates with the model selection system to provide flexible
 * model switching while maintaining a consistent API.
 * 
 * Features:
 * - Multiple model support (MediaPipe, RTMPose, ViTPose, YOLOPose)
 * - Automatic model loading and initialization
 * - Spine curvature analysis (when supported)
 * - Exercise detection integration
 * - Frame rate monitoring
 */

import { ref, computed, onUnmounted, watch } from 'vue';
import { SquatDetector, type SquatState } from '~/utils/pose/squat-detector';
import { SkeletonRenderer } from '~/utils/pose/skeleton-renderer';
import { 
  modelRegistry, 
  type ModelId, 
  type BasePoseModel,
  type NormalizedLandmark,
  type SpineAnalysisResult,
  type ModelLoadingProgress,
} from '~/utils/pose/models';
import type { FormScores, FrameData } from '~/types';

// Default model - use MediaPipe Heavy for highest accuracy
const DEFAULT_MODEL: ModelId = 'mediapipe-pose-heavy';

// Storage key for model preference
const MODEL_STORAGE_KEY = 'physio-tracker-pose-model';

export interface UsePoseDetectionOptions {
  modelId?: ModelId;
  autoInitialize?: boolean;
  enableSpineAnalysis?: boolean;
  persistModelPreference?: boolean;
}

export function usePoseDetection(options: UsePoseDetectionOptions = {}) {
  const {
    modelId: initialModelId,
    autoInitialize = false,
    enableSpineAnalysis = true,
    persistModelPreference = true,
  } = options;

  // Load saved model preference
  const savedModelId = typeof window !== 'undefined' 
    ? localStorage.getItem(MODEL_STORAGE_KEY) as ModelId | null
    : null;

  // State
  const currentModelId = ref<ModelId>(initialModelId || savedModelId || DEFAULT_MODEL);
  const model = ref<BasePoseModel | null>(null);
  const isInitialized = ref(false);
  const isProcessing = ref(false);
  const isModelLoading = ref(false);
  const modelLoadingProgress = ref<ModelLoadingProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const error = ref<string | null>(null);
  const currentState = ref<SquatState>('standing');
  const repCount = ref(0);
  const formScores = ref<FormScores | null>(null);
  const feedback = ref<{ issues: string[]; cues: string[] }>({ issues: [], cues: [] });
  const fps = ref(0);
  const spineAnalysis = ref<SpineAnalysisResult | null>(null);
  const lastLandmarks = ref<NormalizedLandmark[]>([]);

  // Internal state
  let sqautDetector: SquatDetector | null = null;
  let skeletonRenderer: SkeletonRenderer | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let canvasElement: HTMLCanvasElement | null = null;
  let animationFrameId: number | null = null;
  let onFrameCallback: ((frame: FrameData) => void) | null = null;
  let frameCount = 0;
  let fpsUpdateTime = 0;
  let cameraStream: MediaStream | null = null;

  // Computed
  const modelMetadata = computed(() => {
    return modelRegistry.getMetadata(currentModelId.value);
  });

  const supportsSpineAnalysis = computed(() => {
    return modelMetadata.value?.supportsSpineAnalysis ?? false;
  });

  const isHighAccuracyMode = computed(() => {
    const id = currentModelId.value;
    return id === 'mediapipe-pose-heavy' || 
           id === 'vitpose-large' || 
           id === 'vitpose-huge';
  });

  // Save model preference
  function saveModelPreference(id: ModelId): void {
    if (persistModelPreference && typeof window !== 'undefined') {
      localStorage.setItem(MODEL_STORAGE_KEY, id);
    }
  }

  // Initialize the pose detection system
  async function initialize(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    exerciseConfig?: any
  ): Promise<void> {
    try {
      error.value = null;
      videoElement = video;
      canvasElement = canvas;

      // Load the selected model
      await loadModel(currentModelId.value);

      // Initialize exercise detector
      sqautDetector = new SquatDetector(exerciseConfig);

      // Initialize skeleton renderer
      skeletonRenderer = new SkeletonRenderer(canvas);

      isInitialized.value = true;
      console.log(`Pose detection initialized with ${currentModelId.value}`);
    } catch (err: any) {
      error.value = err.message || 'Failed to initialize pose detection';
      console.error('Pose detection initialization error:', err);
      throw err;
    }
  }

  // Load a specific model
  async function loadModel(id: ModelId): Promise<void> {
    isModelLoading.value = true;
    modelLoadingProgress.value = {
      status: 'loading',
      progress: 0,
      message: 'Starting model load...',
    };

    try {
      const loadedModel = await modelRegistry.load(id, {}, (progress) => {
        modelLoadingProgress.value = progress;
      });

      model.value = loadedModel;
      currentModelId.value = id;
      saveModelPreference(id);

      modelLoadingProgress.value = {
        status: 'ready',
        progress: 100,
        message: 'Model ready',
      };
    } catch (err: any) {
      modelLoadingProgress.value = {
        status: 'error',
        progress: 0,
        message: err.message,
        error: err,
      };
      throw err;
    } finally {
      isModelLoading.value = false;
    }
  }

  // Switch to a different model
  async function switchModel(newModelId: ModelId): Promise<void> {
    if (newModelId === currentModelId.value && model.value?.isReady()) {
      return;
    }

    const wasProcessing = isProcessing.value;
    
    // Stop processing during switch
    if (wasProcessing) {
      stopProcessing();
    }

    await loadModel(newModelId);

    // Resume processing if it was active
    if (wasProcessing && videoElement) {
      await startProcessing();
    }
  }

  // Start camera and processing
  async function start(): Promise<void> {
    if (!videoElement || !isInitialized.value) {
      error.value = 'Pose detection not initialized';
      return;
    }

    try {
      // Start camera if not already active
      if (!cameraStream) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
        videoElement.srcObject = cameraStream;
        await videoElement.play();
      }

      await startProcessing();
    } catch (err: any) {
      error.value = err.message || 'Failed to start camera';
      isProcessing.value = false;
    }
  }

  // Start pose processing loop
  async function startProcessing(): Promise<void> {
    if (!model.value || !videoElement) return;

    isProcessing.value = true;
    fpsUpdateTime = performance.now();
    frameCount = 0;

    const processFrame = async () => {
      if (!isProcessing.value || !model.value || !videoElement) return;

      const now = performance.now();

      try {
        // Run pose estimation
        const result = await model.value.estimate(videoElement);

        if (result?.landmarks) {
          lastLandmarks.value = result.landmarks;
          
          // Convert to legacy format for squat detector
          const legacyLandmarks = result.landmarks.map(lm => ({
            x: lm.x,
            y: lm.y,
            z: lm.z || 0,
            visibility: lm.visibility || 1,
          }));

          // Process through exercise detector
          if (sqautDetector) {
            const frameData = sqautDetector.processFrame(legacyLandmarks, now);
            
            currentState.value = sqautDetector.getCurrentStateName();
            repCount.value = sqautDetector.getRepCount();
            formScores.value = frameData.feedback.scores;
            feedback.value = {
              issues: frameData.feedback.issues,
              cues: frameData.feedback.cues,
            };

            // Call frame callback if set
            if (onFrameCallback) {
              onFrameCallback(frameData);
            }
          }

          // Perform spine analysis if enabled and supported
          if (enableSpineAnalysis && supportsSpineAnalysis.value && model.value) {
            spineAnalysis.value = model.value.analyzeSpine(result.landmarks);
          }

          // Render skeleton
          if (skeletonRenderer) {
            skeletonRenderer.render(
              legacyLandmarks,
              currentState.value,
              formScores.value || undefined,
              repCount.value,
              feedback.value
            );
          }
        } else {
          // No pose detected, clear canvas
          if (skeletonRenderer) {
            skeletonRenderer.clear();
          }
        }
      } catch (err) {
        console.error('Frame processing error:', err);
      }

      // Update FPS counter
      frameCount++;
      if (now - fpsUpdateTime > 1000) {
        fps.value = Math.round(frameCount * 1000 / (now - fpsUpdateTime));
        frameCount = 0;
        fpsUpdateTime = now;
      }

      // Schedule next frame
      animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  // Stop processing
  function stopProcessing(): void {
    isProcessing.value = false;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // Stop camera and processing
  function stop(): void {
    stopProcessing();

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }

    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  // Reset exercise state
  function reset(): void {
    if (sqautDetector) {
      sqautDetector.reset();
    }
    repCount.value = 0;
    currentState.value = 'standing';
    formScores.value = null;
    feedback.value = { issues: [], cues: [] };
    spineAnalysis.value = null;
  }

  // Set frame callback
  function setOnFrameCallback(callback: (frame: FrameData) => void): void {
    onFrameCallback = callback;
  }

  // Get average form score
  function getAverageFormScore(): FormScores | null {
    return sqautDetector?.getAverageFormScore() || null;
  }

  // Update canvas size
  function updateCanvasSize(width: number, height: number): void {
    if (canvasElement) {
      canvasElement.width = width;
      canvasElement.height = height;
    }
    if (skeletonRenderer) {
      skeletonRenderer.resize(width, height);
    }
  }

  // Get current spine analysis
  function getSpineAnalysis(): SpineAnalysisResult | null {
    if (!enableSpineAnalysis || !supportsSpineAnalysis.value) {
      return null;
    }
    return spineAnalysis.value;
  }

  // Get current landmarks
  function getLandmarks(): NormalizedLandmark[] {
    return lastLandmarks.value;
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stop();
    modelRegistry.disposeActive();
  });

  // Auto-initialize if requested
  if (autoInitialize) {
    // Will be initialized when video/canvas are provided
  }

  return {
    // State
    currentModelId,
    isInitialized,
    isProcessing,
    isModelLoading,
    modelLoadingProgress,
    error,
    currentState,
    repCount,
    formScores,
    feedback,
    fps,
    spineAnalysis,
    lastLandmarks,

    // Computed
    modelMetadata,
    supportsSpineAnalysis,
    isHighAccuracyMode,

    // Methods
    initialize,
    loadModel,
    switchModel,
    start,
    stop,
    reset,
    setOnFrameCallback,
    getAverageFormScore,
    updateCanvasSize,
    getSpineAnalysis,
    getLandmarks,

    // Model registry access
    availableModels: computed(() => modelRegistry.getAllMetadata()),
    getRecommendedModels: (useCase: string) => modelRegistry.getRecommendedForUseCase(useCase),
  };
}

export type PoseDetectionReturn = ReturnType<typeof usePoseDetection>;
