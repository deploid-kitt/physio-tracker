export type Role = 'PHYSIO' | 'PATIENT' | 'ADMIN';
export type ExerciseType = 'REPETITION' | 'HOLD' | 'TIMED';
export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string;
  calibrationData?: CalibrationData;
  createdAt: string;
}

export interface CalibrationData {
  standingKneeAngle: number;
  mobilityLimit: number;
  asymmetryBaseline: number;
  lastCalibrated: string;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  type: ExerciseType;
  muscleGroups: string[];
  difficulty: number;
  checkpoints: ExerciseCheckpoint[];
  formChecks: FormCheck[];
  defaultConfig: Record<string, number>;
  instructions: string[];
  cues: string[];
  demoAnimation?: DemoAnimation;
  thumbnailUrl?: string;
  videoUrl?: string;
  isPublic: boolean;
  isBuiltIn: boolean;
  createdById?: string;
}

export interface ExerciseCheckpoint {
  name: string;
  conditions: Record<string, string>;
}

export interface FormCheck {
  name: string;
  rule: string;
  weight: number;
  feedback?: string;
}

export interface DemoAnimation {
  frameCount: number;
  fps: number;
  keyframes: { t: number; pose: string }[];
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  isPublic: boolean;
  createdById?: string;
  exercises: RoutineExercise[];
  createdBy?: { firstName: string; lastName: string };
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  order: number;
  sets: number;
  reps?: number;
  holdSeconds?: number;
  restSeconds: number;
  notes?: string;
}

export interface RoutineAssignment {
  id: string;
  routineId: string;
  routine: Routine;
  patientId: string;
  assignedById?: string;
  assignedBy?: { firstName: string; lastName: string };
  frequency?: string;
  notes?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface ExerciseSession {
  id: string;
  userId: string;
  exerciseId: string;
  exercise?: Exercise;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  repsCompleted: number;
  repsTarget?: number;
  holdDuration?: number;
  averageFormScore?: number;
  formScores?: FormScores;
  keypointData?: FrameData[];
  cameraAngle?: string;
  notes?: string;
}

export interface FormScores {
  depth: number;
  kneeTracking: number;
  trunkPosition: number;
  symmetry: number;
  overall: number;
}

export interface FrameData {
  t: number;
  keypoints: Record<string, [number, number, number]>;
  angles: JointAngles;
  state: string;
  repCount: number;
  formScore?: number;
}

export interface JointAngles {
  leftKnee: number;
  rightKnee: number;
  leftHip: number;
  rightHip: number;
  trunk: number;
  leftAnkle?: number;
  rightAnkle?: number;
}

export interface ProgressSnapshot {
  id: string;
  userId: string;
  date: string;
  totalSessions: number;
  totalReps: number;
  totalDuration: number;
  averageFormScore?: number;
  exerciseBreakdown?: Record<string, { reps: number; avgForm: number; count: number }>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
}

export interface PoseKeypoints {
  nose: Keypoint;
  leftShoulder: Keypoint;
  rightShoulder: Keypoint;
  leftElbow: Keypoint;
  rightElbow: Keypoint;
  leftWrist: Keypoint;
  rightWrist: Keypoint;
  leftHip: Keypoint;
  rightHip: Keypoint;
  leftKnee: Keypoint;
  rightKnee: Keypoint;
  leftAnkle: Keypoint;
  rightAnkle: Keypoint;
  [key: string]: Keypoint;
}

export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  visibility: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}
