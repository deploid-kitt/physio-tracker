/**
 * Base Pose Estimation Model Interface
 * All pose estimation models must implement this interface for consistent usage
 */

import type { Keypoint, JointAngles, FormScores } from '~/types';

// Normalized landmark point compatible with all models
export interface NormalizedLandmark {
  x: number;       // Normalized x coordinate (0-1)
  y: number;       // Normalized y coordinate (0-1)
  z?: number;      // Depth coordinate (optional)
  visibility?: number; // Confidence score (0-1)
  name?: string;   // Optional landmark name
}

// Pose estimation result from any model
export interface PoseEstimationResult {
  landmarks: NormalizedLandmark[];
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  timestamp: number;
}

// Spine-specific analysis result (for RTMPose and capable models)
export interface SpineAnalysisResult {
  curvature: {
    cervical: number;    // Neck curvature angle
    thoracic: number;    // Upper back (kyphosis)
    lumbar: number;      // Lower back (lordosis)
    overall: number;     // Overall spinal alignment score
  };
  deviation: {
    lateral: number;     // Side-to-side deviation
    anteriorPosterior: number; // Front-back deviation
  };
  riskFactors: string[];
  recommendations: string[];
}

// Model metadata for UI display
export interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: ModelCapability[];
  performance: {
    speed: 'fast' | 'medium' | 'slow';
    accuracy: 'high' | 'medium' | 'standard';
    memoryUsage: 'low' | 'medium' | 'high';
  };
  useCases: string[];
  landmarkCount: number;
  supportsSpineAnalysis: boolean;
  modelSize: string; // e.g., "12MB"
  inputSize: { width: number; height: number };
}

export type ModelCapability = 
  | 'full-body'
  | 'upper-body'
  | 'face'
  | 'hands'
  | 'spine-curvature'
  | 'real-time'
  | '3d-pose'
  | 'multi-person'
  | 'occlusion-handling';

// Model initialization options
export interface ModelInitOptions {
  modelPath?: string;
  useWebGPU?: boolean;
  numThreads?: number;
  smoothLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  enableSegmentation?: boolean;
  delegateDevice?: 'cpu' | 'gpu' | 'auto';
  cacheModels?: boolean;
}

// Model loading status
export type ModelLoadingStatus = 
  | 'idle'
  | 'downloading'
  | 'loading'
  | 'initializing'
  | 'ready'
  | 'error';

export interface ModelLoadingProgress {
  status: ModelLoadingStatus;
  progress: number; // 0-100
  message: string;
  error?: Error;
}

/**
 * Abstract base class for all pose estimation models
 */
export abstract class BasePoseModel {
  protected isInitialized: boolean = false;
  protected options: ModelInitOptions;
  protected onProgressCallback?: (progress: ModelLoadingProgress) => void;

  constructor(options: ModelInitOptions = {}) {
    this.options = {
      useWebGPU: true,
      numThreads: 4,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      enableSegmentation: false,
      delegateDevice: 'auto',
      cacheModels: true,
      ...options,
    };
  }

  /**
   * Get model metadata for UI display
   */
  abstract getMetadata(): ModelMetadata;

  /**
   * Initialize the model (load weights, create session)
   */
  abstract initialize(): Promise<void>;

  /**
   * Run pose estimation on an image/video frame
   */
  abstract estimate(input: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<PoseEstimationResult | null>;

  /**
   * Analyze spine curvature (if supported)
   */
  analyzeSpine(landmarks: NormalizedLandmark[]): SpineAnalysisResult | null {
    // Default implementation returns null - override in models that support it
    return null;
  }

  /**
   * Clean up resources
   */
  abstract dispose(): void;

  /**
   * Check if model is ready for inference
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Set progress callback for loading status
   */
  setProgressCallback(callback: (progress: ModelLoadingProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Report loading progress
   */
  protected reportProgress(progress: ModelLoadingProgress): void {
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }

  /**
   * Convert model-specific landmarks to normalized format
   */
  protected abstract normalizeLandmarks(rawLandmarks: any): NormalizedLandmark[];

  /**
   * Get standard landmark indices (MediaPipe-compatible mapping)
   */
  static get LANDMARK_INDICES() {
    return {
      NOSE: 0,
      LEFT_EYE_INNER: 1,
      LEFT_EYE: 2,
      LEFT_EYE_OUTER: 3,
      RIGHT_EYE_INNER: 4,
      RIGHT_EYE: 5,
      RIGHT_EYE_OUTER: 6,
      LEFT_EAR: 7,
      RIGHT_EAR: 8,
      MOUTH_LEFT: 9,
      MOUTH_RIGHT: 10,
      LEFT_SHOULDER: 11,
      RIGHT_SHOULDER: 12,
      LEFT_ELBOW: 13,
      RIGHT_ELBOW: 14,
      LEFT_WRIST: 15,
      RIGHT_WRIST: 16,
      LEFT_PINKY: 17,
      RIGHT_PINKY: 18,
      LEFT_INDEX: 19,
      RIGHT_INDEX: 20,
      LEFT_THUMB: 21,
      RIGHT_THUMB: 22,
      LEFT_HIP: 23,
      RIGHT_HIP: 24,
      LEFT_KNEE: 25,
      RIGHT_KNEE: 26,
      LEFT_ANKLE: 27,
      RIGHT_ANKLE: 28,
      LEFT_HEEL: 29,
      RIGHT_HEEL: 30,
      LEFT_FOOT_INDEX: 31,
      RIGHT_FOOT_INDEX: 32,
    };
  }

  /**
   * Extended spine landmark indices (for RTMPose and similar)
   */
  static get SPINE_LANDMARK_INDICES() {
    return {
      C7_VERTEBRA: 100,        // Base of neck
      T1_VERTEBRA: 101,        // First thoracic
      T6_VERTEBRA: 102,        // Mid thoracic
      T12_VERTEBRA: 103,       // Last thoracic
      L1_VERTEBRA: 104,        // First lumbar
      L5_VERTEBRA: 105,        // Last lumbar
      SACRUM: 106,             // Sacrum center
      SPINE_MID_CERVICAL: 107, // Mid cervical spine
      SPINE_MID_LUMBAR: 108,   // Mid lumbar spine
    };
  }
}

/**
 * Model factory type for dynamic model creation
 */
export type ModelFactory = (options?: ModelInitOptions) => BasePoseModel;

/**
 * Model registry entry
 */
export interface ModelRegistryEntry {
  id: string;
  factory: ModelFactory;
  metadata: ModelMetadata;
}
