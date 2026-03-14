/**
 * MediaPipe Pose Landmarker Model Adapter (Latest Tasks API)
 * 
 * This implementation uses the modern @mediapipe/tasks-vision API
 * with support for all model variants (lite, full, heavy).
 * 
 * Model Variants:
 * - Lite: Fastest, ~3MB, good for mobile/low-end devices
 * - Full: Balanced, ~6MB, good accuracy with decent speed
 * - Heavy: Highest accuracy, ~26MB, best for precision analysis
 * 
 * Key Features:
 * - 33 full-body landmarks with 3D coordinates
 * - World landmarks in meters (real-world scale)
 * - High-quality pose segmentation (optional)
 * - Smooth landmark filtering built-in
 * 
 * Strengths:
 * - Well-tested and production-ready
 * - Excellent browser compatibility
 * - Good real-time performance
 * - Built-in temporal smoothing
 * 
 * Use cases:
 * - General pose estimation
 * - Exercise tracking
 * - Real-time feedback
 * - Physical therapy
 */

import {
  BasePoseModel,
  type ModelMetadata,
  type ModelInitOptions,
  type PoseEstimationResult,
  type NormalizedLandmark,
  type SpineAnalysisResult,
  type ModelLoadingProgress,
  type ModelCapability,
} from './base-model';
import { analyzeSpineCurvature } from './spine-analysis';

// Model variant types
export type MediaPipeModelVariant = 'lite' | 'full' | 'heavy';

// Model URLs for each variant
const MODEL_URLS: Record<MediaPipeModelVariant, string> = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  heavy: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
};

// Model sizes
const MODEL_SIZES: Record<MediaPipeModelVariant, string> = {
  lite: '~3MB',
  full: '~6MB',
  heavy: '~26MB',
};

// WASM files location
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

// Landmark names for MediaPipe Pose Landmarker (33 landmarks)
const MEDIAPIPE_LANDMARK_NAMES = [
  'nose',
  'left_eye_inner',
  'left_eye',
  'left_eye_outer',
  'right_eye_inner',
  'right_eye',
  'right_eye_outer',
  'left_ear',
  'right_ear',
  'mouth_left',
  'mouth_right',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_pinky',
  'right_pinky',
  'left_index',
  'right_index',
  'left_thumb',
  'right_thumb',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_heel',
  'right_heel',
  'left_foot_index',
  'right_foot_index',
];

export interface MediaPipeModelOptions extends ModelInitOptions {
  variant?: MediaPipeModelVariant;
  numPoses?: number;
  outputSegmentationMasks?: boolean;
  runningMode?: 'IMAGE' | 'VIDEO';
}

export class MediaPipePoseModel extends BasePoseModel {
  private poseLandmarker: any = null;
  private variant: MediaPipeModelVariant;
  private numPoses: number;
  private outputSegmentationMasks: boolean;
  private runningMode: 'IMAGE' | 'VIDEO';
  private lastTimestamp: number = 0;
  private lastResults: any = null;

  constructor(options: MediaPipeModelOptions = {}) {
    super({
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      ...options,
    });
    
    // Default to 'heavy' for highest accuracy
    this.variant = options.variant ?? 'heavy';
    this.numPoses = options.numPoses ?? 1;
    this.outputSegmentationMasks = options.outputSegmentationMasks ?? false;
    this.runningMode = options.runningMode ?? 'VIDEO';
  }

