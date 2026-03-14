/**
 * Pose Estimation Model Registry and Factory
 * 
 * Central hub for managing all pose estimation models in the application.
 * Provides a unified interface for model selection, loading, and switching.
 * 
 * Available Models:
 * 
 * 1. MediaPipe Pose Landmarker (Lite/Full/Heavy)
 *    - Google's production-ready solution
 *    - Heavy variant: Highest accuracy (recommended for clinical use)
 *    - 33 landmarks with 3D world coordinates
 * 
 * 2. RTMPose (Body/WholeBody/COCO)
 *    - OpenMMLab's high-accuracy model
 *    - Excellent for spine curvature analysis
 *    - Handles occlusion well
 * 
 * 3. ViTPose (Small/Base/Large/Huge)
 *    - Vision Transformer-based
 *    - State-of-the-art accuracy
 *    - Best for research/professional use
 * 
 * 4. YOLOPose (Nano/Small/Medium/Large/XLarge)
 *    - Ultralytics YOLO family
 *    - Fastest real-time performance
 *    - Native multi-person support
 */

import {
  BasePoseModel,
  type ModelMetadata,
  type ModelInitOptions,
  type ModelRegistryEntry,
  type ModelFactory,
  type PoseEstimationResult,
  type NormalizedLandmark,
  type SpineAnalysisResult,
  type ModelLoadingProgress,
} from './base-model';

import { 
  MediaPipePoseModel, 
  createMediaPipeModel, 
  createMediaPipeLite,
  createMediaPipeFull,
  createMediaPipeHeavy,
  type MediaPipeModelOptions, 
  type MediaPipeModelVariant 
} from './mediapipe-model';
import { RTMPoseModel, createRTMPoseModel, type RTMPoseOptions, type RTMPoseVariant } from './rtmpose-model';
import { ViTPoseModel, createViTPoseModel, type ViTPoseOptions, type ViTPoseSize } from './vitpose-model';
import { YOLOPoseModel, createYOLOPoseModel, type YOLOPoseOptions, type YOLOPoseSize } from './yolopose-model';

// Re-export types and classes
export * from './base-model';
export * from './spine-analysis';
export { 
  MediaPipePoseModel, 
  createMediaPipeModel, 
  createMediaPipeLite,
  createMediaPipeFull,
  createMediaPipeHeavy 
} from './mediapipe-model';
export { RTMPoseModel, createRTMPoseModel } from './rtmpose-model';
export { ViTPoseModel, createViTPoseModel } from './vitpose-model';
export { YOLOPoseModel, createYOLOPoseModel } from './yolopose-model';

// Model IDs for easy reference
export type ModelId = 
  // MediaPipe variants
  | 'mediapipe-pose-lite'
  | 'mediapipe-pose-full'
  | 'mediapipe-pose-heavy'
  // RTMPose variants
  | 'rtmpose-body'
  | 'rtmpose-wholebody'
  | 'rtmpose-coco'
  // ViTPose variants
  | 'vitpose-small'
  | 'vitpose-base'
  | 'vitpose-large'
  | 'vitpose-huge'
  // YOLOPose variants
  | 'yolopose-nano'
  | 'yolopose-small'
  | 'yolopose-medium'
  | 'yolopose-large'
  | 'yolopose-xlarge';

// Model categories for UI grouping
export interface ModelCategory {
  id: string;
  name: string;
  description: string;
  models: ModelId[];
}

