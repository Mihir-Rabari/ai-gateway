"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { api, getAuthToken, type UserProfile } from "@/lib/api";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/apps", label: "Apps" },
  { href: "/earnings", label: "Earnings" },
  { href: "/docs", label: "Docs" },
];

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const me = await api.auth.me();
        const balance = await api.credits.getBalance();
        setUser({ ...me, creditBalance: balance.balance });
      } catch {
        router.replace("/login");
      } finally {
        setAuthLoading(false);
      }
    };

    void load();
  }, [router]);

  const logout = async () => {
    await api.auth.logout();
    router.replace("/login");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">Loading developer console...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white">
      <nav className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-bold text-black">
              AI
            </div>
            <span className="font-bold tracking-tight">Developer Console</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href
                    ? "text-white"
                    : "text-white/60 transition-colors hover:text-white"
                }
              >
                {item.label}
              </Link>
            ))}
            <a
              href={WEB_URL}
              className="ml-2 text-xs text-white/40 transition-colors hover:text-white"
            >
              User Dashboard
            </a>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="container mx-auto max-w-5xl space-y-4">
          {user ? (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              Signed in as {user.email} ({user.planId} plan, {user.creditBalance} credits)
            </div>
          ) : null}
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
