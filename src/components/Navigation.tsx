'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '../hooks/useWallet';
import { useAuth } from '../hooks/useAuth';
import { Menu, X, Wallet, Award, Activity, History, BarChart3, Settings as SettingsIcon, Shield } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { address, balance, network, isConnected, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Dispute Hub', href: '/disputes', icon: Shield },
    { name: 'Activity Feed', href: '/activity', icon: Activity },
    { name: 'Transaction Center', href: '/tx-center', icon: History },
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
              <Award className="h-5 w-5 text-accent animate-pulse" />
              <span>pay<span className="text-accent">Loyal</span></span>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent/10 text-accent border border-accent/20">
              {network}
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-white ${
                    active ? 'text-accent border-b-2 border-accent pb-1' : 'text-muted-foreground pb-1'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Connect Button / Wallet Info */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/auth"
                  className="bg-accent/15 hover:bg-accent/20 text-accent border border-accent/20 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all"
                >
                  Login / Register
                </Link>
              )}

              {isConnected && address && (
                <div className="flex items-center gap-2">
                  <div className="bg-zinc-900 border border-border px-3 py-1.5 rounded-xl flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{balance} XLM</span>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                  >
                    {formatAddress(address)}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={isConnected ? disconnectWallet : connectWallet}
              disabled={isConnecting}
              className="bg-accent/15 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>
                {isConnecting ? '...' : isConnected && address ? formatAddress(address) : 'Connect'}
              </span>
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
