"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, setAuthToken } from "@/lib/api";

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
      // Ensure the response explicitly has the accessToken correctly mapped
      if (res && res.data && res.data.accessToken) {
        setAuthToken(res.data.accessToken);
        router.push("/dashboard");
      } else {
        setError("Invalid response. Missing user token.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-sm bg-[#0a0a0a] border-white/10 text-white">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 bg-white text-black flex items-center justify-center rounded-lg font-bold mb-2">
            AI
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription className="text-white/60">
            Start building with AI Gateway today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-white/90 font-medium h-10"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t border-white/5 mx-6 pt-6 px-0 pb-6">
          <div className="text-sm text-center text-white/60">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline font-medium">
              Sign in
            </Link>
          </div>
          <Link href="/" className="text-xs text-center text-white/40 hover:text-white/80 transition-colors flex items-center justify-center">
            ← Back to home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
