"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Blocks, Sparkles, Wallet } from "lucide-react";
import { getAuthToken, setAuthToken, setRefreshToken } from "@/lib/api";
import { Button, Surface } from "@/components/console/system";

export default function ConsolePage() {
  const router = useRouter();
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingToken = params.get("token");
    const incomingRefresh = params.get("rt");

    if (incomingToken) {
      setAuthToken(incomingToken);
      if (incomingRefresh) setRefreshToken(incomingRefresh);
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (incomingToken || getAuthToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-grid px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1560px] flex-col gap-6">
        <Surface className="flex items-center justify-between px-5 py-4 md:px-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-black">
              AI
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/38">AI Gateway</p>
              <p className="mt-1 font-display text-2xl tracking-[-0.05em] text-white">Developer Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={webUrl} target="_blank" rel="noopener noreferrer" className="hidden text-sm text-white/54 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:block">
              Main website
            </a>
            <Link href="/login">
              <Button>Enter Console</Button>
            </Link>
          </div>
        </Surface>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Surface className="relative overflow-hidden px-6 py-8 md:px-10 md:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30rem)]" />
            <div className="relative max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/34">Monochrome Workspace</p>
              <h1 className="mt-6 text-balance font-display text-5xl tracking-[-0.08em] text-white md:text-7xl">
                Build, ship, and monetize AI apps from one control room.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/60 md:text-lg">
                Your console is now set up to become a sharp monochrome workspace for apps, keys, redirect flows,
                usage, and earnings. Every route still speaks directly to the existing backend client.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/login">
                  <Button className="h-12 px-6">
                    Open dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a
                  href={`${webUrl}/signup`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white/10 bg-white/8 text-white hover:bg-white/14 inline-flex h-12 px-6 items-center justify-center gap-2 rounded-full text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  Create account
                </a>
              </div>
            </div>
          </Surface>

          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-1">
            <Surface className="p-6">
              <Blocks className="h-5 w-5 text-white/64" />
              <p className="mt-6 font-display text-3xl tracking-[-0.06em] text-white">Apps</p>
              <p className="mt-3 text-sm leading-6 text-white/58">
                Register apps, rotate keys, and manage exact redirect URI lists against the live API.
              </p>
            </Surface>
            <Surface className="p-6">
              <Sparkles className="h-5 w-5 text-white/64" />
              <p className="mt-6 font-display text-3xl tracking-[-0.06em] text-white">Overview</p>
              <p className="mt-3 text-sm leading-6 text-white/58">
                Track requests, top models, latency, and recent account activity in one view.
              </p>
            </Surface>
            <Surface className="p-6">
              <Wallet className="h-5 w-5 text-white/64" />
              <p className="mt-6 font-display text-3xl tracking-[-0.06em] text-white">Earnings</p>
              <p className="mt-3 text-sm leading-6 text-white/58">
                Watch credits movement and export payout-facing transaction history whenever you need it.
              </p>
            </Surface>
          </div>
        </div>
      </div>
    </div>
  );
}
