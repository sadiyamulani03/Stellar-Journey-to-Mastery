import { useEffect } from 'react';
import { useWalletStore } from '../store/useWalletStore';
import { useAuthStore } from '../store/useAuthStore';
import { parseJsonResponse } from '../lib/api';
import { scopedStorageKey } from '../lib/user-scope';
import { trackProductEvent } from '../lib/monitoring';

const WALLET_CONNECTED_KEY = 'payloyal_wallet_connected';

async function persistWalletForUser(walletAddress: string) {
  const response = await fetch('/api/auth/wallet', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
    credentials: 'include',
  });

  if (!response.ok) {
    return;
  }

  const payload = await parseJsonResponse(response, { user: null });
  if (payload?.user) {
    useAuthStore.setState({ user: payload.user, isAuthenticated: true });
  }
}

export function useWallet() {
  const store = useWalletStore();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || !userId) {
      return;
    }

    const storageKey = scopedStorageKey(WALLET_CONNECTED_KEY, userId);
    const savedConnected = localStorage.getItem(storageKey);
    if (savedConnected === 'true' && !store.isConnected && !store.isConnecting) {
      store.connectWallet(userId);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !userId) {
      return;
    }

    const storageKey = scopedStorageKey(WALLET_CONNECTED_KEY, userId);
    if (store.isConnected && store.address) {
      localStorage.setItem(storageKey, 'true');
      void persistWalletForUser(store.address);
    } else if (!store.isConnecting) {
      localStorage.removeItem(storageKey);
    }
  }, [store.isConnected, store.address, store.isConnecting, userId]);

  return {
    address: store.address,
    balance: store.balance,
    network: store.network,
    isConnected: store.isConnected,
    isConnecting: store.isConnecting,
    error: store.error,
    kit: store.kit,
    connectWallet: () => store.connectWallet(userId ?? undefined),
    disconnectWallet: () => store.disconnectWallet(userId ?? undefined),
    setNetwork: store.setNetwork,
    updateBalance: store.updateBalance,
  };
}
