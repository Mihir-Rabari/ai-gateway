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
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
              Developer Console
            </p>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-white md:text-6xl">
              One control room for every AI app you ship.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/50">
              Launch apps, manage OAuth redirect flows, inspect live usage,
              and monitor earnings from one clean surface.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/40 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                Apps
              </p>
              <p className="mt-3 text-xl font-bold text-white">Register</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                Usage
              </p>
              <p className="mt-3 text-xl font-bold text-white">Analyze</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                Revenue
              </p>
              <p className="mt-3 text-xl font-bold text-white">Track</p>
            </div>
          </div>
        </Surface>

        {/* Right: Login form */}
        <Surface className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
              Access
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Use the same credentials you use on the main AI Gateway site.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300 font-mono"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-white/50 font-mono"
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
                  className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/20 focus-visible:ring-1 focus-visible:ring-white/50"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-white/50 font-mono"
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
                  className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/20 focus-visible:ring-1 focus-visible:ring-white/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-white/40">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition hover:text-white/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to landing
              </Link>
              <a
                href={`${webUrl}/signup`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-2 py-1 transition hover:text-white/80"
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
