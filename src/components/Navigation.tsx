'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import NotificationCenter from './NotificationCenter';
import ThemeToggle from './ThemeToggle';
import { Menu, X, Wallet, Award, Activity, History, BarChart3, Settings as SettingsIcon, Shield, RefreshCw, LogOut, User as UserIcon, ChevronDown, Users } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { address, balance, network, isConnected, isConnecting, connectionStage, error, connectWallet, disconnectWallet } = useWallet();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Dispute Hub', href: '/disputes', icon: Shield },
    { name: 'Activity Feed', href: '/activity', icon: Activity },
    { name: 'Transaction Center', href: '/tx-center', icon: History },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 4)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 font-display font-semibold text-lg text-white tracking-tight">
              <span className="relative inline-flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent">
                <Award className="h-4 w-4 text-white" />
              </span>
              <span>pay<span className="text-accent">Loyal</span></span>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20">
              {network}
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white ${
                    active ? 'text-accent border-b-2 border-accent pb-1' : 'text-muted-foreground pb-1'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side: theme, notifications, account */}
          <div className="hidden md:flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationCenter />

            {isAuthenticated ? (
              <div className="relative ml-1" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-border px-3 py-1.5 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-accent/15 text-accent">
                    <UserIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="max-w-[100px] truncate">{user?.username || 'Account'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-950/95 border border-border rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[60]">
                    <div className="px-4 py-3 border-b border-border space-y-1">
                      <p className="text-xs font-bold text-white">{user?.username}</p>
                      <p className="text-[11px] text-muted-foreground font-light break-all">{user?.id}</p>
                    </div>

                    {isConnected && address ? (
                      <div className="px-4 py-3 border-b border-border space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Wallet</span>
                          <span className="font-mono text-white">{formatAddress(address)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Balance</span>
                          <span className="font-semibold text-accent">{balance} XLM</span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 border-b border-border">
                        <button
                          onClick={() => { connectWallet(); setAccountOpen(false); }}
                          disabled={isConnecting}
                          className="w-full bg-accent hover:opacity-90 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>
                                {connectionStage === 'detecting'
                                  ? 'Scanning Wallets...'
                                  : connectionStage === 'waiting_signature'
                                  ? 'Wallet Approval...'
                                  : connectionStage === 'verifying'
                                  ? 'Checking Account...'
                                  : 'Connecting...'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Wallet className="h-3.5 w-3.5" />
                              <span>Connect Wallet</span>
                            </>
                          )}
                        </button>
                        {error && (
                          <p className="mt-2 text-[11px] text-red-400 font-light">{error}</p>
                        )}
                      </div>
                    )}

                    <div className="p-2 space-y-1">
                      {isConnected && address && (
                        <button
                          onClick={() => { disconnectWallet(); setAccountOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white hover:bg-zinc-900 transition-colors"
                        >
                          <Wallet className="h-4 w-4" />
                          Disconnect Wallet
                        </button>
                      )}
                      <Link
                        href="/settings"
                        onClick={() => setAccountOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-white hover:bg-zinc-900 transition-colors"
                      >
                        <SettingsIcon className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        onClick={() => { logout(); setAccountOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="bg-accent/15 hover:bg-accent/20 text-accent border border-accent/20 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all"
              >
                Login / Register
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <NotificationCenter />
            <button
              onClick={isConnected ? disconnectWallet : connectWallet}
              disabled={isConnecting}
              className="bg-accent/15 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>
                    {connectionStage === 'detecting'
                      ? 'Scanning...'
                      : connectionStage === 'waiting_signature'
                      ? 'Approving...'
                      : connectionStage === 'verifying'
                      ? 'Verifying...'
                      : 'Connecting...'}
                  </span>
                </>
              ) : (
                <>
                  <Wallet className="h-3.5 w-3.5" />
                  <span>
                    {isConnected && address ? formatAddress(address) : 'Connect'}
                  </span>
                </>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted-foreground hover:text-white p-1"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card py-4 px-4 space-y-3">
          <div className="space-y-3">
            {isAuthenticated ? (
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full block bg-accent/15 hover:bg-accent/20 text-accent border border-accent/20 px-3 py-2 rounded-xl text-sm font-semibold text-center transition-all"
              >
                Login / Register
              </Link>
            )}

            {isConnected && address && (
              <div className="bg-zinc-900 border border-border p-3 rounded-lg flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Wallet: {formatAddress(address)}</span>
                <span className="font-semibold text-accent">{balance} XLM</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
