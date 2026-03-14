// Pose detection configuration and thresholds
// These values can be tuned based on user feedback and camera setup

export const POSE_CONFIG = {
  // MediaPipe Pose model configuration
  MODEL: {
    modelComplexity: 1, // 0=lite, 1=full, 2=heavy
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },

  // Keypoint visibility threshold
  VISIBILITY_THRESHOLD: 0.6,

  // Frame rate for processing (reduce for performance)
  TARGET_FPS: 30,
};

// Squat-specific configuration
export const SQUAT_CONFIG = {
  // Joint angle thresholds (degrees)
  KNEE_STANDING_ANGLE: 160,    // Minimum knee angle when standing
  KNEE_BOTTOM_ANGLE: 100,      // Target knee angle at bottom of squat
  KNEE_PARALLEL_ANGLE: 95,     // Thighs parallel to ground
  KNEE_BELOW_PARALLEL: 80,     // Deep squat threshold
  
  // Hip angles
  HIP_STANDING_ANGLE: 160,
  HIP_BOTTOM_ANGLE: 70,
  
  // Trunk/torso lean (angle from vertical)
  TRUNK_LEAN_MAX: 45,          // Maximum acceptable forward lean
  TRUNK_LEAN_WARNING: 35,      // Warning threshold
  
  // Knee valgus (inward collapse)
  KNEE_VALGUS_THRESHOLD: 15,   // Maximum inward deviation (degrees)
  KNEE_VALGUS_WARNING: 10,
  
  // Heel lift detection (y-coordinate change)
  HEEL_LIFT_THRESHOLD: 0.02,   // Normalized coordinate change
  
  // Asymmetry thresholds
  ASYMMETRY_WARNING: 10,       // % difference between sides
  ASYMMETRY_ERROR: 20,
  
  // State machine timing
  MIN_HOLD_MS: 300,            // Minimum time at bottom to count as valid rep
  REP_COOLDOWN_MS: 500,        // Minimum time between reps
  
  // Smoothing
  ANGLE_SMOOTHING_FACTOR: 0.3, // Lower = more smoothing
};

// Wall sit configuration
export const WALL_SIT_CONFIG = {
  TARGET_KNEE_ANGLE: 90,
  KNEE_TOLERANCE: 10,
  BACK_FLAT_THRESHOLD: 10,     // Maximum trunk angle from wall
  HOLD_THRESHOLD_MS: 1000,     // Minimum time to start counting hold
};

// Single leg stand configuration
export const SINGLE_LEG_CONFIG = {
  HIP_TILT_MAX: 10,            // Maximum hip tilt (degrees)
  SWAY_THRESHOLD: 5,           // Maximum body sway
  HOLD_THRESHOLD_MS: 1000,
};

// Lunge configuration
export const LUNGE_CONFIG = {
  FRONT_KNEE_ANGLE_BOTTOM: 90,
  REAR_KNEE_ANGLE_BOTTOM: 90,
  TRUNK_LEAN_MAX: 20,
  KNEE_OVER_ANKLE_THRESHOLD: 0.05, // Normalized x-coordinate tolerance
};

// MediaPipe pose landmark indices
export const LANDMARKS = {
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

// Skeleton connections for drawing
export const SKELETON_CONNECTIONS = [
  // Torso
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
  [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
  
  // Left arm
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
  [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
  
  // Right arm
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
  [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
  
  // Left leg
  [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
  [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
  [LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_HEEL],
  [LANDMARKS.LEFT_HEEL, LANDMARKS.LEFT_FOOT_INDEX],
  [LANDMARKS.LEFT_ANKLE, LANDMARKS.LEFT_FOOT_INDEX],
  
  // Right leg
  [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
  [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
  [LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_HEEL],
  [LANDMARKS.RIGHT_HEEL, LANDMARKS.RIGHT_FOOT_INDEX],
  [LANDMARKS.RIGHT_ANKLE, LANDMARKS.RIGHT_FOOT_INDEX],
];

// Form score colors
export const SCORE_COLORS = {
  EXCELLENT: '#22c55e', // Green 500
  GOOD: '#3b82f6',      // Blue 500  
  FAIR: '#f59e0b',      // Amber 500
  POOR: '#ef4444',      // Red 500
};

export function getScoreColor(score: number): string {
  if (score >= 90) return SCORE_COLORS.EXCELLENT;
  if (score >= 75) return SCORE_COLORS.GOOD;
  if (score >= 50) return SCORE_COLORS.FAIR;
  return SCORE_COLORS.POOR;
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Work';
}
