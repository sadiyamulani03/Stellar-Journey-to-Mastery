'use client';

import React from 'react';
import { useWallet } from '../../hooks/useWallet';
import { Settings as SettingsIcon, Shield, Server, Wallet, Key, Cpu } from 'lucide-react';
import { PAYMENT_LOGGER_CONTRACT_ID, LOYALTY_TOKEN_CONTRACT_ID, PAYLOYAL_RESOLVER_CONTRACT_ID } from '../../services/stellar';

export default function SettingsPage() {
  const { address, network, isConnected, setNetwork, connectWallet, disconnectWallet } = useWallet();

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Page Title */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-accent" />
          Application Settings
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Manage your Stellar network connection, view contract registry parameters, and configure wallet preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left side: categories */}
        <div className="md:col-span-1 space-y-3">
          <div className="bg-card border border-border rounded-[2rem] p-8 space-y-4">
            <div className="text-sm uppercase tracking-[0.15em] text-muted-foreground font-semibold">Configuration</div>
            <button className="w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold bg-accent/10 text-accent flex items-center gap-3">
              <Cpu className="h-4 w-4" />
              <span>Protocol Config</span>
            </button>
          </div>
        </div>

        {/* Right side: details panels */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Wallet Profile */}
          <div className="bg-card border border-border p-8 rounded-[2rem] space-y-5">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-accent" />
              Wallet Configuration
            </h3>
            
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-white font-medium block">Connection Status</span>
                  <span className="text-xs text-muted-foreground">Manage active Stellar session</span>
                </div>
                {isConnected && address ? (
                  <button
                    onClick={disconnectWallet}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  >
                    Disconnect Wallet
                  </button>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="bg-accent hover:opacity-90 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>

              {isConnected && address && (
                <div className="bg-zinc-900 border border-border p-3 rounded-lg space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Linked Account Address</span>
                  <code className="text-xs text-white block break-all font-mono">{address}</code>
                </div>
              )}
            </div>
          </div>

          {/* Network Selection */}
          <div className="bg-card border border-border p-8 rounded-[2rem] space-y-5">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-accent" />
              Stellar Network Node
            </h3>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-semibold">Active Node Environment</label>
                <div className="grid grid-cols-2 gap-4">
                  {['TESTNET', 'PUBLIC'].map((net) => (
                    <button
                      key={net}
                      onClick={() => setNetwork(net)}
                      className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-center ${
                        network === net
                          ? 'border-accent bg-accent/5 text-accent'
                          : 'border-border bg-zinc-900 text-muted-foreground hover:text-white'
                      }`}
                    >
                      {net === 'TESTNET' ? 'Testnet Node' : 'Public Mainnet'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-border p-3 rounded-lg text-xs text-muted-foreground leading-relaxed">
                {network === 'TESTNET' ? (
                  <span>
                    Connected to Stellar Testnet RPC: <code className="text-white font-mono">https://soroban-testnet.stellar.org</code>. You can fund your account for testing using the{' '}
                    <a
                      href={`https://friendbot.stellar.org/?addr=${address || 'GBH6XRNQXMMXXCZKZKJFPNBQXFFQ2AZONNFEE4XUN4YKG2CGW3XB5V24'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline hover:opacity-80"
                    >
                      Stellar Friendbot
                    </a>.
                  </span>
                ) : (
                  <span>
                    Warning: Deploying escrow payroll payouts on Public Mainnet involves real XLM/USDC tokens. Ensure contract variables are double checked.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Deployed Contract Registry */}
          <div className="bg-card border border-border p-8 rounded-[2rem] space-y-5">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Smart Contract Addresses
            </h3>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Streaming Escrow Contract ID</span>
                  <a href={`https://stellar.expert/explorer/testnet/contract/${PAYMENT_LOGGER_CONTRACT_ID}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">Explorer</a>
                </div>
                <code className="bg-zinc-900 border border-border px-3 py-2 rounded-lg text-xs text-white block break-all font-mono">
                  {PAYMENT_LOGGER_CONTRACT_ID}
                </code>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Dispute Resolver Contract ID</span>
                  <a href={`https://stellar.expert/explorer/testnet/contract/${PAYLOYAL_RESOLVER_CONTRACT_ID}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">Explorer</a>
                </div>
                <code className="bg-zinc-900 border border-border px-3 py-2 rounded-lg text-xs text-white block break-all font-mono">
                  {PAYLOYAL_RESOLVER_CONTRACT_ID}
                </code>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Loyalty Points Token ID</span>
                  <a href={`https://stellar.expert/explorer/testnet/contract/${LOYALTY_TOKEN_CONTRACT_ID}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">Explorer</a>
                </div>
                <code className="bg-zinc-900 border border-border px-3 py-2 rounded-lg text-xs text-white block break-all font-mono">
                  {LOYALTY_TOKEN_CONTRACT_ID}
                </code>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
