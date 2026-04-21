import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useGetCurrentUser, useUpdateCurrentUser, useListGroups } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, LogOut, Wallet, Mail, Users, BookOpen, Sparkles, ChevronRight } from "lucide-react";
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

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
    }
  }, [user]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    updateProfile.mutate({
      data: { name, bio }
    }, {
      onSuccess: (updatedUser) => {
        toast({ title: "Profile updated", description: "Your changes have been saved." });
        queryClient.setQueryData(['/api/users/me'], updatedUser);
      },
      onError: () => {
        toast({ title: "Update failed", description: "Failed to save profile changes.", variant: "destructive" });
      }
    });
  };

  const initial = (clerkUser?.firstName?.[0] || clerkUser?.username?.[0] || clerkUser?.primaryEmailAddress?.emailAddress?.[0] || "K").toUpperCase();
  const isCreator = user?.role === 'creator';
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';

  return (
    <MainLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Orange gradient hero header */}
        <div className="relative bg-gradient-to-br from-[#F59E0B] via-[#F59E0B] to-[#D97706] text-white pt-14 pb-20 px-4 sm:px-5 shadow-lg shadow-[#F59E0B]/25 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-60 h-60 rounded-full bg-[#5A1DE6]/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-white/50 shadow-xl ring-4 ring-white/15">
                <AvatarImage src={clerkUser?.imageUrl || user?.avatarUrl || undefined} className="object-cover" />
                <AvatarFallback className="bg-white/20 backdrop-blur text-white text-xl sm:text-2xl font-bold">{initial}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[#5A1DE6] text-[9px] sm:text-[10px] font-bold text-white shadow-md uppercase tracking-wider">
                {isCreator ? 'Pro' : 'Free'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight truncate">{user?.name || clerkUser?.fullName || 'Loading...'}</h1>
              <p className="text-white/85 text-xs sm:text-sm truncate mt-0.5">{user?.email || clerkUser?.primaryEmailAddress?.emailAddress}</p>
              <p className="text-white/70 text-[11px] sm:text-xs mt-0.5 sm:mt-1">Member since {memberSince}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-32 -mt-12">
          {/* Stats cards floating over header */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
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

          {/* Wallet card for creators */}
          {isCreator && (
            <Card className="border-none shadow-lg shadow-[#F59E0B]/20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white mb-4 sm:mb-5 relative">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
              <CardContent className="p-4 sm:p-5 relative">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-white/90" />
                      <p className="text-[11px] sm:text-xs font-semibold text-white/90 uppercase tracking-widest">Earnings</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold truncate">${user?.walletBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                    <p className="text-[11px] sm:text-xs text-white/80 mt-1">Available to withdraw</p>
                  </div>
                  <span className="inline-block w-3 h-3 rounded-full bg-white shadow-lg shadow-white/50 animate-pulse shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal info */}
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card mb-3 sm:mb-4">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center">
                <Settings className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">Personal Info</h3>
            </div>
            <CardContent className="p-4 sm:p-5 pt-3">
              <form onSubmit={handleUpdateProfile} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold text-foreground text-sm">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    className="min-h-[80px] sm:min-h-[88px] resize-none rounded-xl border-border/60"
                    placeholder="Tell us about your real estate journey..."
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateProfile.isPending || isLoading}
                  className="w-full h-11 rounded-xl font-bold text-base bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:opacity-90 border-0 shadow-md shadow-[#F59E0B]/30 text-white"
                >
                  {updateProfile.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account actions */}
          <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-card mb-3 sm:mb-4">
            <button
              onClick={() => openUserProfile()}
              className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-[#5A1DE6]/10 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#5A1DE6]" />
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
              className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-[#F59E0B]/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#F59E0B]" />
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
    <div className="bg-white rounded-2xl border border-border/60 shadow-md shadow-black/5 p-2.5 sm:p-3 flex flex-col items-center text-center min-w-0">
      <div className="h-7 w-7 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center mb-1 sm:mb-1.5">
        {icon}
      </div>
      <div className="text-base sm:text-lg font-bold text-foreground leading-tight truncate w-full">{value}</div>
      <div className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 truncate w-full">{label}</div>
    </div>
  );
}
