import { Request } from 'express';
import { Role } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface FrameData {
  t: number; // timestamp in ms
  keypoints: Record<string, [number, number, number]>; // name -> [x, y, visibility]
  angles: {
    leftKnee: number;
    rightKnee: number;
    leftHip: number;
    rightHip: number;
    trunk: number;
    leftAnkle?: number;
    rightAnkle?: number;
  };
  state: string;
  repCount: number;
  formScore?: number;
}

export interface SessionData {
  sessionId: string;
  exerciseId: string;
  timestamp: number;
  frameRate: number;
  frames: FrameData[];
  summary: {
    totalReps: number;
    averageFormScore: number;
    duration: number;
    formBreakdown?: Record<string, number>;
  };
}

export interface FormScores {
  depth: number;
  kneeTracking: number;
  trunkPosition: number;
  symmetry: number;
  overall: number;
}

export interface ExerciseCheckpoint {
  name: string;
  conditions: Record<string, string>; // e.g., { kneeAngle: ">160" }
}

export interface FormCheck {
  name: string;
  rule: string;
  weight: number;
  feedback?: string;
}

export interface ExerciseConfig {
  checkpoints: ExerciseCheckpoint[];
  formChecks: FormCheck[];
  thresholds?: Record<string, number>;
}

export interface CalibrationData {
  standingKneeAngle: number;
  mobilityLimit: number;
  asymmetryBaseline: number;
  lastCalibrated: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
