"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type DeveloperApp } from "@/lib/api";

export default function AppsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apps, setApps] = useState<DeveloperApp[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.apps.list();
        setApps(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load apps");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Your Apps</h1>
          <p className="text-white/60">Manage registered applications and API keys.</p>
        </div>
        <Link href="/dev/apps/new">
          <Button className="bg-white text-black hover:bg-white/90">Register App</Button>
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden border-white/10 bg-[#0a0a0a]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Name</TableHead>
              <TableHead className="text-white/60">App ID</TableHead>
              <TableHead className="text-white/60">Description</TableHead>
              <TableHead className="text-white/60">Created</TableHead>
              <TableHead className="text-right text-white/60">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={5}>
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-8 w-full bg-white/10" />
                    <Skeleton className="h-8 w-full bg-white/10" />
                  </div>
                </TableCell>
              </TableRow>
            ) : apps.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={5} className="py-10 text-center text-sm text-white/50">
                  No apps registered yet.
                </TableCell>
              </TableRow>
            ) : (
              apps.map((app) => (
                <TableRow key={app.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{app.name}</TableCell>
                  <TableCell className="font-mono text-xs text-white/60">{app.id}</TableCell>
                  <TableCell className="text-white/60">{app.description || "-"}</TableCell>
                  <TableCell className="text-white/60">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dev/apps/${app.id}`}>
                      <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                        Manage
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
