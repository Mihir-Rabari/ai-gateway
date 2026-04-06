"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Copy, Eye, EyeOff, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api, type AppUsageSummary, type DeveloperApp } from "@/lib/api";

export default function AppDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [appData, setAppData] = useState<DeveloperApp | null>(null);
  const [usage, setUsage] = useState<AppUsageSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [apps, usageRes] = await Promise.all([api.apps.list(), api.apps.usage(id)]);
        const app = apps.find((item) => item.id === id) ?? null;
        setAppData(app);
        setUsage(usageRes);
      } catch (err) {
        toast({
          title: "Failed to load app",
          description: err instanceof Error ? err.message : "Unexpected error",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, toast]);

  const copyKey = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    toast({ title: "API key copied", description: "Copied to clipboard." });
  };

  const rotateKey = async () => {
    if (!window.confirm("Rotate key now? This will immediately invalidate the previous key.")) {
      return;
    }

    try {
      const result = await api.apps.rotateKey(id);
      setApiKey(result.apiKey);
      setShowKey(true);
      toast({ title: "API key rotated", description: "Your new key is shown below." });
    } catch (err) {
      toast({
        title: "Key rotation failed",
        description: err instanceof Error ? err.message : "Unexpected error",
        variant: "destructive",
      });
    }
  };

  const deleteApp = async () => {
    if (!window.confirm("Delete this app? This action is irreversible.")) {
      return;
    }

    try {
      await api.apps.delete(id);
      toast({ title: "App deleted", description: "The app was removed successfully." });
      router.push("/apps");
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unexpected error",
        variant: "destructive",
      });
    }
  };

  const usageRows = usage?.rows ?? [];
  const totalCredits = usageRows.reduce((acc, row) => acc + Number(row.total_credits || 0), 0);
  const totalRequests = usageRows.reduce((acc, row) => acc + Number(row.total_requests || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/apps"
          className="mb-4 inline-flex items-center text-sm font-medium text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Apps
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">App Details</h1>
            <p className="text-white/60">Rotate keys and inspect usage for this app.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-white/10 bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle>Application Info</CardTitle>
            <CardDescription className="text-white/40">Data from registered apps service.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-5 w-40 bg-white/10" />
                <Skeleton className="h-4 w-full bg-white/10" />
                <Skeleton className="h-4 w-48 bg-white/10" />
              </>
            ) : !appData ? (
              <p className="text-sm text-white/50">App not found or you no longer have access.</p>
            ) : (
              <>
                <div>
                  <p className="text-sm text-white/60">App Name</p>
                  <p className="mt-1 text-lg font-medium">{appData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">App ID</p>
                  <p className="mt-1 rounded border border-white/10 bg-black p-2 font-mono text-xs text-white/80">
                    {appData.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Description</p>
                  <p className="mt-1 text-sm text-white/80">{appData.description || "-"}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription className="text-white/40">Rotate to issue a fresh API key.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-sm text-white/60">Current Visible Key</p>
              <div className="flex">
                <div className="flex flex-1 items-center overflow-hidden rounded-l-md border border-white/10 bg-black px-3 font-mono text-sm">
                  {apiKey ? (showKey ? apiKey : "********************************") : "Rotate to generate a new key"}
                </div>
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  className="border border-l-0 border-white/10 bg-white/5 px-4 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={copyKey}
                  className="rounded-r-md border border-l-0 border-white/10 bg-white/5 px-4 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-4 border-t border-white/5 pt-4">
              <Button
                onClick={rotateKey}
                variant="outline"
                className="border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
              >
                <RotateCw className="mr-2 h-4 w-4" /> Rotate Key
              </Button>
              <Button
                onClick={deleteApp}
                variant="outline"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete App
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle>Usage Stats</CardTitle>
          <CardDescription className="text-white/40">
            Aggregated from analytics-service for this app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-28 w-full bg-white/10" />
          ) : usageRows.length === 0 ? (
            <p className="text-sm text-white/50">No usage events recorded yet for this app.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <p className="text-xs text-white/50">Total Requests</p>
                  <p className="mt-1 text-xl font-semibold text-white">{totalRequests.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <p className="text-xs text-white/50">Total Credits</p>
                  <p className="mt-1 text-xl font-semibold text-white">{totalCredits.toLocaleString()}</p>
                </div>
              </div>

              {usageRows.map((row) => (
                <div
                  key={row.model}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="text-white">{row.model}</p>
                    <p className="text-xs text-white/50">avg latency {Math.round(row.avg_latency_ms || 0)} ms</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{Number(row.total_requests || 0).toLocaleString()} req</p>
                    <p className="text-xs text-white/50">{Number(row.total_credits || 0).toLocaleString()} credits</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
