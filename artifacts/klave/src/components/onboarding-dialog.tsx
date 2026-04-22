import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Sparkles, Wallet as WalletIcon, ArrowRight, Check, GraduationCap, Users, Loader2, AtSign, X } from "lucide-react";
import { Link } from "wouter";
import { useGetCurrentUser, useUpdateCurrentUser, customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
type CheckResp = { available: boolean; reason: "ok" | "self" | "taken" | "invalid" };

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
  const [step, setStep] = useState<"role" | "username" | number>("role");
  const [savingRole, setSavingRole] = useState<"creator" | "student" | null>(null);
  const [username, setUsername] = useState("");
  const [checkState, setCheckState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [savingUsername, setSavingUsername] = useState(false);
  const checkSeqRef = useRef(0);

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

  const goAfterRole = () => {
    // If the user already has a username (e.g. they're going through onboarding
    // a second time after clearing localStorage), skip straight to the intro.
    const existing = ((user as any)?.username as string | null) || "";
    setStep(existing ? 0 : "username");
  };

  const pickRole = (role: "creator" | "student") => {
    if (savingRole) return;
    setSavingRole(role);
    updateProfile.mutate({ data: { role } as any }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(['/api/users/me'], updated);
        setSavingRole(null);
        goAfterRole();
      },
      onError: () => {
        setSavingRole(null);
        // Still let them through — we don't want to block onboarding on a network blip.
        goAfterRole();
      },
    });
  };

  // Live availability check, debounced.
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) { setCheckState("idle"); return; }
    if (!USERNAME_RE.test(trimmed)) { setCheckState("invalid"); return; }
    setCheckState("checking");
    const seq = ++checkSeqRef.current;
    const t = setTimeout(async () => {
      try {
        const resp = await customFetch<CheckResp>(`/api/users/check-username?u=${encodeURIComponent(trimmed)}`, { method: "GET" });
        if (seq !== checkSeqRef.current) return;
        setCheckState(resp.available ? "ok" : (resp.reason === "invalid" ? "invalid" : "taken"));
      } catch {
        if (seq !== checkSeqRef.current) return;
        setCheckState("idle");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const submitUsername = () => {
    const trimmed = username.trim();
    if (!trimmed || !USERNAME_RE.test(trimmed) || checkState === "taken" || savingUsername) return;
    setSavingUsername(true);
    updateProfile.mutate({ data: { username: trimmed } as any }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(['/api/users/me'], updated);
        setSavingUsername(false);
        setStep(0);
      },
      onError: () => {
        setSavingUsername(false);
        setCheckState("taken");
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
        {step === "username" ? (
          <div className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] p-7 text-white">
            <div className="text-center mb-5">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-white/15 backdrop-blur items-center justify-center mb-3">
                <AtSign className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Pick a username</h2>
              <p className="text-white/85 mt-2 text-sm">
                Friends can find you by name, email or @username. You can change it later.
              </p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                <Input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@+/, ""))}
                  maxLength={20}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="yourname"
                  className="h-12 pl-9 pr-10 bg-white/10 border-white/30 text-white placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-white/40 rounded-xl text-base"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkState === "checking" && <Loader2 className="h-4 w-4 animate-spin text-white/70" />}
                  {checkState === "ok" && <Check className="h-4 w-4 text-emerald-300" />}
                  {(checkState === "taken" || checkState === "invalid") && <X className="h-4 w-4 text-red-300" />}
                </div>
              </div>
              <p className="text-[12px] text-white/75 min-h-[18px]">
                {checkState === "taken"
                  ? "That username is taken. Try another."
                  : checkState === "invalid"
                    ? "3–20 letters, numbers or underscore."
                    : checkState === "ok"
                      ? "Looks good — that one's yours."
                      : "3–20 letters, numbers or underscore."}
              </p>
              <Button
                onClick={submitUsername}
                disabled={savingUsername || checkState !== "ok"}
                className="w-full h-12 rounded-xl font-semibold bg-white text-[#3A0CA3] hover:bg-white/90 disabled:opacity-50"
              >
                {savingUsername ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving</>
                ) : (
                  <>Continue<ArrowRight className="ml-1.5 h-4 w-4" /></>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="w-full text-center text-xs text-white/70 hover:text-white py-1"
              >
                Skip for now
              </button>
            </div>
          </div>
        ) : step === "role" ? (
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