export const MODEL_CATEGORIES: ModelCategory[] = [
  {
    id: 'recommended',
    name: 'Recommended',
    description: 'Best overall models for most use cases',
    models: ['mediapipe-pose-heavy', 'yolopose-medium', 'rtmpose-body'],
  },
  {
    id: 'highest-accuracy',
    name: 'Highest Accuracy',
    description: 'Maximum precision models for critical analysis',
    models: ['mediapipe-pose-heavy', 'vitpose-large', 'vitpose-huge'],
  },
  {
    id: 'speed',
    name: 'Speed-Optimized',
    description: 'Fastest models for real-time applications',
    models: ['yolopose-nano', 'yolopose-small', 'mediapipe-pose-lite'],
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Good balance of speed and accuracy',
    models: ['mediapipe-pose-full', 'yolopose-medium', 'rtmpose-body'],
  },
  {
    id: 'spine-analysis',
    name: 'Spine Analysis',
    description: 'Best models for spine and posture analysis',
    models: ['rtmpose-body', 'mediapipe-pose-heavy', 'vitpose-base'],
  },
  {
    id: 'multi-person',
    name: 'Multi-Person',
    description: 'Native multi-person detection',
    models: ['yolopose-medium', 'yolopose-large', 'yolopose-xlarge'],
  },
  {
    id: 'mediapipe',
    name: 'MediaPipe Family',
    description: 'All MediaPipe Pose Landmarker variants',
    models: ['mediapipe-pose-lite', 'mediapipe-pose-full', 'mediapipe-pose-heavy'],
  },
];

// Use case recommendations
export interface UseCaseRecommendation {
  useCase: string;
  description: string;
  recommendedModels: ModelId[];
  reason: string;
}

export const USE_CASE_RECOMMENDATIONS: UseCaseRecommendation[] = [
  {
    useCase: 'general-fitness',
    description: 'General fitness and exercise tracking',
    recommendedModels: ['mediapipe-pose-full', 'yolopose-medium'],
    reason: 'Good balance of speed and accuracy for real-time feedback',
  },
  {
    useCase: 'clinical-analysis',
    description: 'Clinical and professional pose analysis',
    recommendedModels: ['mediapipe-pose-heavy', 'vitpose-large'],
    reason: 'Highest accuracy for medical-grade assessments',
  },
  {
    useCase: 'spine-analysis',
    description: 'Spine curvature and posture assessment',
    recommendedModels: ['rtmpose-body', 'mediapipe-pose-heavy'],
    reason: 'Superior landmark accuracy for spine measurements',
  },
  {
    useCase: 'physical-therapy',
    description: 'Physical therapy and rehabilitation',
    recommendedModels: ['mediapipe-pose-heavy', 'rtmpose-body'],
    reason: 'Reliable tracking with detailed form analysis',
  },
  {
    useCase: 'group-exercise',
    description: 'Group fitness classes with multiple people',
    recommendedModels: ['yolopose-medium', 'yolopose-large'],
    reason: 'Native multi-person support without additional detection',
  },
  {
    useCase: 'mobile-app',
    description: 'Mobile applications with limited resources',
    recommendedModels: ['yolopose-nano', 'mediapipe-pose-lite'],
    reason: 'Lightweight models optimized for mobile performance',
  },
  {
    useCase: 'research',
    description: 'Research and professional analysis',
    recommendedModels: ['vitpose-huge', 'vitpose-large'],
    reason: 'Maximum accuracy for detailed analysis',
  },
  {
    useCase: 'real-time-feedback',
    description: 'Applications requiring instant visual feedback',
    recommendedModels: ['yolopose-small', 'mediapipe-pose-lite'],
    reason: 'Fastest inference for smooth real-time experience',
  },
];

/**
 * Model Registry
 * Central storage for all available models
 */
class ModelRegistry {
  private models: Map<ModelId, ModelRegistryEntry> = new Map();
  private activeModel: BasePoseModel | null = null;
  private activeModelId: ModelId | null = null;

  constructor() {
    this.registerBuiltinModels();
  }

