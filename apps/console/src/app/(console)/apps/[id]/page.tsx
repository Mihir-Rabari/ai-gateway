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
  const totalCredits = usageRows.reduce((sum, row) => sum + Number(row.total_credits || 0), 0);
  const totalRequests = usageRows.reduce((sum, row) => sum + Number(row.total_requests || 0), 0);

  return (
    <div className="space-y-6">
      <ShellSection eyebrow="App detail" title={appData?.name ?? "Application detail"} description="Inspect credentials, edit redirect URIs, and review analytics for this app." action={<Link href="/apps" className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 border border-white/10 bg-white/8 text-white hover:bg-white/14">Back to apps</Link>} />
      {!loading && !appData ? <InlineMessage tone="danger">App not found or you no longer have access to it.</InlineMessage> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface className="p-6 md:p-7"><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Identity</p>{loading ? <div className="mt-8 space-y-3"><SkeletonBlock className="h-12" /><SkeletonBlock className="h-20" /><SkeletonBlock className="h-12" /></div> : appData ? <div className="mt-8 space-y-4"><div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.2em] text-white/38">App ID</p><div className="mt-3 flex items-center gap-3"><p className="min-w-0 flex-1 break-all font-mono text-sm text-white/82">{appData.id}</p><Button variant="secondary" onClick={() => copyText(appData.id, "App ID")}><Copy className="h-4 w-4" />Copy</Button></div></div><div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.2em] text-white/38">Client ID</p><div className="mt-3 flex items-center gap-3"><p className="min-w-0 flex-1 break-all font-mono text-sm text-white/82">{appData.clientId ?? "Unavailable"}</p>{appData.clientId ? <Button variant="secondary" onClick={() => copyText(appData.clientId!, "Client ID")}><Copy className="h-4 w-4" />Copy</Button> : null}</div></div><div className="flex items-center gap-2"><Badge tone="success">Active</Badge><Badge>Created {new Date(appData.createdAt).toLocaleDateString()}</Badge></div></div> : null}</Surface>
        <Surface className="p-6 md:p-7"><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Credentials</p><div className="mt-8 space-y-4"><div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"><p className="text-[11px] uppercase tracking-[0.2em] text-white/38">Visible API key</p><div className="mt-3 flex items-center gap-3"><p className="min-w-0 flex-1 break-all font-mono text-sm text-white/82">{apiKey ? (showKey ? apiKey : "•".repeat(24)) : "Rotate the key to generate a fresh visible value"}</p><IconButton onClick={() => setShowKey((current) => !current)} aria-label={showKey ? "Hide API Key" : "Show API Key"}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</IconButton><Button variant="secondary" onClick={() => copyText(apiKey, "API Key")} disabled={!apiKey}><Copy className="h-4 w-4" />Copy</Button></div></div><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={rotateKey}><RotateCw className="h-4 w-4" />Rotate key</Button><Button variant="danger" onClick={deleteApp}><Trash2 className="h-4 w-4" />Delete app</Button></div></div></Surface>
      </div>
      <Surface className="p-6 md:p-7"><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">OAuth redirect URIs</p><div className="mt-8 space-y-4"><Field label="Allowed redirect URIs" hint="One URI per line"><TextArea value={redirectUrisRaw} onChange={(event) => setRedirectUrisRaw(event.target.value)} placeholder={"http://localhost:3000/callback\nhttps://myapp.com/callback"} /></Field><Button busy={savingUris} onClick={saveRedirectUris}>{savingUris ? "Saving" : "Save redirect URIs"}</Button></div></Surface>
      <Surface className="p-6 md:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Usage</p><h2 className="mt-3 font-display text-3xl tracking-[-0.05em] text-white">Traffic summary</h2></div><div className="flex items-center gap-2 text-sm text-white/48"><span>{totalRequests.toLocaleString()} requests</span><span>{totalCredits.toLocaleString()} credits</span></div></div>{loading ? <div className="mt-8 space-y-3"><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /><SkeletonBlock className="h-16" /></div> : usageRows.length === 0 ? <p className="mt-8 text-sm text-white/50">No usage events have been recorded for this app yet.</p> : <div className="mt-8 space-y-3">{usageRows.map((row) => <div key={row.model} className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 md:flex-row md:items-center md:justify-between"><div><p className="font-medium text-white">{row.model}</p><p className="mt-1 text-sm text-white/44">Average latency {Math.round(row.avg_latency_ms || 0)} ms</p></div><div className="text-sm text-white/60 md:text-right"><p>{Number(row.total_requests || 0).toLocaleString()} requests</p><p className="mt-1">{Number(row.total_credits || 0).toLocaleString()} credits</p></div></div>)}</div>}</Surface>
    </div>
  );
}
