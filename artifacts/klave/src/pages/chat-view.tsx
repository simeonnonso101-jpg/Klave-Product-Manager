import { useGetGroup, useGetGroupStats, useListMessages, useSendMessage, useDeleteMessage, useReplicateLecture, useListGroups, useGetCurrentUser, getListMessagesQueryKey, getListReplicationJobsQueryKey } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, Send, Sparkles, Image as ImageIcon, Trash2, Copy, Loader2, Smile, Mic, Plus, Camera, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  const diffMs = today.getTime() - d.getTime();
  if (diffMs < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: today.getFullYear() === d.getFullYear() ? undefined : "numeric" });
}

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
  
  // Poll messages while the tab is visible. Pauses when the browser tab is hidden
  // to save the API and avoid spinner flicker. 8s feels live without hammering Render.
  const { data: messages, isLoading: isLoadingMessages } = useListMessages(
    { groupId, limit: 100 },
    { query: {
        enabled: !!groupId,
        refetchInterval: 8000,
        refetchIntervalInBackground: false,
        staleTime: 0,
    } as any }
  );
  
  const [, setLocation] = useLocation();

  const { data: groups } = useListGroups({ creatorId: user?.id }, { query: { enabled: !!user } as any });

  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const replicateLecture = useReplicateLecture();

  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [replicateMessageId, setReplicateMessageId] = useState<number | null>(null);
  const [targetGroupIds, setTargetGroupIds] = useState<number[]>([]);
  const [reactions, setReactions] = useState<Record<number, string[]>>({});
  const [showScrollDown, setShowScrollDown] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(distFromBottom > 200);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const addReaction = (messageId: number, emoji: string) => {
    setReactions(prev => {
      const current = prev[messageId] || [];
      if (current.includes(emoji)) {
        return { ...prev, [messageId]: current.filter(e => e !== emoji) };
      }
      return { ...prev, [messageId]: [...current, emoji] };
    });
  };

  const QUICK_REACTIONS = ["heart", "fire", "100", "clap", "rocket"] as const;
  const REACTION_EMOJI: Record<string, string> = {
    heart: "♥",
    fire: "✦",
    "100": "★",
    clap: "✓",
    rocket: "▲",
  };

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
      <div className="flex flex-col h-[100dvh] bg-[hsl(258,30%,97%)]">
        <header className="h-[68px] flex items-center gap-2 px-2 bg-white/80 backdrop-blur-xl border-b border-white/40 shrink-0">
          <Link href="/chats" className="p-2 rounded-full hover:bg-muted text-foreground transition-colors flex items-center shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-col gap-1.5 ml-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </header>
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          <Skeleton className="h-10 w-2/3 rounded-2xl rounded-tl-none" />
          <Skeleton className="h-14 w-3/5 rounded-2xl rounded-tl-none" />
          <Skeleton className="h-10 w-1/2 rounded-2xl rounded-tr-none ml-auto bg-[#5A1DE6]/15" />
          <Skeleton className="h-12 w-3/5 rounded-2xl rounded-tr-none ml-auto bg-[#5A1DE6]/15" />
          <Skeleton className="h-10 w-2/5 rounded-2xl rounded-tl-none" />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] p-8 text-center bg-background">
        <p className="text-muted-foreground mb-4">This chat couldn't be loaded.</p>
        <Link href="/chats" className="text-[#5A1DE6] font-semibold hover:underline">Back to chats</Link>
      </div>
    );
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10 pb-20">
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
            const prev = idx > 0 ? messages[idx - 1] : null;
            const showDateDivider = !prev || !sameDay(new Date(prev.createdAt), new Date(msg.createdAt));

            return (
              <div key={msg.id}>
              {showDateDivider && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-semibold tracking-wide bg-white/80 dark:bg-card/80 backdrop-blur-md text-muted-foreground px-3 py-1 rounded-full shadow-sm border border-border/40">
                    {formatDayLabel(new Date(msg.createdAt))}
                  </span>
                </div>
              )}
              <div className={`flex gap-2 max-w-[85%] group/msg ${isMe ? "ml-auto flex-row-reverse" : ""}`}>
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
                    {/* Hover reaction quick bar */}
                    <div className={`flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity absolute ${isMe ? "right-[calc(100%+8px)]" : "left-[calc(100%+8px)]"} top-1/2 -translate-y-1/2 bg-card/95 backdrop-blur-md border border-border/60 rounded-full shadow-lg px-1.5 py-1 z-10`}>
                      {QUICK_REACTIONS.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => addReaction(msg.id, r)}
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-base hover:scale-125 hover:bg-muted transition-all font-semibold ${
                            r === "heart" ? "text-rose-500" :
                            r === "fire" ? "text-[#F59E0B]" :
                            r === "100" ? "text-[#5A1DE6]" :
                            r === "clap" ? "text-emerald-500" : "text-blue-500"
                          }`}
                          title={r}
                        >
                          {REACTION_EMOJI[r]}
                        </button>
                      ))}
                      {isMe && (
                        <>
                          <span className="w-px h-5 bg-border/60 mx-0.5" />
                          <button type="button" onClick={() => handleDelete(msg.id)} className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {isCreator && (
                            <button type="button" onClick={() => setReplicateMessageId(msg.id)} className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-[#5A1DE6] hover:bg-[#5A1DE6]/10 transition-all" title="Replicate">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <div
                      className={`px-3.5 py-2 text-[15px] shadow-sm relative ${
                        isMe
                          ? "bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white shadow-[#5A1DE6]/20"
                          : "bg-white dark:bg-card text-foreground"
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
                        <span className={`text-[10px] inline-block text-right w-full ${isMe ? "text-white/70" : "text-black/40 dark:text-white/40"}`}>
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

                  {/* Reactions display */}
                  {reactions[msg.id] && reactions[msg.id].length > 0 && (
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? "self-end mr-1" : "self-start ml-1"}`}>
                      {reactions[msg.id].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => addReaction(msg.id, r)}
                          className="bg-card border border-border/60 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 shadow-sm hover:scale-110 transition-transform"
                          title="Remove reaction"
                        >
                          <span className={`font-semibold ${
                            r === "heart" ? "text-rose-500" :
                            r === "fire" ? "text-[#F59E0B]" :
                            r === "100" ? "text-[#5A1DE6]" :
                            r === "clap" ? "text-emerald-500" : "text-blue-500"
                          }`}>{REACTION_EMOJI[r]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Scroll-to-bottom FAB */}
      {showScrollDown && (
        <button
          type="button"
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-24 right-4 z-30 h-10 w-10 rounded-full bg-card border border-border/60 shadow-lg flex items-center justify-center text-foreground hover:scale-110 transition-transform"
          aria-label="Scroll to latest"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-2 pt-2 pb-3 bg-background/85 backdrop-blur-xl border-t border-border/60 z-20">
        <form onSubmit={handleSend} className="flex items-end gap-1.5 max-w-screen-md mx-auto">
          <div className="flex-1 bg-card rounded-3xl flex items-end min-h-[44px] max-h-[140px] focus-within:ring-2 focus-within:ring-[#5A1DE6]/40 shadow-sm border border-border/60 pl-1.5 pr-1">
            <button type="button" className="shrink-0 h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-[#5A1DE6] rounded-full transition-colors self-end" aria-label="Emoji">
              <Smile className="h-5 w-5" />
            </button>
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
              placeholder="Message"
              rows={1}
              className="border-0 bg-transparent shadow-none focus:outline-none focus-visible:ring-0 py-2.5 px-1 w-full text-[15px] resize-none leading-tight"
              autoComplete="off"
            />
            <div className="flex items-end gap-0.5 shrink-0 self-end">
              <button type="button" className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-[#5A1DE6] rounded-full transition-colors" aria-label="Attach">
                <Plus className="h-5 w-5" />
              </button>
              {!content.trim() && (
                <button type="button" className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-[#5A1DE6] rounded-full transition-colors" aria-label="Camera">
                  <Camera className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          {content.trim() ? (
            <Button
              type="submit"
              size="icon"
              disabled={sendMessage.isPending}
              className="shrink-0 h-11 w-11 rounded-full transition-all bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 shadow-md shadow-[#5A1DE6]/30"
              aria-label="Send"
            >
              <Send className="h-5 w-5 ml-0.5" />
            </Button>
          ) : (
            <button
              type="button"
              className="shrink-0 h-11 w-11 rounded-full bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white shadow-md shadow-[#5A1DE6]/30 flex items-center justify-center hover:opacity-90 transition-opacity"
              aria-label="Voice message"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
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
