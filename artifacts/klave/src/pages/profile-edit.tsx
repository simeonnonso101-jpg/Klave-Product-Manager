import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useGetCurrentUser, useUpdateCurrentUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2, GraduationCap, Users } from "lucide-react";

export default function ProfileEditPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetCurrentUser();
  const updateProfile = useUpdateCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<"creator" | "student">("student");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (user && !hydrated) {
      setName(user.name || "");
      setBio(user.bio || "");
      setRole((user.role as any) === "creator" ? "creator" : "student");
      setHydrated(true);
    }
  }, [user, hydrated]);

  const dirty = !!user && (
    name !== (user.name || "") ||
    bio !== (user.bio || "") ||
    role !== ((user.role as any) === "creator" ? "creator" : "student")
  );

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !dirty) return;
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    updateProfile.mutate({ data: { name: name.trim(), bio: bio.trim(), role } as any }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(['/api/users/me'], updated);
        toast({ title: "Profile updated", description: "Your changes have been saved." });
        setLocation("/profile");
      },
      onError: () => {
        toast({ title: "Couldn't save", description: "Please check your connection and try again.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="relative flex flex-col h-[100dvh] bg-background">
      <header className="h-[64px] flex items-center gap-2 px-2 sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <Link href="/profile" className="p-2 rounded-full hover:bg-muted text-foreground transition-colors flex items-center shrink-0" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight flex-1 truncate">Edit profile</h1>
        <Button
          type="button"
          onClick={() => handleSave()}
          disabled={!dirty || updateProfile.isPending || isLoading}
          className="h-9 px-4 mr-2 rounded-full bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 disabled:opacity-50 shadow-sm shadow-[#5A1DE6]/20"
        >
          {updateProfile.isPending ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving</>
          ) : (
            <><Check className="h-4 w-4 mr-1.5" /> Save</>
          )}
        </Button>
      </header>

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-4 pt-6 pb-32 space-y-6 max-w-screen-md mx-auto w-full">
        <section className="space-y-2">
          <Label htmlFor="name" className="font-semibold text-foreground text-sm">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="h-12 rounded-xl border-border/60 text-base"
            placeholder="Your full name"
            autoFocus
          />
        </section>

        <section className="space-y-2">
          <Label htmlFor="bio" className="font-semibold text-foreground text-sm">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isLoading}
            maxLength={280}
            className="min-h-[120px] resize-none rounded-xl border-border/60 text-base"
            placeholder="Tell people what you teach or what you're learning."
          />
          <div className="flex justify-end">
            <span className="text-[11px] text-muted-foreground">{bio.length}/280</span>
          </div>
        </section>

        <section className="space-y-2">
          <Label className="font-semibold text-foreground text-sm">I'm using Klave to</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("creator")}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                role === "creator"
                  ? "border-[#5A1DE6] bg-[#5A1DE6]/5 shadow-md shadow-[#5A1DE6]/10"
                  : "border-border/60 hover:border-border bg-card"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2 ${
                role === "creator" ? "bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white" : "bg-muted text-muted-foreground"
              }`}>
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="font-bold text-sm">Teach</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Create and sell classes.</div>
            </button>

            <button
              type="button"
              onClick={() => setRole("student")}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                role === "student"
                  ? "border-[#F59E0B] bg-[#F59E0B]/5 shadow-md shadow-[#F59E0B]/10"
                  : "border-border/60 hover:border-border bg-card"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2 ${
                role === "student" ? "bg-[#F59E0B] text-white" : "bg-muted text-muted-foreground"
              }`}>
                <Users className="h-5 w-5" />
              </div>
              <div className="font-bold text-sm">Learn</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Join classes and learn.</div>
            </button>
          </div>
        </section>

        <p className="text-[12px] text-muted-foreground pt-2">
          Tap <span className="font-semibold text-foreground">Save</span> at the top when you're done. We'll bring you back to your profile.
        </p>
      </form>
    </div>
  );
}
