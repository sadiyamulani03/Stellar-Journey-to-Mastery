import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export function useAuth() {
  const auth = useAuthStore();

  useEffect(() => {
    auth.restoreSession();
  }, []);

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isInitialized: auth.isInitialized,
    isLoading: auth.isLoading,
    error: auth.error,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
  };
}