  getMetadata(): ModelMetadata {
    const variantDescriptions: Record<MediaPipeModelVariant, string> = {
      lite: 'Lightweight model optimized for speed. Best for mobile devices and real-time applications where speed is critical.',
      full: 'Balanced model offering good accuracy with reasonable performance. Suitable for most applications.',
      heavy: 'Highest accuracy model for precision analysis. Recommended for physical therapy, detailed form analysis, and research.',
    };

    const speedMap: Record<MediaPipeModelVariant, 'fast' | 'medium' | 'slow'> = {
      lite: 'fast',
      full: 'fast',
      heavy: 'medium',
    };

    const accuracyMap: Record<MediaPipeModelVariant, 'high' | 'medium' | 'standard'> = {
      lite: 'standard',
      full: 'medium',
      heavy: 'high',
    };

    const capabilities: ModelCapability[] = [
      'full-body',
      'real-time',
      '3d-pose',
    ];
    
    if (this.outputSegmentationMasks) {
      // Segmentation is a capability when enabled
    }

    return {
      id: `mediapipe-pose-${this.variant}`,
      name: `MediaPipe Pose (${this.variant})`,
      version: '0.10.14',
      description: `Google's MediaPipe Pose Landmarker using the ${this.variant} model. ${variantDescriptions[this.variant]} Provides 33 3D body landmarks with world coordinates in meters.`,
      capabilities,
      performance: {
        speed: speedMap[this.variant],
        accuracy: accuracyMap[this.variant],
        memoryUsage: this.variant === 'heavy' ? 'medium' : 'low',
      },
      useCases: [
        'Real-time exercise tracking',
        'Form analysis during workouts',
        'Physical therapy exercises',
        'Fitness applications',
        'Motion capture basics',
        ...(this.variant === 'heavy' ? [
          'Detailed posture analysis',
          'Clinical assessments',
          'Research applications',
        ] : []),
      ],
      landmarkCount: 33,
      supportsSpineAnalysis: true,
      modelSize: MODEL_SIZES[this.variant],
      inputSize: { width: 640, height: 480 },
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.reportProgress({
        status: 'downloading',
        progress: 5,
        message: 'Loading MediaPipe Tasks Vision module...',
      });

      // Dynamic import to avoid SSR issues
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');

      this.reportProgress({
        status: 'loading',
        progress: 20,
        message: 'Initializing WASM runtime...',
      });

      // Initialize the vision tasks
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

      this.reportProgress({
        status: 'loading',
        progress: 40,
        message: `Downloading ${this.variant} model (${MODEL_SIZES[this.variant]})...`,
      });

      // Create pose landmarker with heavy model for highest accuracy
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URLS[this.variant],
          delegate: this.options.delegateDevice === 'gpu' ? 'GPU' : 'CPU',
        },
        runningMode: this.runningMode,
        numPoses: this.numPoses,
        minPoseDetectionConfidence: this.options.minDetectionConfidence,
        minPosePresenceConfidence: this.options.minTrackingConfidence,
        minTrackingConfidence: this.options.minTrackingConfidence,
        outputSegmentationMasks: this.outputSegmentationMasks,
      });

      this.reportProgress({
        status: 'initializing',
        progress: 85,
        message: 'Warming up model...',
      });

      // Warmup with a blank frame
      await this.warmup();

      this.isInitialized = true;
      this.reportProgress({
        status: 'ready',
        progress: 100,
        message: `MediaPipe Pose (${this.variant}) ready`,
      });
    } catch (error: any) {
      this.reportProgress({
        status: 'error',
        progress: 0,
        message: `Failed to initialize: ${error.message}`,
        error,
      });
      throw error;
    }
  }

  /**
   * Warmup the model
   */
  private async warmup(): Promise<void> {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 64, 64);
      try {
        if (this.runningMode === 'VIDEO') {
          this.poseLandmarker.detectForVideo(canvas, performance.now());
        } else {
          this.poseLandmarker.detect(canvas);
        }
      } catch (e) {
        // Warmup may fail on blank frame, that's okay
      }
    }
  }

  async estimate(
    input: HTMLVideoElement | HTMLCanvasElement | ImageBitmap
  ): Promise<PoseEstimationResult | null> {
    if (!this.isInitialized || !this.poseLandmarker) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const timestamp = performance.now();

    try {
      let results: any;
      
      if (this.runningMode === 'VIDEO') {
        // Ensure timestamp is always increasing
        const adjustedTimestamp = Math.max(timestamp, this.lastTimestamp + 1);
        this.lastTimestamp = adjustedTimestamp;
        results = this.poseLandmarker.detectForVideo(input, adjustedTimestamp);
      } else {
        results = this.poseLandmarker.detect(input);
      }

      this.lastResults = results;

      // Check if we have any poses
      if (!results.landmarks || results.landmarks.length === 0) {
        return null;
      }

      // Use the first (primary) pose
      const primaryPose = results.landmarks[0];
      const worldLandmarks = results.worldLandmarks?.[0];
      
      // Normalize landmarks
      const landmarks = this.normalizeLandmarks(primaryPose, worldLandmarks);

      // Calculate overall confidence from visibility scores
      const visibilities = landmarks.map(l => l.visibility || 0);
      const confidence = visibilities.reduce((a, b) => a + b, 0) / visibilities.length;

      return {
        landmarks,
        confidence,
        timestamp,
      };
    } catch (error: any) {
      console.error('MediaPipe estimation error:', error);
      return null;
    }
  }

  /**
   * Get all detected poses (multi-pose mode)
   */
  getAllPoses(): PoseEstimationResult[] {
    if (!this.lastResults?.landmarks) return [];

    return this.lastResults.landmarks.map((landmarks: any, idx: number) => {
      const worldLandmarks = this.lastResults.worldLandmarks?.[idx];
      const normalizedLandmarks = this.normalizeLandmarks(landmarks, worldLandmarks);
      const visibilities = normalizedLandmarks.map((l: NormalizedLandmark) => l.visibility || 0);
      const confidence = visibilities.reduce((a: number, b: number) => a + b, 0) / visibilities.length;

      return {
        landmarks: normalizedLandmarks,
        confidence,
        timestamp: performance.now(),
      };
    });
  }

  /**
   * Get world landmarks (in meters)
   */
  getWorldLandmarks(): NormalizedLandmark[] | null {
    if (!this.lastResults?.worldLandmarks?.[0]) return null;
    
    return this.lastResults.worldLandmarks[0].map((lm: any, idx: number) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility,
      name: MEDIAPIPE_LANDMARK_NAMES[idx],
    }));
  }

  /**
   * Get segmentation mask (if enabled)
   */
  getSegmentationMask(): ImageData | null {
    if (!this.outputSegmentationMasks || !this.lastResults?.segmentationMasks?.[0]) {
      return null;
    }
    return this.lastResults.segmentationMasks[0];
  }

  analyzeSpine(landmarks: NormalizedLandmark[]): SpineAnalysisResult | null {
    // MediaPipe doesn't have dedicated spine keypoints, but we can estimate
    // from body landmarks with good accuracy using the heavy model
    return analyzeSpineCurvature(landmarks, false);
  }

  dispose(): void {
    if (this.poseLandmarker) {
      this.poseLandmarker.close?.();
      this.poseLandmarker = null;
    }
    this.isInitialized = false;
    this.lastResults = null;
    this.lastTimestamp = 0;
  }

  protected normalizeLandmarks(
    landmarks: any[],
    worldLandmarks?: any[]
  ): NormalizedLandmark[] {
    return landmarks.map((lm, index) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z ?? worldLandmarks?.[index]?.z ?? 0,
      visibility: lm.visibility ?? 1,
      name: MEDIAPIPE_LANDMARK_NAMES[index],
    }));
  }

  /**
   * Switch running mode between IMAGE and VIDEO
   */
  async setRunningMode(mode: 'IMAGE' | 'VIDEO'): Promise<void> {
    if (this.runningMode === mode) return;
    
    this.runningMode = mode;
    
    if (this.poseLandmarker) {
      await this.poseLandmarker.setOptions({ runningMode: mode });
    }
  }

  /**
   * Update model options at runtime
   */
  async updateOptions(options: {
    minPoseDetectionConfidence?: number;
    minPosePresenceConfidence?: number;
    minTrackingConfidence?: number;
    numPoses?: number;
  }): Promise<void> {
    if (!this.poseLandmarker) return;
    
    await this.poseLandmarker.setOptions(options);
    
    if (options.numPoses) {
      this.numPoses = options.numPoses;
    }
  }

  /**
   * Get current model variant
   */
  getVariant(): MediaPipeModelVariant {
    return this.variant;
  }

  /**
   * Check if using heavy (highest accuracy) model
   */
  isHighAccuracyMode(): boolean {
    return this.variant === 'heavy';
  }
}

/**
 * Factory functions for creating MediaPipe models
 */
export function createMediaPipeModel(options?: MediaPipeModelOptions): MediaPipePoseModel {
  return new MediaPipePoseModel({ 
    runningMode: 'VIDEO',
    ...options 
  });
}

// Convenience factories for each variant
export function createMediaPipeLite(options?: Omit<MediaPipeModelOptions, 'variant'>): MediaPipePoseModel {
  return new MediaPipePoseModel({ 
    runningMode: 'VIDEO',
    ...options, 
    variant: 'lite' 
  });
}

export function createMediaPipeFull(options?: Omit<MediaPipeModelOptions, 'variant'>): MediaPipePoseModel {
  return new MediaPipePoseModel({ 
    runningMode: 'VIDEO',
    ...options, 
    variant: 'full' 
  });
}

export function createMediaPipeHeavy(options?: Omit<MediaPipeModelOptions, 'variant'>): MediaPipePoseModel {
  return new MediaPipePoseModel({ 
    runningMode: 'VIDEO',
    ...options, 
    variant: 'heavy' 
  });
}
