import { useGetGroup, useGetGroupStats, useListGroupMembers, useGetCurrentUser, useCreatePayment, useAddGroupMember, useUpdateGroup, useListUsers, getGetGroupQueryKey, getListGroupMembersQueryKey, getListGroupsQueryKey, customFetch } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, ShieldCheck, CreditCard, Settings, Loader2, UserPlus, MessageCircle, BookOpen, Plus, PlayCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import defaultImg1 from "../assets/course-1.png";
import defaultImg2 from "../assets/course-2.png";
import defaultImg3 from "../assets/course-3.png";

export default function GroupDetailPage() {
  const { id } = useParams();
  const groupId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user } = useGetCurrentUser();
  const { data: group, isLoading: isLoadingGroup } = useGetGroup(groupId, { query: { enabled: !!groupId } as any });
  const { data: stats } = useGetGroupStats(groupId, { query: { enabled: !!groupId } as any });
  const { data: members, isLoading: isLoadingMembers } = useListGroupMembers(groupId, { query: { enabled: !!groupId } as any });
  
  const createPayment = useCreatePayment();
  const addMember = useAddGroupMember();
  const updateGroup = useUpdateGroup();
  const { data: users } = useListUsers({ query: { enabled: !!user } as any });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const [editData, setEditData] = useState({
    name: "",
    subject: "",
    description: "",
    price: "",
  });

  type Lesson = { id: number; title: string; position: number; isPublished: boolean; videoUrl: string | null };
  type LessonsResp = { lessons: Lesson[]; isPreview: boolean; total: number };

  const { data: lessonsData } = useQuery<LessonsResp>({
    queryKey: ["lessons", groupId],
    queryFn: () => customFetch<LessonsResp>(`/api/groups/${groupId}/lessons`, { method: "GET" }),
    enabled: !!groupId,
    retry: false,
  });

  const isMember = members?.some(m => m.userId === user?.id);
  const isCreator = user?.id === group?.creatorId;

  // Fetch student's wallet balance so we can offer "Pay from wallet" option
  const { data: walletSummary } = useQuery<{ availableBalance: number }>({
    queryKey: ["walletBalance", user?.id],
    queryFn: () => customFetch<{ availableBalance: number }>(`/api/wallet/summary?creatorId=${user?.id}`, { method: "GET" }),
    enabled: !!user?.id,
    retry: false,
  });
  const walletBalance = walletSummary?.availableBalance ?? 0;

  const getFallbackImage = (id: number) => {
    const images = [defaultImg1, defaultImg2, defaultImg3];
    return images[id % images.length];
  };

  // Initialize edit form when open
  const handleOpenEdit = () => {
    if (group) {
      setEditData({
        name: group.name,
        subject: group.subject || "",
        description: group.description || "",
        price: group.price ? group.price.toString() : "",
      });
      setIsEditOpen(true);
    }
  };

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    updateGroup.mutate({
      id: groupId,
      data: {
        name: editData.name,
        subject: editData.subject,
        description: editData.description,
        price: editData.price ? parseFloat(editData.price) : null
      }
    }, {
      onSuccess: () => {
        toast({ title: "Class updated successfully" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(groupId) });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
      }
    });
  };

  const handleInviteUser = (userId: number) => {
    addMember.mutate({
      id: groupId,
      data: { userId, role: "student" }
    }, {
      onSuccess: () => {
        toast({ title: "Student added successfully" });
        setIsInviteOpen(false);
        queryClient.invalidateQueries({ queryKey: getListGroupMembersQueryKey(groupId) });
      }
    });
  };

  const handleJoin = async () => {
    if (!user || !group) return;
    setIsProcessing(true);
    
    try {
      if (group.price && group.price > 0) {
        // Redirect to Paystack checkout
        const data = await customFetch<{ authorizationUrl: string; reference: string }>(
          "/api/payments/paystack/initialize",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: group.id }),
          }
        );
        // Full page redirect to Paystack hosted checkout
        window.location.href = data.authorizationUrl;
        return;
      } else {
        await addMember.mutateAsync({
          id: group.id,
          data: { userId: user.id, role: "student" }
        });
        toast({ title: "Joined class successfully!", description: `Welcome to ${group.name}!` });
      }
      
      queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(group.id) });
      setLocation(`/chat/${group.id}`);
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message ?? "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinWithWallet = async () => {
    if (!user || !group) return;
    setIsProcessing(true);
    try {
      await createPayment.mutateAsync({
        data: { userId: user.id, groupId: group.id, paymentMethod: "wallet" },
      });
      toast({ title: "Joined!", description: `₦${group.price} deducted from your wallet. Welcome to ${group.name}!` });
      queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(group.id) });
      queryClient.invalidateQueries({ queryKey: ["walletBalance", user.id] });
      setLocation(`/chat/${group.id}`);
    } catch (err: any) {
      toast({ title: "Wallet payment failed", description: err?.message ?? "Try paying with card instead.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingGroup) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <Skeleton className="h-[280px] w-full rounded-none" />
        <div className="p-4 space-y-4 -mt-10 relative z-10">
          <Skeleton className="h-28 w-full rounded-2xl shadow-sm" />
          <Skeleton className="h-40 w-full rounded-2xl shadow-sm" />
        </div>
      </div>
    );
  }

  if (!group) {
    return <div className="p-8 text-center text-destructive font-semibold">Group not found</div>;
  }

  const usersToInvite = users?.filter(u => u.id !== user?.id && !members?.some(m => m.userId === u.id)) || [];

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-y-auto pb-24">
      <div className="relative h-[280px] bg-muted w-full">
        <img 
          src={group.coverImageUrl || getFallbackImage(group.id)} 
          alt={group.name} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
        
        <Link href="/groups" className="absolute top-10 left-4 p-2.5 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors z-10 shadow-sm cursor-pointer">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {isCreator && (
          <Button 
            variant="secondary" 
            size="icon"
            className="absolute top-10 right-4 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 z-10 shadow-sm border-none"
            onClick={handleOpenEdit}
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
        
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-center gap-2 mb-2.5">
            <Badge className="bg-white text-black hover:bg-white border-none font-bold shadow-sm px-2.5 py-0.5">
              {group.price ? `$${group.price}` : "Free"}
            </Badge>
            {group.subject && (
              <Badge variant="outline" className="bg-black/30 backdrop-blur-md text-white border-white/20 px-2.5 py-0.5">
                {group.subject}
              </Badge>
            )}
          </div>
          <h1 className="text-[28px] font-bold text-white leading-tight drop-shadow-md">{group.name}</h1>
        </div>
      </div>

      <div className="p-4 space-y-5 -mt-2 relative z-10 bg-background rounded-t-2xl">
        {isMember ? (
          <Link href={`/chat/${group.id}`}>
            <Button className="w-full h-14 text-[17px] font-bold shadow-lg shadow-primary/20 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5" /> Go to Chat
            </Button>
          </Link>
        ) : (
          <div className="space-y-2">
            {/* Wallet payment option — show if user has sufficient balance and class has a price */}
            {group.price && group.price > 0 && walletBalance >= group.price && (
              <Button
                className="w-full h-14 text-[17px] font-bold shadow-lg rounded-2xl bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white hover:opacity-90 flex items-center justify-center gap-2"
                onClick={handleJoinWithWallet}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                Pay ₦{group.price} from Wallet
              </Button>
            )}
            {/* Wallet balance hint */}
            {group.price && group.price > 0 && walletBalance > 0 && walletBalance < group.price && (
              <p className="text-xs text-muted-foreground text-center">
                Wallet: ₦{walletBalance.toLocaleString()} — not enough. <a href="/wallet" className="text-[#5A1DE6] font-semibold hover:underline">Top up</a> or pay with card below.
              </p>
            )}
            {/* Card / Paystack button — always shown for paid classes; used for free classes too */}
            <Button
              className="w-full h-14 text-[17px] font-bold shadow-lg shadow-primary/20 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleJoin}
              disabled={isProcessing}
              variant={group.price && group.price > 0 && walletBalance >= group.price ? "outline" : "default"}
            >
              {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {group.price && group.price > 0 && walletBalance >= group.price
                ? "Pay with Card instead"
                : group.price ? `Pay ₦${group.price} to Join` : "Join for Free"}
            </Button>
          </div>
        )}

        {isCreator && (
          <Card className="bg-primary/5 border-primary/20 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex gap-4">
              <div className="flex-1">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Revenue</p>
                <p className="text-[22px] font-bold text-primary">${stats?.totalRevenue?.toLocaleString() || 0}</p>
              </div>
              <div className="w-px bg-border/50"></div>
              <div className="flex-1">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Messages</p>
                <p className="text-[22px] font-bold text-foreground">{stats?.messageCount?.toLocaleString() || 0}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-2 bg-card p-5 rounded-2xl border border-border shadow-sm">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
            <BookOpen className="h-5 w-5 text-muted-foreground" /> About this course
          </h3>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            {group.description || "Learn from this creator and connect with a community of students."}
          </p>
        </section>

        {/* Lessons section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              Lessons
              {lessonsData && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({lessonsData.total})
                </span>
              )}
            </h3>
            {isCreator && (
              <Link href={`/groups/${groupId}/lessons/new`}>
                <Button variant="ghost" size="sm" className="text-sm text-[#5A1DE6] dark:text-[#9F75FF] font-semibold h-8 px-2 gap-1 hover:bg-[#5A1DE6]/10">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </Link>
            )}
          </div>

          {!lessonsData ? null : lessonsData.lessons.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm font-semibold text-foreground">No lessons yet</p>
              {isCreator && (
                <Link href={`/groups/${groupId}/lessons/new`}>
                  <Button size="sm" className="mt-3 rounded-full bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90">
                    <Plus className="h-4 w-4 mr-1" /> Add first lesson
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border overflow-hidden">
              {lessonsData.lessons.map((lesson, idx) => (
                isMember || isCreator ? (
                  <Link key={lesson.id} href={`/groups/${groupId}/lessons/${lesson.id}`} className="block">
                    <div className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-[#5A1DE6]/10 text-[#5A1DE6] flex items-center justify-center shrink-0 text-sm font-bold">
                        {lesson.videoUrl
                          ? <PlayCircle className="h-4 w-4" />
                          : <span>{idx + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-foreground truncate leading-tight">{lesson.title}</p>
                        {!lesson.isPublished && (
                          <p className="text-[11px] text-amber-600 font-medium">Hidden</p>
                        )}
                      </div>
                      {lesson.videoUrl && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-[#5A1DE6]/30 text-[#5A1DE6]">Video</Badge>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div key={lesson.id} className="flex items-center gap-3 p-4 opacity-60">
                    <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <p className="text-[15px] font-semibold text-foreground truncate">{lesson.title}</p>
                  </div>
                )
              ))}
              {lessonsData.isPreview && lessonsData.total > lessonsData.lessons.length && (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {lessonsData.total - lessonsData.lessons.length} more lessons — join to unlock
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border shadow-sm p-4 rounded-2xl flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full mt-0.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Access</p>
              <p className="text-sm font-semibold text-foreground capitalize">{group.type}</p>
            </div>
          </div>
          <div className="bg-card border border-border shadow-sm p-4 rounded-2xl flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full mt-0.5">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Billing</p>
              <p className="text-sm font-semibold text-foreground capitalize">{group.subscriptionModel?.replace('_', '-') || 'One-time'}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" /> Members ({group.memberCount})
            </h3>
            {isCreator && (
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-sm text-primary font-semibold h-8 px-2 gap-1 hover:bg-primary/10">
                    <UserPlus className="h-4 w-4" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Students</DialogTitle>
                    <DialogDescription>Select users to manually add to your class.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                    {usersToInvite.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-xl">No users available to add.</p>
                    ) : (
                      usersToInvite.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 border border-border rounded-xl bg-card">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={u.avatarUrl || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">{u.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold">{u.name}</span>
                          </div>
                          <Button size="sm" variant="secondary" className="font-semibold shadow-sm" onClick={() => handleInviteUser(u.id)} disabled={addMember.isPending}>
                            Add
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border overflow-hidden">
            {isLoadingMembers ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : members?.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                    <AvatarImage src={member.user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {member.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[15px] font-semibold leading-tight">{member.user?.name || 'Unknown User'}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {member.role === 'creator' && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none font-bold uppercase tracking-wider px-2">Host</Badge>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Edit Group Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleUpdateGroup}>
            <DialogHeader>
              <DialogTitle>Edit Course Details</DialogTitle>
              <DialogDescription>Update the information for your class.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="font-semibold">Course Name</Label>
                <Input 
                  id="edit-name" 
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required 
                  className="rounded-xl h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-subject" className="font-semibold">Category</Label>
                  <Input 
                    id="edit-subject" 
                    value={editData.subject}
                    onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price" className="font-semibold">Price ($)</Label>
                  <Input 
                    id="edit-price" 
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.price}
                    onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                    className="rounded-xl h-11 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc" className="font-semibold">Description</Label>
                <Textarea 
                  id="edit-desc" 
                  rows={3}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="resize-none rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="rounded-xl shadow-md w-full" disabled={updateGroup.isPending || !editData.name}>
                {updateGroup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
