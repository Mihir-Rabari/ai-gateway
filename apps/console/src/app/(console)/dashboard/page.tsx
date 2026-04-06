"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Wallet, AppWindow, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type CreditTransaction, type DeveloperApp, type UsageSummary } from "@/lib/api";

export default function DevOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [appsRes, usageRes, txRes] = await Promise.all([
          api.apps.list(),
          api.usage.getSummary(),
          api.credits.getTransactions(12, 0),
        ]);
        setApps(appsRes);
        setUsage(usageRes);
        setTransactions(txRes.transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load developer overview");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const earnedCredits = transactions
    .filter((tx) => tx.type === "debit")
    .reduce((acc, tx) => acc + tx.amount, 0);
  const estimatedInr = (earnedCredits * 0.2).toFixed(2);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Developer Overview</h1>
        <p className="text-white/60">All numbers here are loaded from live backend routes.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          title="Estimated Earnings"
          hint="20% share on consumed credits"
          icon={<Wallet className="h-4 w-4 text-white/40" />}
          loading={loading}
          value={`INR ${estimatedInr}`}
        />
        <InfoCard
          title="Registered Apps"
          hint="Currently active apps"
          icon={<AppWindow className="h-4 w-4 text-white/40" />}
          loading={loading}
          value={apps.length.toString()}
        />
        <InfoCard
          title="Credits Driven"
          hint="Credits consumed this month"
          icon={<Code className="h-4 w-4 text-white/40" />}
          loading={loading}
          value={(usage?.thisMonth.totalCredits ?? 0).toLocaleString()}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-transparent">
          <CardHeader>
            <CardTitle>Your Apps</CardTitle>
            <CardDescription className="text-white/40">Manage keys and statuses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full bg-white/10" />
                <Skeleton className="h-12 w-full bg-white/10" />
              </div>
            ) : apps.length === 0 ? (
              <p className="text-sm text-white/50">No apps yet. Register your first app to start earning.</p>
            ) : (
              apps.slice(0, 5).map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{app.name}</p>
                    <p className="truncate text-xs text-white/40">{app.id}</p>
                  </div>
                  <Link href={`/apps/${app.id}`}>
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                      View
                    </Button>
                  </Link>
                </div>
              ))
            )}
            <Link href="/apps/new" className="block pt-1">
              <Button variant="outline" className="w-full border-white/10 text-white/80 hover:bg-white/5">
                Register New App
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-transparent">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription className="text-white/40">SDK and monetization resources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/docs"
              className="group flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-white">SDK Documentation</p>
                <p className="mt-1 text-xs text-white/40">Install, authenticate, and call models.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white" />
            </Link>
            <Link
              href="/earnings"
              className="group flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-white">Earnings and Payouts</p>
                <p className="mt-1 text-xs text-white/40">See credits-driven revenue estimates.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  hint,
  icon,
  loading,
  value,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  loading: boolean;
  value: string;
}) {
  return (
    <Card className="border-white/10 bg-[#0a0a0a]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/60">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-28 bg-white/10" />
            <Skeleton className="mt-2 h-3 w-32 bg-white/10" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-white/40">{hint}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
