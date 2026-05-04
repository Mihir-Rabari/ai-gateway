"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { api, setAuthToken, setRefreshToken } from "@/lib/api";
import { Button, Field, InlineMessage, Surface, TextInput } from "@/components/console/system";

export default function LoginPage() {
  const router = useRouter();
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
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
    <div className="min-h-screen bg-grid px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1480px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Surface className="flex flex-col justify-between p-7 md:p-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/38">Developer Console</p>
            <h1 className="mt-6 max-w-2xl font-display text-5xl tracking-[-0.08em] text-white md:text-7xl">
              Monochrome control for every app you ship.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/58 md:text-lg">
              Launch apps, manage OAuth redirect flows, inspect live usage, and monitor earnings from one clean surface.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"><p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Apps</p><p className="mt-4 font-display text-3xl tracking-[-0.06em] text-white">Register</p></div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"><p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Usage</p><p className="mt-4 font-display text-3xl tracking-[-0.06em] text-white">Analyze</p></div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"><p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Revenue</p><p className="mt-4 font-display text-3xl tracking-[-0.06em] text-white">Track</p></div>
          </div>
        </Surface>

        <Surface className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Access</p>
            <h2 className="mt-4 font-display text-4xl tracking-[-0.06em] text-white">Sign in</h2>
            <p className="mt-3 text-sm leading-6 text-white/56">Use the same credentials you use on the main AI Gateway site.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}
              <Field label="Email"><TextInput type="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
              <Field label="Password"><TextInput type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
              <Button type="submit" busy={loading} className="w-full justify-center">{loading ? "Signing in" : "Continue to console"}{!loading ? <ArrowRight className="h-4 w-4" /> : null}</Button>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-white/46">
              <Link href="/" className="inline-flex items-center gap-2 transition hover:text-white/82"><ArrowLeft className="h-4 w-4" />Back to landing</Link>
              <a href={`${webUrl}/signup`} className="transition hover:text-white/82">Create account</a>
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
