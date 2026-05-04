'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, setAuthToken, setRefreshToken } from "@/lib/api";

/**
 * Whitelist of origins allowed to receive the authentication postMessage.
 * Includes the main app and the dashboard console, plus any origins
 * specified in the environment.
 */
const GET_ALLOWED_ORIGINS = () => {
  const envOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') ?? [];
  const consoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL;
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:3009'];

  const origins = new Set([...defaultOrigins, ...envOrigins]);
  if (consoleUrl) {
    try {
      origins.add(new URL(consoleUrl).origin);
    } catch { /* ignore invalid URL */ }
  }
  return Array.from(origins);
};

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
        // Use the origin passed by the SDK so the postMessage is restricted to
        // the correct opener origin instead of the insecure wildcard '*'.
        const params = new URLSearchParams(window.location.search);
        const callbackOrigin = params.get('origin');
        const allowedOrigins = GET_ALLOWED_ORIGINS();

        if (callbackOrigin && allowedOrigins.includes(callbackOrigin)) {
          window.opener.postMessage(
            { type: 'AI_GATEWAY_AUTH', accessToken: res.accessToken, user: res.user },
            callbackOrigin
          );
          window.close();
        } else {
          console.error('Unauthorized or missing origin for auth popup:', callbackOrigin);
          setError("Unauthorized callback origin.");
        }
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
