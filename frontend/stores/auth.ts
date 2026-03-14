import { defineStore } from 'pinia';
import type { User, ApiResponse } from '~/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    isPhysio: (state) => state.user?.role === 'PHYSIO' || state.user?.role === 'ADMIN',
    isPatient: (state) => state.user?.role === 'PATIENT',
  },

  actions: {
    async init() {
      if (typeof window === 'undefined') return;
      
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (accessToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        
        try {
          await this.fetchUser();
        } catch {
          this.logout();
        }
      }
      
      this.isLoading = false;
    },

    async login(email: string, password: string) {
      const config = useRuntimeConfig();
      
      const response = await $fetch<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
        `${config.public.apiBaseUrl}/auth/login`,
        {
          method: 'POST',
          body: { email, password },
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Login failed');
      }

      this.user = response.data.user;
      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;

      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    },

    async register(data: { email: string; password: string; firstName: string; lastName: string; role?: string }) {
      const config = useRuntimeConfig();
      
      const response = await $fetch<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
        `${config.public.apiBaseUrl}/auth/register`,
        {
          method: 'POST',
          body: data,
        }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Registration failed');
      }

      this.user = response.data.user;
      this.accessToken = response.data.accessToken;
      this.refreshToken = response.data.refreshToken;

      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    },

    async fetchUser() {
      const config = useRuntimeConfig();
      
      const response = await $fetch<ApiResponse<User>>(
        `${config.public.apiBaseUrl}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch user');
      }

      this.user = response.data;
    },

    async refreshTokens() {
      if (!this.refreshToken) {
        this.logout();
        return;
      }

      const config = useRuntimeConfig();
      
      try {
        const response = await $fetch<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${config.public.apiBaseUrl}/auth/refresh`,
          {
            method: 'POST',
            body: { refreshToken: this.refreshToken },
          }
        );

        if (!response.success || !response.data) {
          throw new Error('Token refresh failed');
        }

        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;

        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
      } catch {
        this.logout();
      }
    },

    logout() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      navigateTo('/login');
    },

    async updateProfile(data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
      const config = useRuntimeConfig();
      
      const response = await $fetch<ApiResponse<User>>(
        `${config.public.apiBaseUrl}/users/me`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: data,
        }
      );

      if (response.success && response.data) {
        this.user = response.data;
      }
    },

    async updateCalibration(data: { standingKneeAngle?: number; mobilityLimit?: number; asymmetryBaseline?: number }) {
      const config = useRuntimeConfig();
      
      await $fetch(
        `${config.public.apiBaseUrl}/users/me/calibration`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: data,
        }
      );

      await this.fetchUser();
    },
  },
});
