import { create } from 'zustand';
import { parseJsonResponse } from '../lib/api';
import { trackProductEvent } from '../lib/monitoring';

// Defer StellarWalletsKit loading to client-side only to support Next.js server-side pre-rendering
let StellarWalletsKit: any = null;
let Networks: any = null;
let kitReady = false;

if (typeof window !== 'undefined') {
  try {
    const swk = require('@creit.tech/stellar-wallets-kit');
    StellarWalletsKit = swk.StellarWalletsKit;
    Networks = swk.Networks;

    const { defaultModules } = require('@creit.tech/stellar-wallets-kit/modules/utils');
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: defaultModules(),
      authModal: {
        showInstallLabel: true,
        hideUnsupportedWallets: false, // keep this false so Albedo/xBull still show even if Freighter isn't detected
      },
    });
    kitReady = true;
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
  connectionStage: 'idle' | 'detecting' | 'waiting_signature' | 'verifying';
  detectedWallets: string[];
  error: string | null;
  kit: any;
  connectWallet: (userId?: string, silent?: boolean) => Promise<string | null>;
  disconnectWallet: (userId?: string) => Promise<void>;
  setNetwork: (network: string) => void;
  updateBalance: () => Promise<void>;
  detectWallets: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  balance: '0.00',
  network: 'TESTNET',
  isConnected: false,
  isConnecting: false,
  connectionStage: 'idle',
  detectedWallets: [],
  error: null,
  kit: typeof window !== 'undefined' ? StellarWalletsKit : null,

  detectWallets: () => {
    if (typeof window === 'undefined') return;
    const detected: string[] = [];
    if (!!(window as any).freighter || !!(window as any).stellarKeys) detected.push('Freighter');
    if (!!(window as any).albedo) detected.push('Albedo');
    if (!!(window as any).xbull) detected.push('xBull');
    if (!!(window as any).lobstr) detected.push('Lobstr');
    set({ detectedWallets: detected });
  },

  connectWallet: async (userId?: string, silent = false) => {
    if (typeof window === 'undefined' || !StellarWalletsKit || !kitReady) {
      set({ error: 'Wallet kit is not available on server.', connectionStage: 'idle' });
      return null;
    }
    
    // Scan browser wallets
    get().detectWallets();
    
    const savedWalletType = typeof window !== 'undefined' ? localStorage.getItem('payloyal_wallet_type') : null;
    if (silent && !savedWalletType) {
      return null;
    }
    
    set({ isConnecting: true, connectionStage: 'detecting', error: null });
    try {
      let address = '';
      if (silent && savedWalletType) {
        set({ connectionStage: 'verifying' });
        StellarWalletsKit.setWallet(savedWalletType);
        const addrObj = await StellarWalletsKit.getAddress();
        address = addrObj.address;
      } else {
        set({ connectionStage: 'waiting_signature' });
        const res = await StellarWalletsKit.authModal();
        address = res.address;
        
        const walletId = StellarWalletsKit.selectedModule?.id;
        if (walletId && typeof window !== 'undefined') {
          localStorage.setItem('payloyal_wallet_type', walletId);
        }
      }
      
      set({
        address,
        isConnected: true,
        isConnecting: false,
        connectionStage: 'idle',
      });
      trackProductEvent('wallet_connected', { network: 'TESTNET' }, userId);
      await get().updateBalance();
      return address;
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      if (silent) {
        set({ isConnecting: false, isConnected: false, address: null, connectionStage: 'idle' });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('payloyal_wallet_type');
        }
        return null;
      }
      
      const errMsg = err?.message || String(err);
      let friendlyMsg = 'Failed to connect wallet. Please try again.';
      
      const errMsgLower = errMsg.toLowerCase();
      if (
        errMsgLower.includes('closed') || 
        errMsgLower.includes('dismissed') || 
        errMsgLower.includes('cancel')
      ) {
        friendlyMsg = 'Wallet connection cancelled.';
      } else if (
        errMsgLower.includes('install') || 
        errMsgLower.includes('not found') || 
        errMsgLower.includes('not_found')
      ) {
        friendlyMsg = 'Wallet not found.';
      } else if (
        errMsgLower.includes('network') || 
        errMsgLower.includes('passphrase') || 
        errMsgLower.includes('network mismatch')
      ) {
        friendlyMsg = 'Network mismatch.';
      } else if (
        errMsgLower.includes('reject') || 
        errMsgLower.includes('decline')
      ) {
        friendlyMsg = 'Transaction rejected.';
      } else if (
        errMsgLower.includes('404') || 
        errMsgLower.includes('not funded') ||
        errMsgLower.includes('not_found')
      ) {
        friendlyMsg = 'Account not funded.';
      }
      
      set({ 
        error: friendlyMsg, 
        isConnecting: false, 
        isConnected: false, 
        address: null, 
        connectionStage: 'idle' 
      });
      return null;
    }
  },

  disconnectWallet: async (userId?: string) => {
    if (typeof window !== 'undefined' && StellarWalletsKit && kitReady) {
      try {
        await StellarWalletsKit.disconnect();
      } catch (err) {
        console.warn('Disconnect error:', err);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('payloyal_wallet_type');
    }
    set({ address: null, isConnected: false, balance: '0.00', connectionStage: 'idle' });
    trackProductEvent('wallet_disconnected', undefined, userId);
  },

  setNetwork: (network: string) => {
    set({ network });
    if (typeof window !== 'undefined' && StellarWalletsKit && Networks && kitReady) {
      StellarWalletsKit.setNetwork(network === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET);
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
      const data = await parseJsonResponse<{ balances: { asset_type: string; balance: string }[] }>(
        res,
        { balances: [] }
      );
      const nativeBal = data.balances.find((b) => b.asset_type === 'native');
      set({ balance: parseFloat(nativeBal?.balance || '0').toFixed(2) });
    } catch (err) {
      console.warn('Failed to update balance:', err);
    }
  },
}));
