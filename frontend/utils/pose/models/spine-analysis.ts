/**
 * Spine Curvature Analysis Module
 * 
 * Provides detailed spinal analysis including:
 * - Cervical, thoracic, and lumbar curvature measurement
 * - Lateral deviation detection
 * - Posture assessment and recommendations
 * 
 * Designed for use with RTMPose and models with spine keypoints,
 * but can estimate from standard body landmarks as well.
 */

import type { NormalizedLandmark, SpineAnalysisResult } from './base-model';
import { BasePoseModel } from './base-model';

// Reference angles for normal spinal curvature (in degrees)
export const NORMAL_SPINE_ANGLES = {
  // Cervical lordosis (20-40° is normal)
  cervical: { min: 20, optimal: 30, max: 40 },
  // Thoracic kyphosis (20-45° is normal)
  thoracic: { min: 20, optimal: 35, max: 45 },
  // Lumbar lordosis (40-60° is normal)
  lumbar: { min: 40, optimal: 50, max: 60 },
};

// Lateral deviation thresholds
export const DEVIATION_THRESHOLDS = {
  // Lateral deviation (mm equivalent in normalized coords)
  lateralNormal: 0.02,
  lateralWarning: 0.04,
  lateralSevere: 0.06,
  // Anterior/Posterior shift
  apNormal: 0.03,
  apWarning: 0.05,
};

export interface SpineKeypoints {
  // Core spine points
  c7?: NormalizedLandmark;  // C7 vertebra (base of neck)
  t1?: NormalizedLandmark;  // T1 (first thoracic)
  t6?: NormalizedLandmark;  // T6 (mid thoracic)
  t12?: NormalizedLandmark; // T12 (last thoracic)
  l1?: NormalizedLandmark;  // L1 (first lumbar)
  l5?: NormalizedLandmark;  // L5 (last lumbar)
  sacrum?: NormalizedLandmark;
  
  // Body landmarks for estimation when spine points unavailable
  leftShoulder?: NormalizedLandmark;
  rightShoulder?: NormalizedLandmark;
  leftHip?: NormalizedLandmark;
  rightHip?: NormalizedLandmark;
  nose?: NormalizedLandmark;
  leftEar?: NormalizedLandmark;
  rightEar?: NormalizedLandmark;
}

/**
 * Calculate angle between three points
 */
function calculateAngle3D(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
  p3: NormalizedLandmark
): number {
  const v1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
    z: (p1.z || 0) - (p2.z || 0),
  };
  const v2 = {
    x: p3.x - p2.x,
    y: p3.y - p2.y,
    z: (p3.z || 0) - (p2.z || 0),
  };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

  if (mag1 === 0 || mag2 === 0) return 180;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Calculate midpoint between two landmarks
 */
function midpoint(p1: NormalizedLandmark, p2: NormalizedLandmark): NormalizedLandmark {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    z: ((p1.z || 0) + (p2.z || 0)) / 2,
    visibility: Math.min(p1.visibility || 1, p2.visibility || 1),
  };
}

/**
 * Estimate spine keypoints from body landmarks when dedicated spine points unavailable
 */
