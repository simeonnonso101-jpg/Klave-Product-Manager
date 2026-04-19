import { useGetGroup, useListMessages, useSendMessage, useDeleteMessage, useReplicateLecture, useListGroups, useGetCurrentUser, getListMessagesQueryKey, getListReplicationJobsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
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
    query: { enabled: !!groupId } 
  });
  
  const { data: messages, isLoading: isLoadingMessages } = useListMessages(
    { groupId, limit: 100 },
    { query: { enabled: !!groupId, refetchInterval: 3000 } }
  );

  const { data: groups } = useListGroups({ creatorId: user?.id }, { query: { enabled: !!user } });

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
        <header className="h-16 border-b border-border flex items-center px-4 gap-3 bg-card/80 backdrop-blur-md">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </header>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-12 w-2/3 rounded-2xl rounded-tl-sm" />
          <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tr-sm self-end ml-auto" />
        </div>
      </div>
    );
  }

  if (!group) {
    return <div className="p-8 text-center text-destructive">Group not found</div>;
  }

  const isCreator = user?.id === group.creatorId;
  const otherGroups = groups?.filter(g => g.id !== groupId) || [];

  return (
    <div className="flex flex-col h-[100dvh] bg-background relative">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 sticky top-0 bg-card/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href={`/groups/${group.id}`} className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={group.coverImageUrl || undefined} />
              <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold leading-none">{group.name}</h2>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {group.memberCount} members • {group.price ? `$${group.price}` : 'Free'}
              </span>
            </div>
          </Link>
        </div>
        {isCreator && (
          <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10">
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {isLoadingMessages ? (
          <div className="flex justify-center p-4">
            <div className="animate-pulse flex space-x-2">
              <div className="w-2 h-2 bg-primary/50 rounded-full"></div>
              <div className="w-2 h-2 bg-primary/50 rounded-full animation-delay-200"></div>
              <div className="w-2 h-2 bg-primary/50 rounded-full animation-delay-400"></div>
            </div>
          </div>
        ) : messages?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Sparkles className="h-12 w-12 mb-2 text-primary" />
            <p>Start the conversation</p>
          </div>
        ) : (
          messages?.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 max-w-[85%] group/msg ${isMe ? "ml-auto flex-row-reverse" : ""}`}>
                {!isMe && (
                  <Avatar className="h-6 w-6 shrink-0 mt-auto">
                    <AvatarImage src={msg.sender?.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px]">{msg.sender?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && <span className="text-[10px] text-muted-foreground ml-1 mb-1">{msg.sender?.name}</span>}
                  
                  <div className="flex items-center gap-2">
                    {isMe && (
                      <div className="flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(msg.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {isCreator && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setReplicateMessageId(msg.id)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMe 
                          ? "bg-primary text-primary-foreground rounded-br-sm shadow-md shadow-primary/20" 
                          : "bg-muted/80 backdrop-blur-sm text-foreground rounded-bl-sm border border-border"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                  
                  <span className="text-[9px] text-muted-foreground mt-1 opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-background/90 backdrop-blur-md border-t border-border safe-area-bottom">
        <form onSubmit={handleSend} className="flex items-end gap-2 max-w-screen-md mx-auto">
          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <div className="flex-1 bg-muted/50 rounded-2xl flex items-center px-1 overflow-hidden focus-within:ring-1 focus-within:ring-primary border border-border/50">
            <Input 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Message..." 
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 px-3"
            />
          </div>
          <Button 
            type="submit" 
            size="icon" 
            disabled={!content.trim() || sendMessage.isPending}
            className={`shrink-0 h-10 w-10 rounded-full transition-all ${content.trim() ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-100" : "bg-muted text-muted-foreground scale-95"}`}
          >
            <Send className="h-4 w-4 ml-0.5" />
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