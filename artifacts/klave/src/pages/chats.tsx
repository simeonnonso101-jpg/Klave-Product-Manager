import { useListGroups, useGetCurrentUser } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MessageCircle, Search, Compass, Plus, Sparkles, TrendingUp, Users, ArrowRight } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { useState } from "react";

export default function ChatsPage() {
  const { data: user } = useGetCurrentUser();
  const { data: myGroups, isLoading } = useListGroups(
    { memberId: user?.id },
    { query: { enabled: !!user } as any }
  );
  const { data: allGroups } = useListGroups(
    {},
    { query: { enabled: !!user } as any }
  );
  const [searchTerm, setSearchTerm] = useState("");

  const myGroupIds = new Set((myGroups ?? []).map((g) => g.id));
  const filteredMyGroups = (myGroups ?? []).filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const suggestedGroups = (allGroups ?? [])
    .filter((g) => !myGroupIds.has(g.id))
    .slice(0, 3);

  const showSuggestions = !isLoading && myGroups && myGroups.length > 0 && myGroups.length < 5 && suggestedGroups.length > 0;

  return (
    <MainLayout>
      <OnboardingDialog />
      <div className="relative flex flex-col h-full bg-background overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-[#5A1DE6]/20 to-[#3A0CA3]/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-32 w-72 h-72 rounded-full bg-gradient-to-tr from-[#F59E0B]/15 to-transparent blur-3xl" />

        <header className="relative px-4 pt-14 pb-4 bg-background/60 backdrop-blur-2xl border-b border-border/60 text-foreground sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2">
                <span className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] bg-clip-text text-transparent">Chats</span>
                <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B] mt-1" />
              </h1>
              {myGroups && myGroups.length > 0 && (
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  {myGroups.length} {myGroups.length === 1 ? "conversation" : "conversations"}
                </p>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your classes..."
              className="pl-10 bg-card/80 text-foreground placeholder:text-muted-foreground border-border/60 focus-visible:ring-2 focus-visible:ring-[#5A1DE6]/30 rounded-2xl h-11 backdrop-blur-sm shadow-sm"
            />
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto">
          {!user || isLoading || !myGroups ? (
            <div className="bg-card">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 border-b border-border/40 animate-pulse">
                  <Skeleton className="h-[56px] w-[56px] rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 py-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : myGroups?.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-12">
              <div className="relative mb-6">
                <div className="absolute -inset-6 bg-gradient-to-br from-[#5A1DE6]/15 to-[#F59E0B]/15 rounded-full blur-2xl" />
                <div className="relative bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] p-7 rounded-3xl shadow-xl shadow-[#5A1DE6]/30">
                  <MessageCircle className="h-12 w-12 text-white" strokeWidth={2} />
                  <div className="absolute -right-2 -bottom-2 bg-[#F59E0B] rounded-2xl p-2 shadow-lg shadow-[#F59E0B]/40 border-4 border-background">
                    <Compass className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-foreground tracking-tight">Your chats will live here</h2>
              <p className="text-[15px] text-muted-foreground mb-8 max-w-[300px] leading-relaxed">
                Join a real estate course to start learning, or create your first paid group to start teaching.
              </p>
              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <Link href="/groups">
                  <Button className="w-full h-12 rounded-xl font-bold text-base shadow-md shadow-[#5A1DE6]/20 bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90">
                    <Compass className="h-4 w-4 mr-2" />
                    Browse courses
                  </Button>
                </Link>
                <Link href="/groups/new">
                  <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-base border-border">
                    <Plus className="h-4 w-4 mr-2" />
                    Create a group
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-card/60 backdrop-blur-sm">
                {filteredMyGroups.length === 0 ? (
                  <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No chats matching "{searchTerm}"
                  </div>
                ) : (
                  filteredMyGroups.map((group, idx) => {
                    const unreadCount = (idx % 3 === 0) ? 2 : 0;
                    const hasUnread = unreadCount > 0;
                    return (
                      <Link
                        key={group.id}
                        href={`/chat/${group.id}`}
                        onMouseEnter={() => { import("@/pages/chat-view"); }}
                        onTouchStart={() => { import("@/pages/chat-view"); }}
                        className="group relative flex items-center gap-3.5 px-4 py-3.5 border-b border-border/40 hover:bg-muted/40 transition-all cursor-pointer active:bg-muted"
                      >
                        {hasUnread && (
                          <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#5A1DE6] to-[#3A0CA3] rounded-r" />
                        )}
                        <div className="relative shrink-0">
                          {hasUnread && (
                            <span className="absolute -inset-[2px] rounded-full bg-gradient-to-br from-[#5A1DE6] to-[#F59E0B] opacity-90" />
                          )}
                          <Avatar className={`relative h-[56px] w-[56px] ${hasUnread ? "ring-2 ring-background" : "border border-border"}`}>
                            <AvatarImage src={group.coverImageUrl || undefined} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6]/15 to-[#F59E0B]/15 text-[#5A1DE6] font-bold text-lg">
                              {group.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center gap-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <h3 className={`truncate text-[16px] ${hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                              {group.name}
                            </h3>
                            <span className={`text-[12px] whitespace-nowrap shrink-0 ${hasUnread ? "text-[#5A1DE6] font-semibold" : "text-muted-foreground"}`}>
                              12:45 PM
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <p className={`text-[14px] truncate pr-1 ${hasUnread ? "text-foreground/80" : "text-muted-foreground"}`}>
                              {group.subject || group.description || "Welcome to the class!"}
                            </p>
                            <div className="flex gap-1.5 items-center shrink-0">
                              {group.price ? (
                                <Badge className="text-[10px] px-2 py-0 h-[18px] bg-[#F59E0B]/15 text-[#B45309] dark:text-[#F59E0B] border border-[#F59E0B]/30 leading-none rounded-full font-semibold">
                                  Paid
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] px-2 py-0 h-[18px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 leading-none rounded-full font-semibold">
                                  Free
                                </Badge>
                              )}
                              {hasUnread && (
                                <span className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white text-[11px] font-bold h-[20px] min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-sm shadow-[#5A1DE6]/30">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {showSuggestions && (
                <div className="px-4 pt-8 pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] p-1.5 rounded-lg shadow-sm shadow-[#F59E0B]/30">
                        <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                      </div>
                      <h2 className="text-[15px] font-bold tracking-tight text-foreground">Suggested for you</h2>
                    </div>
                    <Link href="/groups" className="text-[13px] font-semibold text-[#5A1DE6] dark:text-[#9F75FF] flex items-center gap-1 hover:gap-1.5 transition-all">
                      See all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {suggestedGroups.map((group) => (
                      <Link
                        key={group.id}
                        href={`/groups/${group.id}`}
                        className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 shadow-sm hover:shadow-md hover:border-[#5A1DE6]/30 transition-all"
                      >
                        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-[#5A1DE6]/8 to-[#F59E0B]/8 blur-2xl group-hover:from-[#5A1DE6]/15 group-hover:to-[#F59E0B]/15 transition-all" />
                        <div className="relative flex items-center gap-3">
                          <Avatar className="h-12 w-12 shrink-0 border border-border">
                            <AvatarImage src={group.coverImageUrl || undefined} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6]/15 to-[#F59E0B]/15 text-[#5A1DE6] font-bold">
                              {group.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-[15px] text-foreground truncate">{group.name}</h3>
                            <p className="text-[12.5px] text-muted-foreground truncate">
                              {group.subject || group.description || "Real estate course"}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                <Users className="h-3 w-3" /> Trending
                              </span>
                              {group.price ? (
                                <span className="text-[11px] font-bold text-[#5A1DE6] dark:text-[#9F75FF]">
                                  ${(group.price / 100).toFixed(0)}/mo
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Free</span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[#5A1DE6] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>

                  <Link href="/groups/new" className="block mt-5">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5A1DE6] via-[#4318B8] to-[#3A0CA3] p-5 shadow-lg shadow-[#5A1DE6]/30">
                      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#F59E0B]/30 blur-2xl" />
                      <div className="relative flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-[#F59E0B]" />
                            <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">For creators</span>
                          </div>
                          <h3 className="text-white font-bold text-[16px] leading-tight mb-0.5">Start earning today</h3>
                          <p className="text-white/70 text-[12.5px]">Create your first paid group in 60 seconds</p>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-full p-2.5 shrink-0 group-hover:bg-white/25 transition-colors">
                          <ArrowRight className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              <div className="h-20" />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
