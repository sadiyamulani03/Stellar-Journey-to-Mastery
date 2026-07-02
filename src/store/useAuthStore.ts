import { create } from 'zustand';

export interface UserProfile {
  id: string;
  username: string;
  walletAddress?: string;
  createdAt: string;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, walletAddress?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const payload = await response.json();
      if (!response.ok) {
        set({ error: payload?.error || 'Login failed.', isLoading: false });
        return false;
      }

      set({ user: payload.user, isAuthenticated: true, isLoading: false, error: null });
      return true;
    } catch (error: any) {
      set({ error: error?.message || 'Login request failed.', isLoading: false });
      return false;
    }
  },

  register: async (username, password, walletAddress) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, walletAddress }),
        credentials: 'include',
      });

      const payload = await response.json();
      if (!response.ok) {
        set({ error: payload?.error || 'Registration failed.', isLoading: false });
        return false;
      }

      set({ user: payload.user, isAuthenticated: true, isLoading: false, error: null });
      return true;
    } catch (error: any) {
      set({ error: error?.message || 'Registration request failed.', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore logout failures
    }
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  restoreSession: async () => {
    if (get().isInitialized) {
      return;
    }

    set({ isInitialized: true, isLoading: true, error: null });
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const payload = await response.json();
      set({ user: payload.user, isAuthenticated: true, isLoading: false, error: null });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
