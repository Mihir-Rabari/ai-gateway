"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, CreditCard, Activity, Zap, Server } from "lucide-react";
import { api, type CreditTransaction, type DeveloperApp, type UsageSummary } from "@/lib/api";

function TrendChart({ values, labels }: { values: number[]; labels?: string[] }) {
  if (values.length === 0) {
    return <div className="h-48 rounded-2xl border border-white/10 bg-black/40" />;
  }

  // ⚡ Bolt: Avoid spread operator overhead by using reduce.
  const max = (values ?? []).reduce((currentMax, val) => (val > currentMax ? val : currentMax), 1);
  const linePoints = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 92 - (value / max) * 70;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,100 ${linePoints} 100,100`;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible">
        <polygon points={areaPoints} fill="rgba(255,255,255,0.05)" />
        <polyline
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          points={linePoints}
        />
      </svg>
      {labels?.length ? (
        <div className="mt-3 grid grid-cols-7 gap-2 text-center font-mono text-[9px] uppercase tracking-wider text-white/40">
          {labels.map((label) => (
            <span key={label} className="truncate">{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MeterList({ items }: { items: Array<{ label: string; value: number; hint?: string }> }) {
  // ⚡ Bolt: Avoid O(N) allocation and spread overhead by using a single reduce pass.
  const max = (items ?? []).reduce((currentMax, item) => (item.value > currentMax ? item.value : currentMax), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-white/10 bg-black/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              {item.hint ? <p className="mt-1 text-xs text-white/40">{item.hint}</p> : null}
            </div>
            <p className="font-mono text-sm font-bold text-white/80">{item.value.toLocaleString()}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-white/10">
            <div className="h-full bg-white/40" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
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

  const { earnedCredits, estimatedInr, requests, tokens, latency, successRate, chartValues, chartLabels, topModels } = useMemo(() => {
    const earned = transactions.reduce((sum, tx) => (tx.type === "debit" ? sum + tx.amount : sum), 0);
    const { values, labels } = (usage?.last7Days.dailyRequests ?? []).reduce(
      (acc, entry) => {
        acc.values.push(entry.count);
        acc.labels.push(entry.date.slice(5));
        return acc;
      },
      { values: [] as number[], labels: [] as string[] },
    );
    return {
      earnedCredits: earned,
      estimatedInr: earned * 0.2,
      requests: usage?.thisMonth.totalRequests ?? 0,
      tokens: usage?.thisMonth.totalTokens ?? 0,
      latency: Math.round(usage?.thisMonth.avgLatencyMs ?? 0),
      successRate: Math.round((usage?.thisMonth.successRate ?? 0) * 100),
      chartValues: values,
      chartLabels: labels,
      topModels: usage?.thisMonth.topModels ?? [],
    };
  }, [transactions, usage]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
          <p className="mt-1 text-sm text-white/50">
            Live data from your app usage, routing, and credit activity.
          </p>
        </div>
        <Link
          href="/apps/new"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-4xl bg-white px-3 text-sm font-medium text-black transition hover:bg-white/90"
        >
          <Plus className="h-4 w-4" />
          Register app
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </div>
      ) : null}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-4xl bg-white/10" />
          ))
        ) : (
          <>
            <div className="rounded-4xl bg-[#0a0a0a] py-6 px-6 shadow-md ring-1 ring-white/10">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-white/60">Estimated earnings</p>
                <CreditCard className="h-4 w-4 text-white/40" />
              </div>
              <p className="text-2xl font-bold text-white">INR {estimatedInr.toFixed(2)}</p>
              <p className="mt-1 text-xs text-white/40">Derived from transactions</p>
            </div>
            <div className="rounded-4xl bg-[#0a0a0a] py-6 px-6 shadow-md ring-1 ring-white/10">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-white/60">Registered apps</p>
                <Server className="h-4 w-4 text-white/40" />
              </div>
              <p className="text-2xl font-bold text-white">{apps.length}</p>
              <p className="mt-1 text-xs text-white/40">Developer app attachments</p>
            </div>
            <div className="rounded-4xl bg-[#0a0a0a] py-6 px-6 shadow-md ring-1 ring-white/10">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-white/60">Monthly requests</p>
                <Activity className="h-4 w-4 text-white/40" />
              </div>
              <p className="text-2xl font-bold text-white">{requests.toLocaleString()}</p>
              <p className="mt-1 text-xs text-white/40">Current month volume</p>
            </div>
            <div className="rounded-4xl bg-[#0a0a0a] py-6 px-6 shadow-md ring-1 ring-white/10">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-white/60">Success / Latency</p>
                <Zap className="h-4 w-4 text-white/40" />
              </div>
              <p className="text-2xl font-bold text-white">{successRate}% / {latency}ms</p>
              <p className="mt-1 text-xs text-white/40">Health snapshot</p>
            </div>
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-7">
        <div className="col-span-4 rounded-4xl bg-[#0a0a0a] py-6 px-6 shadow-md ring-1 ring-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-medium text-white/60">Demand pulse</p>
              <p className="mt-1 text-lg font-semibold text-white">7-day request curve</p>
            </div>
            <p className="text-xs font-mono text-white/40">{requests.toLocaleString()} this month</p>
          </div>
          {loading ? (
            <div className="mt-6 h-48 animate-pulse rounded-2xl bg-white/10" />
          ) : (
            <div className="mt-6">
              <TrendChart values={chartValues} labels={chartLabels} />
            </div>
          )}
        </div>

        <div className="col-span-3 rounded-4xl bg-[#0a0a0a] py-6 px-6 shadow-md ring-1 ring-white/10">
          <div className="border-b border-white/10 pb-4">
            <p className="text-sm font-medium text-white/60">Model mix</p>
            <p className="mt-1 text-lg font-semibold text-white">Where traffic lands</p>
          </div>
          {loading ? (
            <div className="mt-6 space-y-3">
              <div className="h-16 animate-pulse rounded-lg bg-white/10" />
              <div className="h-16 animate-pulse rounded-lg bg-white/10" />
            </div>
          ) : topModels.length === 0 ? (
            <p className="mt-6 text-sm text-white/50">No model activity recorded yet.</p>
          ) : (
            <div className="mt-6">
              <MeterList items={topModels.map((m) => ({ label: m.model, value: m.count, hint: "Requests routed" }))} />
            </div>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-4xl bg-[#0a0a0a] py-6 px-6 shadow-md ring-1 ring-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-sm font-medium text-white/60">Apps</p>
              <p className="mt-1 text-lg font-semibold text-white">Current app roster</p>
            </div>
            <Link href="/apps" className="text-xs text-white/60 hover:text-white transition">View all</Link>
          </div>
          {loading ? (
            <div className="mt-6 space-y-3">
              <div className="h-14 animate-pulse rounded-lg bg-white/10" />
              <div className="h-14 animate-pulse rounded-lg bg-white/10" />
            </div>
          ) : apps.length === 0 ? (
            <div className="mt-6 rounded-lg border border-white/10 bg-black/40 p-6 text-center">
              <p className="text-xs text-white/40">No apps registered</p>
              <p className="mt-2 text-sm text-white/50">Create your first app to get credentials.</p>
              <div className="mt-4 flex justify-center">
                <Link href="/apps/new" className="inline-flex h-9 items-center rounded-4xl bg-white px-3 text-sm font-medium text-black hover:bg-white/90 transition">
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
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-4 py-3 transition hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{app.name}</p>
                    <p className="mt-1 truncate font-mono text-xs text-white/40">{app.id}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-4xl bg-[#0a0a0a] py-6 px-6 shadow-md ring-1 ring-white/10">
          <div className="border-b border-white/10 pb-4">
            <p className="text-sm font-medium text-white/60">Account activity</p>
            <p className="mt-1 text-lg font-semibold text-white">Recent transactions</p>
          </div>
          {loading ? (
            <div className="mt-6 space-y-3">
              <div className="h-16 animate-pulse rounded-lg bg-white/10" />
              <div className="h-16 animate-pulse rounded-lg bg-white/10" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="mt-6 text-sm text-white/50">No transaction history yet.</p>
          ) : (
            <div className="mt-6 space-y-2">
              {transactions.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{tx.reason}</p>
                    <p className="mt-1 text-xs text-white/40">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                  <p className={`text-sm font-medium ${tx.type === "debit" ? "text-red-300" : "text-emerald-300"}`}>
                    {tx.type === "debit" ? "-" : "+"}{tx.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
