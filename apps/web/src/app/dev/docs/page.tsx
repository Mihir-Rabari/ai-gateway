"use client";

import { useEffect, useState } from "react";
import { Copy, Terminal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function DocsPage() {
  const { toast } = useToast();
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const result = await api.models.list();
        setModels(result.models);
      } catch {
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    void loadModels();
  }, []);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Code copied to clipboard.",
    });
  };

  const codeBlocks = {
    install: "npm install @ai-gateway/sdk-js",
    auth: `import { AIGateway } from "@ai-gateway/sdk-js";

const auth = await AIGateway.signIn({ appId: "YOUR_APP_ID" });
const ai = new AIGateway({ appId: "YOUR_APP_ID" });
ai.setToken(auth.token);`,
    chat: `const response = await ai.chat({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain quantum computing in one sentence." }
  ]
});

console.log(response.output);`,
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">SDK Documentation</h1>
        <p className="text-lg text-white/60">
          Integration guide for <code>@ai-gateway/sdk-js</code> with live model registry.
        </p>
      </div>

      <div className="space-y-12">
        <DocSection title="1. Installation" fileLabel="Terminal" code={codeBlocks.install} onCopy={handleCopy} />

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-white">2. Authentication</h2>
          <p className="mb-4 text-white/60">
            Use the popup auth flow, then attach the access token to the SDK client.
          </p>
          <DocSection title="" fileLabel="auth.ts" code={codeBlocks.auth} onCopy={handleCopy} />
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-white">3. Request Any Model</h2>
          <p className="mb-4 text-white/60">
            Call unified <code className="rounded bg-white/10 px-1 py-0.5 text-sm text-white">chat()</code> from
            one client.
          </p>
          <DocSection title="" fileLabel="chat.ts" code={codeBlocks.chat} onCopy={handleCopy} />
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-white">Supported Models (Live)</h2>
          <Card className="border-white/10 bg-[#0a0a0a]">
            <CardContent className="p-0">
              {loadingModels ? (
                <div className="p-4">
                  <Skeleton className="h-28 w-full bg-white/10" />
                </div>
              ) : models.length === 0 ? (
                <p className="p-4 text-sm text-white/50">No models found from `/api/v1/models`.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-black font-medium text-white/60">
                    <tr>
                      <th className="border-b border-white/10 px-4 py-3">Model ID</th>
                      <th className="border-b border-white/10 px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-white/80">
                    {models.map((model) => (
                      <tr key={model} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-mono text-xs">{model}</td>
                        <td className="px-4 py-3 text-right text-emerald-300">Available</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function DocSection({
  title,
  fileLabel,
  code,
  onCopy,
}: {
  title: string;
  fileLabel: string;
  code: string;
  onCopy: (code: string) => Promise<void>;
}) {
  return (
    <section>
      {title ? <h2 className="mb-4 text-2xl font-semibold text-white">{title}</h2> : null}
      <Card className="border-white/10 bg-[#0a0a0a]">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-2">
            <div className="text-xs font-mono text-white/50">{fileLabel}</div>
            <button onClick={() => void onCopy(code)} className="text-white/40 hover:text-white">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto bg-[#050505] p-4 font-mono text-sm leading-relaxed text-white/80">
            <div className="mb-2 flex items-center gap-2 text-white/40">
              <Terminal className="h-3 w-3" />
              {fileLabel}
            </div>
            <pre className="whitespace-pre-wrap">{code}</pre>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
