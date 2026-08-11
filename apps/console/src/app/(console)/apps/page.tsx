"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api, type DeveloperApp } from "@/lib/api";
import { Button, DataTable, DetailList, EmptyState, InlineMessage, MetricCard, MobileCardList, ShellSection, SkeletonBlock, Surface } from "@/components/console/system";

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

  // ⚡ Bolt: Consolidated multiple .filter() iterations into a single O(N) .reduce() pass.
  // Expected Impact: Reduces iteration overhead from O(2N) to O(N) when computing aggregate metrics for the UI.
  // Also fixed a bug where the UI previously attempted to render an array object instead of its length.
  const { activeApps, withRedirectUris } = apps.reduce((acc, app) => {
    if (app.isActive) acc.activeApps++;
    if ((app.redirectUris?.length ?? 0) > 0) acc.withRedirectUris++;
    return acc;
  }, { activeApps: 0, withRedirectUris: 0 });

  return (
    <div className="space-y-6">
      <ShellSection
        eyebrow="Apps"
        title="Application inventory"
        description="Manage registered applications, redirect URIs, and issued credentials from one table."
        action={
          <Button asChild className="rounded-lg bg-white text-black hover:bg-white/90 px-4 h-9 text-xs transition duration-200 font-medium">
            <Link href="/apps/new">
              <Plus className="h-4 w-4 mr-1.5" />Register app
            </Link>
          </Button>
        }
      />
      {error ? <InlineMessage tone="danger" className="rounded-lg border-red-500/30 bg-red-500/10 text-red-300">{error}</InlineMessage> : null}
      
      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg bg-white/10 border border-white/10 h-32" />
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">Total apps</p>
              <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">{apps.length.toString()}</p>
              <p className="mt-2 text-xs text-white/40">Every registered application on this account.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">Active apps</p>
              <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">{activeApps.toString()}</p>
              <p className="mt-2 text-xs text-white/40">Apps that are currently enabled and reachable.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">With redirect URIs</p>
              <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">{withRedirectUris.toString()}</p>
              <p className="mt-2 text-xs text-white/40">Apps already configured for OAuth callback routing.</p>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="animate-pulse rounded-lg bg-white/10 border border-white/10 h-16" />
              <div className="animate-pulse rounded-lg bg-white/10 border border-white/10 h-16" />
              <div className="animate-pulse rounded-lg bg-white/10 border border-white/10 h-16" />
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 font-semibold">Nothing Yet</p>
              <h3 className="mt-4 font-sans text-2xl font-bold text-white">No developer apps yet</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">
                Register your first application to generate client credentials and begin tracking usage.
              </p>
              <div className="mt-6 flex justify-center">
                <Button asChild className="rounded-lg bg-white text-black hover:bg-white/90 px-4 h-9 text-xs transition duration-200 font-medium">
                  <Link href="/apps/new">Register first app</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                <div className="space-y-3">
                  {apps.map((app) => (
                    <Link
                      key={app.id}
                      href={`/apps/${app.id}`}
                      className="block rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:bg-white/5"
                    >
                      <p className="font-semibold text-white text-sm">{app.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-white/40 uppercase tracking-tight">{app.id}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/50">
                        <span>{app.description || "No description"}</span>
                        <span className="text-right text-white/40">{new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="hidden md:block rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                <div className="overflow-x-auto scrollbar-subtle">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Name</th>
                        <th className="px-5 py-4 font-semibold">App ID</th>
                        <th className="px-5 py-4 font-semibold">Description</th>
                        <th className="px-5 py-4 font-semibold">Created</th>
                        <th className="px-5 py-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {apps.map((app) => (
                        <tr key={app.id} className="align-top text-white/80 transition hover:bg-white/5">
                          <td className="px-5 py-4 font-semibold text-white">{app.name}</td>
                          <td className="px-5 py-4 font-mono text-xs text-white/40">{app.id}</td>
                          <td className="px-5 py-4 text-white/50">{app.description || "No description"}</td>
                          <td className="px-5 py-4 text-white/40">{new Date(app.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-4">
                            <Link href={`/apps/${app.id}`} className="text-xs font-semibold text-white/90 hover:text-white underline underline-offset-4 decoration-zinc-800 hover:decoration-zinc-400 transition">
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-7 shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">Shape of the fleet</p>
          <h2 className="mt-3 font-sans text-3xl font-bold tracking-tight text-white">Operational notes</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-white/50">
            <p>Each app keeps its identity, redirect list, analytics feed, and credential lifecycle attached to the same console shell.</p>
            <p>Use the detail view to rotate keys, inspect per-model usage, and update the exact redirect URIs required for OAuth.</p>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 mt-6">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Data source</p>
              <div className="mt-2 text-sm text-white/80">
                <code className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-xs text-white/80">
                  api.apps.list()
                </code>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Primary follow-up</p>
              <div className="mt-2 text-sm text-white/80 leading-relaxed">
                Use app detail pages for redirect URI control, key rotation, and usage inspection.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
