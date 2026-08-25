"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type CodexSessionInfo } from "@/lib/api";
import { ExternalLink, CheckCircle, XCircle, Loader2, LogOut } from "lucide-react";

export function CodexConnect() {
  const [session, setSession] = useState<CodexSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [deviceCode, setDeviceCode] = useState<{
    userCode: string;
    verificationUri: string;
    deviceCode: string;
    interval: number;
  } | null>(null);
  const [ or, setError] = useState("");

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const result = await api.codex.getSession();
      setSession(result);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    try {
      const result = await api.codex.requestDeviceCode();
      setDeviceCode(result);

      // Start polling
      const pollInterval = Math.max(result.interval * 1000, 3000);
      const poll = async () => {
        try {
          const pollResult = await api.codex.pollDeviceCode(result.deviceCode);
          if (pollResult.status === "authenticated") {
            setDeviceCode(null);
            await loadSession();
            setConnecting(false);
            return;
          }
        } catch {
          // Continue polling
        }
        setTimeout(poll, pollInterval);
      };
      setTimeout(poll, pollInterval);
    } catch {
      setError("Failed to start ChatGPT login flow. Please try again.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.codex.disconnect();
      setSession(null);
    } catch {
      setError("Failed to disconnect");
    }
  };

  if (loading) {
    return (
      <Card className="border-white/10 bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
            ChatGPT Account
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (session?.hasSession) {
    return (
      <Card className="border-white/10 bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <CheckCircle className="h-5 w-5 text-green-500" />
            ChatGPT Connected
          </CardTitle>
          <CardDescription className="text-white/50">
            Your ChatGPT account is linked. You can use Codex models through AI Gateway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Plan</span>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20">{session.planTier ?? "Unknown"}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect} className="w-full border-white/20 bg-transparent text-white hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (deviceCode) {
    return (
      <Card className="border-white/10 bg-[#0a0a0a]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            Sign in with ChatGPT
          </CardTitle>
          <CardDescription className="text-white/50">
            Complete the sign-in in your browser to link your ChatGPT account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-white/50 mb-2">
                1. Open this URL in your browser:
              </p>
              <a
                href={deviceCode.verificationUri}
                target="_blank"
                rel="noopener noref er"
                className="text-blue-400 hover:text-blue-300 underline font-mono text-sm flex items-center justify-center gap-1"
              >
                {deviceCode.verificationUri}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/50 mb-2">
                2. Enter this code:
              </p>
              <div className="text-3xl font-mono font-bold tracking-[0.3em] bg-black px-8 py-4 rounded-md border border-white/20 text-white">
                {deviceCode.userCode}
              </div>
            </div>
            <p className="text-xs text-white/40 animate-pulse">
              Waiting for you to complete sign-in...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-[#0a0a0a]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <XCircle className="h-5 w-5 text-white/40" />
          ChatGPT Account
        </CardTitle>
        <CardDescription className="text-white/50">
          Link your ChatGPT account to use Codex models through AI Gateway — no API key required.
          Usage is billed to your ChatGPT subscription.
        </CardDescription>
      </CardHeader>
      <CardContent>
        { or && (
          <p className="text-sm text-red-400 mb-3">{ or}</p>
        )}
        <Button onClick={handleConnect} disabled={connecting} className="w-full bg-white text-black hover:bg-white/90">
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "Sign in with ChatGPT"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
