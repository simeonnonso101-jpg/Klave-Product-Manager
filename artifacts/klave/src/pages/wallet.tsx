import { useGetWalletSummary, useListTransactions, useWithdrawFunds, useGetCurrentUser, getListTransactionsQueryKey, getGetWalletSummaryQueryKey, customFetch } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Wallet as WalletIcon, Building, Clock, CheckCircle2, AlertCircle, Loader2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
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
    { query: { enabled: !!user } as any }
  );
  
  const { data: transactions, isLoading: isLoadingTx } = useListTransactions(
    { userId },
    { query: { enabled: !!user } as any }
  );

  const withdraw = useWithdrawFunds();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [isTopupLoading, setIsTopupLoading] = useState(false);

  // Handle return from Paystack — verify payment and credit wallet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // New flow: frontend-driven verification via ?paystack_ref=
    const ref = params.get("paystack_ref");
    if (ref) {
      window.history.replaceState({}, "", window.location.pathname);
      customFetch<{ success: boolean; amount: number }>(`/api/wallet/topup/verify/${encodeURIComponent(ref)}`, { method: "GET" })
        .then((data) => {
          toast({ title: "Wallet funded! 🎉", description: `₦${data.amount.toLocaleString()} added to your wallet.` });
          queryClient.invalidateQueries({ queryKey: getGetWalletSummaryQueryKey({ creatorId: userId }) });
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey({ userId }) });
        })
        .catch((err: any) => {
          // Payment may already have been verified (duplicate redirect) — just refresh silently
          queryClient.invalidateQueries({ queryKey: getGetWalletSummaryQueryKey({ creatorId: userId }) });
        });
      return;
    }

    // Legacy flow: server-side callback sets ?topup=success
    const status = params.get("topup");
    const amount = params.get("amount");
    if (status === "success") {
      toast({ title: "Wallet funded!", description: amount ? `₦${parseFloat(amount).toLocaleString()} added to your wallet.` : "Funds added successfully." });
      queryClient.invalidateQueries({ queryKey: getGetWalletSummaryQueryKey({ creatorId: userId }) });
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey({ userId }) });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "failed") {
      toast({ title: "Top-up failed", description: "Your payment was not completed.", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount < 100) {
      toast({ title: "Minimum top-up is ₦100", variant: "destructive" });
      return;
    }
    setIsTopupLoading(true);
    try {
      const data = await customFetch<{ authorizationUrl: string }>("/api/wallet/topup/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, frontendUrl: window.location.origin }),
      });
      window.location.href = data.authorizationUrl;
    } catch (err: any) {
      toast({ title: "Could not start payment", description: err?.message ?? "Please try again.", variant: "destructive" });
      setIsTopupLoading(false);
    }
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    const balance = summary?.availableBalance || 0;
    
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      toast({ title: "Invalid amount", description: "Please enter a valid withdrawal amount.", variant: "destructive" });
      return;
    }
    
    withdraw.mutate({
      data: {
        userId,
        amount,
        bankDetails: `${bankName} - ${accountNumber}`
      }
    }, {
      onSuccess: () => {
        toast({ title: "Withdrawal initiated", description: "Your funds will arrive in 2-3 business days." });
        setIsWithdrawOpen(false);
        setWithdrawAmount("");
        setBankName("");
        setAccountNumber("");
        queryClient.invalidateQueries({ queryKey: getGetWalletSummaryQueryKey({ creatorId: userId }) });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey({ userId }) });
      },
      onError: () => {
        toast({ title: "Withdrawal failed", description: "Failed to initiate withdrawal.", variant: "destructive" });
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-accent" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <MainLayout>
      <div className="relative flex flex-col h-full bg-background overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-[#5A1DE6]/20 to-[#3A0CA3]/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-32 w-72 h-72 rounded-full bg-gradient-to-tr from-[#F59E0B]/10 to-transparent blur-3xl" />

        <header className="relative px-4 pt-14 pb-4 sticky top-0 z-10 bg-background/60 backdrop-blur-2xl border-b border-border/60">
          <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] bg-clip-text text-transparent">Wallet</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B] mt-1" />
          </h1>
        </header>

        <div className="relative flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          {/* Main Balance Card */}
          <Card className="bg-gradient-to-br from-[#5A1DE6] via-[#4318B8] to-[#3A0CA3] text-white border-none overflow-hidden relative shadow-xl shadow-[#5A1DE6]/30 rounded-3xl">
            <div className="absolute -top-12 -right-8 w-48 h-48 rounded-full bg-[#F59E0B]/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute top-[-20%] right-[-10%] opacity-10 rotate-12 pointer-events-none">
              <WalletIcon className="w-48 h-48" />
            </div>
            <CardHeader className="pb-2 pt-6 relative">
              <CardTitle className="text-xs sm:text-sm font-medium text-white/85 uppercase tracking-widest">Available Balance</CardTitle>
            </CardHeader>
            <CardContent className="pb-6 relative">
              {isLoadingSummary ? (
                <Skeleton className="h-12 w-40 bg-white/20 mt-2" />
              ) : (
                <div className="text-4xl sm:text-5xl font-bold tracking-tight">
                  ${summary?.availableBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </div>
              )}
              <div className="mt-6 sm:mt-8 flex gap-3">
                {/* Add Funds */}
                <Dialog open={isTopupOpen} onOpenChange={setIsTopupOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="flex-1 h-12 rounded-xl font-bold bg-white/20 text-white hover:bg-white/30 shadow-md text-[15px] border border-white/30">
                      <Plus className="mr-2 h-5 w-5" /> Add Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <form onSubmit={handleTopup}>
                      <DialogHeader>
                        <DialogTitle>Add Funds to Wallet</DialogTitle>
                        <DialogDescription>Fund your wallet via Paystack. Minimum ₦100.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-2">
                        <Label htmlFor="topup-amount" className="font-semibold">Amount (₦)</Label>
                        <Input
                          id="topup-amount"
                          type="number"
                          min="100"
                          step="100"
                          placeholder="e.g. 5000"
                          value={topupAmount}
                          onChange={(e) => setTopupAmount(e.target.value)}
                          required
                          className="h-12 rounded-xl font-mono text-lg"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isTopupLoading || !topupAmount} className="h-12 rounded-xl w-full text-base font-bold">
                          {isTopupLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting…</> : "Pay with Paystack"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Withdraw */}
                <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="flex-1 h-12 rounded-xl font-bold bg-white text-[#5A1DE6] hover:bg-white/95 shadow-md text-[16px]">
                      <Building className="mr-2 h-5 w-5" /> Withdraw
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleWithdraw}>
                      <DialogHeader>
                        <DialogTitle>Withdraw Funds</DialogTitle>
                        <DialogDescription>
                          Transfer funds to your business bank account. Available: ${summary?.availableBalance?.toLocaleString() || '0.00'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="font-semibold">Amount ($)</Label>
                          <Input 
                            id="amount" 
                            type="number" 
                            placeholder="0.00" 
                            max={summary?.availableBalance || 0}
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            required 
                            className="h-12 rounded-xl font-mono text-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankName" className="font-semibold">Bank Name</Label>
                          <Input 
                            id="bankName" 
                            placeholder="e.g. Chase Business" 
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            required 
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber" className="font-semibold">Account Number</Label>
                          <Input 
                            id="accountNumber" 
                            placeholder="e.g. 123456789" 
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            required 
                            className="h-12 rounded-xl font-mono"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={withdraw.isPending || !withdrawAmount || !bankName || !accountNumber} className="h-12 rounded-xl w-full text-base font-bold shadow-md">
                          {withdraw.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                          Confirm Withdrawal
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div> {/* end flex gap-3 */}
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-1 pt-5 px-5">
                <CardTitle className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Total Earned</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">${summary?.totalEarnings?.toLocaleString() || '0'}</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-card border-none shadow-sm rounded-2xl">
              <CardHeader className="pb-1 pt-5 px-5">
                <CardTitle className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Pending</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">${summary?.pendingBalance?.toLocaleString() || '0'}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            <h3 className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase px-1">Recent Transactions</h3>
            <div className="bg-card rounded-3xl p-2 shadow-sm border border-border">
            {isLoadingTx ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))
            ) : transactions?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No transactions yet</div>
            ) : (
              <div className="divide-y divide-border/50">
                {transactions?.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-3 py-4">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {tx.type === 'credit' ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()} • 
                        <span className="flex items-center gap-1">
                          {getStatusIcon(tx.status)}
                          <span className="capitalize">{tx.status}</span>
                        </span>
                      </div>
                    </div>
                    <div className={`font-bold text-[16px] whitespace-nowrap ${
                      tx.type === 'credit' ? 'text-emerald-600' : 'text-foreground'
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
      </div>
    </MainLayout>
  );
}
