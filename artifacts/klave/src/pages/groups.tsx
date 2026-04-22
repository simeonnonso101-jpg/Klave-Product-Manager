import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  Search, Users, Plus, Star, GraduationCap, TrendingUp, Briefcase,
  Megaphone, Palette, Code2, Sparkles, Flame, Gift, Loader2, Check,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

import defaultImg1 from "../assets/course-1.png";
import defaultImg2 from "../assets/course-2.png";
import defaultImg3 from "../assets/course-3.png";

type DiscoverItem = {
  id: number;
  name: string;
  description: string | null;
  subject: string | null;
  price: number | null;
  subscriptionModel: string | null;
  memberCount: number;
  coverImageUrl: string | null;
  createdAt: string;
  creator: {
    id: number;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  };
  isMember: boolean;
  isCreator: boolean;
};

type DiscoverResp = { items: DiscoverItem[]; nextOffset: number | null };
type SortKey = "trending" | "new" | "free";

const CATEGORIES = [
  { label: "Business", icon: <Briefcase className="w-3.5 h-3.5 mr-1.5" /> },
  { label: "Marketing", icon: <Megaphone className="w-3.5 h-3.5 mr-1.5" /> },
  { label: "Design", icon: <Palette className="w-3.5 h-3.5 mr-1.5" /> },
  { label: "Coding", icon: <Code2 className="w-3.5 h-3.5 mr-1.5" /> },
  { label: "Finance", icon: <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> },
  { label: "Coaching", icon: <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> },
];

const SORTS: Array<{ key: SortKey; label: string; icon: React.ReactNode }> = [
  { key: "trending", label: "Trending", icon: <Flame className="w-3.5 h-3.5" /> },
  { key: "new", label: "New", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: "free", label: "Free", icon: <Gift className="w-3.5 h-3.5" /> },
];

function useDebounced<T>(value: T, delayMs: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return d;
}

