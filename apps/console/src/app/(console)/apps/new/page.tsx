"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button, Field, IconButton, InlineMessage, ShellSection, Surface, TextArea, TextInput } from "@/components/console/system";

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
  const [description, setDescription] = useState("");
  const [redirectUrisRaw, setRedirectUrisRaw] = useState("");
  const [created, setCreated] = useState<CreatedApp | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const redirectUris = redirectUrisRaw.split("\n").map((entry) => entry.trim()).filter(Boolean);
      const result = await api.apps.create(name, description || undefined, redirectUris);
      setCreated({ id: result.id, name: result.name, apiKey: result.apiKey, clientId: result.clientId, clientSecret: result.clientSecret });
      toast({ title: "App registered", description: `${result.name} is ready. Store the secret values now because they are only shown once.` });
    } catch (err) {
      toast({ title: "Registration failed", description: err instanceof Error ? err.message : "Unexpected error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied`, description: "Stored in clipboard." });
  };

  if (created) {
    return (
      <div className="space-y-6">
        <ShellSection
          eyebrow="New app"
          title="Credentials issued"
          description="This is the only time the client secret and API key are shown in full. Save them before leaving this screen."
          action={
            <Button
              onClick={() => router.push(`/apps/${created.id}`)}
              className="rounded-lg bg-white text-black hover:bg-white/90 px-4 h-9 text-xs transition duration-200 font-semibold"
            >
              Open app detail
            </Button>
          }
        />
        <InlineMessage tone="warning" className="rounded-lg border-yellow-500/30 bg-yellow-500/10 text-yellow-300">
          Client secret and API key are write-once display values. Store them in a secret manager before you navigate away.
        </InlineMessage>
        <Surface className="rounded-2xl border-white/10 bg-black/40 p-6 md:p-7 shadow-none">
          <div className="space-y-4">
            <CredentialRow
              label="Client ID"
              value={created.clientId}
              onCopy={() => copy(created.clientId, "Client ID")}
            />
            <CredentialRow
              label="Client Secret"
              value={created.clientSecret}
              secret
              onCopy={() => copy(created.clientSecret, "Client Secret")}
            />
            <CredentialRow
              label="API Key"
              value={created.apiKey}
              secret
              onCopy={() => copy(created.apiKey, "API Key")}
            />
          </div>
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShellSection eyebrow="Create" title="Register a new app" description="Issue fresh developer credentials and define the first redirect URIs for your OAuth flow." />
      <Surface className="rounded-2xl border-white/10 bg-black/40 p-6 md:p-7 shadow-none">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field label="App name" hint="Required">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My AI product"
              required
              className="rounded-lg border-white/10 bg-black/40 px-3 py-2 text-sm focus:border-white/20 focus:bg-black/40 focus-visible:ring-white/10"
            />
          </Field>
          <Field label="Description" hint="Optional">
            <TextInput
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short summary of what the app does"
              className="rounded-lg border-white/10 bg-black/40 px-3 py-2 text-sm focus:border-white/20 focus:bg-black/40 focus-visible:ring-white/10"
            />
          </Field>
          <Field label="Redirect URIs" hint="One per line">
            <TextArea
              value={redirectUrisRaw}
              onChange={(event) => setRedirectUrisRaw(event.target.value)}
              placeholder={"http://localhost:3000/callback\nhttps://myapp.com/callback"}
              className="rounded-lg border-white/10 bg-black/40 px-3 py-2 text-sm font-mono focus:border-white/20 focus:bg-black/40 focus-visible:ring-white/10"
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              busy={loading}
              className="rounded-lg bg-white text-black hover:bg-white/90 px-4 h-9 text-xs transition duration-200 font-semibold"
            >
              {loading ? "Registering" : "Register app"}
            </Button>
            <Button
              asChild
              variant="secondary"
              className="rounded-lg h-9 px-4 text-xs font-semibold border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
            >
              <Link href="/apps">Cancel</Link>
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}

function CredentialRow({ label, value, secret = false, onCopy }: { label: string; value: string; secret?: boolean; onCopy: () => void; }) {
  const [revealed, setRevealed] = useState(!secret);

  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-3 bg-black border border-white/10 rounded px-3 py-2 font-mono text-sm text-white">
        <span className="min-w-0 flex-1 break-all select-all selection:bg-white/10">
          {revealed ? value : "•".repeat(24)}
        </span>
        <div className="flex items-center gap-1.5">
          {secret ? (
            <button
              onClick={() => setRevealed((current) => !current)}
              className="text-white/50 hover:text-white transition p-1 hover:bg-white/5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              title={revealed ? `Hide ${label}` : `Show ${label}`}
              aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          ) : null}
          <button
            onClick={onCopy}
            className="text-white/50 hover:text-white transition p-1 hover:bg-white/5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            title={`Copy ${label}`}
            aria-label={`Copy ${label}`}
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
