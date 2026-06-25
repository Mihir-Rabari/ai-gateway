"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, setAuthToken, setRefreshToken } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.auth.signup(email, name, password);
      setAuthToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-sm bg-[#09090b] border border-zinc-800 text-white rounded-xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 bg-zinc-100 text-black flex items-center justify-center rounded font-mono text-sm tracking-tighter mb-2">
            AI
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">Create an account</CardTitle>
          <CardDescription className="text-zinc-400">
            Start building with AI Gateway today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs text-red-400 bg-red-950/20 border border-red-900/50 rounded-md font-mono flex items-start gap-2" role="alert" aria-live="assertive">
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-black border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-md focus-visible:ring-zinc-700 focus-visible:border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-md focus-visible:ring-zinc-700 focus-visible:border-zinc-700"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-black border-zinc-800 text-zinc-100 placeholder:text-zinc-600 rounded-md focus-visible:ring-zinc-700 focus-visible:border-zinc-700"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-zinc-100 text-black hover:bg-white font-medium h-10 rounded-md transition-colors"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating account..." : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t border-zinc-800 mx-6 pt-6 px-0 pb-6">
          <div className="text-sm text-center text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="text-zinc-100 hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700">
              Sign in
            </Link>
          </div>
          <Link href="/" className="text-xs text-center text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700">
            ← Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
