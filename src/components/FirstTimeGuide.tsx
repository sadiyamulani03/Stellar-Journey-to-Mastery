'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const GUIDE_KEY = 'payloyal_first_time_guide';

export default function FirstTimeGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(GUIDE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    window.localStorage.setItem(GUIDE_KEY, 'true');
  };

  return (
    <div className="relative bg-gradient-to-r from-primary/10 via-accent/10 to-indigo-500/10 border border-accent/25 rounded-2xl p-5 pr-10 flex flex-col sm:flex-row sm:items-center gap-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="bg-accent/15 border border-accent/25 p-2.5 rounded-xl text-accent shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            New here? Welcome to payLoyal
          </h4>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Connect a Stellar wallet, grab Testnet XLM from the Faucet, then create and fund your first wage stream.
            You can track every event in the Notification bell and Activity Feed.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
        >
          Start Streaming
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-white p-1.5 rounded-lg transition-colors"
          aria-label="Dismiss guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
