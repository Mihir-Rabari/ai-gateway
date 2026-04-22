"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button, Field, InlineMessage, ShellSection, Surface, TextArea, TextInput } from "@/components/console/system";

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
        <ShellSection eyebrow="New app" title="Credentials issued" description="This is the only time the client secret and API key are shown in full. Save them before leaving this screen." action={<Button onClick={() => router.push(`/apps/${created.id}`)}>Open app detail</Button>} />
        <InlineMessage tone="warning">Client secret and API key are write-once display values. Store them in a secret manager before you navigate away.</InlineMessage>
        <Surface className="p-6 md:p-7"><div className="space-y-4"><CredentialRow label="Client ID" value={created.clientId} onCopy={() => copy(created.clientId, "Client ID")} /><CredentialRow label="Client Secret" value={created.clientSecret} secret onCopy={() => copy(created.clientSecret, "Client Secret")} /><CredentialRow label="API Key" value={created.apiKey} secret onCopy={() => copy(created.apiKey, "API Key")} /></div></Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShellSection eyebrow="Create" title="Register a new app" description="Issue fresh developer credentials and define the first redirect URIs for your OAuth flow." />
      <Surface className="p-6 md:p-7">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field label="App name" hint="Required"><TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="My AI product" required /></Field>
          <Field label="Description" hint="Optional"><TextInput value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short summary of what the app does" /></Field>
          <Field label="Redirect URIs" hint="One per line"><TextArea value={redirectUrisRaw} onChange={(event) => setRedirectUrisRaw(event.target.value)} placeholder={"http://localhost:3000/callback\nhttps://myapp.com/callback"} /></Field>
          <div className="flex flex-wrap gap-3"><Button type="submit" busy={loading}>{loading ? "Registering" : "Register app"}</Button><Link href="/apps" className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 border border-white/10 bg-white/8 text-white hover:bg-white/14">Cancel</Link></div>
        </form>
      </Surface>
    </div>
  );
}

function CredentialRow({ label, value, secret = false, onCopy }: { label: string; value: string; secret?: boolean; onCopy: () => void; }) {
  const [revealed, setRevealed] = useState(!secret);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">{label}</p>
          <p className="mt-3 break-all font-mono text-sm text-white/82">{revealed ? value : "•".repeat(24)}</p>
        </div>
        <div className="flex items-center gap-2">
          {secret ? <button type="button" onClick={() => setRevealed((current) => !current)} className="rounded-full border border-white/10 bg-white/[0.04] p-3 text-white/66 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-label={revealed ? `Hide ${label}` : `Show ${label}`} title={revealed ? `Hide ${label}` : `Show ${label}`}>{revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button> : null}
          <Button variant="secondary" onClick={onCopy}>Copy</Button>
        </div>
      </div>
    </div>
  );
}