export function estimateSpineFromBodyLandmarks(
  landmarks: NormalizedLandmark[]
): SpineKeypoints {
  const LM = BasePoseModel.LANDMARK_INDICES;
  
  const leftShoulder = landmarks[LM.LEFT_SHOULDER];
  const rightShoulder = landmarks[LM.RIGHT_SHOULDER];
  const leftHip = landmarks[LM.LEFT_HIP];
  const rightHip = landmarks[LM.RIGHT_HIP];
  const nose = landmarks[LM.NOSE];
  const leftEar = landmarks[LM.LEFT_EAR];
  const rightEar = landmarks[LM.RIGHT_EAR];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return {};
  }

  // Estimate spine points from body landmarks
  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);

  // Estimate C7 (slightly below shoulder midpoint, towards back)
  const c7: NormalizedLandmark = {
    x: shoulderMid.x,
    y: shoulderMid.y + 0.02, // Slightly below shoulders
    z: (shoulderMid.z || 0) - 0.05, // Slightly behind
    visibility: shoulderMid.visibility,
  };

  // Estimate thoracic midpoint
  const t6: NormalizedLandmark = {
    x: (shoulderMid.x + hipMid.x) / 2,
    y: shoulderMid.y + (hipMid.y - shoulderMid.y) * 0.4,
    z: ((shoulderMid.z || 0) + (hipMid.z || 0)) / 2,
    visibility: Math.min(shoulderMid.visibility || 1, hipMid.visibility || 1),
  };

  // Estimate T12 (where thoracic meets lumbar)
  const t12: NormalizedLandmark = {
    x: (shoulderMid.x + hipMid.x) / 2,
    y: shoulderMid.y + (hipMid.y - shoulderMid.y) * 0.65,
    z: ((shoulderMid.z || 0) + (hipMid.z || 0)) / 2,
    visibility: Math.min(shoulderMid.visibility || 1, hipMid.visibility || 1),
  };

  // L5 - just above hip midpoint
  const l5: NormalizedLandmark = {
    x: hipMid.x,
    y: hipMid.y - 0.02,
    z: (hipMid.z || 0) - 0.03,
    visibility: hipMid.visibility,
  };

  // Sacrum - at hip level
  const sacrum: NormalizedLandmark = {
    x: hipMid.x,
    y: hipMid.y,
    z: (hipMid.z || 0) - 0.05,
    visibility: hipMid.visibility,
  };

  return {
    c7,
    t6,
    t12,
    l5,
    sacrum,
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    nose,
    leftEar,
    rightEar,
  };
}

/**
 * Analyze cervical spine curvature (neck)
 */
function analyzeCervicalCurvature(spinePoints: SpineKeypoints): number {
  const { c7, nose, leftEar, rightEar } = spinePoints;
  
  if (!c7) return NORMAL_SPINE_ANGLES.cervical.optimal;

  // Use ear midpoint as head reference if available
  let headRef: NormalizedLandmark;
  if (leftEar && rightEar) {
    headRef = midpoint(leftEar, rightEar);
  } else if (nose) {
    headRef = nose;
  } else {
    return NORMAL_SPINE_ANGLES.cervical.optimal;
  }

  // Calculate forward head posture angle
  const dx = headRef.x - c7.x;
  const dy = headRef.y - c7.y;
  
  // Angle from vertical
  const angleFromVertical = Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI));
  
  // Convert to lordosis estimate (simplified)
  // A straight neck = ~0° forward angle, normal lordosis ~20-40°
  return Math.max(0, NORMAL_SPINE_ANGLES.cervical.optimal - angleFromVertical);
}

/**
 * Analyze thoracic kyphosis (upper back curve)
 */
function analyzeThoracicCurvature(spinePoints: SpineKeypoints): number {
  const { c7, t6, t12 } = spinePoints;
  
  if (!c7 || !t6 || !t12) {
    // Estimate from shoulders if direct points unavailable
    const { leftShoulder, rightShoulder, leftHip, rightHip } = spinePoints;
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return NORMAL_SPINE_ANGLES.thoracic.optimal;
    }

    const shoulderMid = midpoint(leftShoulder, rightShoulder);
    const hipMid = midpoint(leftHip, rightHip);
    
    // Calculate trunk forward lean as proxy for kyphosis
    const dx = shoulderMid.x - hipMid.x;
    const dy = shoulderMid.y - hipMid.y;
    const forwardLean = Math.atan2(dx, -dy) * (180 / Math.PI);
    
    // Map forward lean to kyphosis estimate
    return Math.max(0, NORMAL_SPINE_ANGLES.thoracic.optimal + forwardLean);
  }

  // Calculate kyphosis angle using Cobb angle method (simplified)
  const angle = 180 - calculateAngle3D(c7, t6, t12);
  return Math.abs(angle);
}

/**
 * Analyze lumbar lordosis (lower back curve)
 */
