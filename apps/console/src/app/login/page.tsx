"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { api, setAuthToken, setRefreshToken } from "@/lib/api";
import { Button, Field, InlineMessage, Surface, TextInput } from "@/components/console/system";

export default function LoginPage() {
  const router = useRouter();
  const isBrowser = typeof window !== "undefined";
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? (isBrowser ? window.location.origin : "http://localhost:3000");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.auth.login(email, password);
      setAuthToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 py-6 md:px-6 md:py-8 font-sans">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1480px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Surface className="flex flex-col justify-between p-7 md:p-10 !rounded-xl !border-zinc-800 !bg-[#09090b] !bg-none !shadow-none !backdrop-filter-none">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">Developer Console</p>
            <h1 className="mt-6 max-w-2xl font-sans text-5xl font-bold tracking-[-0.05em] text-zinc-100 md:text-7xl">
              Monochrome control for every app you ship.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-400 md:text-lg">
              Launch apps, manage OAuth redirect flows, inspect live usage, and monitor earnings from one clean surface.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Apps</p>
              <p className="mt-4 font-sans text-3xl font-bold tracking-[-0.04em] text-zinc-100">Register</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Usage</p>
              <p className="mt-4 font-sans text-3xl font-bold tracking-[-0.04em] text-zinc-100">Analyze</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Revenue</p>
              <p className="mt-4 font-sans text-3xl font-bold tracking-[-0.04em] text-zinc-100">Track</p>
            </div>
          </div>
        </Surface>

        <Surface className="flex items-center justify-center p-6 md:p-10 !rounded-xl !border-zinc-800 !bg-[#09090b] !bg-none !shadow-none !backdrop-filter-none">
          <div className="w-full max-w-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">Access</p>
            <h2 className="mt-4 font-sans text-4xl font-bold tracking-[-0.04em] text-zinc-100">Sign in</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400 font-sans">Use the same credentials you use on the main AI Gateway site.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div className="p-3 text-xs text-red-400 bg-red-950/20 border border-red-900/50 rounded-md font-mono flex items-start gap-2" role="alert">
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-zinc-800 bg-black px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-zinc-800 bg-black px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-100 text-black px-4 text-sm font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to console</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
              <Link href="/" className="inline-flex items-center gap-2 rounded-md px-2 py-1 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Back to landing
              </Link>
              <a href={`${webUrl}/signup`} target="_blank" rel="noopener noreferrer" className="rounded-md px-2 py-1 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 -mr-2">
                Create account
              </a>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
