'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function AuthGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isInitialized, isLoading } = useAuth();

  useEffect(() => {
    if (!isInitialized || isLoading) {
      return;
    }

    if (!pathname.startsWith('/auth') && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [pathname, isAuthenticated, isInitialized, isLoading, router]);

  return null;
}
