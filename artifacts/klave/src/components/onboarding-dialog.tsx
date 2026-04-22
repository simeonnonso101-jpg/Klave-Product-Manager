import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Wallet as WalletIcon, ArrowRight, Check, GraduationCap, Users, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useGetCurrentUser, useUpdateCurrentUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "klave_onboarded_v2";

const STEPS = [
  {
    icon: MessageCircle,
    title: "Welcome to Klave",
    body: "Klave is a chat-first platform for course creators and their students. Teach and learn inside groups that feel just like the chats you already love.",
    cta: "Next",
  },
  {
    icon: WalletIcon,
    title: "Get paid instantly",
    body: "Open a free or paid class. The moment a student joins, money lands in your in-app wallet — no waiting, no schedules.",
    cta: "Next",
  },
  {
    icon: Sparkles,
    title: "Scale with AI",
    body: "Record one lesson. Klave's AI re-tones it for every other class you pick — so you can teach hundreds without copy-pasting.",
    cta: "Let's go",
  },
];

export function OnboardingDialog() {
  const { data: user } = useGetCurrentUser();
  const updateProfile = useUpdateCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"role" | number>("role");
  const [savingRole, setSavingRole] = useState<"creator" | "student" | null>(null);

  useEffect(() => {
    if (!user) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        t = setTimeout(() => setOpen(true), 500);
      }
    } catch {
      // ignore
    }
    return () => { if (t) clearTimeout(t); };
  }, [user]);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setOpen(false);
  };

  const pickRole = (role: "creator" | "student") => {
    if (savingRole) return;
    setSavingRole(role);
    updateProfile.mutate({ data: { role } as any }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(['/api/users/me'], updated);
        setSavingRole(null);
        setStep(0);
      },
      onError: () => {
        setSavingRole(null);
        // Still let them through — we don't want to block onboarding on a network blip.
        setStep(0);
      },
    });
  };

  const next = () => {
    if (typeof step !== "number") return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-0 rounded-3xl">
        {step === "role" ? (
          <div className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] p-7 text-white">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight">First — who are you?</h2>
              <p className="text-white/85 mt-2 text-sm">Pick what fits you. You can switch later in your profile.</p>
            </div>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => pickRole("creator")}
                disabled={!!savingRole}
                className="group relative bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/20 rounded-2xl p-4 text-left transition-all disabled:opacity-60 flex items-center gap-4"
              >
                <div className="h-12 w-12 rounded-xl bg-white text-[#3A0CA3] flex items-center justify-center shrink-0 shadow-lg">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base">I'm here to teach</div>
                  <div className="text-xs text-white/75 mt-0.5">Create classes, sell access, and grow your audience.</div>
                </div>
                {savingRole === "creator" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white shrink-0" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-white/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => pickRole("student")}
                disabled={!!savingRole}
                className="group relative bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/20 rounded-2xl p-4 text-left transition-all disabled:opacity-60 flex items-center gap-4"
              >
                <div className="h-12 w-12 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base">I'm here to learn</div>
                  <div className="text-xs text-white/75 mt-0.5">Join classes, ask questions, and learn from creators.</div>
                </div>
                {savingRole === "student" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white shrink-0" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-white/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
                )}
              </button>
            </div>
          </div>
        ) : (() => {
          const current = STEPS[step];
          const Icon = current.icon;
          return (
            <>
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
                    <>{current.cta}<ArrowRight className="ml-1.5 h-4 w-4" /></>
                  ) : (
                    <><Check className="mr-1.5 h-4 w-4" />{current.cta}</>
                  )}
                </Button>
                {step === STEPS.length - 1 && user?.role === 'creator' && (
                  <Link href="/groups/new" onClick={finish}>
                    <Button variant="ghost" className="w-full h-11 rounded-xl text-sm text-muted-foreground">
                      Create my first class now
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
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
