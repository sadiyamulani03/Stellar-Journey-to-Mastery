'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, ArrowRightCircle, Lock, User } from 'lucide-react';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, isLoading, error, isAuthenticated } = useAuth();
  const initialMode = searchParams?.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const isRegister = mode === 'register';

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && password !== confirmPassword) {
      return;
    }

    const success = mode === 'login'
      ? await login(username, password)
      : await register(username, password);

    if (success) {
      router.replace('/');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-96 bg-[radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.14),transparent_40%)]" />
      <div className="relative mx-auto w-full max-w-xl rounded-[2rem] border border-accent/20 bg-zinc-950/95 p-10 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-border/50 pb-6 mb-6">
          <div className="flex items-center gap-3 text-white">
            <ShieldCheck className="h-8 w-8 text-accent" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-accent/70">payLoyal secure access</p>
            </div>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Log in or register to continue to the app.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-full bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              router.replace('/auth?mode=login', { scroll: false });
            }}
            className={`rounded-full px-4 py-3 text-sm font-semibold transition ${!isRegister ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'text-muted-foreground hover:text-white'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              router.replace('/auth?mode=register', { scroll: false });
            }}
            className={`rounded-full px-4 py-3 text-sm font-semibold transition ${isRegister ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'text-muted-foreground hover:text-white'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block space-y-2 text-sm text-muted-foreground">
            <span className="font-semibold text-white">Email or Username</span>
            <div className="flex items-center gap-2 bg-zinc-900 border border-border rounded-3xl px-4 py-4">
              <User className="h-5 w-5 text-accent" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-transparent outline-none text-white placeholder:text-zinc-500"
                required
              />
            </div>
          </label>

          <label className="block space-y-2 text-sm text-muted-foreground">
            <span className="font-semibold text-white">Password</span>
            <div className="flex items-center gap-2 bg-zinc-900 border border-border rounded-3xl px-4 py-4">
              <Lock className="h-5 w-5 text-accent" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-transparent outline-none text-white placeholder:text-zinc-500"
                required
              />
            </div>
          </label>

          {mode === 'register' && (
            <label className="block space-y-2 text-sm text-muted-foreground">
              <span className="font-semibold text-white">Confirm Password</span>
              <div className="flex items-center gap-2 bg-zinc-900 border border-border rounded-3xl px-4 py-4">
                <Lock className="h-5 w-5 text-accent" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full bg-transparent outline-none text-white placeholder:text-zinc-500"
                  required
                />
              </div>
            </label>
          )}

          {error && <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
          {mode === 'register' && password && confirmPassword && password !== confirmPassword && (
            <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">Passwords do not match.</div>
          )}

          <button
            type="submit"
            disabled={isLoading || (mode === 'register' && password !== confirmPassword)}
            className="w-full rounded-3xl bg-gradient-to-r from-primary to-accent px-5 py-4 text-sm font-semibold text-black transition disabled:opacity-50 shadow-lg shadow-accent/20"
          >
            {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <button type="button" onClick={() => setMode('register')} className="font-semibold text-accent hover:text-white">
              Don't have an account? Register
            </button>
          ) : (
            <button type="button" onClick={() => setMode('login')} className="font-semibold text-accent hover:text-white">
              Already have an account? Login
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground leading-relaxed">
          By continuing, you agree to use this demo app responsibly. Your credentials are stored locally in a simple JSON database for development only.
        </div>

        <div className="flex flex-col gap-3 pt-6 border-t border-border/50 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <span>Need wallet access?</span>
            <Link href="/settings" className="text-accent hover:underline flex items-center gap-1">
              Connect a wallet <ArrowRightCircle className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            After logging in, you can manage your Stellar wallet, deploy streams, and track loyalty rewards from the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-sm text-muted-foreground">
          Loading authentication...
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
