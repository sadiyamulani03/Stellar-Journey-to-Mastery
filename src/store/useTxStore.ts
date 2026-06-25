import { create } from 'zustand';

export interface TransactionItem {
  id: string;
  hash: string | null;
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  title: string;
  timestamp: number;
  error?: string;
  explorerLink?: string;
}

interface TxState {
  transactions: TransactionItem[];
  addTransaction: (tx: Omit<TransactionItem, 'timestamp'>) => void;
  updateTransaction: (id: string, updates: Partial<Omit<TransactionItem, 'id' | 'timestamp'>>) => void;
  clearTransactions: () => void;
}

export const useTxStore = create<TxState>((set) => ({
  transactions: [],

  addTransaction: (tx) => {
    set((state) => ({
      transactions: [
        {
          ...tx,
          timestamp: Date.now(),
        },
        ...state.transactions,
      ],
    }));
  },

  updateTransaction: (id, updates) => {
    set((state) => ({
      transactions: state.transactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates } : tx
      ),
    }));
  },

  clearTransactions: () => {
    set({ transactions: [] });
  },
}));
