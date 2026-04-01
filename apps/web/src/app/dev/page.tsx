"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Wallet, AppWindow, Code } from "lucide-react";

export default function DevOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Developer Overview</h1>
        <p className="text-white/60">Manage your integrated apps and track earnings.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Total Earnings</CardTitle>
            <Wallet className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹12,450.00</div>
            <p className="text-xs text-green-400 mt-1 flex items-center">
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Registered Apps</CardTitle>
            <AppWindow className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-white/40 mt-1">
              Active integrations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Credits Driven</CardTitle>
            <Code className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">62,250</div>
            <p className="text-xs text-white/40 mt-1">
              Through your apps
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-transparent border-white/10">
          <CardHeader>
            <CardTitle>Your Apps</CardTitle>
            <CardDescription className="text-white/40">Manage your API keys and check usage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {["My Cool App", "Internal Tools", "Client Dashboard"].map((app, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-black flex items-center justify-center text-xs font-mono text-white/60">
                    {app.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{app}</span>
                </div>
                <Link href={`/dev/apps/app_${i}`}>
                  <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                    View
                  </Button>
                </Link>
              </div>
            ))}
            <Link href="/dev/apps/new" className="block pt-2">
              <Button variant="outline" className="w-full border-white/10 text-white/80 hover:bg-white/5">
                + Register New App
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-transparent border-white/10">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription className="text-white/40">Resources to get you started faster.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/dev/docs" className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group">
              <div>
                <p className="font-medium text-sm group-hover:text-white">SDK Documentation</p>
                <p className="text-xs text-white/40 mt-1">Read the @ai-gateway/sdk-js docs.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white" />
            </Link>
            <Link href="/dev/earnings" className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group">
              <div>
                <p className="font-medium text-sm group-hover:text-white">Earnings & Payouts</p>
                <p className="text-xs text-white/40 mt-1">Withdraw your 20% revenue split.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
