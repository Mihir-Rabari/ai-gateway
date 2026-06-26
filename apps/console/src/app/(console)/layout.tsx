"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, BookOpenText, Boxes, LayoutDashboard, LogOut, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/console/toaster";
import { UserProvider, useUser } from "@/components/UserProvider";

const isBrowser = typeof window !== "undefined";
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? (isBrowser ? window.location.origin : "http://localhost:3000");

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/apps", label: "Apps", icon: Boxes },
  { href: "/earnings", label: "Earnings", icon: Wallet },
  { href: "/docs", label: "Docs", icon: BookOpenText },
];

function ConsoleLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useUser();

  const logout = async () => {
    await api.auth.logout();
    router.replace("/login");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#09090b] p-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono">AI Gateway Console</p>
          <p className="mt-4 font-mono text-xl font-bold tracking-tight text-zinc-100">Loading workspace...</p>
          <div className="mt-6 space-y-2.5">
            <div className="h-10 w-full animate-pulse rounded bg-zinc-900 border border-zinc-800" />
            <div className="h-10 w-4/5 animate-pulse rounded bg-zinc-900 border border-zinc-800 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 md:px-6 md:py-6">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col rounded-lg border border-zinc-800 bg-[#09090b] p-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">AI Gateway</p>
                <h2 className="mt-1 font-sans text-xl font-bold tracking-tight text-zinc-100">Console</h2>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-100 text-sm font-bold text-zinc-950">
                AI
              </div>
            </div>

            {/* Operator Card */}
            <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Operator</p>
              <p className="mt-2 text-sm font-bold text-zinc-100">{user?.name ?? "Developer"}</p>
              <p className="mt-0.5 font-mono text-xs text-zinc-400">{user?.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-300">
                  {user?.planId ?? "free"} plan
                </span>
                <span className="inline-flex items-center rounded border border-emerald-950 bg-emerald-950/30 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                  {(user?.creditBalance ?? 0).toLocaleString()} credits
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-6 space-y-1">
              {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700",
                      active
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-100"
                        : "border border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="mt-auto space-y-2">
              <a
                href={WEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-400 transition hover:bg-zinc-900/40 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
              >
                <span>Open main website</span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500" />
              </a>
              <button
                onClick={logout}
                className="flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-xs font-medium text-zinc-400 transition hover:bg-zinc-900/80 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
                aria-label="Sign out"
              >
                <span>Sign out</span>
                <LogOut className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-6">
          {/* Mobile Header */}
          <div className="lg:hidden rounded-lg border border-zinc-800 bg-[#09090b] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">AI Gateway</p>
                <p className="mt-1 font-sans text-xl font-bold tracking-tight text-zinc-100">Console</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
                aria-label="Exit console"
              >
                <LogOut className="h-4 w-4 text-zinc-500" />
                <span>Exit</span>
              </button>
            </div>
            
            <div className="scrollbar-subtle flex gap-2 overflow-x-auto pb-2">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700",
                      active
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-100"
                        : "border border-transparent bg-zinc-950 text-zinc-400",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <main className="min-w-0 flex-1 pb-24 lg:pb-0">
            <div key={pathname} className="space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ConsoleLayoutContent>{children}</ConsoleLayoutContent>
    </UserProvider>
  );
}
