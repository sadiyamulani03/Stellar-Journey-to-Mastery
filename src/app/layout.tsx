import type { Metadata } from "next";
import "./globals.css";
import React from "react";
import Providers from "./providers";
import Navigation from "../components/Navigation";
import ToastContainer from "../components/ToastContainer";
import GlobalInit from "../components/GlobalInit";

export const metadata: Metadata = {
  title: "payLoyal | Streaming Escrow & Dispute Resolution",
  description: "A startup-grade second-by-second linear payroll streaming and decentralized arbiter dispute resolution platform built on Stellar.",
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
          <GlobalInit />
          <Navigation />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
