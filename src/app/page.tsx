'use client';

import React from 'react';
import Link from 'next/link';
import { useWalletStore } from '../store/useWalletStore';
import { ArrowRight, ShieldCheck, Zap, Coins, CheckCircle, RefreshCw } from 'lucide-react';

export default function LandingPage() {
  const { isConnected, connectWallet } = useWalletStore();

  return (
    <div className="space-y-20 py-10">
      {/* Hero Section */}
      <div className="relative text-center space-y-6 max-w-4xl mx-auto py-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent)] blur-3xl" />
        
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/20">
          <Zap className="h-3 w-3 fill-current" />
          Soroban-Powered Stellar Protocol
        </span>
        
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold text-white tracking-tight leading-tight">
          Automate Escrow Payroll & <span className="bg-gradient-to-r from-accent via-violet-500 to-indigo-500 bg-clip-text text-transparent">Reward Loyalty</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
          The autonomous payroll agreement and escrow protocol on Stellar. Create agreements, secure deposits in trust, pay contractors, and reward builders with automated loyalty tokens.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
          {isConnected ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold px-8 py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <button
              onClick={connectWallet}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold px-8 py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
            >
              <span>Connect Wallet to Launch</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          )}
          <a
            href="https://developers.stellar.org/docs/smart-contracts"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white border border-border font-semibold px-8 py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            Read Soroban Docs
          </a>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Volume Secured', value: '$12,492,084', desc: 'Secure smart contract deposits' },
          { label: 'Loyalty Points Distributed', value: '452,198 LP', desc: 'Points awarded to contractors' },
          { label: 'Successful Escrows', value: '14,821 Agreements', desc: 'Released with zero friction' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-card border border-border p-6 rounded-xl hover:border-zinc-700 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors -mr-16 -mt-16" />
            <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
            <div className="text-3xl font-display font-extrabold text-white mt-2 group-hover:text-accent transition-colors">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Features Grid */}
      <div className="space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
            Designed for Modern Builders and Startups
          </h2>
          <p className="text-muted-foreground font-light leading-relaxed">
            payLoyal combines the security of audited smart contracts with a rewards layer that incentivizes builders and payroll processing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: ShieldCheck,
              title: 'Secure Trust Escrow',
              desc: 'Funds are held securely by the autonomous escrow contract on Stellar. Only the employer can trigger releases, and cancellation refunds are fully programmatically governed.',
            },
            {
              icon: Coins,
              title: 'Automated Payouts',
              desc: 'Pay contractors instantly using USDC, XLM, or any custom asset contract. Funds are routed in a single transaction with verifiable cryptographic proofs.',
            },
            {
              icon: RefreshCw,
              title: 'Inter-Contract Loyalty Rewards',
              desc: 'Every payment released triggers a cross-contract message to the Loyalty Registry, automatically minting points to contractors based on payment amount.',
            },
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="bg-card border border-border/80 p-8 rounded-2xl flex flex-col gap-4 relative">
                <div className="bg-accent/10 border border-accent/20 p-3 rounded-lg w-fit text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mt-2">{feat.title}</h3>
                <p className="text-muted-foreground font-light text-sm leading-relaxed flex-1">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works Flowchart */}
      <div className="border border-border bg-card/30 backdrop-blur-sm rounded-3xl p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">How payLoyal Operates</h2>
            <p className="text-muted-foreground text-sm font-light">From agreement creation to contract rewards in 3 simple steps</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {[
              { step: '01', title: 'Employer Deposit', desc: 'Employer creates a payroll escrow contract and funds it with the required balance.' },
              { step: '02', title: 'Work Delivery & Release', desc: 'Contractor delivers work. Employer approves and triggers the secure release of funds.' },
              { step: '03', title: 'Loyalty Points Minted', desc: 'Escrow makes a cross-contract call to issue Loyalty points directly to the contractor.' },
            ].map((step, idx) => (
              <div key={idx} className="bg-zinc-900/60 border border-border p-6 rounded-xl relative space-y-3">
                <span className="text-3xl font-display font-extrabold text-accent/20 absolute top-4 right-4">{step.step}</span>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-white text-sm">{step.title}</span>
                </div>
                <p className="text-muted-foreground text-xs font-light leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
