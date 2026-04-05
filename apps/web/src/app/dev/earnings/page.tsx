"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type CreditTransaction } from "@/lib/api";

const INCOME_SHARE = 0.2;

export default function EarningsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const tx = await api.credits.getTransactions(100, 0);
        setTransactions(tx.transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load earnings");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const { debits, credits, estimatedEarnings, pending } = useMemo(() => {
    const debitSum = transactions
      .filter((tx) => tx.type === "debit")
      .reduce((acc, tx) => acc + tx.amount, 0);
    const creditSum = transactions
      .filter((tx) => tx.type === "credit")
      .reduce((acc, tx) => acc + tx.amount, 0);

    const earned = debitSum * INCOME_SHARE;
    const paidOut = creditSum * INCOME_SHARE;
    return {
      debits: debitSum,
      credits: creditSum,
      estimatedEarnings: earned,
      pending: Math.max(earned - paidOut, 0),
    };
  }, [transactions]);

  const exportCsv = () => {
    const headers = ["date", "id", "type", "reason", "amount", "balance_after"];
    const rows = transactions.map((tx) =>
      [
        new Date(tx.created_at).toISOString(),
        tx.id,
        tx.type,
        tx.reason,
        tx.amount,
        tx.balance_after,
      ].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-gateway-earnings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Earnings</h1>
        <p className="text-white/60">Revenue estimation from live credit transaction history.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#151515]">
          <CardHeader>
            <CardTitle>Estimated Available</CardTitle>
            <CardDescription className="text-white/40">
              Based on {Math.round(INCOME_SHARE * 100)}% partner share of consumed credits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-12 w-56 bg-white/10" />
            ) : (
              <div className="flex flex-wrap items-center gap-6">
                <p className="text-5xl font-bold tracking-tight text-white">
                  INR {pending.toFixed(2)}
                </p>
                <Button disabled className="bg-white/30 text-black/80">
                  <Wallet className="mr-2 h-4 w-4" />
                  Withdrawal (coming soon)
                </Button>
              </div>
            )}
            <p className="mt-4 text-xs text-white/40">
              Automatic payouts are not wired yet on backend; this page now reflects real transaction data only.
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#0a0a0a]">
          <CardHeader>
            <CardTitle>Stats</CardTitle>
            <CardDescription className="text-white/40">Live credits movement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <p>Total debits: {loading ? "..." : debits.toLocaleString()}</p>
            <p>Total credits: {loading ? "..." : credits.toLocaleString()}</p>
            <p>Estimated earnings: {loading ? "..." : `INR ${estimatedEarnings.toFixed(2)}`}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-[#0a0a0a]">
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <CardTitle className="text-white">Transaction History</CardTitle>
            <CardDescription className="mt-1 text-white/40">Latest 100 transactions.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/5"
            onClick={exportCsv}
            disabled={transactions.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Date</TableHead>
              <TableHead className="text-white/60">Reason</TableHead>
              <TableHead className="text-white/60">Type</TableHead>
              <TableHead className="text-right text-white/60">Amount</TableHead>
              <TableHead className="text-right text-white/60">Balance After</TableHead>
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
            ) : transactions.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={5} className="py-10 text-center text-sm text-white/50">
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white/80">
                    {new Date(tx.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-white/60">{tx.reason}</TableCell>
                  <TableCell className="text-white/60">{tx.type}</TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === "debit" ? "text-red-300" : "text-green-300"}`}>
                    {tx.type === "debit" ? "-" : "+"}
                    {tx.amount}
                  </TableCell>
                  <TableCell className="text-right text-white/60">{tx.balance_after}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