  /**
   * Register all built-in models
   */
  private registerBuiltinModels(): void {
    // MediaPipe Pose variants (Lite, Full, Heavy)
    (['lite', 'full', 'heavy'] as MediaPipeModelVariant[]).forEach(variant => {
      const options: MediaPipeModelOptions = { variant };
      this.register({
        id: `mediapipe-pose-${variant}` as ModelId,
        factory: (opts) => createMediaPipeModel({ ...options, ...opts }),
        metadata: new MediaPipePoseModel(options).getMetadata(),
      });
    });

    // RTMPose variants
    (['body', 'wholebody', 'coco'] as RTMPoseVariant[]).forEach(variant => {
      const options: RTMPoseOptions = { variant };
      this.register({
        id: `rtmpose-${variant}` as ModelId,
        factory: (opts) => createRTMPoseModel({ ...options, ...opts }),
        metadata: new RTMPoseModel(options).getMetadata(),
      });
    });

    // ViTPose variants
    (['small', 'base', 'large', 'huge'] as ViTPoseSize[]).forEach(size => {
      const options: ViTPoseOptions = { size };
      this.register({
        id: `vitpose-${size}` as ModelId,
        factory: (opts) => createViTPoseModel({ ...options, ...opts }),
        metadata: new ViTPoseModel(options).getMetadata(),
      });
    });

    // YOLOPose variants
    (['nano', 'small', 'medium', 'large', 'xlarge'] as YOLOPoseSize[]).forEach(size => {
      const options: YOLOPoseOptions = { size };
      this.register({
        id: `yolopose-${size}` as ModelId,
        factory: (opts) => createYOLOPoseModel({ ...options, ...opts }),
        metadata: new YOLOPoseModel(options).getMetadata(),
      });
    });
  }

  /**
   * Register a model
   */
  register(entry: ModelRegistryEntry): void {
    this.models.set(entry.id as ModelId, entry);
  }

