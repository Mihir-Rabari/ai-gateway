"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Copy, Eye, EyeOff, RotateCw, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AppDetailsPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("agk_test_5x9a8b7c6d5e4f3g2h1i0j9k8l7m6n5");

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: "API Key copied",
      description: "Copied to clipboard.",
    });
  };

  const rotateKey = () => {
    if (confirm("Are you sure? This will invalidate the current key immediately.")) {
      setApiKey(`agk_test_${Math.random().toString(36).substring(2, 15)}`);
      toast({
        title: "API Key Rotated",
        description: "Your new API key is ready.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dev/apps" className="inline-flex items-center text-sm font-medium text-white/50 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Apps
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">App Details</h1>
            <p className="text-white/60">Manage API keys and view usage for this application.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader>
            <CardTitle>Application Info</CardTitle>
            <CardDescription className="text-white/40">General details about this app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-white/60">App Name</p>
              <p className="mt-1 font-medium text-lg">My Cool App</p>
            </div>
            <div>
              <p className="text-sm font-medium text-white/60">App ID</p>
              <p className="mt-1 font-mono text-sm bg-black p-2 rounded border border-white/5 text-white/80">{params.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-white/60">Website</p>
              <p className="mt-1 text-blue-400 hover:underline">https://mycoolapp.com</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription className="text-white/40">Use this key to authenticate your SDK calls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-white/60 mb-2">API Key</p>
              <div className="flex mt-1 rounded-md shadow-sm">
                <div className="relative flex items-stretch flex-grow focus-within:z-10">
                  <div className="flex items-center pl-3 pr-3 w-full bg-black border border-white/10 rounded-l-md overflow-hidden font-mono text-sm">
                    {showKey ? apiKey : "••••••••••••••••••••••••••••••••••••"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-white/10 bg-white/5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={copyKey}
                  className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-white/10 bg-white/5 text-sm font-medium text-white/70 rounded-r-md hover:bg-white/10 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex gap-4">
              <Button onClick={rotateKey} variant="outline" className="border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10">
                <RotateCw className="mr-2 h-4 w-4" /> Rotate Key
              </Button>
              <Button variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete App
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0a0a0a] border-white/10">
        <CardHeader>
          <CardTitle>Usage Stats</CardTitle>
          <CardDescription className="text-white/40">Total credits driven through this app.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="h-[200px] flex items-center justify-center text-white/40 text-sm border border-dashed border-white/10 rounded-lg">
             Usage Chart Placeholder (GET /analytics/usage/app?appId={params.id})
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
