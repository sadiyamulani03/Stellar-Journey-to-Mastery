import { create } from 'zustand';
import { readScopedJson, writeScopedJson } from '../lib/user-scope';

export interface TransactionItem {
  id: string;
  hash: string | null;
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  title: string;
  timestamp: number;
  error?: string;
  explorerLink?: string;
  retryAction?: () => Promise<any>;
}

interface PersistedTransactionItem extends Omit<TransactionItem, 'retryAction'> {}

interface TxState {
  userId: string | null;
  transactions: TransactionItem[];
  loadForUser: (userId: string) => void;
  addTransaction: (tx: Omit<TransactionItem, 'timestamp'>) => void;
  updateTransaction: (id: string, updates: Partial<Omit<TransactionItem, 'id' | 'timestamp'>>) => void;
  clearTransactions: () => void;
}

const TX_STORAGE_KEY = 'payloyal_transactions';

function persistTransactions(userId: string | null, transactions: TransactionItem[]) {
  if (!userId) {
    return;
  }

  const serializable: PersistedTransactionItem[] = transactions.map(({ retryAction: _retryAction, ...tx }) => tx);
  writeScopedJson(TX_STORAGE_KEY, userId, serializable);
}

export const useTxStore = create<TxState>((set, get) => ({
  userId: null,
  transactions: [],

  loadForUser: (userId) => {
    const saved = readScopedJson<PersistedTransactionItem[]>(TX_STORAGE_KEY, userId, []);
    set({ userId, transactions: saved });
  },

  addTransaction: (tx) => {
    set((state) => {
      const transactions = [
        {
          ...tx,
          timestamp: Date.now(),
        },
        ...state.transactions,
      ];
      persistTransactions(state.userId, transactions);
      return { transactions };
    });
  },

  updateTransaction: (id, updates) => {
    set((state) => {
      const transactions = state.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates } : tx
      );
      persistTransactions(state.userId, transactions);
      return { transactions };
    });
  },

  clearTransactions: () => {
    set({ transactions: [] });
  },
}));
