import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customFetch } from "@workspace/api-client-react";

export default function PaystackCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    const paystackStatus = params.get("paystack"); // success / failed / error from redirect

    if (paystackStatus === "failed" || paystackStatus === "error" || !reference) {
      setStatus("failed");
      setErrorMsg("Payment was cancelled or failed.");
      return;
    }

    customFetch<{ success: boolean; groupId: number }>(
      `/api/payments/paystack/verify/${encodeURIComponent(reference)}`,
      { method: "GET" }
    )
      .then((data) => {
        setGroupId(data.groupId);
        setStatus("success");
      })
      .catch((err: any) => {
        setStatus("failed");
        setErrorMsg(err?.message ?? "Verification failed. Please contact support.");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full bg-card border border-border rounded-3xl p-8 shadow-lg text-center space-y-5">
        {status === "verifying" && (
          <>
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 text-[#5A1DE6] animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Verifying payment…</h2>
            <p className="text-sm text-muted-foreground">Please wait, this only takes a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Payment successful!</h2>
            <p className="text-sm text-muted-foreground">You now have full access to the class.</p>
            <Button
              className="w-full rounded-full bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90"
              onClick={() => setLocation(groupId ? `/groups/${groupId}` : "/groups")}
            >
              Go to class
            </Button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="flex justify-center">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Payment failed</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => setLocation("/groups")}
            >
              Back to classes
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
