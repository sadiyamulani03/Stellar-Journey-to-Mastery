'use client';

import { useAuth } from '../hooks/useAuth';
import { useWallet } from '../hooks/useWallet';
import { useEventStreaming } from '../hooks/useEventStreaming';

export default function GlobalInit() {
  useAuth();            // Handles auth session recovery
  useWallet();          // Handles automatic wallet session recovery
  useEventStreaming();  // Handles global event polling & toast alerts
  return null;
}
