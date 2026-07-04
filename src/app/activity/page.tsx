'use client';

import React from 'react';
import { useEventStreaming } from '../../hooks/useEventStreaming';
import { formatEventDescription, normalizeEventType } from '../../lib/stellar-events';
import { Activity, PlusCircle, CheckCircle, ArrowRightLeft, XCircle, Settings, HelpCircle, ShieldAlert, RefreshCw } from 'lucide-react';

export default function ActivityPage() {
  const { events, isLoading, isError, error, refetchEvents, isFetching } = useEventStreaming();

  const getEventIcon = (type: string) => {
    switch (normalizeEventType(type)) {
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
      case 'staked':
      case 'withdrawn':
        return <ShieldAlert className="h-5 w-5 text-violet-400" />;
      case 'registered':
        return <ShieldAlert className="h-5 w-5 text-orange-400" />;
      default:
        return <Settings className="h-5 w-5 text-zinc-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-accent animate-pulse" />
            Live Event Registry Feed
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Real-time subscription to payLoyal Soroban contract events on testnet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetchEvents()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-border px-3 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
        {isLoading && events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span>Connecting to Stellar Soroban Event Stream...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-400" />
            <span>{error instanceof Error ? error.message : 'Failed to load activity feed.'}</span>
            <button
              type="button"
              onClick={() => refetchEvents()}
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-border px-4 py-2 rounded-lg text-sm text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <HelpCircle className="h-8 w-8 text-zinc-600" />
            <span>No contract events detected on testnet yet. Start wage streaming to log history.</span>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
              {events.length} event{events.length === 1 ? '' : 's'} in the last 1000 ledgers
            </p>
            <div className="relative border-l border-zinc-800 pl-6 space-y-8">
              {events.map((evt) => (
                <div key={evt.id} className="relative group">
                  <div className="absolute -left-[37px] top-0 bg-background border border-border p-1.5 rounded-full group-hover:border-zinc-700 transition-colors">
                    {getEventIcon(evt.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-white text-sm capitalize">
                        {normalizeEventType(evt.type)} Event
                      </span>
                      <span className="text-xs text-muted-foreground font-light">{evt.timestamp}</span>
                    </div>
                    <p className="text-sm text-zinc-300 font-light leading-relaxed">
                      {formatEventDescription(evt)}
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
          </>
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
