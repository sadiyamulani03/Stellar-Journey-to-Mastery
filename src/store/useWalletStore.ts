import { create } from 'zustand';
import { trackProductEvent } from '../lib/monitoring';

// Defer StellarWalletsKit loading to client-side only to support Next.js server-side pre-rendering
let StellarWalletsKit: any = null;
let Networks: any = null;

if (typeof window !== 'undefined') {
  try {
    const swk = require('@creit.tech/stellar-wallets-kit');
    StellarWalletsKit = swk.StellarWalletsKit;
    Networks = swk.Networks;
    
    const { defaultModules } = require('@creit.tech/stellar-wallets-kit/modules/utils');
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: defaultModules(),
    });
  } catch (err) {
    console.error('Failed to initialize StellarWalletsKit on client:', err);
  }
}

interface WalletState {
  address: string | null;
  balance: string;
  network: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  kit: any;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  setNetwork: (network: string) => void;
  updateBalance: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  balance: '0.00',
  network: 'TESTNET',
  isConnected: false,
  isConnecting: false,
  error: null,
  kit: typeof window !== 'undefined' ? StellarWalletsKit : null,

  connectWallet: async () => {
    if (typeof window === 'undefined' || !StellarWalletsKit) {
      set({ error: 'Wallet kit is not available on server.' });
      return null;
    }
    set({ isConnecting: true, error: null });
    try {
      const { address } = await StellarWalletsKit.authModal();
      set({
        address,
        isConnected: true,
        isConnecting: false,
      });
      trackProductEvent('wallet_connected', { network: 'TESTNET' });
      await get().updateBalance();
      return address;
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      const errMsg = err?.message || String(err);
      let friendlyMsg = 'Failed to connect wallet. Please try again.';
      if (errMsg.includes('closed') || errMsg.includes('dismissed')) {
        friendlyMsg = 'Wallet connection cancelled by the user.';
      } else if (errMsg.includes('install')) {
        friendlyMsg = 'Selected wallet is not installed. Please install it to continue.';
      }
      set({ error: friendlyMsg, isConnecting: false, isConnected: false, address: null });
      return null;
    }
  },

  disconnectWallet: async () => {
    if (typeof window !== 'undefined' && StellarWalletsKit) {
      try {
        await StellarWalletsKit.disconnect();
      } catch (err) {
        console.warn('Disconnect error:', err);
      }
    }
    set({ address: null, isConnected: false, balance: '0.00' });
    trackProductEvent('wallet_disconnected');
  },

  setNetwork: (network: string) => {
    set({ network });
    if (typeof window !== 'undefined' && StellarWalletsKit && Networks) {
      const { defaultModules } = require('@creit.tech/stellar-wallets-kit/modules/utils');
      StellarWalletsKit.init({
        network: network === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET,
        modules: defaultModules(),
      });
    }
    get().updateBalance();
  },

  updateBalance: async () => {
    const { address, network } = get();
    if (!address) return;
    try {
      const url = network === 'PUBLIC' 
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org';
      const res = await fetch(`${url}/accounts/${address}`);
      if (res.status === 404) {
        set({ balance: '0.00' });
        return;
      }
      const data = await res.json();
      const nativeBal = data.balances.find((b: any) => b.asset_type === 'native');
      set({ balance: parseFloat(nativeBal?.balance || '0').toFixed(2) });
    } catch (err) {
      console.warn('Failed to update balance:', err);
    }
  },
}));