function analyzeLumbarCurvature(spinePoints: SpineKeypoints): number {
  const { t12, l5, sacrum } = spinePoints;
  
  if (!t12 || !l5 || !sacrum) {
    // Estimate from body landmarks
    const { leftHip, rightHip, leftShoulder, rightShoulder } = spinePoints;
    if (!leftHip || !rightHip) {
      return NORMAL_SPINE_ANGLES.lumbar.optimal;
    }

    const hipMid = midpoint(leftHip, rightHip);
    
    // Check for excessive anterior pelvic tilt (indicator of hyperlordosis)
    // or posterior tilt (hypolordosis)
    if (leftShoulder && rightShoulder) {
      const shoulderMid = midpoint(leftShoulder, rightShoulder);
      const trunkAngle = Math.atan2(
        shoulderMid.x - hipMid.x,
        shoulderMid.y - hipMid.y
      ) * (180 / Math.PI);
      
      // Estimate lordosis from trunk angle
      return Math.max(20, NORMAL_SPINE_ANGLES.lumbar.optimal + trunkAngle * 0.5);
    }

    return NORMAL_SPINE_ANGLES.lumbar.optimal;
  }

  // Calculate lordosis angle
  const angle = 180 - calculateAngle3D(t12, l5, sacrum);
  return Math.abs(angle);
}

/**
 * Calculate lateral spine deviation (scoliosis indicator)
 */
function calculateLateralDeviation(spinePoints: SpineKeypoints): number {
  const { leftShoulder, rightShoulder, leftHip, rightHip } = spinePoints;
  
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return 0;
  }

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);

  // Lateral deviation = horizontal offset between shoulder and hip midpoints
  const lateralOffset = Math.abs(shoulderMid.x - hipMid.x);
  
  // Check shoulder tilt
  const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
  
  // Check hip tilt
  const hipTilt = Math.abs(leftHip.y - rightHip.y);

  // Combined lateral deviation score
  return lateralOffset + shoulderTilt * 0.5 + hipTilt * 0.5;
}

/**
 * Calculate anterior-posterior deviation
 */
function calculateAPDeviation(spinePoints: SpineKeypoints): number {
  const { leftShoulder, rightShoulder, leftHip, rightHip, c7 } = spinePoints;
  
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return 0;
  }

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);

  // Calculate forward/backward lean
  const dx = shoulderMid.x - hipMid.x;
  const dy = -(shoulderMid.y - hipMid.y); // Flip y as it increases downward
  
  const leanAngle = Math.atan2(dx, dy) * (180 / Math.PI);
  
  // Convert to normalized deviation score
  return Math.abs(leanAngle) / 45; // Normalize to ~0-1 range
}

/**
 * Generate risk factors based on analysis
 */
