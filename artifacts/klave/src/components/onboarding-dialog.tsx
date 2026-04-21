import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Wallet as WalletIcon, ArrowRight, Check } from "lucide-react";
import { Link } from "wouter";

const STORAGE_KEY = "klave_onboarded_v1";

const STEPS = [
  {
    icon: MessageCircle,
    title: "Welcome to Klave",
    body: "Klave is a chat-first platform for real estate creators. Teach your students inside groups they already love.",
    cta: "Next",
  },
  {
    icon: WalletIcon,
    title: "Get paid instantly",
    body: "Open a free or paid group. The moment a student joins, money lands in your in-app wallet — no waiting, no schedules.",
    cta: "Next",
  },
  {
    icon: Sparkles,
    title: "Scale with AI",
    body: "Record one lesson. Klave's AI re-tones it for every other group you pick — so you can teach hundreds without copy-pasting.",
    cta: "Let's go",
  },
];

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        t = setTimeout(() => setOpen(true), 600);
      }
    } catch (_) {
      // ignore
    }
    return () => { if (t) clearTimeout(t); };
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (_) {}
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-0 rounded-3xl">
        <div className="relative bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] p-8 text-center text-white">
          <div className="absolute top-4 right-4 flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/15 backdrop-blur mb-4">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{current.title}</h2>
          <p className="text-white/85 mt-3 text-[15px] leading-relaxed">{current.body}</p>
        </div>
        <div className="p-5 bg-card flex flex-col gap-2">
          <Button
            onClick={next}
            className="w-full h-12 rounded-xl font-semibold bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 shadow-md shadow-[#5A1DE6]/25"
          >
            {step < STEPS.length - 1 ? (
              <>
                {current.cta}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                {current.cta}
              </>
            )}
          </Button>
          {step === STEPS.length - 1 && (
            <Link href="/groups/new" onClick={finish}>
              <Button variant="ghost" className="w-full h-11 rounded-xl text-sm text-muted-foreground">
                Create my first group now
              </Button>
            </Link>
          )}
          {step < STEPS.length - 1 && (
            <button
              onClick={finish}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Skip intro
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
