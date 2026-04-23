"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api, type DeveloperApp } from "@/lib/api";
import { DataTable, DetailList, EmptyState, InlineMessage, MetricCard, MobileCardList, ShellSection, SkeletonBlock, Surface } from "@/components/console/system";

export default function AppsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apps, setApps] = useState<DeveloperApp[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        setApps(await api.apps.list());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load apps");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const activeApps = apps.filter((app) => app.isActive).length;

  return (
    <div className="space-y-6">
      <ShellSection eyebrow="Apps" title="Application inventory" description="Manage registered applications, redirect URIs, and issued credentials from one table." action={<Link href="/apps/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 bg-white text-black hover:bg-white/86"><Plus className="h-4 w-4" />Register app</Link>} />
      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      <div className="grid gap-4 md:grid-cols-3">{loading ? Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-32" />) : <><MetricCard label="Total apps" value={apps.length.toString()} hint="Every registered application on this account." /><MetricCard label="Active apps" value={activeApps.toString()} hint="Apps that are currently enabled and reachable." /><MetricCard label="With redirect URIs" value={apps.filter((app) => (app.redirectUris?.length ?? 0) > 0).toString()} hint="Apps already configured for OAuth callback routing." /></>}</div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><div className="space-y-4">{loading ? <div className="space-y-3"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /></div> : apps.length === 0 ? <EmptyState title="No developer apps yet" description="Register your first application to generate client credentials and begin tracking usage." action={<Link href="/apps/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 bg-white text-black hover:bg-white/86">Register first app</Link>} /> : <><div className="md:hidden"><MobileCardList>{apps.map((app) => <Link key={app.id} href={`/apps/${app.id}`} className="block rounded-[24px] border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"><p className="font-medium text-white">{app.name}</p><p className="mt-2 font-mono text-xs text-white/40">{app.id}</p><div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/52"><span>{app.description || "No description"}</span><span className="text-right">{new Date(app.createdAt).toLocaleDateString()}</span></div></Link>)}</MobileCardList></div><DataTable className="hidden md:block" columns={["Name", "App ID", "Description", "Created", "Action"]} rows={apps.map((app) => <tr key={app.id} className="align-top text-white/76 transition hover:bg-white/[0.04]"><td className="px-5 py-4 font-medium text-white">{app.name}</td><td className="px-5 py-4 font-mono text-xs text-white/42">{app.id}</td><td className="px-5 py-4 text-white/56">{app.description || "No description"}</td><td className="px-5 py-4 text-white/48">{new Date(app.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><Link href={`/apps/${app.id}`} className="text-sm text-white transition hover:text-white/66">Manage</Link></td></tr>)} /></>}</div><Surface className="p-6 md:p-7"><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Shape of the fleet</p><h2 className="mt-3 font-display text-3xl tracking-[-0.05em] text-white">Operational notes</h2><div className="mt-8 space-y-4 text-sm leading-7 text-white/58"><p>Each app keeps its identity, redirect list, analytics feed, and credential lifecycle attached to the same console shell.</p><p>Use the detail view to rotate keys, inspect per-model usage, and update the exact redirect URIs required for OAuth.</p></div><DetailList className="mt-6" items={[{ label: "Data source", value: <code className="rounded bg-white/10 px-2 py-1 text-white">api.apps.list()</code> }, { label: "Primary follow-up", value: "Use app detail pages for redirect URI control, key rotation, and usage inspection." }]} /></Surface></div>
    </div>
  );
}
