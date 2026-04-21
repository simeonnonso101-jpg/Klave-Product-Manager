import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useGetCurrentUser, useUpdateCurrentUser, useListGroups } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, LogOut, Wallet, Mail, Users, BookOpen, Bell, ChevronRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { data: user, isLoading } = useGetCurrentUser();
  const { data: createdGroups } = useListGroups({ creatorId: user?.id }, { query: { enabled: !!user && user.role === 'creator' } as any });
  const { data: joinedGroups } = useListGroups({ memberId: user?.id }, { query: { enabled: !!user } as any });
  const updateProfile = useUpdateCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const userRef = useRef(user);
  const requestSeqRef = useRef(0);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (user && !initializedRef.current) {
      setName(user.name || "");
      setBio(user.bio || "");
      initializedRef.current = true;
    }
  }, [user]);

  // Silent auto-save: debounce 800ms after edit, save in the background.
  // Uses userRef to avoid stale closures and a request seq to ignore out-of-order responses.
  useEffect(() => {
    if (!initializedRef.current) return;
    const liveUser = userRef.current;
    if (!liveUser) return;
    const currentName = liveUser.name || "";
    const currentBio = liveUser.bio || "";
    if (name === currentName && bio === currentBio) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSaveState("saving");
      const seq = ++requestSeqRef.current;
      updateProfile.mutate({ data: { name, bio } }, {
        onSuccess: (updatedUser) => {
          // Ignore stale responses (a newer save was issued)
          if (seq !== requestSeqRef.current) return;
          queryClient.setQueryData(['/api/users/me'], updatedUser);
          setSaveState("saved");
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1800);
        },
        onError: () => {
          if (seq !== requestSeqRef.current) return;
          setSaveState("idle");
          toast({ title: "Couldn't save", description: "We'll try again — check your connection.", variant: "destructive" });
        }
      });
    }, 800);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, bio]);

  const initial = (clerkUser?.firstName?.[0] || clerkUser?.username?.[0] || clerkUser?.primaryEmailAddress?.emailAddress?.[0] || "K").toUpperCase();
  const isCreator = user?.role === 'creator';
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';

  return (
    <MainLayout>
      <div className="relative flex flex-col h-full bg-background overflow-hidden">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-[#5A1DE6]/20 to-[#3A0CA3]/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-32 w-72 h-72 rounded-full bg-gradient-to-tr from-[#F59E0B]/10 to-transparent blur-3xl" />

        {/* Header */}
        <header className="relative px-4 pt-14 pb-3 sticky top-0 z-10 bg-background/60 backdrop-blur-2xl border-b border-border/60">
          <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] bg-clip-text text-transparent">Profile</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B] mt-1" />
          </h1>
        </header>

        <div className="relative flex-1 overflow-y-auto px-4 pt-5 pb-32 space-y-5">
          {/* Identity card */}
          <Card className="border-border/60 shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-card via-card to-[#5A1DE6]/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <span className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-[#5A1DE6] to-[#F59E0B]" />
                  <Avatar className="relative h-[72px] w-[72px] ring-2 ring-background">
                    <AvatarImage src={clerkUser?.imageUrl || user?.avatarUrl || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white text-2xl font-bold">{initial}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-foreground leading-tight truncate">{user?.name || clerkUser?.fullName || 'Loading...'}</h2>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{user?.email || clerkUser?.primaryEmailAddress?.emailAddress}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-[#5A1DE6]/30">
                      {isCreator ? 'Pro Creator' : 'Free'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Since {memberSince}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<BookOpen className="w-4 h-4" />}
              label={isCreator ? 'Classes' : 'Joined'}
              value={isCreator ? (createdGroups?.length ?? 0) : (joinedGroups?.length ?? 0)}
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label={isCreator ? 'Students' : 'Active'}
              value={isCreator
                ? (createdGroups?.reduce((s, g) => s + (g.memberCount || 0), 0) ?? 0)
                : (joinedGroups?.length ?? 0)}
            />
            <StatCard
              icon={<Wallet className="w-4 h-4" />}
              label="Wallet"
              value={`$${user?.walletBalance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}`}
            />
          </div>

          {/* Personal info — auto-saves silently as you type */}
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#5A1DE6]/10 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-[#5A1DE6] dark:text-[#9F75FF]" />
                </div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Personal Info</h3>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold transition-opacity duration-300" aria-live="polite">
                {saveState === "saving" && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving
                  </span>
                )}
                {saveState === "saved" && (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </div>
            <CardContent className="p-5 pt-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold text-foreground text-sm">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="h-11 rounded-xl border-border/60"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="font-semibold text-foreground text-sm">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[88px] resize-none rounded-xl border-border/60"
                    placeholder="Tell us about your real estate journey..."
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Changes save automatically as you type.</p>
              </div>
            </CardContent>
          </Card>

          {/* Account actions */}
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card">
            <button
              onClick={() => openUserProfile()}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-[#5A1DE6]/10 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#5A1DE6] dark:text-[#9F75FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm">Account & Security</div>
                <div className="text-xs text-muted-foreground truncate">{clerkUser?.primaryEmailAddress?.emailAddress}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
            <div className="border-t border-border/60" />
            <button
              onClick={() => toast({ title: "Coming soon", description: "Notification preferences will be available soon." })}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-[#5A1DE6]/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-[#5A1DE6] dark:text-[#9F75FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm">Notifications</div>
                <div className="text-xs text-muted-foreground truncate">Manage what you get notified about</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          </Card>

          {/* Sign out */}
          <Button
            variant="outline"
            onClick={async () => { await signOut(); }}
            className="w-full h-12 rounded-xl font-bold text-base border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="mr-2 h-5 w-5" /> Sign Out
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-3 flex flex-col items-center text-center min-w-0">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#5A1DE6]/15 to-[#3A0CA3]/10 text-[#5A1DE6] dark:text-[#9F75FF] flex items-center justify-center mb-1.5">
        {icon}
      </div>
      <div className="text-lg font-bold text-foreground leading-tight truncate w-full">{value}</div>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 truncate w-full">{label}</div>
    </div>
  );
}
