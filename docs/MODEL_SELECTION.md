# Pose Estimation Model Selection Guide

PhysioTracker supports multiple state-of-the-art pose estimation models, each optimized for different use cases. This guide helps you choose the right model for your needs.

## Available Models

### 1. MediaPipe Pose Landmarker

Google's production-ready pose estimation solution. Now upgraded to use the latest Tasks Vision API with three accuracy levels.

| Variant | Size | Speed | Accuracy | Best For |
|---------|------|-------|----------|----------|
| **Lite** | ~3MB | ⚡ Fast | ⭐⭐ Standard | Mobile apps, real-time |
| **Full** | ~6MB | ⚡ Fast | ⭐⭐⭐ Medium | General fitness |
| **Heavy** | ~26MB | 🔄 Medium | ⭐⭐⭐⭐ High | Clinical analysis |

**Key Features:**
- 33 full-body landmarks with 3D coordinates
- World landmarks in meters (real-world scale)
- Built-in temporal smoothing
- Optional segmentation masks

**Recommended For:**
- Physical therapy sessions
- Exercise tracking
- Posture analysis
- Applications requiring reliable, consistent tracking

```typescript
import { Models } from '~/utils/pose/models';

// Use Heavy model for highest accuracy (default)
const model = Models.MediaPipe.Heavy();

// Or explicitly choose variant
const model = Models.MediaPipe.Lite(); // Fastest
const model = Models.MediaPipe.Full(); // Balanced
```

---

### 2. RTMPose

OpenMMLab's high-performance pose estimation model, particularly excellent for spine and posture analysis.

| Variant | Keypoints | Size | Speed | Best For |
|---------|-----------|------|-------|----------|
| **Body** | 17 | ~12MB | 🔄 Medium | Spine analysis |
| **WholeBody** | 133 | ~15MB | 🔄 Medium | Hand/face included |
| **COCO** | 17 | ~12MB | 🔄 Medium | Standard COCO format |

**Key Features:**
- Excellent spine curvature analysis
- Superior occlusion handling
- High accuracy for body angles
- SimCC-based keypoint localization

**Recommended For:**
- Detailed posture assessments
- Spine curvature measurement (scoliosis screening)
- Physical therapy evaluations
- Professional fitness coaching

```typescript
import { Models } from '~/utils/pose/models';

const model = Models.RTMPose.Body(); // Best for spine
const model = Models.RTMPose.WholeBody(); // Includes hands/face
```

---

### 3. ViTPose

Vision Transformer-based model achieving state-of-the-art accuracy on pose estimation benchmarks.

| Variant | Size | Speed | Accuracy | Memory |
|---------|------|-------|----------|--------|
| **Small** | ~25MB | 🔄 Medium | ⭐⭐⭐ | Medium |
| **Base** | ~90MB | 🔄 Medium | ⭐⭐⭐⭐ | Medium |
| **Large** | ~310MB | 🐢 Slow | ⭐⭐⭐⭐⭐ | High |
| **Huge** | ~640MB | 🐢 Slow | ⭐⭐⭐⭐⭐ | High |

**Key Features:**
- Transformer architecture for superior accuracy
- Excellent generalization across scenarios
- Sub-pixel keypoint refinement
- Optional flip-test for better accuracy

**Recommended For:**
- Research applications
- Professional sports analysis
- Medical/clinical assessments
- Motion capture reference
- When accuracy is more important than speed

```typescript
import { Models } from '~/utils/pose/models';

const model = Models.ViTPose.Large(); // High accuracy
const model = Models.ViTPose.Huge();  // Maximum accuracy
```

---

### 4. YOLOPose (YOLOv8)

Ultralytics YOLO-based pose estimation with exceptional real-time performance and native multi-person support.

| Variant | Size | Expected FPS | Multi-Person | Best For |
|---------|------|--------------|--------------|----------|
| **Nano** | ~6MB | ~100 FPS | ✅ | Mobile, edge devices |
| **Small** | ~12MB | ~70 FPS | ✅ | Real-time apps |
| **Medium** | ~26MB | ~45 FPS | ✅ | Balanced general use |
| **Large** | ~44MB | ~30 FPS | ✅ | Better accuracy |
| **XLarge** | ~70MB | ~20 FPS | ✅ | Maximum accuracy |

**Key Features:**
- Single-stage detection (no separate person detector needed)
- Native multi-person tracking
- Fastest inference among quality models
- Works well on lower-end hardware

**Recommended For:**
- Group fitness classes
- Interactive fitness games
- Live streaming overlays
- Mobile applications
- Real-time feedback systems

```typescript
import { Models } from '~/utils/pose/models';

const model = Models.YOLOPose.Nano();  // Fastest
const model = Models.YOLOPose.Medium(); // Balanced
const model = Models.YOLOPose.Large();  // Higher accuracy
```

---

## Model Selection by Use Case

### Physical Therapy & Clinical Analysis
**Recommended:** `mediapipe-pose-heavy` or `rtmpose-body`

These models provide the highest accuracy for precise angle measurements and form analysis critical for therapeutic exercises.

```typescript
import { modelRegistry } from '~/utils/pose/models';

const recommendations = modelRegistry.getRecommendedForUseCase('physical-therapy');
// Returns: ['mediapipe-pose-heavy', 'rtmpose-body']
```

### Spine Curvature Analysis
**Recommended:** `rtmpose-body` or `mediapipe-pose-heavy`

RTMPose excels at spine analysis due to its superior handling of torso keypoints.

```typescript
const { analyzeSpineCurvature } = await import('~/utils/pose/models/spine-analysis');

// Get spine curvature metrics
const result = analyzeSpineCurvature(landmarks, false);
console.log(result.curvature.cervical);  // Neck curve
console.log(result.curvature.thoracic);  // Upper back
console.log(result.curvature.lumbar);    // Lower back
console.log(result.riskFactors);         // Identified issues
console.log(result.recommendations);     // Exercise suggestions
```

