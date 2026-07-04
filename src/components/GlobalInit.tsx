'use client';

import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useEventStreaming } from '../hooks/useEventStreaming';
import { useUserSession } from '../hooks/useUserSession';

export default function GlobalInit() {
  useAuth();
  useUserSession();
  useWallet();
  useEventStreaming();
  return null;
}
