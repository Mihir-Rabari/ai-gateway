"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { api, setAuthToken, setRefreshToken } from "@/lib/api";
import { Surface } from "@/components/console/system";

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
    <div className="min-h-screen bg-black px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1480px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: Brand panel */}
        <Surface className="flex flex-col justify-between p-7 md:p-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
              Developer Console
            </p>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-zinc-100 md:text-6xl">
              One control room for every AI app you ship.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400">
              Launch apps, manage OAuth redirect flows, inspect live usage,
              and monitor earnings from one clean surface.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Apps
              </p>
              <p className="mt-3 text-xl font-bold text-zinc-100">Register</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Usage
              </p>
              <p className="mt-3 text-xl font-bold text-zinc-100">Analyze</p>
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Revenue
              </p>
              <p className="mt-3 text-xl font-bold text-zinc-100">Track</p>
            </div>
          </div>
        </Surface>

        {/* Right: Login form */}
        <Surface className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
              Access
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-100">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Use the same credentials you use on the main AI Gateway site.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div
                  className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2.5 text-xs text-red-300 font-mono"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
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
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-md px-2 py-1 transition hover:text-zinc-300"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to landing
              </Link>
              <a
                href={`${webUrl}/signup`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-2 py-1 transition hover:text-zinc-300"
              >
                Create account
              </a>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
