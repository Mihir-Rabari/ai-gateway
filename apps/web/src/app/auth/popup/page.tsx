'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, setAuthToken, setRefreshToken } from "@/lib/api";

export default function AuthPopupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.auth.login(email, password);
      setAuthToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      if (typeof window !== 'undefined' && window.opener) {
        // Validate target origin against trusted whitelist to prevent sensitive data leakage
        // via window.opener.postMessage. Never use wildcard '*' for sensitive auth payloads.
        const params = new URLSearchParams(window.location.search);
        const callbackOrigin = params.get('origin');

        const allowedOriginsStr = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:3009";
        const allowedOrigins = allowedOriginsStr.split(',');

        if (!callbackOrigin || !allowedOrigins.includes(callbackOrigin)) {
          setError("Unauthorized callback origin.");
          setLoading(false);
          return;
        }

        window.opener.postMessage(
          { type: 'AI_GATEWAY_AUTH', accessToken: res.accessToken, user: res.user },
          callbackOrigin
        );
        window.close();
      } else {
        setError("This window was not opened as a popup.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="w-2 h-2 rounded-full bg-white mx-auto mb-4 animate-pulse" />
          <h1 className="text-xl font-bold text-white">Sign in to AI Gateway</h1>
          <p className="text-sm text-white/40 mt-1">Authorize this app to use your credits</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[#0a0a0a] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-[#0a0a0a] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
          />
          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-white/90 font-medium"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Authorize'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-white/60 hover:text-white hover:bg-white/5"
            onClick={() => window.close()}
          >
            Cancel
          </Button>
        </form>
      </div>
    </div>
  );
}
