import { defineStore } from 'pinia';
import type { Exercise, Routine, RoutineAssignment, ApiResponse } from '~/types';
import { useAuthStore } from './auth';

interface ExercisesState {
  exercises: Exercise[];
  routines: Routine[];
  assignedRoutines: RoutineAssignment[];
  currentExercise: Exercise | null;
  isLoading: boolean;
}

export const useExercisesStore = defineStore('exercises', {
  state: (): ExercisesState => ({
    exercises: [],
    routines: [],
    assignedRoutines: [],
    currentExercise: null,
    isLoading: false,
  }),

  getters: {
    builtInExercises: (state) => state.exercises.filter(e => e.isBuiltIn),
    customExercises: (state) => state.exercises.filter(e => !e.isBuiltIn),
    
    exercisesByType: (state) => (type: string) => 
      state.exercises.filter(e => e.type === type),
    
    exercisesByMuscleGroup: (state) => (group: string) =>
      state.exercises.filter(e => e.muscleGroups.includes(group)),
  },

  actions: {
    async fetchExercises() {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      this.isLoading = true;
      
      try {
        const response = await $fetch<ApiResponse<Exercise[]>>(
          `${config.public.apiBaseUrl}/exercises`,
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
          }
        );

        if (response.success && response.data) {
          this.exercises = response.data;
        }
      } finally {
        this.isLoading = false;
      }
    },

    async fetchExercise(id: string) {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      const response = await $fetch<ApiResponse<Exercise>>(
        `${config.public.apiBaseUrl}/exercises/${id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );

      if (response.success && response.data) {
        this.currentExercise = response.data;
        return response.data;
      }
      
      throw new Error('Exercise not found');
    },

    async createExercise(data: Partial<Exercise>) {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      const response = await $fetch<ApiResponse<Exercise>>(
        `${config.public.apiBaseUrl}/exercises`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: data,
        }
      );

      if (response.success && response.data) {
        this.exercises.push(response.data);
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to create exercise');
    },

    async fetchRoutines() {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      const response = await $fetch<ApiResponse<Routine[]>>(
        `${config.public.apiBaseUrl}/routines`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );

      if (response.success && response.data) {
        this.routines = response.data;
      }
    },

    async fetchAssignedRoutines() {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      const response = await $fetch<ApiResponse<RoutineAssignment[]>>(
        `${config.public.apiBaseUrl}/routines/assigned`,
        {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        }
      );

      if (response.success && response.data) {
        this.assignedRoutines = response.data;
      }
    },

    async createRoutine(data: { name: string; description?: string; exercises: any[] }) {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      const response = await $fetch<ApiResponse<Routine>>(
        `${config.public.apiBaseUrl}/routines`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: data,
        }
      );

      if (response.success && response.data) {
        this.routines.push(response.data);
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to create routine');
    },

    async assignRoutine(routineId: string, patientId: string, data: { frequency?: string; notes?: string }) {
      const config = useRuntimeConfig();
      const auth = useAuthStore();
      
      await $fetch(
        `${config.public.apiBaseUrl}/routines/${routineId}/assign`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: { patientId, ...data },
        }
      );
    },
  },
});
