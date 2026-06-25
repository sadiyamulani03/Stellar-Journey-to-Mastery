import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import Providers from "./providers";
import Navigation from "../components/Navigation";

export const metadata: Metadata = {
  title: "payLoyal | Stellar Escrow & Loyalty Payouts",
  description: "A startup-grade payroll streams and automated escrow platform built on Stellar Soroban with loyalty points reward system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col font-sans antialiased overflow-x-hidden">
        <Providers>
          <Navigation />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
