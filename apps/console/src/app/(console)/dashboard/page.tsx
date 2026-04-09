"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { api, type CreditTransaction, type DeveloperApp, type UsageSummary } from "@/lib/api";
import { HorizontalMeterList, LinePulse, TrendAreaChart } from "@/components/console/charts";
import { Button, EmptyState, InlineMessage, MetricCard, MobileCardList, ShellSection, SkeletonBlock, Surface } from "@/components/console/system";

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
        const [appsRes, usageRes, txRes] = await Promise.all([api.apps.list(), api.usage.getSummary(), api.credits.getTransactions(12, 0)]);
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

  const earnedCredits = transactions.filter((tx) => tx.type === "debit").reduce((sum, tx) => sum + tx.amount, 0);
  const estimatedInr = earnedCredits * 0.2;
  const requests = usage?.thisMonth.totalRequests ?? 0;
  const credits = usage?.thisMonth.totalCredits ?? 0;
  const tokens = usage?.thisMonth.totalTokens ?? 0;
  const latency = Math.round(usage?.thisMonth.avgLatencyMs ?? 0);
  const successRate = Math.round((usage?.thisMonth.successRate ?? 0) * 100);
  const chartValues = usage?.last7Days.dailyRequests.map((entry) => entry.count) ?? [];
  const chartLabels = usage?.last7Days.dailyRequests.map((entry) => entry.date.slice(5)) ?? [];
  const topModels = usage?.thisMonth.topModels ?? [];

  return (
    <div className="space-y-6">
      <ShellSection eyebrow="Overview" title="Live operating picture" description="A production dashboard view across app footprint, request quality, model demand, and revenue-side motion." action={<Link href="/apps/new"><Button><Plus className="h-4 w-4" />Register app</Button></Link>} />
      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{loading ? Array.from({ length: 5 }).map((_, index) => <SkeletonBlock key={index} className="h-40" />) : <><MetricCard label="Estimated earnings" value={`INR ${estimatedInr.toFixed(2)}`} hint="Derived from transaction debits." /><MetricCard label="Registered apps" value={apps.length.toString()} hint="All developer apps attached to this account." /><MetricCard label="Monthly requests" value={requests.toLocaleString()} hint="Request volume across the current month." /><MetricCard label="Monthly tokens" value={tokens.toLocaleString()} hint="Combined token throughput this month." /><MetricCard label="Success + latency" value={`${successRate}% / ${latency}ms`} hint="Health and response-time snapshot." /></>}</div>
      <div className="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]"><Surface className="p-6 md:p-7"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Demand pulse</p><h2 className="mt-3 font-display text-3xl tracking-[-0.05em] text-white">7-day request curve</h2></div><p className="text-sm text-white/44">{requests.toLocaleString()} requests this month</p></div>{loading ? <SkeletonBlock className="mt-8 h-64" /> : <TrendAreaChart values={chartValues} labels={chartLabels} className="mt-8" />}</Surface><Surface className="p-6 md:p-7"><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Model mix</p><h2 className="mt-3 font-display text-3xl tracking-[-0.05em] text-white">Where traffic lands</h2>{loading ? <div className="mt-8 space-y-3"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /></div> : topModels.length === 0 ? <p className="mt-8 text-sm text-white/50">No model activity has been recorded yet.</p> : <HorizontalMeterList className="mt-8" items={topModels.map((model) => ({ label: model.model, value: model.count, hint: "Requests routed to this model" }))} />}</Surface></div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]"><Surface className="p-6 md:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Apps</p><h2 className="mt-3 font-display text-3xl tracking-[-0.05em] text-white">Current app roster</h2></div><Link href="/apps" className="text-sm text-white/52 transition hover:text-white">View all</Link></div>{loading ? <div className="mt-8 space-y-3"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /></div> : apps.length === 0 ? <EmptyState title="No apps registered" description="Create your first app to get client credentials and start measuring traffic." action={<Link href="/apps/new"><Button>Register app</Button></Link>} /> : <MobileCardList className="mt-8">{apps.slice(0, 5).map((app) => <Link key={app.id} href={`/apps/${app.id}`} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/[0.06]"><div className="min-w-0"><p className="truncate font-medium text-white">{app.name}</p><p className="mt-1 truncate font-mono text-xs text-white/40">{app.id}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-white/38" /></Link>)}</MobileCardList>}</Surface><Surface className="p-6 md:p-7"><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Account activity</p><h2 className="mt-3 font-display text-3xl tracking-[-0.05em] text-white">Recent transaction motion</h2>{loading ? <SkeletonBlock className="mt-8 h-52" /> : transactions.length === 0 ? <p className="mt-8 text-sm text-white/50">No transaction history yet.</p> : <div className="mt-8 space-y-4"><LinePulse values={transactions.slice(0, 8).map((entry) => entry.amount)} /><MobileCardList>{transactions.slice(0, 4).map((tx) => <div key={tx.id} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm"><div><p className="text-white">{tx.reason}</p><p className="mt-1 text-white/42">{new Date(tx.created_at).toLocaleString()}</p></div><p className="font-medium text-white/74">{tx.type === "debit" ? "-" : "+"}{tx.amount}</p></div>)}</MobileCardList></div>}</Surface></div>
    </div>
  );
}
