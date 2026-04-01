"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Copy, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DocsPage() {
  const { toast } = useToast();

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Code copied to clipboard.",
    });
  };

  const codeBlocks = {
    install: `npm install @ai-gateway/sdk-js`,
    auth: `import { AIGateway } from '@ai-gateway/sdk-js';

// 1. Trigger "Sign in with AI Gateway" flow
// This opens a secure popup where the user logs in and authorizes your app
const token = await AIGateway.signIn({ appId: 'YOUR_APP_ID' });

// 2. Initialize the SDK with the user's token
const ai = new AIGateway({ token });`,
    chat: `// Call any supported model (gpt-4, claude-3, gemini)
const response = await ai.chat({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing in one sentence.' }
  ]
});

console.log(response.choices[0].message.content);`
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">SDK Documentation</h1>
        <p className="text-white/60 text-lg">Integrate the AI Gateway SDK into your JavaScript or TypeScript application.</p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">1. Installation</h2>
          <Card className="bg-[#0a0a0a] border-white/10">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black">
                <div className="text-xs font-mono text-white/50">Terminal</div>
                <button onClick={() => handleCopy(codeBlocks.install)} className="text-white/40 hover:text-white">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 bg-[#050505] overflow-x-auto text-sm font-mono text-green-400">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3 w-3 text-white/40" />
                  {codeBlocks.install}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">2. Authentication</h2>
          <p className="text-white/60 mb-4">
            Our SDK includes a built-in authentication flow. When your user clicks "Sign in", they authorize your app to spend their credits. You don't need to manage their billing or API keys.
          </p>
          <Card className="bg-[#0a0a0a] border-white/10">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black">
                <div className="text-xs font-mono text-white/50">auth.ts</div>
                <button onClick={() => handleCopy(codeBlocks.auth)} className="text-white/40 hover:text-white">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 bg-[#050505] overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre text-white/80">
                {codeBlocks.auth}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">3. Making Requests</h2>
          <p className="text-white/60 mb-4">
            Use the unified <code className="bg-white/10 px-1 py-0.5 rounded text-sm text-pink-400">chat</code> method to communicate with any supported model. Credits are automatically deducted from the user's account.
          </p>
          <Card className="bg-[#0a0a0a] border-white/10">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black">
                <div className="text-xs font-mono text-white/50">request.ts</div>
                <button onClick={() => handleCopy(codeBlocks.chat)} className="text-white/40 hover:text-white">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 bg-[#050505] overflow-x-auto text-sm font-mono leading-relaxed whitespace-pre text-white/80">
                {codeBlocks.chat}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Supported Models</h2>
          <Card className="bg-[#0a0a0a] border-white/10">
            <CardContent className="p-0">
               <table className="w-full text-sm text-left">
                 <thead className="bg-black text-white/60 font-medium">
                   <tr>
                     <th className="px-4 py-3 border-b border-white/10">Provider</th>
                     <th className="px-4 py-3 border-b border-white/10">Model ID</th>
                     <th className="px-4 py-3 border-b border-white/10 text-right">Credits / 1k tokens</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/10 text-white/80">
                   <tr className="hover:bg-white/5">
                     <td className="px-4 py-3">OpenAI</td>
                     <td className="px-4 py-3 font-mono text-xs">gpt-4o</td>
                     <td className="px-4 py-3 text-right">10</td>
                   </tr>
                   <tr className="hover:bg-white/5">
                     <td className="px-4 py-3">OpenAI</td>
                     <td className="px-4 py-3 font-mono text-xs">gpt-3.5-turbo</td>
                     <td className="px-4 py-3 text-right">1</td>
                   </tr>
                   <tr className="hover:bg-white/5">
                     <td className="px-4 py-3">Anthropic</td>
                     <td className="px-4 py-3 font-mono text-xs">claude-3-5-sonnet</td>
                     <td className="px-4 py-3 text-right">12</td>
                   </tr>
                   <tr className="hover:bg-white/5">
                     <td className="px-4 py-3">Google</td>
                     <td className="px-4 py-3 font-mono text-xs">gemini-1.5-pro</td>
                     <td className="px-4 py-3 text-right">8</td>
                   </tr>
                 </tbody>
               </table>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
