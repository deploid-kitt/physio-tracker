// Squat detection and form analysis using state machine approach
import type { JointAngles, FormScores, FrameData } from '~/types';
import { SQUAT_CONFIG, LANDMARKS } from './config';
import { calculateJointAngles, smoothJointAngles, calculateKneeValgus, calculateAsymmetry } from './angles';

// State machine states
export type SquatState = 'standing' | 'descending' | 'bottom' | 'ascending';

interface SquatDetectorState {
  currentState: SquatState;
  repCount: number;
  lastRepTimestamp: number;
  bottomReachedTimestamp: number;
  previousAngles: JointAngles | null;
  formScoreHistory: FormScores[];
  minKneeAngle: number; // Track deepest point in current rep
}

interface FormFeedback {
  scores: FormScores;
  issues: string[];
  cues: string[];
}

export class SquatDetector {
  private state: SquatDetectorState;
  private config: typeof SQUAT_CONFIG;

  constructor(customConfig?: Partial<typeof SQUAT_CONFIG>) {
    this.config = { ...SQUAT_CONFIG, ...customConfig };
    this.state = this.getInitialState();
  }

  private getInitialState(): SquatDetectorState {
    return {
      currentState: 'standing',
      repCount: 0,
      lastRepTimestamp: 0,
      bottomReachedTimestamp: 0,
      previousAngles: null,
      formScoreHistory: [],
      minKneeAngle: 180,
    };
  }

  reset(): void {
    this.state = this.getInitialState();
  }

  /**
   * Process a frame of pose landmarks
   */
  processFrame(landmarks: any[], timestamp: number): FrameData & { feedback: FormFeedback } {
    // Calculate joint angles
    let angles = calculateJointAngles(landmarks);
    
    // Apply smoothing if we have previous angles
    if (this.state.previousAngles) {
      angles = smoothJointAngles(angles, this.state.previousAngles, this.config.ANGLE_SMOOTHING_FACTOR);
    }
    
    // Get average knee angle (use minimum for depth tracking)
    const avgKneeAngle = Math.min(angles.leftKnee, angles.rightKnee);
    
    // Update state machine
    const previousState = this.state.currentState;
    this.updateState(avgKneeAngle, timestamp);
    
    // Track minimum knee angle during rep
    if (this.state.currentState === 'descending' || this.state.currentState === 'bottom') {
      this.state.minKneeAngle = Math.min(this.state.minKneeAngle, avgKneeAngle);
    }
    
    // Check if rep completed
    if (previousState === 'ascending' && this.state.currentState === 'standing') {
      const timeSinceLastRep = timestamp - this.state.lastRepTimestamp;
      if (timeSinceLastRep > this.config.REP_COOLDOWN_MS) {
        this.state.repCount++;
        this.state.lastRepTimestamp = timestamp;
      }
      // Reset min knee angle for next rep
      this.state.minKneeAngle = 180;
    }
    
    // Analyze form
    const feedback = this.analyzeForm(landmarks, angles);
    
    // Store form score history
    if (this.state.currentState === 'bottom' || this.state.currentState === 'ascending') {
      this.state.formScoreHistory.push(feedback.scores);
    }
    
    // Store current angles for next frame
    this.state.previousAngles = angles;
    
    // Convert landmarks to storable format
    const keypoints: Record<string, [number, number, number]> = {};
    const landmarkNames = [
      'nose', 'leftEyeInner', 'leftEye', 'leftEyeOuter',
      'rightEyeInner', 'rightEye', 'rightEyeOuter',
      'leftEar', 'rightEar', 'mouthLeft', 'mouthRight',
      'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
      'leftWrist', 'rightWrist', 'leftPinky', 'rightPinky',
      'leftIndex', 'rightIndex', 'leftThumb', 'rightThumb',
      'leftHip', 'rightHip', 'leftKnee', 'rightKnee',
      'leftAnkle', 'rightAnkle', 'leftHeel', 'rightHeel',
      'leftFootIndex', 'rightFootIndex'
    ];
    
    landmarks.forEach((lm, idx) => {
      if (idx < landmarkNames.length) {
        keypoints[landmarkNames[idx]] = [lm.x, lm.y, lm.visibility ?? 1];
      }
    });
    
    return {
      t: timestamp,
      keypoints,
      angles,
      state: this.state.currentState,
      repCount: this.state.repCount,
      formScore: feedback.scores.overall,
      feedback,
    };
  }

  /**
   * Update state machine based on knee angle
   */
  private updateState(kneeAngle: number, timestamp: number): void {
    const { currentState } = this.state;
    
    switch (currentState) {
      case 'standing':
        if (kneeAngle < this.config.KNEE_STANDING_ANGLE) {
          this.state.currentState = 'descending';
        }
        break;
        
      case 'descending':
        if (kneeAngle <= this.config.KNEE_BOTTOM_ANGLE) {
          this.state.currentState = 'bottom';
          this.state.bottomReachedTimestamp = timestamp;
        } else if (kneeAngle > this.config.KNEE_STANDING_ANGLE) {
          // Aborted descent
          this.state.currentState = 'standing';
        }
        break;
        
      case 'bottom':
        // Must hold for minimum time
        const holdTime = timestamp - this.state.bottomReachedTimestamp;
        if (holdTime >= this.config.MIN_HOLD_MS && kneeAngle > this.config.KNEE_BOTTOM_ANGLE + 10) {
          this.state.currentState = 'ascending';
        }
        break;
        
      case 'ascending':
        if (kneeAngle >= this.config.KNEE_STANDING_ANGLE) {
          this.state.currentState = 'standing';
        } else if (kneeAngle < this.config.KNEE_BOTTOM_ANGLE) {
          // Went back down
          this.state.currentState = 'bottom';
          this.state.bottomReachedTimestamp = timestamp;
        }
        break;
    }
  }

