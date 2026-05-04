"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge, Button, DetailList, InlineMessage, ShellSection, SkeletonBlock, Surface } from "@/components/console/system";

const installCode = "npm install @ai-gateway/sdk-js";
const authCode = `import { AIGateway } from "@ai-gateway/sdk-js";\n\nconst auth = await AIGateway.signIn({ appId: "YOUR_APP_ID" });\nconst ai = new AIGateway({ appId: "YOUR_APP_ID" });\nai.setToken(auth.token);`;
const chatCode = `const response = await ai.chat({\n  model: "gpt-4o",\n  messages: [\n    { role: "system", content: "You are a helpful assistant." },\n    { role: "user", content: "Explain quantum computing in one sentence." }\n  ]\n});\n\nconsole.log(response.output);`;

export default function DocsPage() {
  const { toast } = useToast();
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      setError("");
      try {
        const result = await api.models.list();
        setModels(result.models);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load models");
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    void loadModels();
  }, []);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: "Snippet copied to clipboard." });
  };

  return (
    <div className="space-y-6">
      <ShellSection eyebrow="Docs" title="SDK quickstart" description="Reference snippets for installing the SDK, authenticating a user, and issuing unified model calls through the gateway." />
      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]"><div className="space-y-6"><CodeSurface label="Install" summary="Package install command for local development." code={installCode} onCopy={copy} /><CodeSurface label="Authenticate" summary="Popup-style sign-in and token attachment." code={authCode} onCopy={copy} /><CodeSurface label="Chat request" summary="Unified model call through the SDK client." code={chatCode} onCopy={copy} /></div><Surface className="p-6 md:p-7"><p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Live model registry</p><h2 className="mt-3 font-display text-3xl tracking-[-0.05em] text-white">Available models</h2><DetailList className="mt-6" items={[{ label: "Backend route", value: <code className="rounded bg-white/10 px-2 py-1 text-white">api.models.list()</code> }, { label: "Purpose", value: "Shows the current model registry exposed by the API instead of a static doc list." }]} />{loadingModels ? <div className="mt-8 space-y-3"><SkeletonBlock className="h-12" /><SkeletonBlock className="h-12" /><SkeletonBlock className="h-12" /></div> : models.length === 0 ? <p className="mt-8 text-sm text-white/48">No models were returned from the live registry.</p> : <div className="mt-8 space-y-3">{models.map((model) => <div key={model} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4"><p className="font-mono text-sm text-white/82">{model}</p><Badge tone="success">Available</Badge></div>)}</div>}</Surface></div>
    </div>
  );
}

function CodeSurface({ label, summary, code, onCopy }: { label: string; summary: string; code: string; onCopy: (value: string) => Promise<void>; }) {
  return (
    <Surface className="overflow-hidden"><div className="border-b border-white/10 px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="text-[11px] uppercase tracking-[0.24em] text-white/38">{label}</p><Button variant="secondary" onClick={() => void onCopy(code)}><Copy className="h-4 w-4" />Copy</Button></div><p className="mt-3 text-sm text-white/52">{summary}</p></div><pre className="overflow-x-auto px-5 py-5 font-mono text-sm leading-7 text-white/76">{code}</pre></Surface>
  );
}
