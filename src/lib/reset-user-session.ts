import { QueryClient } from '@tanstack/react-query';
import { useWalletStore } from '../store/useWalletStore';
import { useTxStore } from '../store/useTxStore';
import { removeScopedItem } from './user-scope';

const WALLET_CONNECTED_KEY = 'payloyal_wallet_connected';

export async function resetUserSession(queryClient?: QueryClient, userId?: string | null) {
  await useWalletStore.getState().disconnectWallet(userId ?? undefined);
  useTxStore.getState().clearTransactions();

  if (typeof window !== 'undefined' && userId) {
    removeScopedItem(WALLET_CONNECTED_KEY, userId);
  }

  queryClient?.clear();
}
