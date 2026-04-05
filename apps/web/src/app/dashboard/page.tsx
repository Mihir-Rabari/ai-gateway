"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Activity, Zap, CreditCard } from "lucide-react";
import { api } from "@/lib/api";

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [usageStats, setUsageStats] = useState({ requests: 0, tokens: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        const bal = await api.credits.getBalance();
        setBalance(bal?.balance || 0);
        
        const stats = await api.usage.getStats();
        setUsageStats({
          requests: stats?.totalRequests || 0,
          tokens: stats?.totalTokens || 0
        });
      } catch (e) {
        console.error("Failed to load dashboard stats", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">Overview</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10">View Documentation</Button>
          <Button className="bg-white text-black hover:bg-white/90">Add Credits</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 mt-1">
                <Skeleton className="h-8 w-24 bg-white/10" />
                <Skeleton className="h-3 w-32 bg-white/10" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">₹{balance.toLocaleString()}</div>
                <p className="text-xs text-green-400 mt-1 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +20.1% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 mt-1">
                <Skeleton className="h-8 w-16 bg-white/10" />
                <Skeleton className="h-3 w-24 bg-white/10" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">+2350</div>
                <p className="text-xs text-white/40 mt-1">
                  +180.1% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Credits Used</CardTitle>
            <Zap className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 mt-1">
                <Skeleton className="h-8 w-20 bg-white/10" />
                <Skeleton className="h-3 w-28 bg-white/10" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">{usageStats.tokens.toLocaleString()}</div>
                <p className="text-xs text-white/40 mt-1">
                  +19% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/60">Active Models</CardTitle>
            <Activity className="h-4 w-4 text-white/40" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 mt-1">
                <Skeleton className="h-8 w-12 bg-white/10" />
                <Skeleton className="h-3 w-20 bg-white/10" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-white">4</div>
                <p className="text-xs text-white/40 mt-1">
                  GPT-4, Claude 3, Gemini
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-[#0a0a0a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Usage</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {loading ? (
              <div className="space-y-4 pt-4 px-4">
                <Skeleton className="h-40 w-full bg-white/10" />
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-white/40 text-sm border border-dashed border-white/10 rounded-lg m-4">
                Chart Placeholder
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-[#0a0a0a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[150px] bg-white/10" />
                      <Skeleton className="h-3 w-[100px] bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {[
                  { model: "gpt-4o", tokens: 120, time: "2 mins ago" },
                  { model: "claude-3-5-sonnet", tokens: 340, time: "15 mins ago" },
                  { model: "gemini-1.5-pro", tokens: 80, time: "1 hour ago" },
                  { model: "gpt-4-turbo", tokens: 420, time: "3 hours ago" },
                ].map((req, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center border border-white/10 text-xs text-white/60">
                        {req.model.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none text-white">{req.model}</p>
                        <p className="text-xs text-white/40 mt-1.5">{req.time}</p>
                      </div>
                    </div>
                    <div className="font-mono text-sm text-white/80">
                      {req.tokens} tkns
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
