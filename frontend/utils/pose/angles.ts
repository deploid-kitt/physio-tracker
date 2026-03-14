// Angle calculation utilities for pose analysis
import type { Keypoint, JointAngles } from '~/types';
import { LANDMARKS, POSE_CONFIG } from './config';

interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Calculate angle between three points (in degrees)
 * The angle is measured at point B (the middle point)
 */
export function calculateAngle(
  a: LandmarkPoint,
  b: LandmarkPoint, 
  c: LandmarkPoint
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  
  if (angle > 180) {
    angle = 360 - angle;
  }
  
  return angle;
}

/**
 * Calculate 3D angle if z-coordinates are available
 */
export function calculateAngle3D(
  a: LandmarkPoint,
  b: LandmarkPoint,
  c: LandmarkPoint
): number {
  if (a.z === undefined || b.z === undefined || c.z === undefined) {
    return calculateAngle(a, b, c);
  }

  // Vectors BA and BC
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  // Dot product
  const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;

  // Magnitudes
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);

  // Angle in radians
  const cosAngle = dotProduct / (magBA * magBC);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

  return angle;
}

/**
 * Calculate the trunk lean angle from vertical
 */
export function calculateTrunkAngle(landmarks: LandmarkPoint[]): number {
  const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[LANDMARKS.RIGHT_HIP];

  // Midpoints
  const shoulderMid = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const hipMid = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  };

  // Angle from vertical (0° = perfectly upright)
  const dx = shoulderMid.x - hipMid.x;
  const dy = shoulderMid.y - hipMid.y;
  
  // In normalized coordinates, y increases downward
  const angleFromVertical = Math.atan2(dx, -dy) * (180 / Math.PI);
  
  return Math.abs(angleFromVertical);
}

/**
 * Calculate knee valgus angle (inward knee collapse)
 * Positive value = knees caving inward
 */
export function calculateKneeValgus(landmarks: LandmarkPoint[], side: 'left' | 'right'): number {
  const hipIdx = side === 'left' ? LANDMARKS.LEFT_HIP : LANDMARKS.RIGHT_HIP;
  const kneeIdx = side === 'left' ? LANDMARKS.LEFT_KNEE : LANDMARKS.RIGHT_KNEE;
  const ankleIdx = side === 'left' ? LANDMARKS.LEFT_ANKLE : LANDMARKS.RIGHT_ANKLE;

  const hip = landmarks[hipIdx];
  const knee = landmarks[kneeIdx];
  const ankle = landmarks[ankleIdx];

  // Vector from hip to ankle (ideal knee path)
  const hipToAnkle = { x: ankle.x - hip.x, y: ankle.y - hip.y };
  
  // Vector from hip to knee (actual knee position)
  const hipToKnee = { x: knee.x - hip.x, y: knee.y - hip.y };

  // Cross product (z component) to determine direction
  const cross = hipToAnkle.x * hipToKnee.y - hipToAnkle.y * hipToKnee.x;

  // Dot product for angle
  const dot = hipToAnkle.x * hipToKnee.x + hipToAnkle.y * hipToKnee.y;
  const magHA = Math.sqrt(hipToAnkle.x ** 2 + hipToAnkle.y ** 2);
  const magHK = Math.sqrt(hipToKnee.x ** 2 + hipToKnee.y ** 2);

  const cosAngle = dot / (magHA * magHK);
  let angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

  // Determine if inward or outward based on side
  // For left leg: negative cross = inward
  // For right leg: positive cross = inward
  const isInward = side === 'left' ? cross < 0 : cross > 0;
  
  return isInward ? angle : -angle;
}

/**
 * Calculate asymmetry between left and right sides
 * Returns percentage difference
 */
export function calculateAsymmetry(leftAngle: number, rightAngle: number): number {
  const avg = (leftAngle + rightAngle) / 2;
  if (avg === 0) return 0;
  return Math.abs(leftAngle - rightAngle) / avg * 100;
}

/**
 * Calculate all relevant joint angles from pose landmarks
 */
