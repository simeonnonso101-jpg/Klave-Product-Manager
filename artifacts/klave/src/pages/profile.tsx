import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { useGetCurrentUser, useUpdateCurrentUser } from "@workspace/api-client-react";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, LogOut, Wallet, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { data: user, isLoading } = useGetCurrentUser();
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
      data: {
        name,
        bio,
      }
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
  const roleBadge = user?.role === 'creator' ? 'Creator' : 'Student';

  return (
    <MainLayout>
      <div className="flex flex-col h-full bg-background">
        <header className="px-4 pt-10 pb-4 sticky top-0 z-10 bg-background/90 backdrop-blur-md">
          <h1 className="text-[28px] font-bold tracking-tight">Profile</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <Avatar className="h-24 w-24 border-2 border-primary shadow-sm">
              <AvatarImage src={clerkUser?.imageUrl || user?.avatarUrl || undefined} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initial}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground">{user?.name || clerkUser?.fullName || 'Loading...'}</h2>
              <p className="text-muted-foreground text-sm">{user?.email || clerkUser?.primaryEmailAddress?.emailAddress}</p>
            </div>
            {user && (
              <Badge variant={user.role === 'creator' ? 'default' : 'secondary'} className="mt-1 px-3 py-1 font-semibold uppercase tracking-wider text-[10px]">
                {roleBadge}
              </Badge>
            )}
          </div>

          {/* Edit Profile Form */}
          <Card className="border-border shadow-sm rounded-3xl overflow-hidden bg-card">
            <CardHeader className="pb-4 pt-6 bg-muted/30">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4" /> Personal Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold text-foreground">Full Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="h-12 rounded-xl"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="font-semibold text-foreground">Bio</Label>
                  <Textarea 
                    id="bio" 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    className="min-h-[100px] resize-none rounded-xl"
                    placeholder="Tell us about your real estate journey..."
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending || isLoading} 
                  className="w-full h-12 rounded-xl font-bold text-base shadow-sm"
                >
                  {updateProfile.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card className="border-border shadow-sm rounded-3xl overflow-hidden bg-card">
            <CardHeader className="pb-4 pt-6 bg-muted/30">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Mail className="w-4 h-4" /> Account
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Email Address</p>
                <p className="text-[15px] text-muted-foreground">{clerkUser?.primaryEmailAddress?.emailAddress}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => openUserProfile()} 
                className="w-full h-12 rounded-xl font-semibold border-border hover:bg-muted"
              >
                Manage Clerk Account
              </Button>
            </CardContent>
          </Card>

          {/* Wallet Summary Snippet */}
          {user?.role === 'creator' && (
             <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-primary text-primary-foreground">
               <CardContent className="p-5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="bg-primary-foreground/20 p-3 rounded-full">
                     <Wallet className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-widest mb-0.5">Wallet Balance</p>
                     <p className="text-2xl font-bold">${user?.walletBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
          )}

          {/* Sign Out */}
          <div className="pt-4">
            <Button 
              variant="destructive" 
              onClick={() => signOut()} 
              className="w-full h-12 rounded-xl font-bold text-base shadow-sm bg-destructive hover:bg-destructive/90"
            >
              <LogOut className="mr-2 h-5 w-5" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
