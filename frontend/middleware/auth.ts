export default defineNuxtRouteMiddleware((to, from) => {
  const auth = useAuthStore();

  // Wait for auth to initialize
  if (auth.isLoading) {
    return;
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/login');
  }
});
