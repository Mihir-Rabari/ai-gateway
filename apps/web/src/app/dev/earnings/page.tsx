"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Wallet } from "lucide-react";

export default function EarningsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const withdrawFunds = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Withdrawal Requested",
        description: "Your funds will be transferred to your bank account within 3-5 business days.",
      });
    }, 1500);
  };

  const transactions = [
    { date: "Oct 15, 2024", type: "Credit Earned", amount: "₹450.00", app: "My Cool App", status: "Completed" },
    { date: "Oct 12, 2024", type: "Credit Earned", amount: "₹1,200.00", app: "Internal Tools", status: "Completed" },
    { date: "Oct 05, 2024", type: "Withdrawal", amount: "-₹5,000.00", app: "-", status: "Processed" },
    { date: "Oct 01, 2024", type: "Credit Earned", amount: "₹3,400.00", app: "My Cool App", status: "Completed" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Earnings</h1>
        <p className="text-white/60">View your revenue from app integrations and withdraw funds.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle>Available Balance</CardTitle>
            <CardDescription className="text-white/40">Funds ready to be withdrawn.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-5xl font-bold tracking-tighter text-white">₹12,450.00</div>
              <Button onClick={withdrawFunds} disabled={loading} className="bg-white text-black hover:bg-white/90 shadow-lg">
                <Wallet className="mr-2 h-4 w-4" />
                {loading ? "Processing..." : "Withdraw Funds"}
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-4">
              Minimum withdrawal amount is ₹1,000. Withdrawals are processed via Razorpay Payouts.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a0a0a] border-white/10">
          <CardHeader>
            <CardTitle>Pending</CardTitle>
            <CardDescription className="text-white/40">Awaiting clearance.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold tracking-tight text-white/80">₹450.00</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0a0a0a] border-white/10">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <CardTitle className="text-white">Transaction History</CardTitle>
            <CardDescription className="text-white/40 mt-1">Your recent earnings and payouts.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/5">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Date</TableHead>
              <TableHead className="text-white/60">Type</TableHead>
              <TableHead className="text-white/60">App</TableHead>
              <TableHead className="text-white/60 text-right">Amount</TableHead>
              <TableHead className="text-white/60 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx, i) => (
              <TableRow key={i} className="border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white/80">{tx.date}</TableCell>
                <TableCell className="text-white/60">{tx.type}</TableCell>
                <TableCell className="text-white/60">{tx.app}</TableCell>
                <TableCell className={`text-right font-medium ${tx.amount.startsWith('-') ? 'text-white' : 'text-green-400'}`}>
                  {tx.amount}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.status === 'Completed' || tx.status === 'Processed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {tx.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
