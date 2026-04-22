import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useGetCurrentUser, useUpdateCurrentUser, customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2, GraduationCap, Users, Camera, AtSign, X } from "lucide-react";
import { AvatarCropUploader, useAvatarFilePicker } from "@/components/avatar-uploader";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

type CheckResp = { available: boolean; reason: "ok" | "self" | "taken" | "invalid" };

export default function ProfileEditPage() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetCurrentUser();
  const updateProfile = useUpdateCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: clerkUser } = useUser();

  // Avatar upload state. We hold the picked file separately from the dialog
  // open flag so the dialog mounts cleanly each time and revokes its blob URL.
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [localAvatarOverride, setLocalAvatarOverride] = useState<string | null>(null);
  const { open: openFilePicker, input: fileInput } = useAvatarFilePicker((f) => {
    setPickedFile(f);
    setCropOpen(true);
  });

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState<"creator" | "student">("student");
  const [hydrated, setHydrated] = useState(false);

  const [checkState, setCheckState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const checkSeqRef = useRef(0);

  useEffect(() => {
    if (user && !hydrated) {
      setName(user.name || "");
      setUsername(((user as any).username as string | null) || "");
      setBio(user.bio || "");
      setRole((user.role as any) === "creator" ? "creator" : "student");
      setHydrated(true);
    }
  }, [user, hydrated]);

  // Live availability check, debounced. Invalid client-side patterns short-circuit
  // before we hit the network.
  useEffect(() => {
    const trimmed = username.trim();
    const original = ((user as any)?.username as string | null) || "";
    if (!trimmed) {
      setCheckState("idle");
      return;
    }
    if (!USERNAME_RE.test(trimmed)) {
      setCheckState("invalid");
      return;
    }
    if (trimmed.toLowerCase() === original.toLowerCase()) {
      setCheckState("ok");
      return;
    }
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
  }, [username, user]);

  const originalUsername = ((user as any)?.username as string | null) || "";
  const usernameChanged = username.trim() !== originalUsername;
  const usernameOk = !usernameChanged || (USERNAME_RE.test(username.trim()) && checkState === "ok");

  const dirty = !!user && (
    name !== (user.name || "") ||
    bio !== (user.bio || "") ||
    role !== ((user.role as any) === "creator" ? "creator" : "student") ||
    usernameChanged
  );

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !dirty) return;
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (usernameChanged && username.trim() && !USERNAME_RE.test(username.trim())) {
      toast({ title: "Invalid username", description: "3–20 letters, numbers or underscore.", variant: "destructive" });
      return;
    }
    if (usernameChanged && checkState === "taken") {
      toast({ title: "Username taken", description: "Try a different one.", variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = { name: name.trim(), bio: bio.trim(), role };
    if (usernameChanged) payload.username = username.trim() || null;

    updateProfile.mutate({ data: payload as any }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(['/api/users/me'], updated);
        toast({ title: "Profile updated", description: "Your changes have been saved." });
        setLocation("/profile");
      },
      onError: (err: any) => {
        const msg = err?.message?.includes("taken") ? "That username is taken." : "Please check your connection and try again.";
        toast({ title: "Couldn't save", description: msg, variant: "destructive" });
      },
    });
  };

  const handleChangePicture = () => openFilePicker();

  // After upload: optimistically show the new image, then PATCH the URL onto
  // the user record. We store an ABSOLUTE URL in the DB (prefixed with the
  // API origin) because the frontend is hosted on Vercel while the API lives
  // on Render — relative `/api/...` paths would 404 in production.
  const handleAvatarUploaded = (_objectPath: string, servingUrl: string) => {
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
    const absoluteUrl = apiBase ? `${apiBase}${servingUrl}` : servingUrl;
    setLocalAvatarOverride(absoluteUrl);
    updateProfile.mutate(
      { data: { avatarUrl: absoluteUrl } as any },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(['/api/users/me'], updated);
          toast({ title: "Photo updated" });
        },
        onError: () => {
          setLocalAvatarOverride(null);
          toast({
            title: "Couldn't save photo",
            description: "The image uploaded but we couldn't save it to your profile. Try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const avatarSrc = localAvatarOverride || user?.avatarUrl || clerkUser?.imageUrl || undefined;
  const initial = (name?.[0] || user?.name?.[0] || "K").toUpperCase();

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
          disabled={!dirty || !usernameOk || updateProfile.isPending || isLoading}
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
        <section className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleChangePicture}
            className="relative group focus:outline-none"
            aria-label="Change profile picture"
          >
            <span className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-[#5A1DE6] to-[#F59E0B]" />
            <Avatar className="relative h-[88px] w-[88px] ring-2 ring-background">
              <AvatarImage src={avatarSrc} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white text-3xl font-bold">{initial}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Camera className="h-4 w-4" />
            </span>
          </button>
          <button
            type="button"
            onClick={handleChangePicture}
            className="text-[13px] font-semibold text-[#5A1DE6] dark:text-[#9F75FF] hover:underline"
          >
            Change picture
          </button>
        </section>

        <section className="space-y-2">
          <Label htmlFor="name" className="font-semibold text-foreground text-sm">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="h-12 rounded-xl border-border/60 text-base"
            placeholder="Your full name"
          />
        </section>

        <section className="space-y-2">
          <Label htmlFor="username" className="font-semibold text-foreground text-sm">Username</Label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/^@+/, ""))}
              disabled={isLoading}
              maxLength={20}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 pl-9 pr-10 rounded-xl border-border/60 text-base"
              placeholder="yourname"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checkState === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {checkState === "ok" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              {(checkState === "taken" || checkState === "invalid") && <X className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {checkState === "taken"
              ? "That username is taken."
              : checkState === "invalid"
                ? "3–20 letters, numbers or underscore."
                : "Friends can find you by name, email or @username."}
          </p>
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
          Tap <span className="font-semibold text-foreground">Save</span> at the top when you're done.
        </p>
      </form>

      {fileInput}
      <AvatarCropUploader
        open={cropOpen}
        file={pickedFile}
        onClose={() => { setCropOpen(false); setPickedFile(null); }}
        onUploaded={handleAvatarUploaded}
        onError={(msg) => toast({ title: "Upload failed", description: msg, variant: "destructive" })}
      />
    </div>
  );
}
