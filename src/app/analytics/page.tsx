'use client';

import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Award } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent" />
          Protocol Analytics Dashboard
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Real-time metrics, gas fee tracking, and loyalty rewards distribution volume.
        </p>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Cumulative Volume', value: '$12,492,084', change: '+14.2%', icon: DollarSign, statusColor: 'text-green-400' },
          { label: 'Active Escrow Funds', value: '450,290 XLM', change: '+8.1%', icon: TrendingUp, statusColor: 'text-green-400' },
          { label: 'Registered Contractors', value: '1,842 Builders', change: '+23.5%', icon: Users, statusColor: 'text-green-400' },
          { label: 'Loyalty Points Issued', value: '452,198 LP', change: '+18.9%', icon: Award, statusColor: 'text-green-400' },
        ].map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="bg-card border border-border p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{metric.label}</span>
                <div className="bg-zinc-900 border border-border p-2 rounded-lg text-accent">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-white mt-4">{metric.value}</div>
              <div className={`flex items-center gap-1 text-xs mt-2 ${metric.statusColor} font-semibold`}>
                <span>{metric.change}</span>
                <span className="text-muted-foreground font-light">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart A: Payout Volume History */}
        <div className="bg-card border border-border p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base">Monthly Payroll Payout Volume</h3>
            <span className="text-xs text-muted-foreground">XLM (Thousands)</span>
          </div>
          
          <div className="h-48 flex items-end justify-between gap-2 pt-4">
            {[
              { month: 'Jan', val: 30 },
              { month: 'Feb', val: 45 },
              { month: 'Mar', val: 65 },
              { month: 'Apr', val: 55 },
              { month: 'May', val: 80 },
              { month: 'Jun', val: 95 },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity mb-1 shrink-0">
                  {bar.val}k
                </div>
                <div
                  style={{ height: `${(bar.val / 100) * 120}px` }}
                  className="w-full bg-gradient-to-t from-primary to-accent rounded-t-md transition-all group-hover:opacity-85 shadow-lg shadow-primary/10"
                />
                <span className="text-xs text-muted-foreground shrink-0 mt-1">{bar.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart B: Loyalty Points Minting Distribution */}
        <div className="bg-card border border-border p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base">Loyalty Points Distribution Rate</h3>
            <span className="text-xs text-accent font-semibold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> High Issuance Rate
            </span>
          </div>

          <div className="space-y-4">
            {[
              { type: 'Escrow Payroll Releases', pct: 68, val: '307,494 LP', color: 'bg-accent' },
              { type: 'Admin Airdrops / Promos', pct: 15, val: '67,829 LP', color: 'bg-primary' },
              { type: 'Partner Integrations', pct: 17, val: '76,875 LP', color: 'bg-violet-400' },
            ].map((bar, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-white">{bar.type}</span>
                  <span className="text-muted-foreground font-semibold">{bar.val} ({bar.pct}%)</span>
                </div>
                <div className="h-2 bg-zinc-900 border border-border rounded-full overflow-hidden">
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
      <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-white text-base">Stellar Network Health & Ledger Performance</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
          {[
            { label: 'Avg Ledger Close Time', val: '5.1s', status: 'Healthy', color: 'text-green-400' },
            { label: 'Base Fee per Op', val: '100 Stroops', status: '0.00001 XLM', color: 'text-muted-foreground' },
            { label: 'Contract Execution cost', val: '0.045 XLM', status: 'Optimal', color: 'text-green-400' },
            { label: 'Total Operations (24h)', val: '1,492,084', status: '+4.2% Load', color: 'text-accent' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-zinc-900/40 border border-border p-4 rounded-xl space-y-1">
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
