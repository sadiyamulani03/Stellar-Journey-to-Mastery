'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useTxStore } from '../store/useTxStore';
import { resetUserSession } from '../lib/reset-user-session';

export function useUserSession() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousUserId.current;

    if (previous && previous !== userId) {
      void resetUserSession(queryClient, previous);
    }

    if (userId) {
      useTxStore.getState().loadForUser(userId);
    } else if (previous) {
      useTxStore.getState().clearTransactions();
    }

    previousUserId.current = userId;
  }, [userId, queryClient]);

  useEffect(() => {
    if (!isAuthenticated && previousUserId.current) {
      void resetUserSession(queryClient, previousUserId.current);
      previousUserId.current = null;
    }
  }, [isAuthenticated, queryClient]);
}
