'use client';

import React from 'react';
import { useTxStore, TransactionItem } from '../../store/useTxStore';
import { History, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, Trash2, ArrowUpRight } from 'lucide-react';

export default function TxCenter() {
  const { transactions, clearTransactions, updateTransaction } = useTxStore();

  const getStatusIcon = (status: TransactionItem['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-400 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const getStatusClass = (status: TransactionItem['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'pending':
      case 'processing':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'failed':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
    }
  };

  const handleRetryMock = (tx: TransactionItem) => {
    const retryId = tx.id;
    updateTransaction(retryId, { status: 'processing', error: undefined });
    setTimeout(() => {
      updateTransaction(retryId, {
        status: 'confirmed',
        hash: 'mock_tx_retry_' + Math.random().toString(36).substring(7),
        explorerLink: '#',
      });
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
            <History className="h-6 w-6 text-accent" />
            Transaction Management Center
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Monitor transaction lifecycle state machine transitions (Pending &rarr; Processing &rarr; Confirmed).
          </p>
        </div>
        
        {transactions.length > 0 && (
          <button
            onClick={clearTransactions}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
        {transactions.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="bg-zinc-900 border border-border p-3 rounded-full w-fit mx-auto text-muted-foreground">
              <History className="h-6 w-6" />
            </div>
            <p className="text-muted-foreground text-sm font-light">
              No transactions triggered in this session. Create or execute agreement payouts to see logs.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-zinc-900/40 border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-800 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tx.status)}
                    <span className="font-semibold text-white text-sm">{tx.title}</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground font-light">
                    <span>Initiated: {new Date(tx.timestamp).toLocaleTimeString()}</span>
                    {tx.hash && (
                      <span className="flex items-center gap-1">
                        Hash: <code className="bg-zinc-950 px-1 py-0.5 rounded text-accent font-semibold">{tx.hash.substring(0, 16)}...</code>
                      </span>
                    )}
                  </div>

                  {tx.error && (
                    <div className="bg-red-500/5 border border-red-500/10 rounded px-3 py-2 text-xs text-red-400/90 flex gap-1.5 mt-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{tx.error}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusClass(tx.status)}`}>
                    {tx.status}
                  </span>
                  
                  {tx.explorerLink && tx.hash && (
                    <a
                      href={tx.explorerLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-zinc-950 hover:bg-zinc-900 border border-border p-2 rounded-lg text-muted-foreground hover:text-white transition-colors"
                      title="View on Explorer"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}

                  {tx.status === 'failed' && (
                    <button
                      onClick={() => handleRetryMock(tx)}
                      className="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 p-2 rounded-lg transition-colors"
                      title="Retry Transaction"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
