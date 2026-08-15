import { create } from 'zustand';
import { readScopedJson, writeScopedJson } from '../lib/user-scope';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  userId: string | null;
  notifications: NotificationItem[];
  loadForUser: (userId: string) => void;
  push: (title: string, message: string, variant: NotificationItem['variant']) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  unreadCount: () => number;
}

const NOTIFICATION_STORAGE_KEY = 'payloyal_notifications';

function persist(userId: string | null, notifications: NotificationItem[]) {
  if (!userId) return;
  writeScopedJson(NOTIFICATION_STORAGE_KEY, userId, notifications.slice(0, 50));
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  userId: null,
  notifications: [],

  loadForUser: (userId) => {
    const saved = readScopedJson<NotificationItem[]>(NOTIFICATION_STORAGE_KEY, userId, []);
    set({ userId, notifications: saved });
  },

  push: (title, message, variant) => {
    const item: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title,
      message,
      variant,
      timestamp: Date.now(),
      read: false,
    };
    set((state) => {
      const notifications = [item, ...state.notifications].slice(0, 50);
      persist(state.userId, notifications);
      return { notifications };
    });
  },

  markRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      persist(state.userId, notifications);
      return { notifications };
    });
  },

  markAllRead: () => {
    set((state) => {
      const notifications = state.notifications.map((n) => ({ ...n, read: true }));
      persist(state.userId, notifications);
      return { notifications };
    });
  },

  clearAll: () => {
    set((state) => {
      persist(state.userId, []);
      return { notifications: [] };
    });
  },

  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
}));
