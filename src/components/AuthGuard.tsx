'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function AuthGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!pathname.startsWith('/auth') && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [pathname, isAuthenticated, router]);

  return null;
}
