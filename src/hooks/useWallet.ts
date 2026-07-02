import { useEffect } from 'react';
import { useWalletStore } from '../store/useWalletStore';

export function useWallet() {
  const store = useWalletStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConnected = localStorage.getItem('payloyal_wallet_connected');
      if (savedConnected === 'true' && !store.isConnected && !store.isConnecting) {
        store.connectWallet();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (store.isConnected && store.address) {
        localStorage.setItem('payloyal_wallet_connected', 'true');
      } else if (!store.isConnecting) {
        localStorage.removeItem('payloyal_wallet_connected');
      }
    }
  }, [store.isConnected, store.address, store.isConnecting]);

  return {
    address: store.address,
    balance: store.balance,
    network: store.network,
    isConnected: store.isConnected,
    isConnecting: store.isConnecting,
    error: store.error,
    kit: store.kit,
    connectWallet: store.connectWallet,
    disconnectWallet: store.disconnectWallet,
    setNetwork: store.setNetwork,
    updateBalance: store.updateBalance,
  };
}
