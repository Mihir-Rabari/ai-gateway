"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { api, getAuthToken, getRefreshToken, type UserProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";

const CONSOLE_URL = process.env.NEXT_PUBLIC_CONSOLE_URL ?? "http://localhost:3002";

const navLinks = [
  { href: "/dashboard", label: "Overview" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isDeveloper, setIsDeveloper] = useState<boolean | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const bootstrap = async () => {
      try {
        const [me, balance, devStatus] = await Promise.all([
          api.auth.me(),
          api.credits.getBalance(),
          api.developers.getStatus().catch(() => ({ isDeveloper: false, enrolledAt: null })),
        ]);
        setUser({ ...me, creditBalance: balance.balance });
        setIsDeveloper(devStatus.isDeveloper);
      } catch {
        router.replace("/login");
      } finally {
        setCheckingAuth(false);
      }
    };

    void bootstrap();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(async () => {
      try {
        const latestBalance = await api.credits.getBalance();
        setUser((prev) => (prev ? { ...prev, creditBalance: latestBalance.balance } : prev));
        if (latestBalance.balance < 10) {
          toast({
            title: "Low credits",
            description: "Your balance is below 10 credits. Recharge to avoid request failures.",
            variant: "destructive",
          });
        }
      } catch {
        // Ignore intermittent polling issues.
      }
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [toast, user]);

  const handleLogout = async () => {
    await api.auth.logout();
    router.replace("/login");
  };

  const handleBecomeDeveloper = async () => {
    setEnrolling(true);
    try {
      await api.developers.enroll();
      setIsDeveloper(true);
      toast({
        title: "Developer access enabled",
        description: "You can now access the Developer Console.",
      });
    } catch (err) {
      toast({
        title: "Enrollment failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-sm text-white/60">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0a0a0a] transition-transform md:sticky md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xs font-bold text-black">
              AI
            </div>
            <span className="font-semibold tracking-tight text-white/90">AI Gateway</span>
          </div>
          <button
            className="p-2 text-white/50 transition-colors hover:text-white md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            x
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          {user ? (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <p className="truncate font-medium text-white/90">{user.name}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
              <p className="mt-1 text-xs text-white/70">{user.creditBalance} credits</p>
            </div>
          ) : null}

          {isDeveloper ? (
            <a
              href={`${CONSOLE_URL}?token=${encodeURIComponent(getAuthToken() ?? "")}&rt=${encodeURIComponent(getRefreshToken() ?? "")}`}
              className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Developer Console →
            </a>
          ) : (
            <Button
              variant="outline"
              className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
              disabled={enrolling}
              onClick={handleBecomeDeveloper}
            >
              {enrolling ? "Enrolling…" : "Become a Developer"}
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-black">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/70 px-4 backdrop-blur md:px-6">
          <button
            className="rounded-md p-2 text-white/60 transition-colors hover:bg-white/5 hover:text-white md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            menu
          </button>
          <h1 className="text-sm font-medium text-white/70">Control Center</h1>
          {isDeveloper && (
            <a href={`${CONSOLE_URL}?token=${encodeURIComponent(getAuthToken() ?? "")}&rt=${encodeURIComponent(getRefreshToken() ?? "")}`}>
              <Button className="bg-white text-black hover:bg-white/90">Dev Console</Button>
            </a>
          )}
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl space-y-8">{children}</div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
