'use client';

import React, { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useDisputes } from '../../hooks/useDisputes';
import { useTxStore } from '../../store/useTxStore';
import { 
  Shield, 
  Award, 
  Lock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Scale, 
  Users, 
  ArrowRight,
  UserCheck,
  Ban,
  Clock
} from 'lucide-react';
import { DisputeData } from '../../services/stellar';

export default function DisputeHub() {
  const { address, isConnected, connectWallet } = useWallet();
  const { 
    disputes, 
    arbiterStake, 
    activeVotesCount, 
    stakeBond, 
    withdrawBond, 
    voteOnDispute, 
    resolveDispute 
  } = useDisputes();
  const { addTransaction } = useTxStore();

  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Mock Disputes for demonstration / disconnected state
  const [mockDisputes, setMockDisputes] = useState<DisputeData[]>([
    {
      id: 1,
      streamId: 991,
      employer: 'GBH6XRNQXMMXXCZKZKJFPNBQXFFQ2AZONNFEE4XUN4YKG2CGW3XB5V24',
      contractor: 'GBA24HODL...',
      amountLocked: 1100,
      status: 0, // Open
      employerVotes: 2,
      contractorVotes: 3,
      endTime: Math.floor(Date.now() / 1000) + 120, // Closes in 2 minutes
      feeAmount: 55, // 5% fee
      escrowContract: 'CCMQWEWUNR5LVWI6KSBCMILU66ZWCX3LVQDX7QB3OYFAZJZI7CDKLYDO',
    },
    {
      id: 2,
      streamId: 992,
      employer: 'GB_EMPLOYER_DEMO_ADDRESS',
      contractor: 'GB_CONTRACTOR_DEMO_ADDRESS',
      amountLocked: 500,
      status: 1, // Resolved
      employerVotes: 1,
      contractorVotes: 4,
      endTime: Math.floor(Date.now() / 1000) - 3600, // Closed 1 hour ago
      feeAmount: 25,
      escrowContract: 'CCMQWEWUNR5LVWI6KSBCMILU66ZWCX3LVQDX7QB3OYFAZJZI7CDKLYDO',
    }
  ]);

  const [mockArbiterStake, setMockArbiterStake] = useState(100); // 100 XLM mock stake
  const [mockActiveVotes, setMockActiveVotes] = useState(0);

  const getDisputesList = (): DisputeData[] => {
    if (!isConnected || disputes.length === 0) {
      return mockDisputes;
    }
    return disputes;
  };

  const getArbiterStakeVal = (): number => {
    return isConnected ? arbiterStake : mockArbiterStake;
  };

  const getActiveVotesCountVal = (): number => {
    return isConnected ? activeVotesCount : mockActiveVotes;
  };

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    setStakeError(null);
    const amt = parseFloat(stakeAmount);
    if (isNaN(amt) || amt <= 0) {
      setStakeError('Amount must be positive.');
      return;
    }

    if (!isConnected) {
      // Mock Staking
      setMockArbiterStake(prev => prev + amt);
      setStakeAmount('');
      addTransaction({
        id: `mock-stake-${Date.now()}`,
        hash: 'mock_tx_' + Math.random().toString(36).substring(7),
        status: 'confirmed',
        title: `Staked security bond: ${amt} XLM`,
      });
      return;
    }

    try {
      await stakeBond({ amount: amt });
      setStakeAmount('');
    } catch (err: any) {
      setStakeError(err.message || 'Staking transaction failed.');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError('Amount must be positive.');
      return;
    }

    const currentStake = getArbiterStakeVal();
    if (currentStake < amt) {
      setWithdrawError('Insufficient stake to withdraw.');
      return;
    }

    const activeVotes = getActiveVotesCountVal();
    if (activeVotes > 0) {
      setWithdrawError('Cannot withdraw security bond while actively voting in open disputes.');
      return;
    }

    if (!isConnected) {
      // Mock Withdraw
      setMockArbiterStake(prev => prev - amt);
      setWithdrawAmount('');
      addTransaction({
        id: `mock-withdraw-${Date.now()}`,
        hash: 'mock_tx_' + Math.random().toString(36).substring(7),
        status: 'confirmed',
        title: `Withdrew security bond: ${amt} XLM`,
      });
      return;
    }

    try {
      await withdrawBond({ amount: amt });
      setWithdrawAmount('');
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal transaction failed.');
    }
  };

  const handleVote = async (disputeId: number, vote: number, streamTitle: string) => {
    if (getArbiterStakeVal() < 100) {
      alert('You must stake at least 100 XLM to participate in voting.');
      return;
    }

    if (!isConnected) {
      // Mock voting action
      setMockDisputes(prev => prev.map(d => {
        if (d.id === disputeId) {
          return {
            ...d,
            employerVotes: vote === 0 ? d.employerVotes + 1 : d.employerVotes,
            contractorVotes: vote === 1 ? d.contractorVotes + 1 : d.contractorVotes,
          };
        }
        return d;
      }));
      setMockActiveVotes(v => v + 1);

      addTransaction({
        id: `mock-vote-${disputeId}-${Date.now()}`,
        hash: 'mock_tx_' + Math.random().toString(36).substring(7),
        status: 'confirmed',
        title: `Cast vote on dispute #${disputeId}: ${vote === 1 ? 'Release' : 'Refund'}`,
      });
      return;
    }

    try {
      await voteOnDispute({ disputeId, vote, streamTitle });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (disputeId: number, streamTitle: string) => {
    if (!isConnected) {
      // Mock resolution
      setMockDisputes(prev => prev.map(d => {
        if (d.id === disputeId) {
          return { ...d, status: 1 }; // Resolve
        }
        return d;
      }));
      setMockActiveVotes(0); // clear voting count in mock

      // Simulate slashing of minority voters
      const target = mockDisputes.find(d => d.id === disputeId);
      if (target) {
        const contractorWins = target.contractorVotes > target.employerVotes;
        // Mock distribution simulation logic:
        // We simulate that since we voted with majority, we get a payout
        setMockArbiterStake(prev => prev + 10); // add reward points/tokens
      }

      addTransaction({
        id: `mock-resolve-${disputeId}-${Date.now()}`,
        hash: 'mock_tx_' + Math.random().toString(36).substring(7),
        status: 'confirmed',
        title: `Resolved dispute #${disputeId} (${streamTitle})`,
      });
      return;
    }

    try {
      await resolveDispute({ disputeId, streamTitle });
    } catch (err) {
      console.error(err);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length < 15) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 6)}`;
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
          <Scale className="h-6 w-6 text-accent animate-pulse" />
          Decentralized Dispute Hub
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Arbitrate remote worker payroll streams fairly. Stake your security bond, evaluate active disputes, cast your vote, and earn flat service fees.
        </p>
      </div>

      {/* Warnings & info banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stake warning banner */}
        <div className="bg-card border border-border p-6 rounded-2xl md:col-span-2 relative overflow-hidden flex flex-col md:flex-row gap-5 items-start justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl" />
          <div className="space-y-3 max-w-lg">
            <h3 className="font-bold text-white text-base flex items-center gap-1.5">
              <Shield className="h-5 w-5 text-accent" />
              Arbiter Security Deposits
            </h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Arbiters must maintain a minimum security deposit of **100 XLM** to cast votes. Staked funds are held in trust inside the `payloyal-resolver` contract to prevent collusion.
            </p>
            <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg text-[11px] text-yellow-400/90 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>CRITICAL CONST-STAKE RULE:</strong> No passive interest is calculated or paid on arbiter stakes. Honest majority arbiters are rewarded purely through the dispute service fees. Dishonest minority voters are slashed immediately upon resolution.
              </span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-border rounded-xl p-4 w-full md:w-48 shrink-0 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">My Staked Bond</span>
            <div className="text-2xl font-black text-white">{getArbiterStakeVal()} XLM</div>
            <span className="text-[10px] text-muted-foreground block">
              Active Voting In: <strong>{getActiveVotesCountVal()}</strong> disputes
            </span>
          </div>
        </div>

        {/* Action side form: Stake / Withdraw */}
        <div className="bg-card border border-border p-6 rounded-2xl md:col-span-1 space-y-4">
          <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-accent" />
            Manage Stake
          </h4>

          {/* Stake Form */}
          <form onSubmit={handleStake} className="space-y-2 border-b border-border pb-4">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Amount (XLM)"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="flex-1 bg-zinc-950 border border-border px-3 py-1.5 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="bg-accent hover:opacity-90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-transform hover:-translate-y-0.5"
              >
                Stake
              </button>
            </div>
            {stakeError && <p className="text-[10px] text-red-400 font-light">{stakeError}</p>}
          </form>

          {/* Withdraw Form */}
          <form onSubmit={handleWithdraw} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Amount (XLM)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 bg-zinc-950 border border-border px-3 py-1.5 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={getActiveVotesCountVal() > 0}
                className="bg-zinc-900 border border-border hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-transform hover:-translate-y-0.5"
              >
                Withdraw
              </button>
            </div>
            {withdrawError && <p className="text-[10px] text-red-400 font-light">{withdrawError}</p>}
            {getActiveVotesCountVal() > 0 && (
              <p className="text-[10px] text-yellow-400/90 font-light leading-relaxed">
                Unlock required: Finish active dispute voting rounds before withdrawing bond.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Disputes list */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
          <Users className="h-5 w-5 text-accent" />
          Active Dispute Board
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {getDisputesList().map((dispute) => {
            const hasEnded = Math.floor(Date.now() / 1000) >= dispute.endTime;
            const isResolved = dispute.status === 1;

            return (
              <div 
                key={dispute.id}
                className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between hover:border-zinc-800 transition-colors"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />

                <div className="space-y-4">
                  {/* Header info */}
                  <div className="flex justify-between items-center border-b border-border/60 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-white text-base">Dispute #{dispute.id}</h4>
                      <span className="text-xs text-muted-foreground">Stream Stream ID: {dispute.streamId}</span>
                    </div>

                    <div>
                      {isResolved ? (
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Resolved
                        </span>
                      ) : hasEnded ? (
                        <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Voting Closed
                        </span>
                      ) : (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold animate-pulse">
                          Active Voting
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body stats */}
                  <div className="grid grid-cols-3 gap-2 bg-zinc-950/40 border border-border/50 p-4 rounded-xl text-center">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold">Locked Escrow</span>
                      <div className="text-sm font-bold text-white">{dispute.amountLocked} XLM</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-accent font-semibold uppercase">Dispute Fee</span>
                      <div className="text-sm font-extrabold text-accent">{dispute.feeAmount} XLM</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold">Consensus Vote</span>
                      <div className="text-sm font-bold text-white">
                        {dispute.contractorVotes} vs {dispute.employerVotes}
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="space-y-1.5 text-xs text-muted-foreground font-light leading-relaxed">
                    <div className="flex justify-between">
                      <span>Employer:</span>
                      <span className="font-mono text-zinc-300">{truncateAddress(dispute.employer)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contractor:</span>
                      <span className="font-mono text-zinc-300">{truncateAddress(dispute.contractor)}</span>
                    </div>
                  </div>
                </div>

                {/* Dispute Actions */}
                <div className="pt-6 mt-4 border-t border-border/40 flex items-center justify-end gap-2">
                  {!isResolved && !hasEnded && (
                    <>
                      <button
                        onClick={() => handleVote(dispute.id, 0, `Stream #${dispute.streamId}`)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        <span>Refund Employer</span>
                      </button>
                      <button
                        onClick={() => handleVote(dispute.id, 1, `Stream #${dispute.streamId}`)}
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Release Contractor</span>
                      </button>
                    </>
                  )}

                  {!isResolved && hasEnded && (
                    <button
                      onClick={() => handleResolve(dispute.id, `Stream #${dispute.streamId}`)}
                      className="w-full bg-accent hover:opacity-90 text-white text-xs font-bold py-2 rounded-lg transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5 shadow-md shadow-accent/10"
                    >
                      <Scale className="h-4 w-4" />
                      <span>Finalize and Resolve Dispute</span>
                    </button>
                  )}

                  {isResolved && (
                    <div className="text-xs text-muted-foreground font-light w-full text-center">
                      Resolved: Remaining funds split according to arbiter consensus. Slashes processed.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