export function calculateJointAngles(landmarks: LandmarkPoint[]): JointAngles {
  // Check visibility of required landmarks
  const requiredLandmarks = [
    LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
    LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
    LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
    LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
  ];

  for (const idx of requiredLandmarks) {
    if (!landmarks[idx] || (landmarks[idx].visibility ?? 1) < POSE_CONFIG.VISIBILITY_THRESHOLD) {
      // Return default angles if landmarks not visible
      return {
        leftKnee: 180,
        rightKnee: 180,
        leftHip: 180,
        rightHip: 180,
        trunk: 0,
      };
    }
  }

  // Knee angles (hip-knee-ankle)
  const leftKnee = calculateAngle(
    landmarks[LANDMARKS.LEFT_HIP],
    landmarks[LANDMARKS.LEFT_KNEE],
    landmarks[LANDMARKS.LEFT_ANKLE]
  );

  const rightKnee = calculateAngle(
    landmarks[LANDMARKS.RIGHT_HIP],
    landmarks[LANDMARKS.RIGHT_KNEE],
    landmarks[LANDMARKS.RIGHT_ANKLE]
  );

  // Hip angles (shoulder-hip-knee)
  const leftHip = calculateAngle(
    landmarks[LANDMARKS.LEFT_SHOULDER],
    landmarks[LANDMARKS.LEFT_HIP],
    landmarks[LANDMARKS.LEFT_KNEE]
  );

  const rightHip = calculateAngle(
    landmarks[LANDMARKS.RIGHT_SHOULDER],
    landmarks[LANDMARKS.RIGHT_HIP],
    landmarks[LANDMARKS.RIGHT_KNEE]
  );

  // Trunk angle
  const trunk = calculateTrunkAngle(landmarks);

  // Ankle angles (optional)
  let leftAnkle: number | undefined;
  let rightAnkle: number | undefined;

  if (landmarks[LANDMARKS.LEFT_FOOT_INDEX] && landmarks[LANDMARKS.RIGHT_FOOT_INDEX]) {
    leftAnkle = calculateAngle(
      landmarks[LANDMARKS.LEFT_KNEE],
      landmarks[LANDMARKS.LEFT_ANKLE],
      landmarks[LANDMARKS.LEFT_FOOT_INDEX]
    );

    rightAnkle = calculateAngle(
      landmarks[LANDMARKS.RIGHT_KNEE],
      landmarks[LANDMARKS.RIGHT_ANKLE],
      landmarks[LANDMARKS.RIGHT_FOOT_INDEX]
    );
  }

  return {
    leftKnee,
    rightKnee,
    leftHip,
    rightHip,
    trunk,
    leftAnkle,
    rightAnkle,
  };
}

/**
 * Smooth angle transitions to reduce jitter
 */
export function smoothAngle(currentAngle: number, previousAngle: number, factor: number = 0.3): number {
  return previousAngle + (currentAngle - previousAngle) * factor;
}

/**
 * Apply smoothing to all joint angles
 */
export function smoothJointAngles(
  current: JointAngles,
  previous: JointAngles,
  factor: number = 0.3
): JointAngles {
  return {
    leftKnee: smoothAngle(current.leftKnee, previous.leftKnee, factor),
    rightKnee: smoothAngle(current.rightKnee, previous.rightKnee, factor),
    leftHip: smoothAngle(current.leftHip, previous.leftHip, factor),
    rightHip: smoothAngle(current.rightHip, previous.rightHip, factor),
    trunk: smoothAngle(current.trunk, previous.trunk, factor),
    leftAnkle: current.leftAnkle !== undefined && previous.leftAnkle !== undefined
      ? smoothAngle(current.leftAnkle, previous.leftAnkle, factor)
      : current.leftAnkle,
    rightAnkle: current.rightAnkle !== undefined && previous.rightAnkle !== undefined
      ? smoothAngle(current.rightAnkle, previous.rightAnkle, factor)
      : current.rightAnkle,
  };
}
