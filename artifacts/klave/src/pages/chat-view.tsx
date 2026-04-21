import { useGetGroup, useGetGroupStats, useListMessages, useSendMessage, useDeleteMessage, useReplicateLecture, useListGroups, useGetCurrentUser, getListMessagesQueryKey, getListReplicationJobsQueryKey } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, Send, Sparkles, Image as ImageIcon, Trash2, Copy, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ChatViewPage() {
  const { id } = useParams();
  const groupId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: user } = useGetCurrentUser();
  const { data: group, isLoading: isLoadingGroup } = useGetGroup(groupId, { 
    query: { enabled: !!groupId } as any
  });
  
  const { data: stats } = useGetGroupStats(groupId, { query: { enabled: !!groupId } as any });
  
  const { data: messages, isLoading: isLoadingMessages } = useListMessages(
    { groupId, limit: 100 },
    { query: { enabled: !!groupId, refetchInterval: 3000 } as any }
  );
  
  const [, setLocation] = useLocation();

  const { data: groups } = useListGroups({ creatorId: user?.id }, { query: { enabled: !!user } as any });

  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const replicateLecture = useReplicateLecture();

  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [replicateMessageId, setReplicateMessageId] = useState<number | null>(null);
  const [targetGroupIds, setTargetGroupIds] = useState<number[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || !user || !groupId) return;
    
    sendMessage.mutate({
      data: {
        groupId,
        senderId: user.id,
        content: content.trim(),
        type: "text"
      }
    }, {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey({ groupId }) });
      }
    });
  };

  const handleDelete = (msgId: number) => {
    deleteMessage.mutate({ id: msgId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey({ groupId }) });
      }
    });
  };

  const handleReplicate = () => {
    if (!replicateMessageId || targetGroupIds.length === 0 || !user) return;
    
    replicateLecture.mutate({
      data: {
        sourceGroupId: groupId,
        messageId: replicateMessageId,
        targetGroupIds,
        creatorId: user.id
      }
    }, {
      onSuccess: () => {
        toast({ title: "AI Replication started", description: "Your lecture is being adapted and sent to target classes." });
        setReplicateMessageId(null);
        setTargetGroupIds([]);
        queryClient.invalidateQueries({ queryKey: getListReplicationJobsQueryKey({ creatorId: user.id }) });
      }
    });
  };

  if (isLoadingGroup) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <header className="h-16 border-b border-border/50 flex items-center px-4 gap-3 bg-card/90 backdrop-blur-md">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </header>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-12 w-2/3 rounded-2xl rounded-tl-none" />
          <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tr-none self-end ml-auto" />
        </div>
      </div>
    );
  }

  if (!group) {
    return <div className="p-8 text-center text-destructive">Class not found</div>;
  }

  const isCreator = user?.id === group.creatorId;
  const otherGroups = groups?.filter(g => g.id !== groupId) || [];

  return (
    <div className="flex flex-col h-[100dvh] bg-[hsl(258,30%,97%)] relative overflow-hidden">
      {/* Subtle purple-dot background pattern */}
      <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%235A1DE6\" fill-opacity=\"0.06\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"2\"/%3E%3Ccircle cx=\"5\" cy=\"5\" r=\"1\"/%3E%3Ccircle cx=\"55\" cy=\"55\" r=\"1\"/%3E%3Ccircle cx=\"15\" cy=\"45\" r=\"1\"/%3E%3Ccircle cx=\"45\" cy=\"15\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>

      <header className="h-[68px] flex items-center justify-between px-2 bg-white/80 backdrop-blur-xl border-b border-white/40 shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link href="/chats" className="p-2 rounded-full hover:bg-muted text-foreground transition-colors flex items-center shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div onClick={() => setLocation(`/groups/${group.id}`)} className="flex items-center gap-3 cursor-pointer p-1 rounded-xl hover:bg-muted transition-colors min-w-0 flex-1">
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={group.coverImageUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white font-bold">{group.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-base font-semibold leading-tight truncate">{group.name}</h2>
              <span className="text-xs text-muted-foreground mt-0.5 truncate">
                <span className="text-emerald-600 font-medium">● Active</span> • {stats?.memberCount || group.memberCount || 1} members
              </span>
            </div>
          </div>
        </div>
        {isCreator && (
          <Button variant="ghost" size="icon" className="text-[#5A1DE6] hover:text-[#5A1DE6] hover:bg-[#5A1DE6]/10 mr-2 shrink-0" onClick={() => toast({ title: "AI Replicate", description: "Hover or long-press a message to replicate it." })}>
            <Sparkles className="h-5 w-5" />
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10 pb-20">
        {isLoadingMessages ? (
          <div className="flex justify-center p-4">
            <div className="bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-muted-foreground shadow-sm">
              Loading messages...
            </div>
          </div>
        ) : messages?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="bg-card/80 backdrop-blur-md p-6 rounded-2xl shadow-sm text-center max-w-[280px]">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary opacity-80" />
              <h3 className="font-semibold text-foreground mb-1">Start the discussion</h3>
              <p className="text-sm text-muted-foreground">Share property insights, market updates, or course materials here.</p>
            </div>
          </div>
        ) : (
          messages?.map((msg, idx) => {
            const isMe = msg.senderId === user?.id;
            const showTail = idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId;
            
            return (
              <div key={msg.id} className={`flex gap-2 max-w-[85%] group/msg ${isMe ? "ml-auto flex-row-reverse" : ""}`}>
                {!isMe && showTail && (
                  <Avatar className="h-8 w-8 shrink-0 mt-auto shadow-sm">
                    <AvatarImage src={msg.sender?.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{msg.sender?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                {!isMe && !showTail && <div className="w-8 shrink-0" />}
                
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (idx === 0 || messages[idx - 1]?.senderId !== msg.senderId) && (
                    <span className="text-xs font-semibold text-accent ml-2 mb-1 drop-shadow-sm">{msg.sender?.name}</span>
                  )}
                  
                  <div className="flex items-center gap-2 relative">
                    {isMe && (
                      <div className="flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/80 shadow-sm text-muted-foreground hover:text-destructive hover:bg-background" onClick={() => handleDelete(msg.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {isCreator && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background/80 shadow-sm text-muted-foreground hover:text-primary hover:bg-background" onClick={() => setReplicateMessageId(msg.id)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div
                      className={`px-3.5 py-2 text-[15px] shadow-sm relative ${
                        isMe
                          ? "bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white shadow-[#5A1DE6]/20"
                          : "bg-white text-foreground"
                      } ${
                        showTail && isMe ? "rounded-l-2xl rounded-tr-2xl rounded-br-sm" :
                        showTail && !isMe ? "rounded-r-2xl rounded-tl-2xl rounded-bl-sm" : "rounded-2xl"
                      }`}
                      style={{
                        wordBreak: 'break-word'
                      }}
                    >
                      <span className="leading-relaxed">{msg.content}</span>

                      <div className="flex justify-end items-center gap-1 mt-1 -mb-0.5 min-w-[50px]">
                        <span className={`text-[10px] inline-block text-right w-full ${isMe ? "text-white/70" : "text-black/40"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <svg viewBox="0 0 16 11" width="16" height="11" className="text-white/90 shrink-0">
                            <path fill="currentColor" d="M11.83 1.01L10.37.03a.58.58 0 0 0-.82.16L5.43 6.6 3.12 3.84a.58.58 0 0 0-.82-.07l-1.35 1.1a.58.58 0 0 0-.08.82l3.41 4.1a.58.58 0 0 0 .85.05l7-9.01a.58.58 0 0 0-.16-.83zM15.42 1.01l-1.46-.98a.58.58 0 0 0-.82.16l-3.32 4.27 1.34 1.13 3.42-4.4a.58.58 0 0 0-.16-.83l-.01.01zM7.22 10.3l-1.34-1.13-1.63 2.1a.58.58 0 0 0 .85.05l2.27-2.73-.01.01z"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-2 pt-2 pb-3 bg-white/80 backdrop-blur-xl border-t border-white/40 z-20">
        <form onSubmit={handleSend} className="flex items-end gap-2 max-w-screen-md mx-auto">
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-11 w-11 text-muted-foreground hover:text-[#5A1DE6] hover:bg-[#5A1DE6]/10 rounded-full" aria-label="Attach">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <div className="flex-1 bg-white rounded-2xl flex items-end min-h-[44px] max-h-[140px] overflow-hidden focus-within:ring-2 focus-within:ring-[#5A1DE6]/40 shadow-sm border border-border/60 px-1">
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message"
              rows={1}
              className="border-0 bg-transparent shadow-none focus:outline-none focus-visible:ring-0 px-3 py-2.5 w-full text-[15px] resize-none leading-tight"
              autoComplete="off"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!content.trim() || sendMessage.isPending}
            className={`shrink-0 h-11 w-11 rounded-full transition-all bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 shadow-md shadow-[#5A1DE6]/30 ${content.trim() ? "scale-100 opacity-100" : "opacity-60 scale-90"}`}
          >
            <Send className="h-5 w-5 ml-0.5" />
          </Button>
        </form>
      </div>

      {/* AI Replicate Dialog */}
      <Dialog open={!!replicateMessageId} onOpenChange={(open) => !open && setReplicateMessageId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Lecture Replication
            </DialogTitle>
            <DialogDescription>
              Select target classes. Our AI will adapt the tone and context for each specific class.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
            {otherGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">You don't have any other classes to replicate to.</p>
            ) : (
              otherGroups.map(g => (
                <div key={g.id} className="flex items-center space-x-3 space-y-0 p-3 border border-border rounded-xl">
                  <Checkbox 
                    id={`group-${g.id}`} 
                    checked={targetGroupIds.includes(g.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setTargetGroupIds([...targetGroupIds, g.id]);
                      else setTargetGroupIds(targetGroupIds.filter(id => id !== g.id));
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`group-${g.id}`} className="text-sm font-medium leading-none cursor-pointer">
                      {g.name}
                    </label>
                    <p className="text-xs text-muted-foreground">{g.memberCount} students</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplicateMessageId(null)}>Cancel</Button>
            <Button onClick={handleReplicate} disabled={targetGroupIds.length === 0 || replicateLecture.isPending} className="gap-2">
              {replicateLecture.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Replicate to {targetGroupIds.length} classes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
