"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowUpRight, BookOpenText, Boxes, LayoutDashboard, LogOut, Wallet } from "lucide-react";
import { api, getAuthToken, getRefreshToken } from "@/lib/api";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = async () => {
    await api.auth.logout();
    router.replace("/login");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
          <div className="text-sm text-white/60 font-mono">Loading workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#09090b] text-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0a0a0a] transition-transform md:sticky md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xs font-bold text-black">
              AG
            </div>
            <span className="font-semibold tracking-tight text-white/90">AI Gateway</span>
          </div>
          <button
            className="p-2 text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-3 border-t border-white/10 p-4">
          {user ? (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <p className="truncate font-medium text-white/90">{user.name}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
              <p className="mt-1 text-xs text-white/70">{(user.creditBalance ?? 0).toLocaleString()} credits</p>
            </div>
          ) : null}

          <a
            href={WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Main website
            <ArrowUpRight className="h-4 w-4 text-white/50" />
          </a>

          <button
            onClick={logout}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            Sign out
            <LogOut className="h-4 w-4 text-white/50" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#09090b]">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-[#09090b]/70 px-4 backdrop-blur md:px-6">
          <button
            className="rounded-md p-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-medium text-white/70">Developer Console</h1>
          <div className="w-9 md:hidden" />
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl space-y-8">{children}</div>
        </div>
      </main>
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
