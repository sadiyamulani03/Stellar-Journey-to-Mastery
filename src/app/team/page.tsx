'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, User as UserIcon, Check, ShieldAlert } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  address: string;
  role: 'employer' | 'contractor' | 'arbiter';
  createdAt: number;
}

const STORAGE_KEY = 'payloyal_team';

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('contractor');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setMembers(raw ? JSON.parse(raw) : []);
    } catch {
      setMembers([]);
    }
  }, []);

  const persist = (next: TeamMember[]) => {
    setMembers(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setError('Failed to save team locally.');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !address.trim()) {
      setError('Name and address are required.');
      return;
    }
    if (!address.startsWith('G') && !address.startsWith('C')) {
      setError('Address must be a Stellar public key (G...) or contract ID (C...).');
      return;
    }
    const exists = members.some((m) => m.address.toLowerCase() === address.toLowerCase());
    if (exists) {
      setError('That address is already in your team.');
      return;
    }

    persist([
      ...members,
      { id: `team-${Date.now()}`, name: name.trim(), address: address.trim(), role, createdAt: Date.now() },
    ]);
    setName('');
    setAddress('');
    setSaved(`Added ${name.trim()} to your team.`);
    setTimeout(() => setSaved(null), 3000);
  };

  const handleRemove = (id: string) => {
    persist(members.filter((m) => m.id !== id));
  };

  const truncateAddress = (addr: string) => {
    if (addr.length < 15) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 6)}`;
  };

  const roleBadge = (role: TeamMember['role']) => {
    switch (role) {
      case 'employer':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-semibold">Employer</span>;
      case 'contractor':
        return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-xs font-semibold">Contractor</span>;
      case 'arbiter':
        return <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded text-xs font-semibold">Arbiter</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white flex items-center gap-3">
          <Users className="h-6 w-6 text-accent" />
          Team Address Book
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Save the Stellar addresses you work with most — contractors, employers, and arbiters — then reuse them when creating streams.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Add member form */}
        <div className="lg:col-span-1 bg-card border border-border p-7 rounded-[2rem] h-fit space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-accent" />
              Add Team Member
            </h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Add a Stellar account to your address book for quick access when creating streams or disputes.
            </p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Member Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Stellar Address</label>
              <input
                type="text"
                placeholder="GB..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-zinc-950 border border-border px-3 py-2 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-accent font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {(['contractor', 'employer', 'arbiter'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-2 py-2 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      role === r
                        ? 'border-accent bg-accent/5 text-accent'
                        : 'border-border bg-zinc-900 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {saved && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-xs flex gap-1.5">
                <Check className="h-4 w-4 shrink-0" />
                <span>{saved}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold py-2.5 rounded-lg text-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add to Team
            </button>
          </form>
        </div>

        {/* Members list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Saved Members
            <span className="text-xs text-muted-foreground font-light">({members.length})</span>
          </h3>

          {members.length === 0 ? (
            <div className="bg-card border border-border rounded-[2rem] p-10 text-center space-y-3">
              <Users className="h-8 w-8 text-zinc-600 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Your team is empty. Add a contractor, employer, or arbiter to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {members.map((m) => (
                <div key={m.id} className="bg-card border border-border rounded-[1.5rem] p-5 space-y-3 relative group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent/15 text-accent">
                        <UserIcon className="h-4 w-4" />
                      </span>
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm">{m.name}</p>
                        {roleBadge(m.role)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <code className="block bg-zinc-950 border border-border px-3 py-2 rounded-lg text-xs text-white font-mono break-all">
                    {m.address}
                  </code>
                  <p className="text-[10px] text-muted-foreground font-light">
                    Added {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
