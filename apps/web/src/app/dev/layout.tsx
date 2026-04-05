"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { api, getAuthToken, type UserProfile } from "@/lib/api";

const links = [
  { href: "/dev", label: "Overview" },
  { href: "/dev/apps", label: "Apps" },
  { href: "/dev/earnings", label: "Earnings" },
  { href: "/dev/docs", label: "Docs" },
];

export default function DevLayout({ children }: { children: ReactNode }) {
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
        <p className="text-sm text-white/60">Loading developer portal...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white">
      <nav className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/dev" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-bold text-black">
              AI
            </div>
            <span className="font-bold tracking-tight">Developer Portal</span>
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
            <Link
              href="/dashboard"
              className="ml-2 text-xs text-white/40 transition-colors hover:text-white"
            >
              User Dashboard
            </Link>
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
