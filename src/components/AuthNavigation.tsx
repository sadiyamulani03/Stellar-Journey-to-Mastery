'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import Navigation from './Navigation';

export default function AuthNavigation() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  if (pathname.startsWith('/auth')) {
    return null;
  }

  return <Navigation />;
}
