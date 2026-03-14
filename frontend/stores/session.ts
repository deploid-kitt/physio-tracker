import { defineStore } from 'pinia';
import type { ExerciseSession, FrameData, FormScores, ApiResponse } from '~/types';
import { useAuthStore } from './auth';

interface SessionState {
  currentSession: ExerciseSession | null;
  recentSessions: ExerciseSession[];
  keypointBuffer: FrameData[];
  isRecording: boolean;
  repCount: number;
  currentFormScore: FormScores | null;
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    currentSession: null,
    recentSessions: [],
    keypointBuffer: [],
    isRecording: false,
    repCount: 0,
    currentFormScore: null,
  }),

  actions: {
    async startSession(exerciseId: string, repsTarget?: number) {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      const response = await $fetch<ApiResponse<ExerciseSession>>(
        `${config.public.apiBaseUrl}/sessions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: { exerciseId, repsTarget },
        }
      );

      if (response.success && response.data) {
        this.currentSession = response.data;
        this.keypointBuffer = [];
        this.isRecording = true;
        this.repCount = 0;
        this.currentFormScore = null;
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to start session');
    },

    addFrame(frame: FrameData) {
      if (this.isRecording) {
        this.keypointBuffer.push(frame);
        this.repCount = frame.repCount;
        
        // Keep buffer manageable (last 5 minutes at 30fps = 9000 frames)
        if (this.keypointBuffer.length > 9000) {
          this.keypointBuffer = this.keypointBuffer.slice(-9000);
        }
      }
    },

    updateFormScore(scores: FormScores) {
      this.currentFormScore = scores;
    },

    incrementRep() {
      this.repCount++;
    },

    async completeSession(formScores?: Record<string, number>) {
      if (!this.currentSession) return;

      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      const duration = Math.floor(
        (Date.now() - new Date(this.currentSession.startedAt).getTime()) / 1000
      );

      const avgFormScore = this.currentFormScore?.overall || 
        (formScores ? Object.values(formScores).reduce((a, b) => a + b, 0) / Object.keys(formScores).length : undefined);

      const response = await $fetch<ApiResponse<ExerciseSession>>(
        `${config.public.apiBaseUrl}/sessions/${this.currentSession.id}/complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: {
            repsCompleted: this.repCount,
            duration,
            averageFormScore: avgFormScore,
            formScores,
            keypointData: this.keypointBuffer,
          },
        }
      );

      if (response.success && response.data) {
        this.currentSession = null;
        this.isRecording = false;
        this.recentSessions.unshift(response.data);
        return response.data;
      }

      throw new Error(response.error || 'Failed to complete session');
    },

    async cancelSession() {
      if (!this.currentSession) return;

      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      await $fetch(
        `${config.public.apiBaseUrl}/sessions/${this.currentSession.id}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );

      this.currentSession = null;
      this.isRecording = false;
      this.keypointBuffer = [];
    },

    async fetchRecentSessions(limit = 10) {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      const response = await $fetch<ApiResponse<ExerciseSession[]>>(
        `${config.public.apiBaseUrl}/sessions?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );

      if (response.success && response.data) {
        this.recentSessions = response.data;
      }
    },

    reset() {
      this.currentSession = null;
      this.keypointBuffer = [];
      this.isRecording = false;
      this.repCount = 0;
      this.currentFormScore = null;
    },
  },
});
