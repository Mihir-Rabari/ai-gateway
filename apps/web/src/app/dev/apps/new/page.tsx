"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function RegisterAppPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [createdKey, setCreatedKey] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.apps.create(name, desc || undefined);
      setCreatedKey(result.apiKey);
      toast({
        title: "App registered",
        description: `${result.name} is ready. Save your API key now.`,
      });
      setTimeout(() => {
        router.push(`/dev/apps/${result.id}`);
      }, 1200);
    } catch (err) {
      toast({
        title: "Failed to register app",
        description: err instanceof Error ? err.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    toast({ title: "API key copied", description: "Store it securely before you leave this page." });
  };

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Register New App</h1>
        <p className="text-white/60">Create a developer app and get your first API key instantly.</p>
      </div>

      <Card className="border-white/10 bg-[#0a0a0a]">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
            <CardDescription className="text-white/40">Only app name is required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-white/80">
                App Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome App"
                className="border-white/10 bg-black text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="desc" className="text-sm font-medium text-white/80">
                Description
              </label>
              <Input
                id="desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What does this app do?"
                className="border-white/10 bg-black text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>

            {createdKey ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-200">New API key (shown once):</p>
                <p className="mt-1 break-all font-mono text-sm text-white">{createdKey}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 border-emerald-400/40 bg-transparent text-emerald-100 hover:bg-emerald-500/20"
                  onClick={copyApiKey}
                >
                  Copy API Key
                </Button>
              </div>
            ) : null}

            <div className="flex gap-4 border-t border-white/5 pt-4">
              <Button type="submit" disabled={loading} className="bg-white text-black hover:bg-white/90">
                {loading ? "Registering..." : "Register App"}
              </Button>
              <Link href="/dev/apps">
                <Button type="button" variant="outline" className="border-white/20 text-white hover:bg-white/5">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
