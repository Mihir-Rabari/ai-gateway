"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, CreditCard, Activity, Zap, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type CreditTransaction, type UsageSummary } from "@/lib/api";

type DashboardState = {
  balance: number;
  usage: UsageSummary | null;
  models: string[];
  transactions: CreditTransaction[];
};

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState<DashboardState>({
    balance: 0,
    usage: null,
    models: [],
    transactions: [],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [balance, usage, models, transactions] = await Promise.all([
          api.credits.getBalance(),
          api.usage.getSummary(),
          api.models.list(),
          api.credits.getTransactions(8, 0),
        ]);

        setState({
          balance: balance.balance,
          usage,
          models: models.models,
          transactions: transactions.transactions,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const topModels = state.usage?.thisMonth.topModels ?? [];
  const dailyRequests = state.usage?.last7Days.dailyRequests ?? [];
  const peakDay = dailyRequests.reduce((max, item) => (item.count > max.count ? item : max), {
    date: "",
    count: 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
          <p className="mt-1 text-sm text-white/50">Live data from your account usage and credits.</p>
        </div>
        <div className="flex gap-2">
          <a href={`${process.env.NEXT_PUBLIC_CONSOLE_URL ?? "http://localhost:3009"}/docs`}>
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              SDK Docs
            </Button>
          </a>
          <a href={process.env.NEXT_PUBLIC_CONSOLE_URL ?? "http://localhost:3009"}>
            <Button className="bg-white text-black hover:bg-white/90">Developer Console</Button>
          </a>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Credit Balance"
          icon={<CreditCard className="h-4 w-4 text-white/40" />}
          loading={loading}
          value={state.balance.toLocaleString()}
          hint="Available right now"
        />
        <StatsCard
          title="Monthly Requests"
          icon={<Activity className="h-4 w-4 text-white/40" />}
          loading={loading}
          value={(state.usage?.thisMonth.totalRequests ?? 0).toLocaleString()}
          hint="Since month start"
        />
        <StatsCard
          title="Monthly Tokens"
          icon={<Zap className="h-4 w-4 text-white/40" />}
          loading={loading}
          value={(state.usage?.thisMonth.totalTokens ?? 0).toLocaleString()}
          hint="Input + output tokens"
        />
        <StatsCard
          title="Supported Models"
          icon={<Server className="h-4 w-4 text-white/40" />}
          loading={loading}
          value={state.models.length.toString()}
          hint={state.models.slice(0, 2).join(", ") || "No models available"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="col-span-4 border-white/10 bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle className="text-white">Usage Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-28 w-full bg-white/10" />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                    <p className="text-xs text-white/50">Credits used this month</p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {(state.usage?.thisMonth.totalCredits ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                    <p className="text-xs text-white/50">Avg latency</p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {Math.round(state.usage?.thisMonth.avgLatencyMs ?? 0)} ms
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-white/70">
                  Peak request day in last 7 days:{" "}
                  <span className="font-medium text-white">
                    {peakDay.date ? `${peakDay.date} (${peakDay.count} requests)` : "No recent traffic"}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-white/10 bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle className="text-white">Top Models</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full bg-white/10" />
                <Skeleton className="h-8 w-full bg-white/10" />
                <Skeleton className="h-8 w-full bg-white/10" />
              </div>
            ) : topModels.length === 0 ? (
              <p className="text-sm text-white/50">No usage recorded this month yet.</p>
            ) : (
              <div className="space-y-3">
                {topModels.map((model) => (
                  <div
                    key={model.model}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                  >
                    <p className="truncate text-sm text-white">{model.model}</p>
                    <p className="text-xs text-white/60">{model.count} req</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-[#0a0a0a]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Recent Credit Transactions</CardTitle>
          <a
            href={`${process.env.NEXT_PUBLIC_CONSOLE_URL ?? "http://localhost:3009"}/earnings`}
            className="text-xs text-white/60 hover:text-white"
          >
            View all <ArrowUpRight className="ml-1 inline h-3 w-3" />
          </a>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
          ) : state.transactions.length === 0 ? (
            <p className="text-sm text-white/50">No transactions found yet.</p>
          ) : (
            <div className="space-y-2">
              {state.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{tx.reason}</p>
                    <p className="text-xs text-white/50">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <p className={tx.type === "debit" ? "text-red-300" : "text-green-300"}>
                    {tx.type === "debit" ? "-" : "+"}
                    {tx.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  title,
  icon,
  loading,
  value,
  hint,
}: {
  title: string;
  icon: ReactNode;
  loading: boolean;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-white/10 bg-[#0a0a0a]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/60">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24 bg-white/10" />
            <Skeleton className="h-3 w-28 bg-white/10" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-white/40">{hint}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
