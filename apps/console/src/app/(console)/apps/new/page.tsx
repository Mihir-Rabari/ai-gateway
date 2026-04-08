"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type CreatedApp = {
  id: string;
  name: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
};

export default function RegisterAppPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [redirectUrisRaw, setRedirectUrisRaw] = useState("");
  const [created, setCreated] = useState<CreatedApp | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Parse redirect URIs — one per line, ignore empty lines
      const redirectUris = redirectUrisRaw
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

      const result = await api.apps.create(name, desc || undefined, redirectUris);
      setCreated({
        id: result.id,
        name: result.name,
        apiKey: result.apiKey,
        clientId: result.clientId,
        clientSecret: result.clientSecret,
      });
      toast({
        title: "App registered",
        description: `${result.name} is ready. Save your credentials now — secrets are shown only once.`,
      });
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

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied`, description: "Store it securely." });
  };

  if (created) {
    return (
      <div className="mx-auto mt-8 max-w-2xl space-y-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">App Registered 🎉</h1>
          <p className="text-white/60">
            Save your credentials below — the <span className="text-yellow-400">client secret</span> and{" "}
            <span className="text-yellow-400">API key</span> are shown <strong>only once</strong>.
          </p>
        </div>

        <Card className="border-white/10 bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle>OAuth Credentials</CardTitle>
            <CardDescription className="text-white/40">
              Use these to integrate the AI Gateway SDK in your application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CredentialRow label="Client ID" value={created.clientId} onCopy={() => copy(created.clientId, "Client ID")} />
            <CredentialRow
              label="Client Secret"
              value={created.clientSecret}
              secret
              onCopy={() => copy(created.clientSecret, "Client Secret")}
              warning="This is shown only once. Store it in a secure secret manager."
            />
            <CredentialRow
              label="API Key (legacy)"
              value={created.apiKey}
              secret
              onCopy={() => copy(created.apiKey, "API Key")}
              warning="This is shown only once."
            />

            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 mt-4">
              <p className="text-xs text-indigo-300 font-medium mb-2">Quick Start</p>
              <pre className="text-xs text-white/80 overflow-x-auto whitespace-pre-wrap break-all">
{`import { AIGateway } from '@ai-gateway/sdk-js';

const ai = new AIGateway({
  clientId: '${created.clientId}',
  redirectUri: 'http://localhost:3000/callback',
});

await ai.signIn();`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={() => router.push(`/apps/${created.id}`)}
            className="bg-white text-black hover:bg-white/90"
          >
            Go to App Details
          </Button>
          <Link href="/apps">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/5">
              Back to Apps
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Register New App</h1>
        <p className="text-white/60">
          Create a developer app and get your OAuth credentials instantly.
        </p>
      </div>

      <Card className="border-white/10 bg-[#0a0a0a]">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
            <CardDescription className="text-white/40">
              Only app name is required. Add redirect URIs to enable the OAuth flow.
            </CardDescription>
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

            <div className="space-y-2">
              <label htmlFor="redirectUris" className="text-sm font-medium text-white/80">
                Redirect URIs
              </label>
              <p className="text-xs text-white/40">
                One URI per line. Required for the OAuth sign-in flow. You can add more later.
              </p>
              <textarea
                id="redirectUris"
                value={redirectUrisRaw}
                onChange={(e) => setRedirectUrisRaw(e.target.value)}
                placeholder={
                  "http://localhost:3000/callback\nhttps://myapp.com/callback"
                }
                rows={3}
                className="w-full rounded-md border border-white/10 bg-black px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
              />
            </div>

            <div className="flex gap-4 border-t border-white/5 pt-4">
              <Button type="submit" disabled={loading} className="bg-white text-black hover:bg-white/90">
                {loading ? "Registering..." : "Register App"}
              </Button>
              <Link href="/apps">
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

function CredentialRow({
  label,
  value,
  secret = false,
  onCopy,
  warning,
}: {
  label: string;
  value: string;
  secret?: boolean;
  onCopy: () => void;
  warning?: string;
}) {
  const [revealed, setRevealed] = useState(!secret);

  return (
    <div className="space-y-1">
      <p className="text-sm text-white/60">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center overflow-hidden rounded-l-md border border-white/10 bg-black px-3 py-2 font-mono text-xs text-white/80 min-h-[38px]">
          <span className="truncate">{revealed ? value : "•".repeat(24)}</span>
        </div>
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="border border-l-0 border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            {revealed ? "Hide" : "Show"}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="rounded-r-md border border-l-0 border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white"
        >
          Copy
        </button>
      </div>
      {warning && <p className="text-xs text-yellow-400/80">{warning}</p>}
    </div>
  );
}
