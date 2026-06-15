import React from 'react';

const explorerUrlForHash = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

const TransactionList = ({ items = [] }) => {
  if (!items.length) return (
    <div className="feedback-card">
      <p className="text-sm text-slate-300">No transactions yet.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map((tx) => (
        <div key={tx.id || tx.hash || JSON.stringify(tx)} className="feedback-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{tx.type || 'payment'}</p>
              <p className="text-xs text-slate-400">{tx.created_at || tx.localTime}</p>
            </div>
            <div>
              <p className={`text-sm ${tx.status === 'pending' ? 'text-amber-300' : tx.status === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
                {tx.status || (tx.type === 'payment' ? 'success' : 'unknown')}
              </p>
            </div>
          </div>

          <div className="mt-2 text-sm text-slate-200 break-all">
            <div>From: {tx.from}</div>
            <div>To: {tx.to}</div>
            <div>Amount: {tx.amount} {tx.asset_type || 'XLM'}</div>
            {tx.hash && (
              <div className="mt-2">
                <a href={explorerUrlForHash(tx.hash)} target="_blank" rel="noreferrer" className="text-cyan-200 underline">View on Explorer</a>
              </div>
            )}
            {tx.message && <div className="mt-2 text-xs text-slate-400">{tx.message}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
