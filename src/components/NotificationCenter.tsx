'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '../store/useNotificationStore';
import { Bell, CheckCheck, Trash2, Inbox, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function variantIcon(variant: string) {
  switch (variant) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />;
    default:
      return <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />;
  }
}

export default function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unread = unreadCount();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unread > 0) {
            setTimeout(() => markAllRead(), 1500);
          }
        }}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-zinc-900 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-950/95 border border-border rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[60]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-accent" />
              Notifications
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllRead}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-zinc-900 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                onClick={clearAll}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Clear all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <Inbox className="h-8 w-8 text-zinc-700 mx-auto" />
                <p className="text-xs text-muted-foreground font-light">
                  No notifications yet. Stream events will appear here in real-time.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-zinc-900/50 transition-colors ${
                    n.read ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {variantIcon(n.variant)}
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{n.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(n.timestamp)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed break-words">{n.message}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
