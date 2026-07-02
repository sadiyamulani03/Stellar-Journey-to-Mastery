'use client';

import React from 'react';
import { useEventStreaming } from '../../hooks/useEventStreaming';
import { StellarEvent } from '../../services/stellar';
import { Activity, PlusCircle, CheckCircle, ArrowRightLeft, XCircle, Settings, HelpCircle, ShieldAlert } from 'lucide-react';

export default function ActivityPage() {
  const { events, isLoading, refetchEvents } = useEventStreaming();

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'created':
        return <PlusCircle className="h-5 w-5 text-yellow-400" />;
      case 'funded':
        return <ArrowRightLeft className="h-5 w-5 text-green-400" />;
      case 'paused':
        return <XCircle className="h-5 w-5 text-zinc-500" />;
      case 'resumed':
        return <PlusCircle className="h-5 w-5 text-green-400 animate-pulse" />;
      case 'withdrew':
        return <CheckCircle className="h-5 w-5 text-accent animate-pulse" />;
      case 'reward':
        return <AwardIcon className="h-5 w-5 text-accent animate-pulse" />;
      case 'disputed':
        return <ShieldAlert className="h-5 w-5 text-red-400 animate-pulse" />;
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-blue-400" />;
      default:
        return <Settings className="h-5 w-5 text-zinc-400" />;
    }
  };

  const formatEventData = (evt: StellarEvent) => {
    const { type, data } = evt;
    if (!data) return 'Event processed successfully.';

    try {
      if (type === 'created') {
        const id = data[0]?.toString() || '?';
        const employer = data[1]?.toString() || '';
        const contractor = data[2]?.toString() || '';
        const amount = data[3] ? (Number(data[3]) / 1e7).toFixed(2) : '0';
        return `Payroll Stream #${id} created by Employer (${employer.substring(0, 6)}...) for Contractor (${contractor.substring(0, 6)}...) with value of ${amount} XLM.`;
      }
      if (type === 'funded') {
        const id = data[0]?.toString() || '?';
        const employer = data[1]?.toString() || '';
        return `Payroll Stream #${id} funded and started by Employer (${employer.substring(0, 6)}...).`;
      }
      if (type === 'paused') {
        const id = data[0]?.toString() || '?';
        return `Payroll Stream #${id} paused by Employer. Streaming progress frozen.`;
      }
      if (type === 'resumed') {
        const id = data[0]?.toString() || '?';
        return `Payroll Stream #${id} resumed by Employer. Streaming progress active.`;
      }
      if (type === 'withdrew') {
        const id = data[0]?.toString() || '?';
        const contractor = data[1]?.toString() || '';
        const amount = data[2] ? (Number(data[2]) / 1e7).toFixed(2) : '0';
        return `Wages claimed from Stream #${id}! ${amount} XLM transferred to Contractor (${contractor.substring(0, 6)}...).`;
      }
      if (type === 'disputed') {
        const id = data[0]?.toString() || '?';
        return `Dispute raised on Stream #${id}. Escrow locked. Arbiter evaluation active.`;
      }
      if (type === 'resolved') {
        const id = data[0]?.toString() || '?';
        const contractorPayout = data[1] ? (Number(data[1]) / 1e7).toFixed(2) : '0';
        const employerRefund = data[2] ? (Number(data[2]) / 1e7).toFixed(2) : '0';
        return `Dispute #${id} resolved: Contractor paid ${contractorPayout} XLM, Employer refunded ${employerRefund} XLM.`;
      }
      if (type === 'reward') {
        const user = data[0]?.toString() || '';
        const points = data[1]?.toString() || '0';
        const bal = data[2]?.toString() || '0';
        return `Loyalty points issued: Contractor (${user.substring(0, 6)}...) awarded +${points} LP (Total Balance: ${bal} LP).`;
      }
    } catch (err) {
      console.warn('Failed parsing event args:', err);
    }
    return JSON.stringify(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-accent animate-pulse" />
            Live Event Registry Feed
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Real-time second-by-second subscription to the payLoyal V2 Soroban smart contract events.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
        {isLoading && events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span>Connecting to Stellar Soroban Event Stream...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <HelpCircle className="h-8 w-8 text-zinc-600" />
            <span>No contract events detected on testnet yet. Start wage streaming to log history.</span>
          </div>
        ) : (
          <div className="relative border-l border-zinc-800 pl-6 space-y-8">
            {events.map((evt) => (
              <div key={evt.id} className="relative group">
                {/* Event timeline node */}
                <div className="absolute -left-[37px] top-0 bg-background border border-border p-1.5 rounded-full group-hover:border-zinc-700 transition-colors">
                  {getEventIcon(evt.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-white text-sm capitalize">
                      {evt.type} Event
                    </span>
                    <span className="text-xs text-muted-foreground font-light">{evt.timestamp}</span>
                  </div>
                  <p className="text-sm text-zinc-300 font-light leading-relaxed">
                    {formatEventData(evt)}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-mono bg-zinc-950 px-2 py-0.5 rounded text-zinc-500">
                      Contract: {evt.contractId.substring(0, 8)}...
                    </span>
                    <span className="text-[10px] font-mono bg-zinc-950 px-2 py-0.5 rounded text-zinc-500">
                      ID: {evt.id.substring(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AwardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}
