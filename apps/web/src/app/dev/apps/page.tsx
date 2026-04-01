"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AppsPage() {
  const apps = [
    { id: "app_12345", name: "My Cool App", url: "https://mycoolapp.com", credits: 45000, status: "Active" },
    { id: "app_67890", name: "Internal Tools", url: "https://internal.tools", credits: 12500, status: "Active" },
    { id: "app_54321", name: "Client Dashboard", url: "https://dashboard.client.com", credits: 4750, status: "Inactive" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Your Apps</h1>
          <p className="text-white/60">Manage your applications and API keys.</p>
        </div>
        <Link href="/dev/apps/new">
          <Button className="bg-white text-black hover:bg-white/90">Register App</Button>
        </Link>
      </div>

      <Card className="bg-[#0a0a0a] border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Name</TableHead>
              <TableHead className="text-white/60">App ID</TableHead>
              <TableHead className="text-white/60">Credits Driven</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow key={app.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="font-medium">
                  <div>{app.name}</div>
                  <div className="text-xs text-white/40">{app.url}</div>
                </TableCell>
                <TableCell className="font-mono text-xs text-white/60">{app.id}</TableCell>
                <TableCell>{app.credits.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${app.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-white/10 text-white/60'}`}>
                    {app.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/dev/apps/${app.id}`}>
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                      Manage
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
