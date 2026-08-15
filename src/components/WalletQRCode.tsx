'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Copy } from 'lucide-react';

interface WalletQRCodeProps {
  address: string;
  className?: string;
}

export default function WalletQRCode({ address, className = '' }: WalletQRCodeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors ${className}`}
      >
        <QrCode className="h-3.5 w-3.5 text-accent" />
        Show QR
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 relative animate-in zoom-in-95 space-y-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-bold text-white flex items-center gap-2">
                <QrCode className="h-5 w-5 text-accent" />
                Wallet Address QR
              </h3>
              <p className="text-xs text-muted-foreground font-light">
                Scan to share or fund this Stellar address on Testnet.
              </p>
            </div>

            <div className="flex justify-center bg-white p-4 rounded-xl">
              <QRCodeSVG value={address} size={200} level="M" includeMargin />
            </div>

            <code className="bg-zinc-950 border border-border px-3 py-2 rounded-lg text-xs text-white block break-all font-mono">
              {address}
            </code>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              {copied ? (
                <span className="text-green-200">Copied to clipboard!</span>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Address
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
