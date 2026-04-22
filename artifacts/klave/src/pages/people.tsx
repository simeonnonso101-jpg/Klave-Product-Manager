import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { ArrowLeft, Search, MessageCircle, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type SearchUser = {
  id: number;
  name: string;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
};

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function PeoplePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q.trim(), 250);

  const { data: results, isFetching } = useQuery<SearchUser[]>({
    queryKey: ["users-search", debouncedQ],
    enabled: debouncedQ.length > 0,
    queryFn: () =>
      customFetch<SearchUser[]>(
        `/api/users/search?q=${encodeURIComponent(debouncedQ)}`,
        { method: "GET" },
      ),
    staleTime: 30_000,
  });

  const startChat = useMutation({
    mutationFn: (userId: number) =>
      customFetch<{ id: number }>("/api/direct-chats", {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: (data) => {
      setLocation(`/chat/${data.id}`);
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't start chat",
        description: err?.message ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <MainLayout>
      <div className="relative flex flex-col h-full bg-background overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-[#5A1DE6]/20 to-[#3A0CA3]/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-32 w-72 h-72 rounded-full bg-gradient-to-tr from-[#F59E0B]/15 to-transparent blur-3xl" />

        <header className="relative px-4 pt-14 pb-4 bg-background/60 backdrop-blur-2xl border-b border-border/60 text-foreground sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-3">
            <Link
              href="/chats"
              className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="Back to chats"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight">
                <span className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] bg-clip-text text-transparent">
                  New message
                </span>
              </h1>
              <p className="text-[12.5px] text-muted-foreground">Find anyone on Klave by name or email</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email or @username"
              className="pl-10 bg-card/80 text-foreground placeholder:text-muted-foreground border-border/60 focus-visible:ring-2 focus-visible:ring-[#5A1DE6]/30 rounded-2xl h-11 backdrop-blur-sm shadow-sm"
            />
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto">
          {debouncedQ.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-12">
              <div className="relative mb-6">
                <div className="absolute -inset-6 bg-gradient-to-br from-[#5A1DE6]/15 to-[#F59E0B]/15 rounded-full blur-2xl" />
                <div className="relative bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] p-7 rounded-3xl shadow-xl shadow-[#5A1DE6]/30">
                  <MessageCircle className="h-12 w-12 text-white" strokeWidth={2} />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2 text-foreground tracking-tight">Start a private chat</h2>
              <p className="text-[14px] text-muted-foreground max-w-[280px] leading-relaxed">
                Type a name or email above to find someone and message them directly.
              </p>
            </div>
          ) : isFetching && !results ? (
            <div className="bg-card">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 border-b border-border/40 animate-pulse">
                  <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !results || results.length === 0 ? (
            <div className="px-6 py-16 text-center text-muted-foreground text-sm">
              No one matches "{debouncedQ}"
            </div>
          ) : (
            <div className="bg-card/60 backdrop-blur-sm">
              {results.map((u) => {
                const pending = startChat.isPending && startChat.variables === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={startChat.isPending}
                    onClick={() => startChat.mutate(u.id)}
                    className="w-full text-left flex items-center gap-3.5 px-4 py-3.5 border-b border-border/40 hover:bg-muted/40 transition-all active:bg-muted disabled:opacity-60"
                  >
                    <Avatar className="h-12 w-12 shrink-0 border border-border">
                      <AvatarImage src={u.avatarUrl || undefined} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6]/15 to-[#F59E0B]/15 text-[#5A1DE6] font-bold">
                        {u.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-[15.5px] font-semibold text-foreground">{u.name}</h3>
                      <p className="truncate text-[12.5px] text-muted-foreground">
                        {u.username ? `@${u.username}` : u.email}
                      </p>
                    </div>
                    {pending ? (
                      <Loader2 className="h-4 w-4 text-[#5A1DE6] animate-spin shrink-0" />
                    ) : (
                      <span className="text-[12px] font-semibold text-[#5A1DE6] dark:text-[#9F75FF] shrink-0">
                        Message
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="h-20" />
        </div>
      </div>
    </MainLayout>
  );
}
