"use client";

import { useEffect, useState } from "react";
// import { useAuth } from "@/context/AuthContext";
// import { getCreditBalance } from "@/lib/api";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

const useAuth = () => ({ user: { id: "123", creditBalance: 100 }, refreshUser: () => {} });
const getCreditBalance = async (id: string) => ({ balance: 100 });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, refreshUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const poll = async () => {
        try {
          const res = await getCreditBalance(user.id);
          if (res && res.balance !== user.creditBalance) {
            refreshUser();
            if (res.balance < 10) {
              toast({
                title: "⚠ Low credits",
                description: "Your credits are running low. Please upgrade your plan.",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          // ignore error
        }
      };
      void poll();
    }, 30_000);
    return () => clearInterval(interval);
  }, [user, refreshUser, toast]);

  return (
    <div className="flex min-h-screen bg-black text-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0a0a0a] border-r border-white/10
        transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-white text-black flex items-center justify-center font-bold text-xs shadow-sm">
              AI
            </div>
            <span className="font-semibold tracking-tight text-white/90">Dashboard</span>
          </div>
          <button className="md:hidden p-2 text-white/50 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Navigation Links Placeholder */}
        </nav>
        <div className="p-4 border-t border-white/10">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium shrink-0">
                U
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate text-white/90">User Account</span>
                <span className="text-xs text-white/50 flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${user.creditBalance < 10 ? 'bg-red-500' : 'bg-green-500'}`} />
                  {user.creditBalance} credits
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col bg-black">
        <header className="h-16 border-b border-white/10 flex items-center px-4 md:px-6 justify-between shrink-0 bg-black/50 backdrop-blur-md sticky top-0 z-30">
           <div className="flex items-center gap-4">
             <button className="md:hidden p-2 -ml-2 text-white/60 hover:text-white transition-colors rounded-md hover:bg-white/5" onClick={() => setSidebarOpen(true)}>
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>
             <h1 className="text-lg font-medium text-white/90 md:hidden">Overview</h1>
           </div>
           <div className="flex items-center gap-4">
             {/* Header actions */}
           </div>
        </header>
        <div className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  );
}
