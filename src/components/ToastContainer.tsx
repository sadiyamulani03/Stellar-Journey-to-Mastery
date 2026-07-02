'use client';

import React from 'react';
import { useToastStore, ToastItem } from '../store/useToastStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const getIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getStyleClass = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return 'bg-zinc-950/80 border-green-500/30 text-green-100 shadow-green-950/20';
      case 'warning':
        return 'bg-zinc-950/80 border-yellow-500/30 text-yellow-100 shadow-yellow-950/20';
      case 'error':
        return 'bg-zinc-950/80 border-red-500/30 text-red-100 shadow-red-950/20';
      case 'info':
        return 'bg-zinc-950/80 border-blue-500/30 text-blue-100 shadow-blue-950/20';
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${getStyleClass(
            toast.type
          )}`}
        >
          <div className="shrink-0 mt-0.5">{getIcon(toast.type)}</div>
          <div className="flex-1 text-sm font-medium leading-snug">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-zinc-500 hover:text-white p-0.5 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
