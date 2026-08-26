"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { api, type CreditTransaction } from "@/lib/api";
import {
  Button,
  DataTable,
  InlineMessage,
  MetricCard,
  MobileCardList,
  ShellSection,
  SkeletonBlock,
  Surface,
} from "@/components/console/system";

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
        const result = await api.credits.getTransactions(100, 0);
        setTransactions(result.transactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load earnings");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const { debits, credits, estimatedEarnings, pending } = useMemo(() => {
    const { debitSum, creditSum } = transactions.reduce(
      (acc, tx) => {
        if (tx.type === "debit") acc.debitSum += tx.amount;
        if (tx.type === "credit") acc.creditSum += tx.amount;
        return acc;
      },
      { debitSum: 0, creditSum: 0 },
    );
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
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-gateway-earnings.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <ShellSection
        eyebrow="Revenue"
        title="Credits to cash view"
        description="Live payout-side estimates generated from your transaction history."
        action={
          <Button
            variant="secondary"
            onClick={exportCsv}
            disabled={transactions.length === 0}
            title={transactions.length === 0 ? "No transactions available to export" : "Export CSV"}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-32" />
          ))
        ) : (
          <>
            <MetricCard
              label="Available now"
              value={`INR ${pending.toFixed(2)}`}
              hint="Estimated earnings not yet offset by payouts."
            />
            <MetricCard
              label="Total debits"
              value={debits.toLocaleString()}
              hint="Credits consumed against your developer traffic."
            />
            <MetricCard
              label="Total credits"
              value={credits.toLocaleString()}
              hint="Credits added back or credited to the account."
            />
            <MetricCard
              label="Gross estimate"
              value={`INR ${estimatedEarnings.toFixed(2)}`}
              hint="Computed from a 20% revenue share."
            />
          </>
        )}
      </div>

      {/* Transaction history */}
      <Surface className="p-6 md:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Transaction history
        </p>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden">
                <MobileCardList>
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-lg border border-white/10 bg-black/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{tx.reason}</p>
                          <p className="mt-1 text-xs text-white/40">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-white/80">
                          {tx.type === "debit" ? "-" : "+"}
                          {tx.amount}
                        </p>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-wider text-white/40">
                        Balance after {tx.balance_after}
                      </p>
                    </div>
                  ))}
                </MobileCardList>
              </div>

              {/* Desktop table */}
              <DataTable
                className="hidden md:block"
                columns={["Date", "Reason", "Type", "Amount", "Balance after"]}
                rows={transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="align-top text-white/80 transition hover:bg-white/5"
                  >
                    <td className="px-5 py-4 text-white/40">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-white">{tx.reason}</td>
                    <td className="px-5 py-4 uppercase tracking-wider text-white/40 text-xs">
                      {tx.type}
                    </td>
                    <td className="px-5 py-4 font-medium text-white/90">
                      {tx.type === "debit" ? "-" : "+"}
                      {tx.amount}
                    </td>
                    <td className="px-5 py-4 text-white/40">
                      {tx.balance_after}
                    </td>
                  </tr>
                ))}
                empty={
                  transactions.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-white/40">
                      No transactions found.
                    </p>
                  ) : undefined
                }
              />
            </>
          )}
        </div>
      </Surface>
    </div>
  );
}
