'use client';

import { useWallet } from '../hooks/useWallet';
import { useEventStreaming } from '../hooks/useEventStreaming';

export default function GlobalInit() {
  useWallet();          // Handles automatic wallet session recovery
  useEventStreaming();   // Handles global event polling & toast alerts
  return null;
}
