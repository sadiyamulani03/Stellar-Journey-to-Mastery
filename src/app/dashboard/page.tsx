'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useStreams } from '../../hooks/useStreams';
import { useLoyalty } from '../../hooks/useLoyalty';
import { useTxStore } from '../../store/useTxStore';
import { 
  Play, 
  Pause, 
  Plus, 
  CircleDollarSign, 
  User, 
  ShieldAlert, 
  Check, 
  ArrowRight, 
  HelpCircle, 
  Clock, 
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  Building,
  Award
} from 'lucide-react';
import { StreamData } from '../../services/stellar';
import { getAnalyticsSnapshot } from '../../lib/monitoring';

export default function Dashboard() {
  const { address, isConnected, connectWallet } = useWallet();
  const { 
    streams, 
    isLoading, 
    createStream, 
    fundStream, 
    pauseStream, 
    resumeStream, 
    withdrawWages, 
    raiseDispute 
  } = useStreams();
  const { points } = useLoyalty(address);
  const { addTransaction } = useTxStore();

  const [timeTicker, setTimeTicker] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState(getAnalyticsSnapshot());

  // Form State
  const [title, setTitle] = useState('');
  const [contractor, setContractor] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('86400'); // Default: 1 Day
  const [customDuration, setCustomDuration] = useState('');
  const [tokenAddress, setTokenAddress] = useState('CDLZFC3SYJYDZT7K67VZ75HPJGWAM3BT2H2MWMCD42Y4AYQXSWGWHPQ2'); // default Testnet token or XLM

  // Cash Ramp State
  const [rampModalOpen, setRampModalOpen] = useState(false);
  const [rampType, setRampType] = useState<'deposit' | 'withdraw'>('deposit');
  const [rampAmount, setRampAmount] = useState('');
  const [rampMethod, setRampMethod] = useState('bank');
  const [rampSuccess, setRampSuccess] = useState(false);
  const [rampLoading, setRampLoading] = useState(false);

  const defaultMockStreams: StreamData[] = [
    {
      id: 991,
      employer: address || 'GB_EMPLOYER_DEMO_ADDRESS',
      contractor: 'GBA24HODL...',
      token: 'USDC (Stellar)',
      amount: 1500,
      startTime: Math.floor(Date.now() / 1000) - 3600 * 12, // 12 hours ago
      endTime: Math.floor(Date.now() / 1000) + 3600 * 12,   // 12 hours from now
      withdrawnAmount: 400,
      status: 1, // Active
      title: 'Q3 Product Dev Stream',
      lastPausedTime: 0,
      totalPausedDuration: 0,
    },
    {
      id: 992,
      employer: 'GB_EMPLOYER_DEMO_ADDRESS',
      contractor: address || 'GB_CONTRACTOR_DEMO_ADDRESS',
      token: 'XLM (Native)',
      amount: 500,
      startTime: Math.floor(Date.now() / 1000) - 3600 * 48,
      endTime: Math.floor(Date.now() / 1000) - 3600 * 24,
      withdrawnAmount: 500,
      status: 2, // Completed
      title: 'Design Audit Stream',
      lastPausedTime: 0,
      totalPausedDuration: 0,
    }
  ];

  // Set up ticker to update streaming calculations every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTicker(Date.now());
      setAnalyticsSnapshot(getAnalyticsSnapshot());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const calculateLiveEarned = (stream: StreamData, nowMs: number) => {
    if (stream.status === 0) return 0;
    if (stream.status === 2) return stream.amount;
    
    const nowSecs = Math.floor(nowMs / 1000);
    const durationSec = stream.endTime - stream.startTime;
    if (durationSec <= 0) return stream.amount;

    const calculationTime = 
      stream.status === 3 || stream.status === 4 
        ? stream.lastPausedTime 
        : nowSecs;

    const elapsed = calculationTime - stream.startTime - stream.totalPausedDuration;

    if (elapsed >= durationSec) return stream.amount;
    if (elapsed <= 0) return 0;
    return (stream.amount * elapsed) / durationSec;
  };

  const getActiveStreams = (): StreamData[] => {
    if (!isConnected || streams.length === 0) {
      return defaultMockStreams;
    }
    return streams;
  };

  const handleCreate = async (e: React.FormEvent) => {
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

    let finalDuration = parseInt(duration);
    if (duration === 'custom') {
      finalDuration = parseInt(customDuration);
      if (isNaN(finalDuration) || finalDuration <= 0) {
        setError('Custom duration must be a positive number of seconds.');
        return;
      }
    }

    try {
      await createStream({
        contractor,
        token: tokenAddress,
        amount: amtNum,
        durationSeconds: finalDuration,
        title,
      });

      setTitle('');
      setContractor('');
      setAmount('');
      setCustomDuration('');
    } catch (err: any) {
      setError(err?.message || 'Transaction execution failed.');
    }
  };

  const executeRampFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rampAmount || parseFloat(rampAmount) <= 0) return;
    setRampLoading(true);
    
    const txId = `ramp-${Date.now()}`;
    addTransaction({
      id: txId,
      hash: null,
      status: 'pending',
      title: `SEP-24 ${rampType === 'deposit' ? 'Funding' : 'Withdrawal'} via Anchor: ${rampAmount} USD`,
    });

    setTimeout(() => {
      useTxStore.getState().updateTransaction(txId, { status: 'processing' });
      
      setTimeout(() => {
        useTxStore.getState().updateTransaction(txId, {
          status: 'confirmed',
          hash: 'mock_ramp_tx_' + Math.random().toString(36).substring(7),
          explorerLink: '#',
        });
        setRampLoading(false);
        setRampSuccess(true);
      }, 2000);
    }, 1500);
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-xs font-semibold">Created</span>;
      case 1:
        return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-xs font-semibold animate-pulse">Streaming</span>;
      case 2:
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 w-fit"><Check className="h-3 w-3" /> Settled</span>;
      case 3:
        return <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2 py-0.5 rounded text-xs font-semibold">Paused</span>;
      case 4:
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Disputed</span>;
      default:
        return null;
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length < 15) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 6)}`;
  };

  return (
    <div className="space-y-8">
      {/* Wallet Not Connected Alert */}
      {!isConnected && (
        <div className="bg-card/40 border border-accent/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-xl" />
          <div className="space-y-2 max-w-xl text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
              <Clock className="h-6 w-6 text-accent animate-pulse" />
              Real-time Wage Streaming MVP
            </h2>
            <p className="text-muted-foreground text-sm font-light leading-relaxed">
              Connect your Freighter or other Stellar wallet to deploy streams. You can browse and interact with mock streams below to test the linear second-by-second streaming widget without connecting.
            </p>
          </div>
          <button
            onClick={connectWallet}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shrink-0 transition-transform hover:-translate-y-0.5"
          >
            <Wallet className="h-4 w-4" />
            <span>Connect Wallet</span>
          </button>
        </div>
      )}

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <span className="text-xs text-muted-foreground uppercase font-semibold">Active Streams</span>
          <div className="text-2xl font-extrabold text-white mt-2">
            {getActiveStreams().filter(s => s.status === 1).length}
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
          <span className="text-xs text-muted-foreground uppercase font-semibold">My Loyalty Points</span>
          <div className="text-2xl font-extrabold text-white mt-2 flex items-center gap-1.5">
            <Award className="h-6 w-6 text-accent" />
            <span>{isConnected ? points : 124} LP</span>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors" />
          <span className="text-xs text-muted-foreground uppercase font-semibold">Stellar Cash Ramps</span>
          <div className="mt-2 flex gap-3">
            <button
              onClick={() => { setRampType('deposit'); setRampModalOpen(true); setRampSuccess(false); }}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-border py-1.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-green-400" />
              <span>Deposit (USD)</span>
            </button>
            <button
              onClick={() => { setRampType('withdraw'); setRampModalOpen(true); setRampSuccess(false); }}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-border py-1.5 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-accent" />
              <span>Cash Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live Product Analytics</p>
            <h3 className="text-base font-semibold text-white">Recent product activity</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-accent">{analyticsSnapshot.totalEvents}</p>
            <p className="text-xs text-muted-foreground">tracked events</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(analyticsSnapshot.events).slice(0, 4).map(([event, count]) => (
            <div key={event} className="rounded-xl border border-border bg-zinc-950/70 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{event.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-lg font-semibold text-white">{count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create Stream Form */}
        <div className="lg:col-span-1 bg-card border border-border p-6 rounded-2xl h-fit space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-accent" />
              Create Stream
            </h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Define a linear stream to pay a remote worker second-by-second. Requires wallet approval.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Stream Title</label>
              <input
                type="text"
                placeholder="e.g. Q3 Frontend Milestone"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Contractor Public Key</label>
              <input
                type="text"
                placeholder="GB..."
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Total Amount (USDC/XLM)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Stream Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-accent"
                >
                  <option value="60">1 Minute (Test)</option>
                  <option value="3600">1 Hour</option>
                  <option value="86400">1 Day</option>
                  <option value="604800">1 Week</option>
                  <option value="2592000">30 Days</option>
                  <option value="custom">Custom Seconds</option>
                </select>
              </div>
            </div>

            {duration === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold">Custom Duration (seconds)</label>
                <input
                  type="number"
                  placeholder="e.g. 172800"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Asset Token Address</label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent font-mono text-xs"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold py-2.5 rounded-lg text-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Stream</span>
            </button>
          </form>
        </div>

        {/* Right Side: Active Streams Feed */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Wage Streams
          </h3>

          <div className="space-y-6">
            {getActiveStreams().map((stream) => {
              const liveEarned = calculateLiveEarned(stream, timeTicker);
              const progress = stream.amount > 0 ? (liveEarned / stream.amount) * 100 : 0;
              const withdrawable = Math.max(0, liveEarned - stream.withdrawnAmount);

              // Role checks
              const isEmployer = address ? stream.employer.toLowerCase() === address.toLowerCase() : true;
              const isContractor = address ? stream.contractor.toLowerCase() === address.toLowerCase() : true;

              return (
                <div 
                  key={stream.id} 
                  className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-800 transition-colors"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                  
                  {/* Header info */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-4 mb-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-base">{stream.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-light">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Employer: <span className="font-mono text-zinc-300">{truncateAddress(stream.employer)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Contractor: <span className="font-mono text-zinc-300">{truncateAddress(stream.contractor)}</span>
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(stream.status)}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Streaming Progress</span>
                      <span className="text-white">{progress.toFixed(4)}%</span>
                    </div>
                    <div className="h-3 bg-zinc-950 border border-border rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${progress}%` }} 
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 shadow-md shadow-primary/20"
                      />
                    </div>
                  </div>

                  {/* Wage values grid */}
                  <div className="grid grid-cols-3 gap-4 pt-4 pb-6 border-b border-border/50 text-center sm:text-left">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Stream</span>
                      <div className="text-sm font-bold text-white">{stream.amount} {stream.token === 'XLM (Native)' ? 'XLM' : 'USDC'}</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Withdrawn</span>
                      <div className="text-sm font-bold text-zinc-400">{stream.withdrawnAmount.toFixed(4)} {stream.token === 'XLM (Native)' ? 'XLM' : 'USDC'}</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-accent font-semibold uppercase tracking-wider block">Withdrawable</span>
                      <div className="text-sm font-extrabold text-accent">{withdrawable.toFixed(4)} {stream.token === 'XLM (Native)' ? 'XLM' : 'USDC'}</div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
                    <div className="text-xs text-muted-foreground font-light">
                      {stream.status === 1 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-accent animate-spin" />
                          Calculated second-by-second
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Fund stream */}
                      {stream.status === 0 && isEmployer && (
                        <button
                          onClick={() => fundStream({ streamId: stream.id, title: stream.title })}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Fund Stream</span>
                        </button>
                      )}

                      {/* Pause stream */}
                      {stream.status === 1 && isEmployer && (
                        <button
                          onClick={() => pauseStream({ streamId: stream.id, title: stream.title })}
                          className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Pause className="h-3.5 w-3.5 fill-current" />
                          <span>Pause</span>
                        </button>
                      )}

                      {/* Resume stream */}
                      {stream.status === 3 && isEmployer && (
                        <button
                          onClick={() => resumeStream({ streamId: stream.id, title: stream.title })}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Resume</span>
                        </button>
                      )}

                      {/* Withdraw wages */}
                      {(stream.status === 1 || stream.status === 3) && isContractor && (
                        <button
                          onClick={() => withdrawWages({ streamId: stream.id, title: stream.title })}
                          disabled={withdrawable <= 0}
                          className="bg-accent hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-transform hover:-translate-y-0.5 flex items-center gap-1 shadow-md shadow-accent/10"
                        >
                          <CircleDollarSign className="h-3.5 w-3.5" />
                          <span>Withdraw Wages</span>
                        </button>
                      )}

                      {/* Raise dispute */}
                      {(stream.status === 1 || stream.status === 3) && (isEmployer || isContractor) && (
                        <button
                          onClick={() => raiseDispute({ streamId: stream.id, title: stream.title })}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Dispute</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cash Ramp Integration Modal */}
      {rampModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 relative animate-in zoom-in-95">
            <button 
              onClick={() => setRampModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white">
                <CreditCard className="h-5 w-5 text-accent animate-pulse" />
                <h3 className="font-bold text-lg">
                  Stellar Anchor API SEP-24 Cash Ramp
                </h3>
              </div>

              {rampSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-full w-fit mx-auto text-green-400">
                    <Check className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white">Ramp Transaction Initiated</h4>
                    <p className="text-xs text-muted-foreground font-light leading-relaxed">
                      Your interactive SEP-24 widget request was approved by the Anchor. Settlement will occur in 3-5 seconds.
                    </p>
                  </div>
                  <button
                    onClick={() => setRampModalOpen(false)}
                    className="bg-zinc-900 border border-border hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    Close Window
                  </button>
                </div>
              ) : (
                <form onSubmit={executeRampFlow} className="space-y-4">
                  <div className="p-3 bg-zinc-900/60 border border-border rounded-xl text-xs text-muted-foreground font-light leading-relaxed">
                    {rampType === 'deposit' 
                      ? 'Employers can deposit fiat USD directly from a bank account or credit card to mint custom XLM/USDC tokens to fund their streams.' 
                      : 'Contractors can cash out their earned XLM/USDC tokens directly into local fiat currency, routing the funds directly to bank accounts or local wallets.'
                    }
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Amount (USD equivalent)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="100.00"
                      value={rampAmount}
                      onChange={(e) => setRampAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-semibold">Anchor Ramping Method</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setRampMethod('bank')}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          rampMethod === 'bank'
                            ? 'border-accent bg-accent/5 text-accent'
                            : 'border-border bg-zinc-950 text-muted-foreground'
                        }`}
                      >
                        <Building className="h-4 w-4" />
                        <span>Bank (ACH/SWIFT)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRampMethod('card')}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          rampMethod === 'card'
                            ? 'border-accent bg-accent/5 text-accent'
                            : 'border-border bg-zinc-950 text-muted-foreground'
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Card (Visa/MC)</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={rampLoading}
                    className="w-full bg-accent hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-1"
                  >
                    <span>{rampLoading ? 'Opening Anchor Widget...' : 'Open Anchor Portal'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
