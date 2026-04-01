"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";

export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <nav className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/dev" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-white text-black flex items-center justify-center font-bold text-xs">AI</div>
            <span className="font-bold tracking-tight">Developer Portal</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/dev/apps" className="text-white/60 hover:text-white transition-colors">Apps</Link>
            <Link href="/dev/earnings" className="text-white/60 hover:text-white transition-colors">Earnings</Link>
            <Link href="/dev/docs" className="text-white/60 hover:text-white transition-colors">Docs</Link>
            <Link href="/dashboard" className="text-white/40 hover:text-white transition-colors text-xs ml-4">Back to User Dashboard</Link>
          </div>
        </div>
      </nav>
      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="container mx-auto max-w-5xl">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
