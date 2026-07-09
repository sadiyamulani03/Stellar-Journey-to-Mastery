'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { useAuth } from '../../hooks/useAuth';
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
  Award,
  RefreshCw,
  Zap
} from 'lucide-react';
import { StreamData } from '../../services/stellar';
import { getAnalyticsSnapshot } from '../../lib/monitoring';

const StreamSkeleton = () => (
  <div className="bg-card border border-border rounded-[2rem] p-7 space-y-6 animate-pulse">
    <div className="flex justify-between items-start border-b border-border pb-4">
      <div className="space-y-2">
        <div className="h-5 bg-zinc-800 rounded w-48 animate-pulse" />
        <div className="flex gap-4">
          <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
          <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
        </div>
      </div>
      <div className="h-6 bg-zinc-800 rounded w-16 animate-pulse" />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
        <div className="h-3 bg-zinc-800 rounded w-10 animate-pulse" />
      </div>
      <div className="h-3 bg-zinc-950 border border-border rounded-full w-full overflow-hidden flex">
        <div className="h-full bg-zinc-800 w-1/4 rounded-full animate-pulse" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4 pt-2 pb-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded w-16 animate-pulse" />
          <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const router = useRouter();
  const { address, balance, isConnected, isConnecting, connectionStage, detectedWallets, error: walletError, connectWallet, updateBalance, detectWallets } = useWallet();
  const { isAuthenticated, user } = useAuth();
  const { 
    streams, 
    isLoading, 
    createStream, 
    isCreating,
    fundStream, 
    fundStreamMutation,
    pauseStream, 
    pauseStreamMutation,
    resumeStream, 
    resumeStreamMutation,
    withdrawWages, 
    withdrawWagesMutation,
    raiseDispute,
    raiseDisputeMutation
  } = useStreams() as any; // Cast/bypass unused variable linter checks if needed, but we will call them
  const { points } = useLoyalty(address);
  const { addTransaction } = useTxStore();

  const [timeTicker, setTimeTicker] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState(getAnalyticsSnapshot(user?.id));

  // Stream action processing states
  const [processingStreamId, setProcessingStreamId] = useState<number | null>(null);
  const [processingAction, setProcessingAction] = useState<'fund' | 'pause' | 'resume' | 'withdraw' | 'dispute' | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [contractor, setContractor] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('86400'); // Default: 1 Day
  const [customDuration, setCustomDuration] = useState('');
  const [tokenAddress, setTokenAddress] = useState('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'); // default Testnet token or XLM

  // Faucet & Wallet detection
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState<string | null>(null);

  // Saved Workers
  const [savedWorkers, setSavedWorkers] = useState<Array<{ name: string; address: string }>>([]);
  const [workerName, setWorkerName] = useState('');
  const [saveWorkerChecked, setSaveWorkerChecked] = useState(false);

  // Batch withdrawal state
  const [isWithdrawingAll, setIsWithdrawingAll] = useState(false);

  useEffect(() => {
    detectWallets();
  }, [isConnected, detectWallets]);

  // Load saved workers on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const saved = localStorage.getItem(`payloyal_saved_workers_${user.id}`);
      if (saved) {
        try {
          setSavedWorkers(JSON.parse(saved));
        } catch (e) {
          console.warn('Failed to parse saved workers:', e);
        }
      }
    }
  }, [user?.id]);

  // Calculate withdrawable streams count and total amount
  const getWithdrawableStreamsCount = () => {
    return streams.filter((s: any) => {
      const isContractor = address ? s.contractor.toLowerCase() === address.toLowerCase() : false;
      const liveEarned = calculateLiveEarned(s, timeTicker);
      const withdrawable = Math.max(0, liveEarned - s.withdrawnAmount);
      return isContractor && (s.status === 1 || s.status === 3) && withdrawable > 0.0001;
    }).length;
  };

  const getTotalWithdrawableAmount = () => {
    return streams.reduce((acc: number, s: any) => {
      const isContractor = address ? s.contractor.toLowerCase() === address.toLowerCase() : false;
      if (!isContractor || (s.status !== 1 && s.status !== 3)) return acc;
      const liveEarned = calculateLiveEarned(s, timeTicker);
      const withdrawable = Math.max(0, liveEarned - s.withdrawnAmount);
      return acc + withdrawable;
    }, 0);
  };

  // Withdraw all earnings sequentially
  const handleWithdrawAll = async () => {
    const contractorStreams = streams.filter((s: any) => {
      const isContractor = address ? s.contractor.toLowerCase() === address.toLowerCase() : false;
      const liveEarned = calculateLiveEarned(s, timeTicker);
      const withdrawable = Math.max(0, liveEarned - s.withdrawnAmount);
      return isContractor && (s.status === 1 || s.status === 3) && withdrawable > 0.0001;
    });

    if (contractorStreams.length === 0) return;
    
    setIsWithdrawingAll(true);
    setError(null);
    
    for (const stream of contractorStreams) {
      setProcessingStreamId(stream.id);
      setProcessingAction('withdraw');
      try {
        await withdrawWages({ streamId: stream.id, title: stream.title });
      } catch (err: any) {
        setError(err?.message || `Withdrawal failed for "${stream.title}"`);
        break;
      }
    }
    setProcessingStreamId(null);
    setProcessingAction(null);
    setIsWithdrawingAll(false);
  };

  // Wrapper functions for specific streams
  const handleFundStream = async (streamId: number, title: string) => {
    setProcessingStreamId(streamId);
    setProcessingAction('fund');
    setError(null);
    try {
      await fundStream({ streamId, title });
    } catch (err: any) {
      setError(err?.message || 'Funding failed');
    } finally {
      setProcessingStreamId(null);
      setProcessingAction(null);
    }
  };

  const handlePauseStream = async (streamId: number, title: string) => {
    setProcessingStreamId(streamId);
    setProcessingAction('pause');
    setError(null);
    try {
      await pauseStream({ streamId, title });
    } catch (err: any) {
      setError(err?.message || 'Pause failed');
    } finally {
      setProcessingStreamId(null);
      setProcessingAction(null);
    }
  };

  const handleResumeStream = async (streamId: number, title: string) => {
    setProcessingStreamId(streamId);
    setProcessingAction('resume');
    setError(null);
    try {
      await resumeStream({ streamId, title });
    } catch (err: any) {
      setError(err?.message || 'Resume failed');
    } finally {
      setProcessingStreamId(null);
      setProcessingAction(null);
    }
  };

  const handleWithdrawWages = async (streamId: number, title: string) => {
    setProcessingStreamId(streamId);
    setProcessingAction('withdraw');
    setError(null);
    try {
      await withdrawWages({ streamId, title });
    } catch (err: any) {
      setError(err?.message || 'Withdrawal failed');
    } finally {
      setProcessingStreamId(null);
      setProcessingAction(null);
    }
  };

  const handleRaiseDispute = async (streamId: number, title: string) => {
    setProcessingStreamId(streamId);
    setProcessingAction('dispute');
    setError(null);
    try {
      await raiseDispute({ streamId, title });
    } catch (err: any) {
      setError(err?.message || 'Dispute failed');
    } finally {
      setProcessingStreamId(null);
      setProcessingAction(null);
    }
  };

  const handleFaucet = async () => {
    if (!address) return;
    setFaucetLoading(true);
    setFaucetSuccess(null);
    try {
      const res = await fetch(`https://friendbot.stellar.org/?addr=${address}`);
      if (!res.ok) {
        throw new Error('Friendbot funding request failed. Please try again.');
      }
      setFaucetSuccess('Wallet successfully funded with 10,000 Testnet XLM!');
      await updateBalance();
      setTimeout(() => setFaucetSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Friendbot failed.');
    } finally {
      setFaucetLoading(false);
    }
  };

  // Cash Ramp State
  const [rampModalOpen, setRampModalOpen] = useState(false);
  const [rampType, setRampType] = useState<'deposit' | 'withdraw'>('deposit');
  const [rampAmount, setRampAmount] = useState('');
  const [rampMethod, setRampMethod] = useState('bank');
  const [rampSuccess, setRampSuccess] = useState(false);
  const [rampLoading, setRampLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTicker(Date.now());
      setAnalyticsSnapshot(getAnalyticsSnapshot(user?.id));
    }, 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

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

  const getActiveStreams = (): StreamData[] => streams;

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

      // Save worker details to address book if checked
      if (saveWorkerChecked && contractor && workerName && user?.id) {
        const isAlreadySaved = savedWorkers.some(w => w.address.toLowerCase() === contractor.toLowerCase());
        if (!isAlreadySaved) {
          const updated = [...savedWorkers, { name: workerName, address: contractor }];
          setSavedWorkers(updated);
          localStorage.setItem(`payloyal_saved_workers_${user.id}`, JSON.stringify(updated));
        }
      }

      setTitle('');
      setContractor('');
      setAmount('');
      setCustomDuration('');
      setWorkerName('');
      setSaveWorkerChecked(false);
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
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* Wallet Not Connected Alert */}
      {!isConnected && (
        <div className="max-w-4xl mx-auto bg-card/40 border border-accent/20 rounded-[2rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-xl" />
          <div className="space-y-4 max-w-xl text-center sm:text-left">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                <Clock className="h-6 w-6 text-accent animate-pulse" />
                Real-time Wage Streaming MVP
              </h2>
              <p className="text-muted-foreground text-sm font-light leading-relaxed">
                Connect your Freighter or other Stellar wallet to deploy streams and view wage data linked to your account.
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start text-[10px] text-muted-foreground">
                <span>Detected in Browser:</span>
                {detectedWallets.length === 0 ? (
                  <span className="text-zinc-500 font-medium">None detected (Please install Freighter)</span>
                ) : (
                  detectedWallets.map((w) => (
                    <span key={w} className="bg-zinc-900 border border-border px-1.5 py-0.5 rounded text-white font-semibold text-[9px]">
                      {w}
                    </span>
                  ))
                )}
              </div>

              {walletError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl text-xs flex gap-1.5 mt-1 text-left items-center max-w-md">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 animate-bounce" />
                  <span>{walletError}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 shrink-0 transition-transform hover:-translate-y-0.5"
          >
            {isConnecting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            <span>
              {isConnecting 
                ? (connectionStage === 'detecting' 
                    ? 'Scanning Wallets...' 
                    : connectionStage === 'waiting_signature' 
                    ? 'Check Extension...' 
                    : 'Verifying...') 
                : 'Connect Wallet'}
            </span>
          </button>
        </div>
      )}

      {/* Onboarding and Faucet Panel */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-card border border-border/80 p-8 rounded-[2rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-10 -mt-10" />
          
          {/* Onboarding Checklist */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-accent animate-pulse" />
              Onboarding Checklist & Progress
            </h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Complete these steps to set up payLoyal wage streaming on the Stellar Testnet.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {[
                { label: 'Connect browser wallet', done: isConnected },
                { label: 'Request Testnet XLM', done: parseFloat(balance) > 0 },
                { label: 'Create a Wage Stream', done: streams.length > 0 },
                { label: 'Fund and start wages', done: streams.some((s: any) => s.status > 0) },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-2.5 bg-zinc-950/60 border border-border/60 px-4 py-3 rounded-xl">
                  {step.done ? (
                    <div className="bg-green-500/10 border border-green-500/30 p-1 rounded-full text-green-400">
                      <Check className="h-3.5 w-3.5 font-bold" />
                    </div>
                  ) : (
                    <div className="h-5.5 w-5.5 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 text-[10px] font-bold">
                      {idx + 1}
                    </div>
                  )}
                  <span className={`text-xs font-semibold ${step.done ? 'text-zinc-400 line-through' : 'text-white'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Faucet & detected wallets */}
          <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-border/80 pt-6 md:pt-0 md:pl-8 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Wallet Tools</span>
              <h4 className="font-bold text-white text-sm">Need Testnet Gas?</h4>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Fund your connected address with 10,000 test tokens in one click.
              </p>
            </div>
            
            <div className="space-y-3">
              {faucetSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-2.5 rounded-lg text-xs leading-relaxed">
                  {faucetSuccess}
                </div>
              )}
              
              <button
                onClick={handleFaucet}
                disabled={faucetLoading}
                className="w-full bg-gradient-to-r from-accent to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                {faucetLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Funding Wallet...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>Request Friendbot XLM</span>
                  </>
                )}
              </button>
              
              <div className="flex items-center gap-1.5 justify-start text-[10px] text-muted-foreground">
                <span>Detected in Browser:</span>
                {detectedWallets.length === 0 ? (
                  <span className="text-zinc-600 font-medium">Scanning...</span>
                ) : (
                  detectedWallets.map((w) => (
                    <span key={w} className="bg-zinc-900 border border-border px-1.5 py-0.5 rounded text-white font-semibold text-[9px]">
                      {w}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        <div className="bg-card border border-border p-8 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
          <span className="text-xs text-muted-foreground uppercase font-semibold">Active Streams</span>
          <div className="text-2xl font-extrabold text-white mt-2">
            {getActiveStreams().filter((s: any) => s.status === 1).length}
          </div>
        </div>

        <div className="bg-card border border-border p-7 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
          <span className="text-xs text-muted-foreground uppercase font-semibold">My Loyalty Points</span>
          <div className="text-2xl font-extrabold text-white mt-2 flex items-center gap-1.5">
            <Award className="h-6 w-6 text-accent" />
            <span>{isConnected ? points : 0} LP</span>
          </div>
        </div>

        <div className="bg-card border border-border p-7 rounded-[2rem] relative overflow-hidden group">
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

      <div className="bg-card border border-border rounded-[2rem] p-8">
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
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(analyticsSnapshot.events).slice(0, 4).map(([event, count]) => (
            <div key={event} className="rounded-3xl border border-border bg-zinc-950/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{event.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-lg font-semibold text-white">{count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Side: Create Stream Form */}
        <div className="lg:col-span-1 bg-card border border-border p-7 rounded-[2rem] h-fit space-y-6">
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

            {savedWorkers.length > 0 && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs text-muted-foreground font-semibold">Saved Workers</label>
                <select
                  onChange={(e) => {
                    const selected = savedWorkers.find(w => w.address === e.target.value);
                    if (selected) {
                      setContractor(selected.address);
                    }
                  }}
                  className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-accent"
                  defaultValue=""
                >
                  <option value="" disabled>Choose a saved worker...</option>
                  {savedWorkers.map(w => (
                    <option key={w.address} value={w.address}>{w.name} ({truncateAddress(w.address)})</option>
                  ))}
                </select>
              </div>
            )}

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

            <div className="space-y-2 pt-1 pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={saveWorkerChecked}
                  onChange={(e) => setSaveWorkerChecked(e.target.checked)}
                  className="rounded bg-zinc-950 border-border border text-accent focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
                <span>Save worker for next time</span>
              </label>
              
              {saveWorkerChecked && (
                <input
                  type="text"
                  placeholder="Worker Name (e.g. John Doe)"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-border px-3 py-1.5 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent animate-in slide-in-from-top-2"
                  required
                />
              )}
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
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>{isCreating ? 'Creating Stream...' : 'Create Stream'}</span>
            </button>
          </form>
        </div>

        {/* Right Side: Active Streams Feed */}
        <div className="lg:col-span-2 space-y-8">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Wage Streams
          </h3>

          {isConnected && getWithdrawableStreamsCount() > 0 && (
            <div className="bg-card border border-border/80 p-5 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-bold text-white text-sm">Wages Ready to Withdraw</h4>
                <p className="text-xs text-muted-foreground font-light">
                  You have earned money ready to claim across {getWithdrawableStreamsCount()} stream{getWithdrawableStreamsCount() === 1 ? '' : 's'}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleWithdrawAll}
                disabled={processingStreamId !== null || isWithdrawingAll}
                className="w-full sm:w-auto bg-gradient-to-r from-accent to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
              >
                {isWithdrawingAll ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CircleDollarSign className="h-3.5 w-3.5" />
                )}
                <span>{isWithdrawingAll ? 'Withdrawing All...' : `Withdraw All My Money (${getTotalWithdrawableAmount().toFixed(4)} XLM)`}</span>
              </button>
            </div>
          )}

          <div className="space-y-6">
            {isLoading ? (
              <div className="space-y-6">
                <StreamSkeleton />
                <StreamSkeleton />
              </div>
            ) : getActiveStreams().length === 0 ? (
              <div className="bg-card border border-border rounded-[2rem] p-10 text-center space-y-3">
                <HelpCircle className="h-8 w-8 text-zinc-600 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {isConnected
                    ? 'No wage streams linked to your wallet yet. Create one to get started.'
                    : 'Connect your wallet to view streams tied to your account.'}
                </p>
              </div>
            ) : (
            getActiveStreams().map((stream) => {
              const liveEarned = calculateLiveEarned(stream, timeTicker);
              const progress = stream.amount > 0 ? (liveEarned / stream.amount) * 100 : 0;
              const withdrawable = Math.max(0, liveEarned - stream.withdrawnAmount);

              // Calculate time left in the stream
              const timeLeft = stream.endTime - (timeTicker / 1000);
              const isEndingSoon = stream.status === 1 && timeLeft > 0 && timeLeft < 86400; // Less than 24 hours left

              // Role checks
              const isEmployer = address ? stream.employer.toLowerCase() === address.toLowerCase() : false;
              const isContractor = address ? stream.contractor.toLowerCase() === address.toLowerCase() : false;

              return (
                <div 
                  key={stream.id} 
                  className="bg-card border border-border rounded-[2rem] p-7 relative overflow-hidden group hover:border-zinc-800 transition-colors"
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
                    {isEndingSoon && (
                       <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-2.5 rounded-xl text-xs flex items-center gap-1.5 mt-2 animate-pulse font-medium">
                         <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                         <span>Wages running out soon! (Less than {Math.ceil(timeLeft / 3600)} hours left)</span>
                       </div>
                    )}
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
                          onClick={() => handleFundStream(stream.id, stream.title)}
                          disabled={processingStreamId !== null}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-40"
                        >
                          {processingStreamId === stream.id && processingAction === 'fund' ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                          )}
                          <span>{processingStreamId === stream.id && processingAction === 'fund' ? 'Funding...' : 'Fund Stream'}</span>
                        </button>
                      )}

                      {/* Pause stream */}
                      {stream.status === 1 && isEmployer && (
                        <button
                          onClick={() => handlePauseStream(stream.id, stream.title)}
                          disabled={processingStreamId !== null}
                          className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-40"
                        >
                          {processingStreamId === stream.id && processingAction === 'pause' ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Pause className="h-3.5 w-3.5 fill-current" />
                          )}
                          <span>{processingStreamId === stream.id && processingAction === 'pause' ? 'Pausing...' : 'Pause'}</span>
                        </button>
                      )}

                      {/* Resume stream */}
                      {stream.status === 3 && isEmployer && (
                        <button
                          onClick={() => handleResumeStream(stream.id, stream.title)}
                          disabled={processingStreamId !== null}
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-40"
                        >
                          {processingStreamId === stream.id && processingAction === 'resume' ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                          )}
                          <span>{processingStreamId === stream.id && processingAction === 'resume' ? 'Resuming...' : 'Resume'}</span>
                        </button>
                      )}

                      {/* Withdraw wages */}
                      {(stream.status === 1 || stream.status === 3) && isContractor && (
                        <button
                          onClick={() => handleWithdrawWages(stream.id, stream.title)}
                          disabled={withdrawable <= 0 || processingStreamId !== null}
                          className="bg-accent hover:opacity-90 disabled:opacity-40 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-transform hover:-translate-y-0.5 flex items-center gap-1 shadow-md shadow-accent/10"
                        >
                          {processingStreamId === stream.id && processingAction === 'withdraw' ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CircleDollarSign className="h-3.5 w-3.5" />
                          )}
                          <span>{processingStreamId === stream.id && processingAction === 'withdraw' ? 'Withdrawing...' : 'Withdraw Wages'}</span>
                        </button>
                      )}

                      {/* Raise dispute */}
                      {(stream.status === 1 || stream.status === 3) && (isEmployer || isContractor) && (
                        <button
                          onClick={() => handleRaiseDispute(stream.id, stream.title)}
                          disabled={processingStreamId !== null}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-40"
                        >
                          {processingStreamId === stream.id && processingAction === 'dispute' ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5" />
                          )}
                          <span>{processingStreamId === stream.id && processingAction === 'dispute' ? 'Disputing...' : 'Dispute'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
            )}
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
