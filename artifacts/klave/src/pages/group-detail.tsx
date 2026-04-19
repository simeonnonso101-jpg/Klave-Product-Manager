import { useGetGroup, useGetGroupStats, useListGroupMembers, useGetCurrentUser, useCreatePayment, useAddGroupMember, useUpdateGroup, useListUsers, getGetGroupQueryKey, getListGroupMembersQueryKey, getListGroupsQueryKey } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, Users, ShieldCheck, CreditCard, ChevronRight, Settings, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function GroupDetailPage() {
  const { id } = useParams();
  const groupId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user } = useGetCurrentUser();
  const { data: group, isLoading: isLoadingGroup } = useGetGroup(groupId, { query: { enabled: !!groupId } });
  const { data: stats } = useGetGroupStats(groupId, { query: { enabled: !!groupId } });
  const { data: members, isLoading: isLoadingMembers } = useListGroupMembers(groupId, { query: { enabled: !!groupId } });
  
  const createPayment = useCreatePayment();
  const addMember = useAddGroupMember();
  const updateGroup = useUpdateGroup();
  const { data: users } = useListUsers({ query: { enabled: !!user } });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const [editData, setEditData] = useState({
    name: "",
    subject: "",
    description: "",
    price: "",
  });

  const isMember = members?.some(m => m.userId === user?.id);
  const isCreator = user?.id === group?.creatorId;

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
        toast({ title: "User invited successfully" });
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
        await createPayment.mutateAsync({
          data: {
            userId: user.id,
            groupId: group.id,
            paymentMethod: "wallet"
          }
        });
        toast({ title: "Payment successful!", description: "Welcome to the class." });
      } else {
        await addMember.mutateAsync({
          id: group.id,
          data: { userId: user.id, role: "student" }
        });
        toast({ title: "Joined class successfully!" });
      }
      
      queryClient.invalidateQueries({ queryKey: getGetGroupQueryKey(group.id) });
      setLocation(`/chat/${group.id}`);
    } catch (err) {
      toast({ title: "Action failed", description: "Please check your wallet balance and try again.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingGroup) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="p-4 space-y-4 -mt-10 relative z-10">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!group) {
    return <div className="p-8 text-center text-destructive">Group not found</div>;
  }

  const usersToInvite = users?.filter(u => u.id !== user?.id && !members?.some(m => m.userId === u.id)) || [];

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-y-auto pb-24">
      <div className="relative h-64 bg-muted w-full">
        {group.coverImageUrl ? (
          <img src={group.coverImageUrl} alt={group.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-muted flex items-center justify-center">
            <Users className="h-16 w-16 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        <Link href="/groups" className="absolute top-12 left-4 p-2 rounded-full bg-background/50 backdrop-blur-md text-foreground hover:bg-background/80 transition-colors z-10">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {isCreator && (
          <Button 
            variant="secondary" 
            size="icon"
            className="absolute top-12 right-4 rounded-full bg-background/50 backdrop-blur-md text-foreground hover:bg-background/80 z-10"
            onClick={handleOpenEdit}
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
        
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary text-primary-foreground border-none font-semibold">
              {group.price ? `$${group.price}` : "Free"}
            </Badge>
            {group.subject && (
              <Badge variant="outline" className="bg-background/50 backdrop-blur-sm border-border">
                {group.subject}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground leading-tight drop-shadow-md">{group.name}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isMember ? (
          <Link href={`/chat/${group.id}`}>
            <Button className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-xl">
              Open Chat
            </Button>
          </Link>
        ) : (
          <Button 
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" 
            onClick={handleJoin}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {group.price ? `Pay $${group.price} to Join` : "Join for Free"}
          </Button>
        )}

        {isCreator && (
          <Card className="bg-card border-border border-dashed bg-primary/5">
            <CardContent className="p-4 flex gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Revenue</p>
                <p className="text-xl font-bold text-emerald-500">${stats?.totalRevenue?.toLocaleString() || 0}</p>
              </div>
              <div className="w-px bg-border"></div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Messages</p>
                <p className="text-xl font-bold">{stats?.messageCount?.toLocaleString() || 0}</p>
              </div>
              <div className="w-px bg-border"></div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Active</p>
                <p className="text-xl font-bold">{stats?.activeMembers || 0}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            About this class
          </h3>
          <p className="text-muted-foreground leading-relaxed text-sm">
            {group.description || "No description provided."}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 p-3 rounded-xl flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Access</p>
              <p className="text-sm font-semibold capitalize">{group.type}</p>
            </div>
          </div>
          <div className="bg-muted/50 p-3 rounded-xl flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Billing</p>
              <p className="text-sm font-semibold capitalize">{group.subscriptionModel?.replace('_', '-') || 'One-time'}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Members ({group.memberCount})
            </h3>
            {isCreator && (
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-primary font-medium h-8 px-2 gap-1">
                    <UserPlus className="h-3.5 w-3.5" /> Invite
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Invite Students</DialogTitle>
                    <DialogDescription>Select users to manually add to your class.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {usersToInvite.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No users available to invite.</p>
                    ) : (
                      usersToInvite.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">{u.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{u.name}</span>
                          </div>
                          <Button size="sm" variant="secondary" onClick={() => handleInviteUser(u.id)} disabled={addMember.isPending}>
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
          
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {isLoadingMembers ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : members?.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {member.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{member.user?.name || 'Unknown User'}</span>
                </div>
                {member.role === 'creator' && (
                  <Badge variant="outline" className="text-[10px] border-primary text-primary">Creator</Badge>
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
              <DialogTitle>Edit Class Details</DialogTitle>
              <DialogDescription>Update the information for your class.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Class Name</Label>
                <Input 
                  id="edit-name" 
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subject</Label>
                <Input 
                  id="edit-subject" 
                  value={editData.subject}
                  onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price ($)</Label>
                <Input 
                  id="edit-price" 
                  type="number"
                  step="0.01"
                  min="0"
                  value={editData.price}
                  onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea 
                  id="edit-desc" 
                  rows={3}
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateGroup.isPending || !editData.name}>
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