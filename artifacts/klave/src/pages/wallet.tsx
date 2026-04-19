import { useGetWalletSummary, useListTransactions, useWithdrawFunds, useGetCurrentUser, getListTransactionsQueryKey, getGetWalletSummaryQueryKey } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Wallet as WalletIcon, Building, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function WalletPage() {
  const { data: user } = useGetCurrentUser();
  const userId = user?.id || 1;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: summary, isLoading: isLoadingSummary } = useGetWalletSummary(
    { creatorId: userId }, 
    { query: { enabled: !!user } }
  );
  
  const { data: transactions, isLoading: isLoadingTx } = useListTransactions(
    { userId },
    { query: { enabled: !!user } }
  );

  const withdraw = useWithdrawFunds();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    withdraw.mutate({
      data: {
        userId,
        amount,
        bankDetails
      }
    }, {
      onSuccess: () => {
        toast({ title: "Withdrawal initiated", description: "Your funds will arrive in 2-3 business days." });
        setIsWithdrawOpen(false);
        setWithdrawAmount("");
        setBankDetails("");
        queryClient.invalidateQueries({ queryKey: getGetWalletSummaryQueryKey({ creatorId: userId }) });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey({ userId }) });
      },
      onError: (err) => {
        toast({ title: "Withdrawal failed", description: "Failed to initiate withdrawal.", variant: "destructive" });
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <header className="px-4 pt-12 pb-4 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          {/* Main Balance Card */}
          <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground border-none overflow-hidden relative shadow-lg shadow-primary/20">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <WalletIcon className="w-32 h-32" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/80">Available Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-10 w-40 bg-primary-foreground/20 mt-2" />
              ) : (
                <div className="text-4xl font-bold tracking-tight">
                  ${summary?.availableBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="w-full font-semibold bg-white text-black hover:bg-white/90">
                      <Building className="mr-2 h-4 w-4" /> Withdraw
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleWithdraw}>
                      <DialogHeader>
                        <DialogTitle>Withdraw Funds</DialogTitle>
                        <DialogDescription>
                          Transfer funds to your bank account. Available: ${summary?.availableBalance?.toLocaleString() || '0.00'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount ($)</Label>
                          <Input 
                            id="amount" 
                            type="number" 
                            placeholder="0.00" 
                            max={summary?.availableBalance || 0}
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bank">Bank Details (IBAN / Routing)</Label>
                          <Input 
                            id="bank" 
                            placeholder="US00 0000..." 
                            value={bankDetails}
                            onChange={(e) => setBankDetails(e.target.value)}
                            required 
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={withdraw.isPending || !withdrawAmount || !bankDetails}>
                          {withdraw.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Confirm Withdrawal
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Earnings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {isLoadingSummary ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <div className="text-xl font-bold">${summary?.totalEarnings?.toLocaleString() || '0'}</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {isLoadingSummary ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <div className="text-xl font-bold">${summary?.pendingBalance?.toLocaleString() || '0'}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transactions List */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">Recent Transactions</h3>
            {isLoadingTx ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-card animate-pulse">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))
            ) : transactions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
            ) : (
              <div className="space-y-2">
                {transactions?.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {tx.type === 'credit' ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()} • {getStatusIcon(tx.status)}
                        <span className="capitalize">{tx.status}</span>
                      </div>
                    </div>
                    <div className={`font-semibold text-sm whitespace-nowrap ${
                      tx.type === 'credit' ? 'text-emerald-500' : 'text-foreground'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}