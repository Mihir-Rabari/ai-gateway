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
          <Button asChild className="rounded-md bg-white text-black hover:bg-zinc-200 px-4 h-9 text-xs transition duration-200 font-medium">
            <Link href="/apps/new">
              <Plus className="h-4 w-4 mr-1.5" />Register app
            </Link>
          </Button>
        }
      />
      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      
      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-32" />
          ))
        ) : (
          <>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">Total apps</p>
              <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">{apps.length.toString()}</p>
              <p className="mt-2 text-xs text-zinc-500">Every registered application on this account.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">Active apps</p>
              <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">{activeApps.toString()}</p>
              <p className="mt-2 text-xs text-zinc-500">Apps that are currently enabled and reachable.</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 shadow-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">With redirect URIs</p>
              <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-white">{withRedirectUris.toString()}</p>
              <p className="mt-2 text-xs text-zinc-500">Apps already configured for OAuth callback routing.</p>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-16" />
              <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-16" />
              <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-16" />
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500 font-semibold">Nothing Yet</p>
              <h3 className="mt-4 font-display text-2xl font-bold text-white">No developer apps yet</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
                Register your first application to generate client credentials and begin tracking usage.
              </p>
              <div className="mt-6 flex justify-center">
                <Button asChild className="rounded-md bg-white text-black hover:bg-zinc-200 px-4 h-9 text-xs transition duration-200 font-medium">
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
                      className="block rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition hover:bg-zinc-900/50"
                    >
                      <p className="font-semibold text-white text-sm">{app.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-zinc-500 uppercase tracking-tight">{app.id}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-400">
                        <span>{app.description || "No description"}</span>
                        <span className="text-right text-zinc-500">{new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="hidden md:block rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
                <div className="overflow-x-auto scrollbar-subtle">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-zinc-900/50 border-b border-zinc-800 text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Name</th>
                        <th className="px-5 py-4 font-semibold">App ID</th>
                        <th className="px-5 py-4 font-semibold">Description</th>
                        <th className="px-5 py-4 font-semibold">Created</th>
                        <th className="px-5 py-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {apps.map((app) => (
                        <tr key={app.id} className="align-top text-zinc-300 transition hover:bg-zinc-900/30">
                          <td className="px-5 py-4 font-semibold text-white">{app.name}</td>
                          <td className="px-5 py-4 font-mono text-xs text-zinc-500">{app.id}</td>
                          <td className="px-5 py-4 text-zinc-400">{app.description || "No description"}</td>
                          <td className="px-5 py-4 text-zinc-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-4">
                            <Link href={`/apps/${app.id}`} className="text-xs font-semibold text-zinc-200 hover:text-white underline underline-offset-4 decoration-zinc-800 hover:decoration-zinc-400 transition">
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

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-7 shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Shape of the fleet</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white">Operational notes</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-zinc-400">
            <p>Each app keeps its identity, redirect list, analytics feed, and credential lifecycle attached to the same console shell.</p>
            <p>Use the detail view to rotate keys, inspect per-model usage, and update the exact redirect URIs required for OAuth.</p>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 mt-6">
            <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Data source</p>
              <div className="mt-2 text-sm text-zinc-300">
                <code className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
                  api.apps.list()
                </code>
              </div>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Primary follow-up</p>
              <div className="mt-2 text-sm text-zinc-300 leading-relaxed">
                Use app detail pages for redirect URI control, key rotation, and usage inspection.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
