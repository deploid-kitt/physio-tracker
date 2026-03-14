import { ref, onUnmounted } from 'vue';
import { SquatDetector, type SquatState } from '~/utils/pose/squat-detector';
import { SkeletonRenderer } from '~/utils/pose/skeleton-renderer';
import type { FormScores, FrameData } from '~/types';

// Import MediaPipe dynamically to avoid SSR issues
let Pose: any = null;
let Camera: any = null;

export function usePoseDetection() {
  const isInitialized = ref(false);
  const isProcessing = ref(false);
  const error = ref<string | null>(null);
  const currentState = ref<SquatState>('standing');
  const repCount = ref(0);
  const formScores = ref<FormScores | null>(null);
  const feedback = ref<{ issues: string[]; cues: string[] }>({ issues: [], cues: [] });
  const fps = ref(0);

  let pose: any = null;
  let camera: any = null;
  let sqautDetector: SquatDetector | null = null;
  let skeletonRenderer: SkeletonRenderer | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let canvasElement: HTMLCanvasElement | null = null;
  let lastFrameTime = 0;
  let frameCount = 0;
  let fpsUpdateTime = 0;
  let animationFrameId: number | null = null;
  let onFrameCallback: ((frame: FrameData) => void) | null = null;

  async function initialize(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    exerciseConfig?: any
  ) {
    try {
      error.value = null;
      videoElement = video;
      canvasElement = canvas;

      // Dynamic import of MediaPipe
      if (!Pose) {
        // @ts-ignore
        const poseModule = await import('@mediapipe/pose');
        Pose = poseModule.Pose;
      }
      
      if (!Camera) {
        // @ts-ignore
        const cameraModule = await import('@mediapipe/camera_utils');
        Camera = cameraModule.Camera;
      }

      // Initialize pose detector
      pose = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onResults);

      // Initialize exercise detector
      sqautDetector = new SquatDetector(exerciseConfig);

      // Initialize skeleton renderer
      skeletonRenderer = new SkeletonRenderer(canvas);

      // Initialize camera
      camera = new Camera(video, {
        onFrame: async () => {
          if (pose && isProcessing.value) {
            await pose.send({ image: video });
          }
        },
        width: 640,
        height: 480,
      });

      isInitialized.value = true;
      console.log('Pose detection initialized');
    } catch (err: any) {
      error.value = err.message || 'Failed to initialize pose detection';
      console.error('Pose detection initialization error:', err);
    }
  }

  function onResults(results: any) {
    if (!canvasElement || !skeletonRenderer || !sqautDetector) return;

    const now = performance.now();
    
    // Update FPS counter
    frameCount++;
    if (now - fpsUpdateTime > 1000) {
      fps.value = Math.round(frameCount * 1000 / (now - fpsUpdateTime));
      frameCount = 0;
      fpsUpdateTime = now;
    }

    if (results.poseLandmarks) {
      // Process frame through exercise detector
      const frameData = sqautDetector.processFrame(results.poseLandmarks, now);
      
      // Update reactive state
      currentState.value = sqautDetector.getCurrentStateName();
      repCount.value = sqautDetector.getRepCount();
      formScores.value = frameData.feedback.scores;
      feedback.value = {
        issues: frameData.feedback.issues,
        cues: frameData.feedback.cues,
      };

      // Render skeleton overlay
      skeletonRenderer.render(
        results.poseLandmarks,
        currentState.value,
        formScores.value,
        repCount.value,
        feedback.value
      );

      // Call frame callback if set
      if (onFrameCallback) {
        onFrameCallback(frameData);
      }
    } else {
      // Clear canvas if no landmarks detected
      skeletonRenderer.clear();
    }

    lastFrameTime = now;
  }

  async function start() {
    if (!camera || !isInitialized.value) {
      error.value = 'Pose detection not initialized';
      return;
    }

    try {
      isProcessing.value = true;
      await camera.start();
      fpsUpdateTime = performance.now();
      frameCount = 0;
    } catch (err: any) {
      error.value = err.message || 'Failed to start camera';
      isProcessing.value = false;
    }
  }

  function stop() {
    if (camera) {
      camera.stop();
    }
    isProcessing.value = false;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function reset() {
    if (sqautDetector) {
      sqautDetector.reset();
    }
    repCount.value = 0;
    currentState.value = 'standing';
    formScores.value = null;
    feedback.value = { issues: [], cues: [] };
  }

  function setOnFrameCallback(callback: (frame: FrameData) => void) {
    onFrameCallback = callback;
  }

  function getAverageFormScore(): FormScores | null {
    return sqautDetector?.getAverageFormScore() || null;
  }

  function updateCanvasSize(width: number, height: number) {
    if (canvasElement) {
      canvasElement.width = width;
      canvasElement.height = height;
    }
    if (skeletonRenderer) {
      skeletonRenderer.resize(width, height);
    }
  }

  onUnmounted(() => {
    stop();
    pose = null;
    camera = null;
  });

  return {
    // State
    isInitialized,
    isProcessing,
    error,
    currentState,
    repCount,
    formScores,
    feedback,
    fps,

    // Methods
    initialize,
    start,
    stop,
    reset,
    setOnFrameCallback,
    getAverageFormScore,
    updateCanvasSize,
  };
}