export default function GroupsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("trending");
  const debouncedQ = useDebounced(searchQuery.trim(), 250);

  const queryKey = useMemo(
    () => ["discover", { q: debouncedQ, category: activeCategory, sort }] as const,
    [debouncedQ, activeCategory, sort],
  );

  const { data, isLoading, isFetching } = useQuery<DiscoverResp>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (activeCategory) params.set("category", activeCategory);
      params.set("sort", sort);
      return customFetch<DiscoverResp>(`/api/groups/discover?${params.toString()}`, { method: "GET" });
    },
    staleTime: 15_000,
  });

  const join = useMutation({
    mutationFn: (groupId: number) =>
      customFetch<{ joined: boolean; alreadyMember: boolean }>(
        `/api/groups/${groupId}/join`,
        { method: "POST" },
      ),
    onSuccess: (_resp, groupId) => {
      // Optimistically flip isMember on the cached list so the button switches
      // to "Joined" without waiting for the next fetch.
      qc.setQueryData<DiscoverResp>(queryKey, (prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((it) =>
                it.id === groupId
                  ? { ...it, isMember: true, memberCount: it.isMember ? it.memberCount : it.memberCount + 1 }
                  : it,
              ),
            }
          : prev,
      );
      toast({ title: "You're in", description: "Welcome to the class — say hi in chat." });
    },
    onError: (err: any, groupId) => {
      // 402 = paid class → redirect to detail page where checkout lives.
      const msg = String(err?.message ?? "");
      if (msg.toLowerCase().includes("paid")) {
        setLocation(`/groups/${groupId}`);
        return;
      }
      toast({
        title: "Couldn't join",
        description: msg || "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const items = data?.items ?? [];

  const fallback = (id: number) => [defaultImg1, defaultImg2, defaultImg3][id % 3];

  return (
    <MainLayout>
      <div className="relative flex flex-col h-full bg-background overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-[#5A1DE6]/20 to-[#3A0CA3]/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-32 w-72 h-72 rounded-full bg-gradient-to-tr from-[#F59E0B]/10 to-transparent blur-3xl" />

        <header className="relative px-4 pt-14 pb-4 bg-background/60 backdrop-blur-2xl border-b border-border/60 sticky top-0 z-10 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] bg-clip-text text-transparent">Discover</span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B] mt-1" />
            </h1>
            <Link href="/groups/new">
              <Button size="sm" className="gap-1.5 rounded-full font-semibold bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 shadow-md shadow-[#5A1DE6]/25">
                <Plus className="h-4 w-4" /> New
              </Button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find courses, mentors, topics..."
              className="pl-10 bg-card/80 text-foreground border-border/60 focus-visible:ring-2 focus-visible:ring-[#5A1DE6]/30 rounded-2xl h-11 backdrop-blur-sm shadow-sm"
            />
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto p-4 space-y-5 pb-24">
          {/* Sort tabs */}
          <div className="flex gap-2">
            {SORTS.map((s) => {
              const active = sort === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-bold rounded-full border transition-all ${
                    active
                      ? "bg-foreground text-background border-transparent shadow-md"
                      : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
                  }`}
                >
                  {s.icon} {s.label}
                </button>
              );
            })}
          </div>

          {/* Categories row */}
          <div className="flex overflow-x-auto gap-2 -mx-4 px-4 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                className={`inline-flex items-center px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap rounded-full border transition-all ${
                  activeCategory === cat.label
                    ? "bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-transparent shadow-md shadow-[#5A1DE6]/25"
                    : "bg-card text-foreground border-border/60 hover:border-[#5A1DE6]/40 hover:text-[#5A1DE6] dark:hover:text-[#9F75FF]"
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Star className="h-4 w-4 text-[#F59E0B]" />
              {sort === "trending" ? "Trending now" : sort === "new" ? "Just launched" : "Free to join"}
              {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-card border-none shadow-sm overflow-hidden rounded-2xl">
                    <Skeleton className="h-36 w-full rounded-none" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : items.length === 0 ? (
                <div className="col-span-full py-14 px-6 text-center bg-card rounded-2xl border border-border shadow-sm">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#5A1DE6]/10 text-[#5A1DE6] mb-4">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-foreground text-base">No courses match that yet</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-[340px] mx-auto leading-relaxed">
                    Try a different search term or category. Or be the first to teach this — create a new course.
                  </p>
                  <Link href="/groups/new">
                    <Button size="sm" className="mt-5 rounded-full bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 shadow-md shadow-[#5A1DE6]/20">
                      <Plus className="h-4 w-4 mr-1" /> Create a course
                    </Button>
                  </Link>
                </div>
              ) : (
                items.map((g) => {
                  const pending = join.isPending && join.variables === g.id;
                  const priceLabel = g.price && g.price > 0 ? `$${g.price.toFixed(g.price % 1 === 0 ? 0 : 2)}` : "Free";
                  return (
                    <Card key={g.id} className="bg-card border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col rounded-2xl">
                      <Link href={`/groups/${g.id}`} className="block group">
                        <div className="h-36 bg-muted relative overflow-hidden">
                          <img
                            src={g.coverImageUrl || fallback(g.id)}
                            alt={g.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                          <div className="absolute top-3 right-3 flex gap-2">
                            <Badge className="bg-background/95 text-foreground hover:bg-background border-none font-semibold shadow-sm backdrop-blur-sm">
                              {priceLabel}
                            </Badge>
                            {g.subject && (
                              <Badge className="bg-[#5A1DE6]/90 text-white border-none font-semibold shadow-sm backdrop-blur-sm">
                                {g.subject}
                              </Badge>
                            )}
                          </div>
                          <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="font-bold text-lg text-white leading-tight drop-shadow-sm line-clamp-2">{g.name}</h3>
                          </div>
                        </div>
                      </Link>
                      <CardContent className="p-4 flex-1 flex flex-col gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0 border border-border">
                            <AvatarImage src={g.creator.avatarUrl || undefined} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6]/15 to-[#F59E0B]/15 text-[#5A1DE6] text-[11px] font-bold">
                              {g.creator.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-foreground truncate leading-tight">
                              {g.creator.name}
                            </p>
                            {g.creator.username && (
                              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                                @{g.creator.username}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                          {g.description || g.subject || "Learn from a creator and connect with a community of students."}
                        </p>

                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Users className="h-3.5 w-3.5" /> {g.memberCount} enrolled
                          </div>
                          {g.isCreator ? (
                            <Link href={`/groups/${g.id}`}>
                              <Button size="sm" variant="outline" className="h-8 rounded-full text-[12px] font-bold">
                                Manage
                              </Button>
                            </Link>
                          ) : g.isMember ? (
                            <Link href={`/groups/${g.id}`}>
                              <Button size="sm" variant="outline" className="h-8 rounded-full text-[12px] font-bold gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" /> Joined
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={() => {
                                if (g.price && g.price > 0) {
                                  setLocation(`/groups/${g.id}`);
                                } else {
                                  join.mutate(g.id);
                                }
                              }}
                              className="h-8 px-4 rounded-full text-[12px] font-bold bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 shadow-sm shadow-[#5A1DE6]/25"
                            >
                              {pending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : g.price && g.price > 0 ? (
                                `Join · ${priceLabel}`
                              ) : (
                                "Join free"
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
