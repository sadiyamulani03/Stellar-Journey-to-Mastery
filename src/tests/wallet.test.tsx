import { vi, describe, test, expect } from 'vitest';

// Mock the StellarWalletsKit browser modules for Node.js test runner environment
vi.mock('@creit.tech/stellar-wallets-kit', () => {
  return {
    StellarWalletsKit: {
      init: vi.fn(),
      authModal: vi.fn(),
      disconnect: vi.fn(),
    },
    Networks: {
      TESTNET: 'TESTNET',
      PUBLIC: 'PUBLIC',
    },
  };
});

vi.mock('@creit.tech/stellar-wallets-kit/modules/utils', () => {
  return {
    defaultModules: vi.fn(),
  };
});

import { useWalletStore } from '../store/useWalletStore';

describe('useWalletStoreState', () => {
  test('verifies initial state parameters', () => {
    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.balance).toBe('0.00');
    expect(state.network).toBe('TESTNET');
  });

  test('disconnect action resets connected values', async () => {
    useWalletStore.setState({
      address: 'GBH6XRNQXMMXXCZKZKJFPNBQXFFQ2AZONNFEE4XUN4YKG2CGW3XB5V24',
      isConnected: true,
      balance: '120.50',
    });

    await useWalletStore.getState().disconnectWallet();

    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.balance).toBe('0.00');
  });

  test('setNetwork sets active network configurations', () => {
    useWalletStore.getState().setNetwork('PUBLIC');
    expect(useWalletStore.getState().network).toBe('PUBLIC');
  });
});
