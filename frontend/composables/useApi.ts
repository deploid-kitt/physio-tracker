import { useAuthStore } from '~/stores/auth';

export function useApi() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  const baseUrl = config.public.apiBaseUrl;

  async function request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      query?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, query } = options;

    let url = `${baseUrl}${endpoint}`;
    
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth.accessToken) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }

    try {
      const response = await $fetch<T>(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      return response;
    } catch (error: any) {
      // Handle 401 - try to refresh token
      if (error.response?.status === 401 && auth.refreshToken) {
        try {
          await auth.refreshTokens();
          // Retry request
          headers['Authorization'] = `Bearer ${auth.accessToken}`;
          return await $fetch<T>(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
          });
        } catch {
          auth.logout();
          throw error;
        }
      }
      throw error;
    }
  }

  return {
    get: <T>(endpoint: string, query?: Record<string, any>) => 
      request<T>(endpoint, { method: 'GET', query }),
    
    post: <T>(endpoint: string, body?: any) => 
      request<T>(endpoint, { method: 'POST', body }),
    
    put: <T>(endpoint: string, body?: any) => 
      request<T>(endpoint, { method: 'PUT', body }),
    
    patch: <T>(endpoint: string, body?: any) => 
      request<T>(endpoint, { method: 'PATCH', body }),
    
    delete: <T>(endpoint: string) => 
      request<T>(endpoint, { method: 'DELETE' }),
  };
}