  /**
   * Get all registered models
   */
  getAll(): ModelRegistryEntry[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models by category
   */
  getByCategory(categoryId: string): ModelRegistryEntry[] {
    const category = MODEL_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return [];
    return category.models
      .map(id => this.models.get(id))
      .filter((m): m is ModelRegistryEntry => m !== undefined);
  }

  /**
   * Get model metadata
   */
  getMetadata(id: ModelId): ModelMetadata | undefined {
    return this.models.get(id)?.metadata;
  }

  /**
   * Get all model metadata
   */
  getAllMetadata(): ModelMetadata[] {
    return this.getAll().map(entry => entry.metadata);
  }

  /**
   * Create a model instance
   */
  create(id: ModelId, options?: ModelInitOptions): BasePoseModel {
    const entry = this.models.get(id);
    if (!entry) {
      throw new Error(`Unknown model: ${id}`);
    }
    return entry.factory(options);
  }

  /**
   * Load and activate a model
   */
  async load(
    id: ModelId,
    options?: ModelInitOptions,
    onProgress?: (progress: ModelLoadingProgress) => void
  ): Promise<BasePoseModel> {
    // Dispose current model if different
    if (this.activeModel && this.activeModelId !== id) {
      this.activeModel.dispose();
      this.activeModel = null;
      this.activeModelId = null;
    }

    // Return existing model if same ID and ready
    if (this.activeModel && this.activeModelId === id && this.activeModel.isReady()) {
      return this.activeModel;
    }

    // Create and initialize new model
    const model = this.create(id, options);
    
    if (onProgress) {
      model.setProgressCallback(onProgress);
    }

    await model.initialize();
    
    this.activeModel = model;
    this.activeModelId = id;
    
    return model;
  }

  /**
   * Get the currently active model
   */
  getActive(): BasePoseModel | null {
    return this.activeModel;
  }

  /**
   * Get the currently active model ID
   */
  getActiveId(): ModelId | null {
    return this.activeModelId;
  }

  /**
   * Check if a specific model is active
   */
  isActive(id: ModelId): boolean {
    return this.activeModelId === id;
  }

  /**
   * Dispose the active model
   */
  disposeActive(): void {
    if (this.activeModel) {
      this.activeModel.dispose();
      this.activeModel = null;
      this.activeModelId = null;
    }
  }

  /**
   * Get recommended model for a use case
   */
  getRecommendedForUseCase(useCase: string): ModelId[] {
    const rec = USE_CASE_RECOMMENDATIONS.find(r => r.useCase === useCase);
    return rec?.recommendedModels || ['mediapipe-pose-heavy'];
  }

  /**
   * Get the highest accuracy model
   */
  getHighestAccuracy(): ModelId {
    return 'mediapipe-pose-heavy';
  }

  /**
   * Get the fastest model
   */
  getFastest(): ModelId {
    return 'yolopose-nano';
  }

  /**
   * Compare models
   */
  compareModels(ids: ModelId[]): {
    comparison: Record<ModelId, ModelMetadata>;
    best: {
      speed: ModelId;
      accuracy: ModelId;
      memory: ModelId;
      spineAnalysis: ModelId;
    };
  } {
    const comparison: Record<string, ModelMetadata> = {};
    
    for (const id of ids) {
      const metadata = this.getMetadata(id);
      if (metadata) {
        comparison[id] = metadata;
      }
    }

    // Determine best in each category
    const speedOrder: Record<string, number> = { fast: 3, medium: 2, slow: 1 };
    const accuracyOrder: Record<string, number> = { high: 3, medium: 2, standard: 1 };
    const memoryOrder: Record<string, number> = { low: 3, medium: 2, high: 1 };

    let bestSpeed: ModelId = ids[0];
    let bestAccuracy: ModelId = ids[0];
    let bestMemory: ModelId = ids[0];
    let bestSpine: ModelId = ids[0];

    for (const id of ids) {
      const meta = comparison[id];
      if (!meta) continue;

      if (speedOrder[meta.performance.speed] > speedOrder[comparison[bestSpeed]?.performance.speed || 'slow']) {
        bestSpeed = id;
      }
      if (accuracyOrder[meta.performance.accuracy] > accuracyOrder[comparison[bestAccuracy]?.performance.accuracy || 'standard']) {
        bestAccuracy = id;
      }
      if (memoryOrder[meta.performance.memoryUsage] > memoryOrder[comparison[bestMemory]?.performance.memoryUsage || 'high']) {
        bestMemory = id;
      }
      if (meta.supportsSpineAnalysis) {
        // Prefer RTMPose or MediaPipe Heavy for spine analysis
        if (id.includes('rtmpose') || id === 'mediapipe-pose-heavy') {
          bestSpine = id;
        }
      }
    }

    return {
      comparison: comparison as Record<ModelId, ModelMetadata>,
      best: {
        speed: bestSpeed,
        accuracy: bestAccuracy,
        memory: bestMemory,
        spineAnalysis: bestSpine,
      },
    };
  }
}

// Singleton instance
export const modelRegistry = new ModelRegistry();

/**
 * Quick model creation functions
 */
export const Models = {
  MediaPipe: {
    Lite: (options?: MediaPipeModelOptions) => createMediaPipeLite(options),
    Full: (options?: MediaPipeModelOptions) => createMediaPipeFull(options),
    Heavy: (options?: MediaPipeModelOptions) => createMediaPipeHeavy(options),
    // Default to heavy for highest accuracy
    Default: (options?: MediaPipeModelOptions) => createMediaPipeHeavy(options),
  },
  RTMPose: {
    Body: (options?: RTMPoseOptions) => createRTMPoseModel({ ...options, variant: 'body' }),
    WholeBody: (options?: RTMPoseOptions) => createRTMPoseModel({ ...options, variant: 'wholebody' }),
    COCO: (options?: RTMPoseOptions) => createRTMPoseModel({ ...options, variant: 'coco' }),
  },
  ViTPose: {
    Small: (options?: ViTPoseOptions) => createViTPoseModel({ ...options, size: 'small' }),
    Base: (options?: ViTPoseOptions) => createViTPoseModel({ ...options, size: 'base' }),
    Large: (options?: ViTPoseOptions) => createViTPoseModel({ ...options, size: 'large' }),
    Huge: (options?: ViTPoseOptions) => createViTPoseModel({ ...options, size: 'huge' }),
  },
  YOLOPose: {
    Nano: (options?: YOLOPoseOptions) => createYOLOPoseModel({ ...options, size: 'nano' }),
    Small: (options?: YOLOPoseOptions) => createYOLOPoseModel({ ...options, size: 'small' }),
    Medium: (options?: YOLOPoseOptions) => createYOLOPoseModel({ ...options, size: 'medium' }),
    Large: (options?: YOLOPoseOptions) => createYOLOPoseModel({ ...options, size: 'large' }),
    XLarge: (options?: YOLOPoseOptions) => createYOLOPoseModel({ ...options, size: 'xlarge' }),
  },
};

/**
 * Default export
 */
export default modelRegistry;
