'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllStreams } from '../../services/stellar';
import { BarChart3, TrendingUp, DollarSign, Users, Award, ShieldCheck } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: streams = [], isLoading, isError } = useQuery({
    queryKey: ['globalStreams'],
    queryFn: fetchAllStreams,
    refetchInterval: 15000, // Refresh every 15 seconds to keep it real-time
  });

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="space-y-2">
          <div className="h-8 bg-zinc-900 rounded-lg w-64 animate-pulse" />
          <div className="h-4 bg-zinc-900 rounded-lg w-96 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border p-6 rounded-[2rem] h-36 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-card border border-border p-6 rounded-[2rem] h-80 animate-pulse" />
          <div className="bg-card border border-border p-6 rounded-[2rem] h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  // Calculate live stats
  const cumulativeVolume = streams.reduce((acc, s) => acc + s.amount, 0);
  const activeEscrow = streams
    .filter((s) => s.status === 1 || s.status === 3)
    .reduce((acc, s) => acc + (s.amount - s.withdrawnAmount), 0);
  const uniqueContractors = new Set(streams.map((s) => s.contractor.toLowerCase())).size;
  const loyaltyPointsIssued = streams.reduce((acc, s) => acc + s.withdrawnAmount / 10, 0);

  // Calculate dynamic 6 months for payouts chart
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      name: monthNames[d.getMonth()],
      monthIndex: d.getMonth(),
      year: d.getFullYear(),
      val: 0,
    });
  }

  streams.forEach((stream) => {
    const date = new Date(stream.startTime * 1000);
    const m = date.getMonth();
    const y = date.getFullYear();
    const matchIndex = months.findIndex((item) => item.monthIndex === m && item.year === y);
    if (matchIndex !== -1) {
      months[matchIndex].val += stream.amount;
    }
  });

  const maxChartVal = Math.max(...months.map((m) => m.val), 1);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-accent" />
            Protocol Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Real-time metrics, gas fee tracking, and loyalty rewards distribution volume.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-xs font-semibold">
          <ShieldCheck className="h-4 w-4" />
          <span>Live Testnet RPC Connection</span>
        </div>
      </div>

      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs">
          Unable to refresh live metrics. Showing cached on-chain state.
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Cumulative Volume', 
            value: `${cumulativeVolume.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} XLM`, 
            sub: 'Total Streamed Value',
            icon: DollarSign, 
            statusColor: 'text-green-400' 
          },
          { 
            label: 'Active Escrow Funds', 
            value: `${activeEscrow.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} XLM`, 
            sub: 'Locked in active agreements',
            icon: TrendingUp, 
            statusColor: 'text-green-400' 
          },
          { 
            label: 'Registered Contractors', 
            value: `${uniqueContractors} Builder${uniqueContractors === 1 ? '' : 's'}`, 
            sub: 'Distinct contractor accounts',
            icon: Users, 
            statusColor: 'text-green-400' 
          },
          { 
            label: 'Loyalty Points Issued', 
            value: `${loyaltyPointsIssued.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} LP`, 
            sub: '1 Point per 10 XLM released',
            icon: Award, 
            statusColor: 'text-green-400' 
          },
        ].map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="bg-card border border-border p-6 rounded-[2rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{metric.label}</span>
                <div className="bg-zinc-900 border border-border p-2 rounded-lg text-accent">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-white mt-4">{metric.value}</div>
              <div className="text-xs text-muted-foreground font-light mt-1.5">{metric.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart A: Payout Volume History */}
        <div className="bg-card border border-border p-6 rounded-[2rem] space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base">Monthly Payout Volume</h3>
            <span className="text-xs text-muted-foreground">XLM (Historical Streams)</span>
          </div>
          
          <div className="h-48 flex items-end justify-between gap-2 pt-4">
            {months.map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0">
                  {bar.val.toFixed(1)} XLM
                </div>
                <div
                  style={{ height: `${(bar.val / maxChartVal) * 120}px` }}
                  className="w-full bg-gradient-to-t from-primary to-accent rounded-t-md transition-all group-hover:opacity-85 shadow-lg shadow-primary/10 min-h-[4px]"
                />
                <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{bar.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart B: Loyalty Points Minting Distribution */}
        <div className="bg-card border border-border p-6 rounded-[2rem] space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base">Loyalty Points Distribution</h3>
            <span className="text-xs text-accent font-semibold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 animate-pulse" /> Real-time Issuance
            </span>
          </div>

          <div className="space-y-4">
            {[
              { 
                type: 'Escrow Payroll Releases', 
                pct: loyaltyPointsIssued > 0 ? 100 : 0, 
                val: `${loyaltyPointsIssued.toFixed(1)} LP`, 
                color: 'bg-accent' 
              },
              { 
                type: 'Admin Airdrops / Promos', 
                pct: 0, 
                val: '0.0 LP', 
                color: 'bg-primary' 
              },
              { 
                type: 'Partner Integrations', 
                pct: 0, 
                val: '0.0 LP', 
                color: 'bg-violet-400' 
              },
            ].map((bar, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-white">{bar.type}</span>
                  <span className="text-muted-foreground font-semibold">{bar.val} ({bar.pct}%)</span>
                </div>
                <div className="h-2 bg-zinc-950 border border-border rounded-full overflow-hidden">
                  <div
                    style={{ width: `${bar.pct}%` }}
                    className={`h-full ${bar.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Network Stats / Gas Fees Panel */}
      <div className="bg-card border border-border p-6 rounded-[2rem] space-y-4 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mb-10 -mr-10" />
        <h3 className="font-bold text-white text-base">Stellar Network Health & Ledger Performance</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
          {[
            { label: 'Avg Ledger Close Time', val: '5.1s', status: 'Healthy', color: 'text-green-400' },
            { label: 'Base Fee per Op', val: '100 Stroops', status: '0.00001 XLM', color: 'text-muted-foreground' },
            { label: 'Contract Execution cost', val: '0.045 XLM', status: 'Optimal', color: 'text-green-400' },
            { label: 'Total Operations (24h)', val: '1,492,084', status: '+4.2% Load', color: 'text-accent' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-zinc-950/60 border border-border p-4 rounded-2xl space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <div className="text-lg font-extrabold text-white">{stat.val}</div>
              <div className={`text-xs ${stat.color} font-medium`}>{stat.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
