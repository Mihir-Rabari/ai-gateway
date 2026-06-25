"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { api, type CreditTransaction, type DeveloperApp, type UsageSummary } from "@/lib/api";

function PremiumTrendChart({
  values,
  labels,
}: {
  values: number[];
  labels?: string[];
}) {
  if (values.length === 0) {
    return <div className="h-52 rounded-md border border-zinc-800 bg-zinc-950" />;
  }

  const max = Math.max(...values, 1);
  const linePoints = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 92 - (value / max) * 70;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,100 ${linePoints} 100,100`;

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
      <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible">
        <polygon points={areaPoints} fill="rgba(244, 244, 245, 0.05)" />
        <polyline
          fill="none"
          stroke="#d4d4d8"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          points={linePoints}
        />
      </svg>
      {labels?.length ? (
        <div className="mt-3 grid grid-cols-7 gap-2 text-center font-mono text-[9px] uppercase tracking-wider text-zinc-500">
          {labels.map((label) => (
            <span key={label} className="truncate">
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PremiumMeterList({
  items,
}: {
  items: Array<{ label: string; value: number; hint?: string }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">{item.label}</p>
              {item.hint ? <p className="mt-1 text-xs text-zinc-500">{item.hint}</p> : null}
            </div>
            <p className="font-mono text-sm font-bold text-zinc-300">{item.value.toLocaleString()}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-zinc-800">
            <div
              className="h-full bg-zinc-400"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PremiumLinePulse({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div className="h-24 rounded-md border border-zinc-800 bg-zinc-950" />;
  }

  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 84;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
      <svg viewBox="0 0 100 100" className="h-20 w-full overflow-visible">
        <polyline
          fill="none"
          stroke="#a1a1aa"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
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
        setError(err instanceof Error ? err.message : "Failed to load overview");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const earnedCredits = transactions.reduce((sum, tx) => (tx.type === "debit" ? sum + tx.amount : sum), 0);
  const estimatedInr = earnedCredits * 0.2;
  const requests = usage?.thisMonth.totalRequests ?? 0;
  const tokens = usage?.thisMonth.totalTokens ?? 0;
  const latency = Math.round(usage?.thisMonth.avgLatencyMs ?? 0);
  const successRate = Math.round((usage?.thisMonth.successRate ?? 0) * 100);
  const chartValues = usage?.last7Days.dailyRequests.map((entry) => entry.count) ?? [];
  const chartLabels = usage?.last7Days.dailyRequests.map((entry) => entry.date.slice(5)) ?? [];
  const topModels = usage?.thisMonth.topModels ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-zinc-800 pb-6">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Overview
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">
            Live operating picture
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            A production dashboard view across app footprint, request quality, model demand, and revenue-side motion.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/apps/new"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-100 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
          >
            <Plus className="h-4 w-4" />
            <span>Register app</span>
          </Link>
        </div>
      </div>

      {error ? (
        <div role="alert" aria-live="assertive" className="rounded-md border border-red-950 bg-red-950/20 px-4 py-3 text-xs text-red-400 font-mono">
          {error}
        </div>
      ) : null}

      {/* Row 1: Metrics Overview Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-md border border-zinc-800 bg-zinc-900/40" />
          ))
        ) : (
          <>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Estimated earnings</p>
              <p className="mt-4 font-mono text-2xl font-bold tracking-tight text-zinc-100">INR {estimatedInr.toFixed(2)}</p>
              <p className="mt-2 text-xs text-zinc-500">Derived from transactions.</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Registered apps</p>
              <p className="mt-4 font-mono text-2xl font-bold tracking-tight text-zinc-100">{apps.length.toString()}</p>
              <p className="mt-2 text-xs text-zinc-500">Developer app attachments.</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Monthly requests</p>
              <p className="mt-4 font-mono text-2xl font-bold tracking-tight text-zinc-100">{requests.toLocaleString()}</p>
              <p className="mt-2 text-xs text-zinc-500">Current month volume.</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Monthly tokens</p>
              <p className="mt-4 font-mono text-2xl font-bold tracking-tight text-zinc-100">{tokens.toLocaleString()}</p>
              <p className="mt-2 text-xs text-zinc-500">Token throughput.</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Success / Latency</p>
              <p className="mt-4 font-mono text-2xl font-bold tracking-tight text-zinc-100">{successRate}% / {latency}ms</p>
              <p className="mt-2 text-xs text-zinc-500">Health snapshot.</p>
            </div>
          </>
        )}
      </div>

      {/* Row 2: Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Demand Pulse */}
        <div className="lg:col-span-7 rounded-md border border-zinc-800 bg-[#09090b] p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-zinc-800/60 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Demand pulse</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-100">7-day request curve</h2>
              </div>
              <p className="text-xs font-mono text-zinc-400">{requests.toLocaleString()} requests this month</p>
            </div>
            {loading ? (
              <div className="mt-6 h-[224px] animate-pulse rounded-md bg-zinc-900/40 border border-zinc-800" />
            ) : (
              <div className="mt-6">
                <PremiumTrendChart values={chartValues} labels={chartLabels} />
              </div>
            )}
          </div>
        </div>

        {/* Model Mix */}
        <div className="lg:col-span-5 rounded-md border border-zinc-800 bg-[#09090b] p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-zinc-800/60 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Model mix</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-100">Where traffic lands</h2>
            </div>
            {loading ? (
              <div className="mt-6 space-y-3">
                <div className="h-16 animate-pulse rounded-md bg-zinc-900/40 border border-zinc-800" />
                <div className="h-16 animate-pulse rounded-md bg-zinc-900/40 border border-zinc-800" />
                <div className="h-16 animate-pulse rounded-md bg-zinc-900/40 border border-zinc-800" />
              </div>
            ) : topModels.length === 0 ? (
              <p className="mt-6 text-xs text-zinc-500 font-mono">No model activity has been recorded yet.</p>
            ) : (
              <div className="mt-6">
                <PremiumMeterList items={topModels.map((model) => ({ label: model.model, value: model.count, hint: "Requests routed to this model" }))} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Info Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* App Roster */}
        <div className="rounded-md border border-zinc-800 bg-[#09090b] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Apps</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-100">Current app roster</h2>
              </div>
              <Link href="/apps" className="rounded-md text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="mt-6 space-y-3">
                <div className="h-14 animate-pulse rounded-md bg-zinc-900/40 border border-zinc-800" />
                <div className="h-14 animate-pulse rounded-md bg-zinc-900/40 border border-zinc-800" />
              </div>
            ) : apps.length === 0 ? (
              <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-950 p-6 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Nothing Yet</p>
                <h3 className="mt-2 text-sm font-bold text-zinc-100">No apps registered</h3>
                <p className="mt-1 text-xs text-zinc-400">Create your first app to get client credentials.</p>
                <div className="mt-4 flex justify-center">
                  <Link href="/apps/new" className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-100 px-3 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200">
                    Register app
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-2">
                {apps.slice(0, 5).map((app) => (
                  <Link
                    key={app.id}
                    href={`/apps/${app.id}`}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 transition hover:bg-zinc-900/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">{app.name}</p>
                      <p className="mt-1 truncate font-mono text-xs text-zinc-500">{app.id}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-md border border-zinc-800 bg-[#09090b] p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-zinc-800/60 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Account activity</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-100">Recent transaction motion</h2>
            </div>
            {loading ? (
              <div className="mt-6 space-y-3">
                <div className="h-20 animate-pulse rounded-md bg-zinc-900/40 border border-zinc-800" />
                <div className="h-14 animate-pulse rounded-md bg-zinc-900/40 border border-zinc-800" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="mt-6 text-xs text-zinc-500 font-mono">No transaction history yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                <PremiumLinePulse values={transactions.slice(0, 8).map((entry) => entry.amount)} />
                <div className="space-y-2">
                  {transactions.slice(0, 4).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs"
                    >
                      <div>
                        <p className="font-medium text-zinc-200">{tx.reason}</p>
                        <p className="mt-1 text-zinc-500 font-mono text-[10px]">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <p className="font-mono text-sm font-bold text-zinc-300">
                        {tx.type === "debit" ? "-" : "+"}
                        {tx.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