### Group Exercise Classes
**Recommended:** `yolopose-medium` or `yolopose-large`

YOLOPose handles multiple people natively without needing separate person detection.

### Mobile Applications
**Recommended:** `yolopose-nano` or `mediapipe-pose-lite`

These lightweight models work well on mobile browsers and lower-powered devices.

### Real-Time Feedback
**Recommended:** `yolopose-small` or `mediapipe-pose-lite`

When instant visual feedback matters more than perfect accuracy.

---

## Using the Model Selection System

### Basic Usage

```typescript
import { usePoseDetection } from '~/composables/usePoseDetection';
import { useModelSelection } from '~/composables/useModelSelection';

// In your component
const { 
  initialize, 
  start, 
  switchModel,
  currentModelId,
  supportsSpineAnalysis 
} = usePoseDetection();

// Initialize with default (heavy) model
await initialize(videoRef.value, canvasRef.value);

// Switch to a different model at runtime
await switchModel('rtmpose-body');
```

### Model Selection UI

```vue
<template>
  <ModelSelector
    :show="showSelector"
    :initial-model="currentModelId"
    @select="handleModelSelect"
    @close="showSelector = false"
  />
</template>

<script setup>
import { ref } from 'vue';
import ModelSelector from '~/components/ModelSelector.vue';
import { usePoseDetection } from '~/composables/usePoseDetection';

const showSelector = ref(false);
const { currentModelId, switchModel } = usePoseDetection();

async function handleModelSelect(modelId) {
  await switchModel(modelId);
}
</script>
```

### Comparing Models

```typescript
import { modelRegistry } from '~/utils/pose/models';

const comparison = modelRegistry.compareModels([
  'mediapipe-pose-heavy',
  'rtmpose-body',
  'yolopose-medium'
]);

console.log(comparison.best.speed);    // 'yolopose-medium'
console.log(comparison.best.accuracy); // 'mediapipe-pose-heavy'
console.log(comparison.best.memory);   // 'yolopose-medium'
```

---

## Spine Curvature Analysis

The spine analysis module provides detailed spinal assessments using pose landmarks.

### Measurements

| Metric | Normal Range | Description |
|--------|--------------|-------------|
| **Cervical Lordosis** | 20-40° | Neck curve |
| **Thoracic Kyphosis** | 20-45° | Upper back curve |
| **Lumbar Lordosis** | 40-60° | Lower back curve |
| **Lateral Deviation** | < 2% | Side-to-side alignment |

### Risk Detection

The system identifies common postural issues:
- Forward head posture
- Hyperkyphosis (excessive upper back curve)
- Hyperlordosis (excessive lower back curve)
- Reduced cervical lordosis (military neck)
- Scoliosis indicators (lateral deviation)

### Example Output

```typescript
const spineResult = model.analyzeSpine(landmarks);

// spineResult:
{
  curvature: {
    cervical: 28.5,    // degrees
    thoracic: 38.2,    // degrees
    lumbar: 52.1,      // degrees
    overall: 82        // score 0-100
  },
  deviation: {
    lateral: 0.015,    // normalized
    anteriorPosterior: 0.08
  },
  riskFactors: [
    'Mild forward head posture detected'
  ],
  recommendations: [
    'Chin tucks and neck retraction exercises',
    'Limit prolonged screen time'
  ]
}
```

---

## Performance Optimization

### WebGPU Acceleration

ViTPose and RTMPose benefit significantly from WebGPU:

```typescript
const model = Models.ViTPose.Large({
  useWebGPU: true,  // Enable WebGPU (default)
});
```

### Multi-Threading

```typescript
const model = Models.RTMPose.Body({
  numThreads: 4,  // Use 4 threads for WASM
});
```

### Model Caching

Models are cached in IndexedDB by default to speed up subsequent loads.

---

## Adding Custom Models

You can register additional ONNX models:

```typescript
import { modelRegistry, BasePoseModel } from '~/utils/pose/models';

class MyCustomModel extends BasePoseModel {
  // Implement required methods
  getMetadata() { /* ... */ }
  async initialize() { /* ... */ }
  async estimate(input) { /* ... */ }
  dispose() { /* ... */ }
  protected normalizeLandmarks(raw) { /* ... */ }
}

modelRegistry.register({
  id: 'my-custom-model',
  factory: (options) => new MyCustomModel(options),
  metadata: new MyCustomModel().getMetadata(),
});
```

---

## Best Practices

1. **Start with MediaPipe Heavy** - It's the most reliable for general use
2. **Use RTMPose for spine analysis** - Best accuracy for posture assessment
3. **Use YOLOPose for groups** - Native multi-person support
4. **Test on target devices** - Performance varies by hardware
5. **Persist user preference** - Use `useModelSelection` with `persistPreference: true`
6. **Handle loading states** - Show progress during model downloads

---

## Troubleshooting

### Model fails to load
- Check network connectivity
- Verify CORS settings if hosting models locally
- Try a smaller model variant

### Poor performance
- Switch to a lighter model (Lite/Nano variants)
- Enable WebGPU if available
- Reduce input resolution

### Inaccurate landmarks
- Ensure good lighting
- Check camera angle (side view for squats)
- Try the Heavy/Large model variants
- Verify subject is fully visible

---

## API Reference

See the TypeScript definitions in:
- `utils/pose/models/base-model.ts` - Core interfaces
- `utils/pose/models/index.ts` - Model registry
- `composables/usePoseDetection.ts` - Vue composable
- `composables/useModelSelection.ts` - Model selection state