function identifyRiskFactors(
  cervical: number,
  thoracic: number,
  lumbar: number,
  lateralDev: number,
  apDev: number
): string[] {
  const risks: string[] = [];

  // Cervical issues
  if (cervical < NORMAL_SPINE_ANGLES.cervical.min) {
    risks.push('Reduced cervical lordosis (flat neck/military neck)');
  } else if (cervical > NORMAL_SPINE_ANGLES.cervical.max) {
    risks.push('Excessive cervical lordosis (swayback neck)');
  }

  // Forward head posture (often accompanies flat neck)
  if (cervical < NORMAL_SPINE_ANGLES.cervical.min - 10) {
    risks.push('Forward head posture detected');
  }

  // Thoracic issues
  if (thoracic < NORMAL_SPINE_ANGLES.thoracic.min) {
    risks.push('Reduced thoracic kyphosis (flat back)');
  } else if (thoracic > NORMAL_SPINE_ANGLES.thoracic.max) {
    risks.push('Excessive thoracic kyphosis (hyperkyphosis/hunchback)');
  }

  // Lumbar issues
  if (lumbar < NORMAL_SPINE_ANGLES.lumbar.min) {
    risks.push('Reduced lumbar lordosis (flat lower back)');
  } else if (lumbar > NORMAL_SPINE_ANGLES.lumbar.max) {
    risks.push('Excessive lumbar lordosis (hyperlordosis/swayback)');
  }

  // Lateral deviation (scoliosis indicator)
  if (lateralDev > DEVIATION_THRESHOLDS.lateralSevere) {
    risks.push('Significant lateral spinal deviation (possible scoliosis)');
  } else if (lateralDev > DEVIATION_THRESHOLDS.lateralWarning) {
    risks.push('Mild lateral spinal deviation');
  }

  // Anterior-posterior deviation
  if (apDev > DEVIATION_THRESHOLDS.apWarning) {
    risks.push('Excessive forward lean posture');
  }

  return risks;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  cervical: number,
  thoracic: number,
  lumbar: number,
  lateralDev: number,
  risks: string[]
): string[] {
  const recommendations: string[] = [];

  if (cervical < NORMAL_SPINE_ANGLES.cervical.min || risks.some(r => r.includes('Forward head'))) {
    recommendations.push('Chin tucks and neck retraction exercises');
    recommendations.push('Limit prolonged screen time and check workstation ergonomics');
  }

  if (thoracic > NORMAL_SPINE_ANGLES.thoracic.max) {
    recommendations.push('Thoracic extension exercises (foam roller, cat-cow)');
    recommendations.push('Strengthen upper back muscles (rows, reverse flies)');
  }

  if (lumbar > NORMAL_SPINE_ANGLES.lumbar.max) {
    recommendations.push('Core strengthening exercises (planks, dead bugs)');
    recommendations.push('Hip flexor stretches to reduce anterior pelvic tilt');
  } else if (lumbar < NORMAL_SPINE_ANGLES.lumbar.min) {
    recommendations.push('Hip extension exercises (bridges, hip thrusts)');
    recommendations.push('Lumbar extension mobility work');
  }

  if (lateralDev > DEVIATION_THRESHOLDS.lateralWarning) {
    recommendations.push('Consult a physiotherapist for scoliosis screening');
    recommendations.push('Focus on symmetrical exercises and stretches');
  }

  if (recommendations.length === 0) {
    recommendations.push('Maintain current posture with regular breaks during sitting');
    recommendations.push('Continue regular exercise and mobility work');
  }

  return recommendations;
}

/**
 * Calculate overall spine health score (0-100)
 */
function calculateOverallScore(
  cervical: number,
  thoracic: number,
  lumbar: number,
  lateralDev: number,
  apDev: number
): number {
  // Score each region based on deviation from optimal
  const cervicalScore = 100 - Math.min(100, Math.abs(cervical - NORMAL_SPINE_ANGLES.cervical.optimal) * 3);
  const thoracicScore = 100 - Math.min(100, Math.abs(thoracic - NORMAL_SPINE_ANGLES.thoracic.optimal) * 3);
  const lumbarScore = 100 - Math.min(100, Math.abs(lumbar - NORMAL_SPINE_ANGLES.lumbar.optimal) * 3);
  
  // Deviation penalties
  const lateralPenalty = Math.min(30, lateralDev * 500);
  const apPenalty = Math.min(20, apDev * 40);

  // Weighted average
  const baseScore = (cervicalScore * 0.25 + thoracicScore * 0.35 + lumbarScore * 0.4);
  
  return Math.max(0, Math.round(baseScore - lateralPenalty - apPenalty));
}

/**
 * Main spine analysis function
 * 
 * @param landmarks - Normalized pose landmarks
 * @param hasSpineKeypoints - Whether the model provides dedicated spine keypoints
 */
