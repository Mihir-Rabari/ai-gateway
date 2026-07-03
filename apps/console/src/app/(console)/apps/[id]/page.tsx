"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, RotateCw, Trash2 } from "lucide-react";
import { api, type AppUsageSummary, type DeveloperApp } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge, Button, Field, IconButton, InlineMessage, ShellSection, SkeletonBlock, Surface, TextArea } from "@/components/console/system";

export default function AppDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id;
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [appData, setAppData] = useState<DeveloperApp | null>(null);
  const [usage, setUsage] = useState<AppUsageSummary | null>(null);
  const [redirectUrisRaw, setRedirectUrisRaw] = useState("");
  const [savingUris, setSavingUris] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [app, usageRes] = await Promise.all([api.apps.get(id), api.apps.usage(id)]);
        setAppData(app);
        setUsage(usageRes);
        setRedirectUrisRaw(app?.redirectUris?.join("\n") ?? "");
      } catch (err) {
        toast({ title: "Failed to load app", description: err instanceof Error ? err.message : "Unexpected error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, toast]);

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied`, description: "Copied to clipboard." });
  };

  const rotateKey = async () => {
    if (!window.confirm("Rotate the API key now? The previous key will stop working immediately.")) return;
    try {
      const result = await api.apps.rotateKey(id);
      setApiKey(result.apiKey);
      setShowKey(true);
      toast({ title: "API key rotated", description: "The new key is now visible on screen." });
    } catch (err) {
      toast({ title: "Key rotation failed", description: err instanceof Error ? err.message : "Unexpected error", variant: "destructive" });
    }
  };

  const saveRedirectUris = async () => {
    const uris = redirectUrisRaw.split("\n").map((entry) => entry.trim()).filter(Boolean);
    setSavingUris(true);
    try {
      await api.apps.updateRedirectUris(id, uris);
      setAppData((current) => (current ? { ...current, redirectUris: uris } : current));
      toast({ title: "Redirect URIs saved", description: `${uris.length} URI(s) updated.` });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unexpected error", variant: "destructive" });
    } finally {
      setSavingUris(false);
    }
  };

  const deleteApp = async () => {
    if (!window.confirm("Delete this app? This cannot be undone.")) return;
    try {
      await api.apps.delete(id);
      toast({ title: "App deleted", description: "The application has been removed." });
      router.push("/apps");
    } catch (err) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : "Unexpected error", variant: "destructive" });
    }
  };

  const usageRows = usage?.rows ?? [];
  // Bolt: Combined multiple .reduce() operations into a single O(N) pass.
  const { totalCredits, totalRequests } = usageRows.reduce((acc, row) => {
    acc.totalCredits += Number(row.total_credits || 0);
    acc.totalRequests += Number(row.total_requests || 0);
    return acc;
  }, { totalCredits: 0, totalRequests: 0 });

  return (
    <div className="space-y-6">
      <ShellSection
        eyebrow="App detail"
        title={appData?.name ?? "Application detail"}
        description="Inspect credentials, edit redirect URIs, and review analytics for this app."
        action={
          <Button asChild variant="secondary" className="rounded-md h-9 px-4 text-xs font-semibold border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 transition">
            <Link href="/apps">Back to apps</Link>
          </Button>
        }
      />
      {!loading && !appData ? (
        <InlineMessage tone="danger" className="rounded-md border-red-900/30 bg-red-950/20 text-red-200">
          App not found or you no longer have access to it.
        </InlineMessage>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface className="rounded-lg border-zinc-800 bg-zinc-950 p-6 md:p-7 shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Identity</p>
          {loading ? (
            <div className="mt-8 space-y-3">
              <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-12" />
              <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-20" />
              <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-12" />
            </div>
          ) : appData ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">App ID</p>
                <div className="mt-3 flex items-center justify-between gap-3 bg-black border border-zinc-800 rounded px-3 py-2 font-mono text-sm text-white">
                  <span className="min-w-0 flex-1 break-all select-all selection:bg-zinc-800">{appData.id}</span>
                  <button
                    onClick={() => copyText(appData.id, "App ID")}
                    className="text-zinc-400 hover:text-white transition p-1 hover:bg-zinc-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700"
                    title="Copy App ID"
                    aria-label="Copy App ID"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Client ID</p>
                <div className="mt-3 flex items-center justify-between gap-3 bg-black border border-zinc-800 rounded px-3 py-2 font-mono text-sm text-white">
                  <span className="min-w-0 flex-1 break-all select-all selection:bg-zinc-800">{appData.clientId ?? "Unavailable"}</span>
                  {appData.clientId ? (
                    <button
                      onClick={() => copyText(appData.clientId!, "Client ID")}
                      className="text-zinc-400 hover:text-white transition p-1 hover:bg-zinc-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700"
                      title="Copy Client ID"
                      aria-label="Copy Client ID"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="inline-flex items-center rounded border border-emerald-800/60 bg-emerald-950/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Active
                </span>
                <span className="inline-flex items-center rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-xs font-medium text-zinc-400">
                  Created {new Date(appData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : null}
        </Surface>

        <Surface className="rounded-lg border-zinc-800 bg-zinc-950 p-6 md:p-7 shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Credentials</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-md border border-zinc-800 bg-zinc-900/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Visible API key</p>
              <div className="mt-3 flex items-center justify-between gap-3 bg-black border border-zinc-800 rounded px-3 py-2 font-mono text-sm text-white">
                <span className="min-w-0 flex-1 break-all select-all selection:bg-zinc-800">
                  {apiKey ? (showKey ? apiKey : "•".repeat(24)) : "Rotate key to generate a fresh visible value"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowKey((current) => !current)}
                    className="text-zinc-400 hover:text-white transition p-1 hover:bg-zinc-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700"
                    title={showKey ? "Hide API Key" : "Show API Key"}
                    aria-label={showKey ? "Hide API Key" : "Show API Key"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => copyText(apiKey, "API Key")}
                    disabled={!apiKey}
                    className="text-zinc-400 hover:text-white disabled:opacity-30 transition p-1 hover:bg-zinc-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700"
                    title="Copy API Key"
                    aria-label="Copy API Key"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={rotateKey}
                className="rounded-md h-9 px-4 text-xs font-semibold border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 transition"
              >
                <RotateCw className="h-3.5 w-3.5 mr-1.5" />Rotate key
              </Button>
              <Button
                variant="danger"
                onClick={deleteApp}
                className="rounded-md h-9 px-4 text-xs font-semibold border border-red-900/30 bg-red-950/20 text-red-200 hover:bg-red-900/20 transition"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete app
              </Button>
            </div>
          </div>
        </Surface>
      </div>

      <Surface className="rounded-lg border-zinc-800 bg-zinc-950 p-6 md:p-7 shadow-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">OAuth redirect URIs</p>
        <div className="mt-8 space-y-4">
          <Field label="Allowed redirect URIs" hint="One URI per line">
            <TextArea
              value={redirectUrisRaw}
              onChange={(event) => setRedirectUrisRaw(event.target.value)}
              placeholder={"http://localhost:3000/callback\nhttps://myapp.com/callback"}
              className="rounded-md border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-mono focus:border-zinc-700 focus:bg-zinc-950 focus-visible:ring-zinc-800"
            />
          </Field>
          <Button
            busy={savingUris}
            onClick={saveRedirectUris}
            className="rounded-md bg-white text-black hover:bg-zinc-200 px-4 h-9 text-xs transition duration-200 font-semibold"
          >
            {savingUris ? "Saving" : "Save redirect URIs"}
          </Button>
        </div>
      </Surface>

      <Surface className="rounded-lg border-zinc-800 bg-zinc-950 p-6 md:p-7 shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Usage</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white">Traffic summary</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 font-mono">
            <span>{totalRequests.toLocaleString()} requests</span>
            <span>·</span>
            <span>{totalCredits.toLocaleString()} credits</span>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 space-y-3">
            <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-16" />
            <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-16" />
            <div className="animate-pulse rounded-md bg-zinc-900/60 border border-zinc-800 h-16" />
          </div>
        ) : usageRows.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">No usage events have been recorded for this app yet.</p>
        ) : (
          <div className="mt-8 space-y-3">
            {usageRows.map((row) => (
              <div
                key={row.model}
                className="flex flex-col gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 md:flex-row md:items-center md:justify-between transition hover:bg-zinc-900/30"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-white">{row.model}</p>
                  <p className="mt-1 text-xs text-zinc-500">Average latency {Math.round(row.avg_latency_ms || 0)} ms</p>
                </div>
                <div className="text-xs text-zinc-400 md:text-right">
                  <p className="font-medium">{Number(row.total_requests || 0).toLocaleString()} requests</p>
                  <p className="mt-1 font-medium text-zinc-500">{Number(row.total_credits || 0).toLocaleString()} credits</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
