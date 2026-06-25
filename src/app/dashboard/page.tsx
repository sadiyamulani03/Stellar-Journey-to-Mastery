'use client';

import React, { useState, useEffect } from 'react';
import { useWalletStore } from '../../store/useWalletStore';
import { useTxStore } from '../../store/useTxStore';
import { fetchAllAgreements, getPoints, createAgreementOnChain, fundAgreementOnChain, releasePaymentOnChain, cancelAgreementOnChain } from '../../services/stellar';
import { Wallet, Plus, CircleDollarSign, User, Shield, Check, Flame, AlertCircle } from 'lucide-react';

interface Agreement {
  id: number;
  employer: string;
  contractor: string;
  token: string;
  amount: number;
  status: number; // 0=Created, 1=Funded, 2=Completed, 3=Cancelled
  title: string;
}

export default function Dashboard() {
  const { address, isConnected, connectWallet, kit } = useWalletStore();
  const { addTransaction, updateTransaction } = useTxStore();

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [contractor, setContractor] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenAddress, setTokenAddress] = useState('CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2H2MWMCD42Y4AYQXSWGWHPQ2');

  const defaultMockAgreements: Agreement[] = [
    {
      id: 1,
      employer: address || 'GBH6XRNQXMMXXCZKZKJFPNBQXFFQ2AZONNFEE4XUN4YKG2CGW3XB5V24',
      contractor: 'GBA24HODL...',
      token: 'USDC (Stellar)',
      amount: 1500,
      status: 1, // Funded
      title: 'Q2 Frontend Milestone',
    },
    {
      id: 2,
      employer: address || 'GBH6XRNQXMMXXCZKZKJFPNBQXFFQ2AZONNFEE4XUN4YKG2CGW3XB5V24',
      contractor: 'GBA24HODL...',
      token: 'XLM (Native)',
      amount: 500,
      status: 2, // Completed
      title: 'Smart Contract Audit Payout',
    }
  ];

  const loadData = async () => {
    if (!isConnected || !address) {
      setAgreements(defaultMockAgreements);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllAgreements();
      if (data && data.length > 0) {
        setAgreements(data);
      } else {
        setAgreements(defaultMockAgreements);
      }
      const pointsBal = await getPoints(address);
      setPoints(pointsBal);
    } catch (e: any) {
      console.warn('Using mock database fallback:', e);
      setAgreements(defaultMockAgreements);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isConnected, address]);

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !contractor || !amount) {
      setError('Please fill in all fields.');
      return;
    }
    
    setError(null);
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    const txId = `create-${Date.now()}`;
    addTransaction({
      id: txId,
      hash: null,
      status: 'pending',
      title: `Create Escrow: ${title}`,
    });

    try {
      if (!isConnected || !address || !kit) {
        // Fallback for visual demo
        const mockNew: Agreement = {
          id: agreements.length + 1,
          employer: address || 'GB_DEMO_EMPLOYER',
          contractor,
          token: tokenAddress === 'CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2H2MWMCD42Y4AYQXSWGWHPQ2' ? 'XLM' : 'Custom Token',
          amount: amtNum,
          status: 0,
          title,
        };
        setAgreements([...agreements, mockNew]);
        updateTransaction(txId, {
          status: 'confirmed',
          hash: 'mock_tx_hash_create_' + Math.random().toString(36).substring(7),
          explorerLink: '#',
        });
        setTitle('');
        setContractor('');
        setAmount('');
        return;
      }

      const txHash = await createAgreementOnChain(
        kit as any,
        address,
        contractor,
        tokenAddress,
        amtNum,
        title
      );

      updateTransaction(txId, {
        status: 'confirmed',
        hash: txHash,
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      });

      setTitle('');
      setContractor('');
      setAmount('');
      loadData();
    } catch (err: any) {
      console.error(err);
      updateTransaction(txId, {
        status: 'failed',
        error: err?.message || String(err),
      });
      setError(err?.message || 'Transaction failed.');
    }
  };

  const handleAction = async (agreementId: number, action: 'fund' | 'release' | 'cancel') => {
    const txId = `${action}-${agreementId}-${Date.now()}`;
    const target = agreements.find(a => a.id === agreementId);
    const displayTitle = target ? target.title : `Agreement #${agreementId}`;
    
    addTransaction({
      id: txId,
      hash: null,
      status: 'pending',
      title: `${action.toUpperCase()} Agreement: ${displayTitle}`,
    });

    try {
      if (!isConnected || !address || !kit) {
        // Mock fallback action
        setAgreements(prev => prev.map(a => {
          if (a.id === agreementId) {
            let nextStatus = a.status;
            if (action === 'fund') nextStatus = 1;
            if (action === 'release') nextStatus = 2;
            if (action === 'cancel') nextStatus = 3;
            return { ...a, status: nextStatus };
          }
          return a;
        }));
        
        if (action === 'release') {
          setPoints(p => p + Math.max(1, Math.round(target ? target.amount / 10 : 1)));
        }

        updateTransaction(txId, {
          status: 'confirmed',
          hash: `mock_tx_hash_${action}_` + Math.random().toString(36).substring(7),
          explorerLink: '#',
        });
        return;
      }

      let txHash = '';
      if (action === 'fund') {
        txHash = await fundAgreementOnChain(kit as any, address, agreementId);
      } else if (action === 'release') {
        txHash = await releasePaymentOnChain(kit as any, address, agreementId);
      } else if (action === 'cancel') {
        txHash = await cancelAgreementOnChain(kit as any, address, agreementId);
      }

      updateTransaction(txId, {
        status: 'confirmed',
        hash: txHash,
        explorerLink: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      });

      loadData();
    } catch (err: any) {
      console.error(err);
      updateTransaction(txId, {
        status: 'failed',
        error: err?.message || String(err),
      });
      setError(err?.message || `Failed to perform ${action}.`);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-semibold">Created</span>;
      case 1:
        return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-xs font-semibold">Active / Funded</span>;
      case 2:
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 w-fit"><Check className="h-3 w-3" /> Paid</span>;
      case 3:
        return <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2 py-0.5 rounded text-xs font-semibold">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Wallet State Alert / Hero banner */}
      {!isConnected && (
        <div className="bg-card/40 border border-accent/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-xl" />
          <div className="space-y-2 max-w-xl text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
              <Shield className="h-6 w-6 text-accent animate-pulse" />
              Start Building Escrows
            </h2>
            <p className="text-muted-foreground text-sm font-light">
              Connect your Stellar wallet to create agreements, fund escrows, check real-time loyalty points balances, and view transactions on-chain.
            </p>
          </div>
          <button
            onClick={connectWallet}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Wallet className="h-4 w-4" />
            <span>Connect Wallet</span>
          </button>
        </div>
      )}

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Create Payout agreement Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-accent" />
              New Payroll Escrow
            </h2>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateAgreement} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">Agreement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Software Audit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-semibold">Contractor Public Key</label>
                <input
                  type="text"
                  placeholder="e.g. GBH6XRNQ..."
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className="w-full bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-semibold">Amount (XLM)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-semibold">Token Asset</label>
                  <select
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="w-full bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent transition-colors"
                  >
                    <option value="CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2H2MWMCD42Y4AYQXSWGWHPQ2">Native XLM</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Create Agreement</span>
              </button>
            </form>
          </div>

          {/* Loyalty reward card */}
          <div className="bg-gradient-to-br from-card to-zinc-900 border border-border p-6 rounded-2xl flex flex-col justify-between h-40 relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Loyalty Rewards</span>
                <h3 className="text-white font-bold text-lg mt-0.5">Your Balance</h3>
              </div>
              <Flame className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white">{points} <span className="text-sm font-semibold text-accent">Points</span></div>
              <p className="text-xs text-muted-foreground mt-1">Earn 1 LP for every 10 tokens payouts processed</p>
            </div>
          </div>
        </div>

        {/* Right column: Agreements List (span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Active Payroll Escrows</h2>
            <button
              onClick={loadData}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              Reload List
            </button>
          </div>

          <div className="space-y-4">
            {agreements.length === 0 ? (
              <div className="bg-card border border-border text-center py-12 rounded-2xl text-muted-foreground text-sm">
                No active agreements found. Create one using the form.
              </div>
            ) : (
              agreements.map((agreement) => (
                <div key={agreement.id} className="bg-card border border-border p-6 rounded-xl space-y-4 relative overflow-hidden hover:border-zinc-700 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-accent">#{agreement.id}</span>
                        <h3 className="text-white font-bold text-base">{agreement.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> Emp: {agreement.employer.substring(0, 8)}...</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> Contractor: {agreement.contractor.substring(0, 8)}...</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-white font-extrabold text-base flex items-center gap-1">
                        <CircleDollarSign className="h-4 w-4 text-accent" />
                        <span>{agreement.amount} XLM</span>
                      </div>
                      <div className="mt-1">{getStatusBadge(agreement.status)}</div>
                    </div>
                  </div>

                  {/* Actions depending on state */}
                  {agreement.status < 2 && (
                    <div className="border-t border-border pt-4 flex flex-wrap gap-2 justify-end">
                      {agreement.status === 0 && (
                        <button
                          onClick={() => handleAction(agreement.id, 'fund')}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Fund Agreement
                        </button>
                      )}
                      {agreement.status === 1 && (
                        <button
                          onClick={() => handleAction(agreement.id, 'release')}
                          className="bg-accent hover:bg-accent/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Release Payout
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(agreement.id, 'cancel')}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Cancel Agreement
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