  /**
   * Analyze form quality
   */
  private analyzeForm(landmarks: any[], angles: JointAngles): FormFeedback {
    const issues: string[] = [];
    const cues: string[] = [];
    
    // 1. Depth score (based on minimum knee angle reached)
    let depthScore = 100;
    if (this.state.minKneeAngle > this.config.KNEE_BOTTOM_ANGLE) {
      // Didn't reach target depth
      depthScore = Math.max(0, 100 - (this.state.minKneeAngle - this.config.KNEE_BOTTOM_ANGLE) * 2);
      issues.push('Squat not deep enough');
      cues.push('Try to go deeper - thighs parallel to ground');
    } else if (this.state.minKneeAngle <= this.config.KNEE_BELOW_PARALLEL) {
      // Bonus for deep squat
      depthScore = 100;
    }
    
    // 2. Knee tracking (valgus)
    const leftValgus = calculateKneeValgus(landmarks, 'left');
    const rightValgus = calculateKneeValgus(landmarks, 'right');
    const maxValgus = Math.max(leftValgus, rightValgus);
    
    let kneeTrackingScore = 100;
    if (maxValgus > this.config.KNEE_VALGUS_THRESHOLD) {
      kneeTrackingScore = Math.max(0, 100 - (maxValgus - this.config.KNEE_VALGUS_THRESHOLD) * 5);
      issues.push('Knees caving inward');
      cues.push('Push your knees out over your toes');
    } else if (maxValgus > this.config.KNEE_VALGUS_WARNING) {
      kneeTrackingScore = 85;
      cues.push('Keep knees tracking over toes');
    }
    
    // 3. Trunk position
    let trunkScore = 100;
    if (angles.trunk > this.config.TRUNK_LEAN_MAX) {
      trunkScore = Math.max(0, 100 - (angles.trunk - this.config.TRUNK_LEAN_MAX) * 3);
      issues.push('Excessive forward lean');
      cues.push('Keep your chest up');
    } else if (angles.trunk > this.config.TRUNK_LEAN_WARNING) {
      trunkScore = 85;
      cues.push('Try to stay more upright');
    }
    
    // 4. Symmetry
    const kneeAsymmetry = calculateAsymmetry(angles.leftKnee, angles.rightKnee);
    const hipAsymmetry = calculateAsymmetry(angles.leftHip, angles.rightHip);
    const avgAsymmetry = (kneeAsymmetry + hipAsymmetry) / 2;
    
    let symmetryScore = 100;
    if (avgAsymmetry > this.config.ASYMMETRY_ERROR) {
      symmetryScore = Math.max(0, 100 - avgAsymmetry * 2);
      issues.push('Uneven movement');
      cues.push('Keep weight evenly distributed');
    } else if (avgAsymmetry > this.config.ASYMMETRY_WARNING) {
      symmetryScore = 85;
    }
    
    // Calculate overall score (weighted average)
    const overall = Math.round(
      depthScore * 0.3 +
      kneeTrackingScore * 0.25 +
      trunkScore * 0.25 +
      symmetryScore * 0.2
    );
    
    return {
      scores: {
        depth: Math.round(depthScore),
        kneeTracking: Math.round(kneeTrackingScore),
        trunkPosition: Math.round(trunkScore),
        symmetry: Math.round(symmetryScore),
        overall,
      },
      issues,
      cues,
    };
  }

  /**
   * Get current state
   */
  getState(): SquatDetectorState {
    return { ...this.state };
  }

  /**
   * Get rep count
   */
  getRepCount(): number {
    return this.state.repCount;
  }

  /**
   * Get current state name
   */
  getCurrentStateName(): SquatState {
    return this.state.currentState;
  }

  /**
   * Get average form score across the session
   */
  getAverageFormScore(): FormScores | null {
    if (this.state.formScoreHistory.length === 0) return null;
    
    const sum = this.state.formScoreHistory.reduce(
      (acc, scores) => ({
        depth: acc.depth + scores.depth,
        kneeTracking: acc.kneeTracking + scores.kneeTracking,
        trunkPosition: acc.trunkPosition + scores.trunkPosition,
        symmetry: acc.symmetry + scores.symmetry,
        overall: acc.overall + scores.overall,
      }),
      { depth: 0, kneeTracking: 0, trunkPosition: 0, symmetry: 0, overall: 0 }
    );
    
    const count = this.state.formScoreHistory.length;
    return {
      depth: Math.round(sum.depth / count),
      kneeTracking: Math.round(sum.kneeTracking / count),
      trunkPosition: Math.round(sum.trunkPosition / count),
      symmetry: Math.round(sum.symmetry / count),
      overall: Math.round(sum.overall / count),
    };
  }
}
