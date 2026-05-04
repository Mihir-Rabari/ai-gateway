"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, BookOpenText, Boxes, LayoutDashboard, LogOut, Wallet } from "lucide-react";
import { api, getAuthToken, type UserProfile } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/console/toaster";
import { Badge, Button, SkeletonBlock, Surface } from "@/components/console/system";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/apps", label: "Apps", icon: Boxes },
  { href: "/earnings", label: "Earnings", icon: Wallet },
  { href: "/docs", label: "Docs", icon: BookOpenText },
];

export function ConsoleShell({ children }: { children: React.ReactNode }) {
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
        // ⚡ Bolt: `api.auth.me()` already includes `creditBalance`.
        // Removed redundant `api.credits.getBalance()` call to reduce network requests.
        const me = await api.auth.me();
        setUser(me);
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
      <div className="flex min-h-screen items-center justify-center bg-grid px-6">
        <Surface className="w-full max-w-xl p-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/34">AI Gateway Console</p>
          <p className="mt-4 font-display text-3xl tracking-[-0.05em] text-white">Loading workspace</p>
          <div className="mt-8 space-y-3">
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-4/5" />
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 md:px-6 md:py-6">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <Surface className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/38">AI Gateway</p>
                <h2 className="mt-2 font-display text-2xl tracking-[-0.06em] text-white">Developer Console</h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-base font-semibold text-black">
                AI
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/38">Operator</p>
              <p className="mt-3 text-sm font-medium text-white">{user?.name ?? "Developer"}</p>
              <p className="mt-1 text-sm text-white/52">{user?.email}</p>
              <div className="mt-4 flex items-center gap-2">
                <Badge>{user?.planId ?? "free"} plan</Badge>
                <Badge tone="success">{(user?.creditBalance ?? 0).toLocaleString()} credits</Badge>
              </div>
            </div>

            <nav className="mt-8 space-y-2">
              {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                      active ? "bg-white text-black" : "text-white/64 hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-3">
              <a
                href={WEB_URL}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/66 transition hover:bg-white/[0.05] hover:text-white"
              >
                Open main website
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <Button variant="secondary" onClick={logout} className="w-full justify-between rounded-2xl">
                Sign out
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </Surface>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-6">
          <Surface className="lg:hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/36">AI Gateway</p>
                <p className="mt-2 font-display text-2xl tracking-[-0.05em] text-white">Console</p>
              </div>
              <Button variant="secondary" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Exit
              </Button>
            </div>
            <div className="scrollbar-subtle flex gap-2 overflow-x-auto px-4 pb-4">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2 text-sm transition",
                      active ? "bg-white text-black" : "bg-white/[0.04] text-white/64",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </Surface>

          <main className="min-w-0 flex-1 pb-24 lg:pb-0">
            <div key={pathname} className="animate-page-in space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