export function analyzeSpineCurvature(
  landmarks: NormalizedLandmark[],
  hasSpineKeypoints: boolean = false
): SpineAnalysisResult {
  // Extract or estimate spine keypoints
  const spinePoints = hasSpineKeypoints
    ? extractSpineKeypoints(landmarks)
    : estimateSpineFromBodyLandmarks(landmarks);

  // Analyze each spinal region
  const cervical = analyzeCervicalCurvature(spinePoints);
  const thoracic = analyzeThoracicCurvature(spinePoints);
  const lumbar = analyzeLumbarCurvature(spinePoints);
  
  // Calculate deviations
  const lateral = calculateLateralDeviation(spinePoints);
  const anteriorPosterior = calculateAPDeviation(spinePoints);
  
  // Generate overall score
  const overall = calculateOverallScore(cervical, thoracic, lumbar, lateral, anteriorPosterior);
  
  // Identify issues and recommendations
  const riskFactors = identifyRiskFactors(cervical, thoracic, lumbar, lateral, anteriorPosterior);
  const recommendations = generateRecommendations(cervical, thoracic, lumbar, lateral, riskFactors);

  return {
    curvature: {
      cervical: Math.round(cervical * 10) / 10,
      thoracic: Math.round(thoracic * 10) / 10,
      lumbar: Math.round(lumbar * 10) / 10,
      overall,
    },
    deviation: {
      lateral: Math.round(lateral * 1000) / 1000,
      anteriorPosterior: Math.round(anteriorPosterior * 100) / 100,
    },
    riskFactors,
    recommendations,
  };
}

/**
 * Extract spine keypoints from models that provide them (RTMPose)
 */
function extractSpineKeypoints(landmarks: NormalizedLandmark[]): SpineKeypoints {
  const LM = BasePoseModel.LANDMARK_INDICES;
  const SPINE_LM = BasePoseModel.SPINE_LANDMARK_INDICES;

  return {
    c7: landmarks[SPINE_LM.C7_VERTEBRA],
    t1: landmarks[SPINE_LM.T1_VERTEBRA],
    t6: landmarks[SPINE_LM.T6_VERTEBRA],
    t12: landmarks[SPINE_LM.T12_VERTEBRA],
    l1: landmarks[SPINE_LM.L1_VERTEBRA],
    l5: landmarks[SPINE_LM.L5_VERTEBRA],
    sacrum: landmarks[SPINE_LM.SACRUM],
    leftShoulder: landmarks[LM.LEFT_SHOULDER],
    rightShoulder: landmarks[LM.RIGHT_SHOULDER],
    leftHip: landmarks[LM.LEFT_HIP],
    rightHip: landmarks[LM.RIGHT_HIP],
    nose: landmarks[LM.NOSE],
    leftEar: landmarks[LM.LEFT_EAR],
    rightEar: landmarks[LM.RIGHT_EAR],
  };
}

/**
 * Spine posture classification
 */
export type PostureType = 
  | 'ideal'
  | 'kyphotic-lordotic'
  | 'flat-back'
  | 'sway-back'
  | 'military'
  | 'forward-head';

/**
 * Classify overall posture type based on spinal curvatures
 */
export function classifyPosture(result: SpineAnalysisResult): PostureType {
  const { cervical, thoracic, lumbar } = result.curvature;
  const { lateral } = result.deviation;

  // Check for lateral deviation first
  if (lateral > DEVIATION_THRESHOLDS.lateralWarning) {
    // Can't classify standard posture types with significant scoliosis
    return 'ideal'; // Return neutral
  }

  // Kyphotic-lordotic: excessive thoracic curve + excessive lumbar curve
  if (thoracic > NORMAL_SPINE_ANGLES.thoracic.max && lumbar > NORMAL_SPINE_ANGLES.lumbar.max) {
    return 'kyphotic-lordotic';
  }

  // Flat-back: reduced curves all around
  if (thoracic < NORMAL_SPINE_ANGLES.thoracic.min && lumbar < NORMAL_SPINE_ANGLES.lumbar.min) {
    return 'flat-back';
  }

  // Sway-back: excessive lumbar curve with hip forward
  if (lumbar > NORMAL_SPINE_ANGLES.lumbar.max && thoracic < NORMAL_SPINE_ANGLES.thoracic.optimal) {
    return 'sway-back';
  }

  // Military neck: significantly reduced cervical curve
  if (cervical < NORMAL_SPINE_ANGLES.cervical.min - 5) {
    return 'military';
  }

  // Forward head posture
  if (cervical < NORMAL_SPINE_ANGLES.cervical.min) {
    return 'forward-head';
  }

  return 'ideal';
}
