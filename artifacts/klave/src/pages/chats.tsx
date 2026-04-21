import { useListGroups, useGetCurrentUser } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MessageCircle, Search, Compass, Plus } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OnboardingDialog } from "@/components/onboarding-dialog";

export default function ChatsPage() {
  const { data: user } = useGetCurrentUser();
  const { data: groups, isLoading } = useListGroups(
    { memberId: user?.id },
    { query: { enabled: !!user } as any }
  );

  return (
    <MainLayout>
      <OnboardingDialog />
      <div className="flex flex-col h-full bg-background">
        <header className="px-4 pt-14 pb-4 bg-background/70 backdrop-blur-2xl border-b border-border/60 text-foreground sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-2 text-[#5A1DE6]">
              Chats
              <span className="inline-block w-2 h-2 rounded-full bg-[#F59E0B]" />
            </h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              className="pl-10 bg-white/70 text-foreground placeholder:text-muted-foreground border-white/60 focus-visible:ring-2 focus-visible:ring-[#5A1DE6]/30 rounded-xl h-10 backdrop-blur-sm"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-card">
          {!user || isLoading || !groups ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-b border-border/50 animate-pulse pl-4 pr-4">
                <Skeleton className="h-[52px] w-[52px] rounded-full shrink-0" />
                <div className="flex-1 space-y-2 py-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))
          ) : groups?.length === 0 ? (
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
            <div className="divide-y divide-border/60">
              {groups?.map((group) => (
                <Link 
                  key={group.id} 
                  href={`/chat/${group.id}`}
                  className="flex items-center gap-3 p-3 pl-4 pr-4 bg-card hover:bg-muted/40 transition-colors cursor-pointer active:bg-muted"
                >
                  <Avatar className="h-[52px] w-[52px] shrink-0 border border-border">
                    <AvatarImage src={group.coverImageUrl || undefined} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {group.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
                    <div className="flex justify-between items-baseline mb-[2px]">
                      <h3 className="font-semibold text-[16px] truncate pr-2 text-foreground">{group.name}</h3>
                      <span className="text-[12px] text-muted-foreground whitespace-nowrap shrink-0">
                        {/* Mock timestamp */}
                        12:45 PM
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[14px] text-muted-foreground truncate pr-2">
                        {group.subject || group.description || "Welcome to the class!"}
                      </p>
                      <div className="flex gap-1.5 shrink-0">
                        {group.price ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-accent/10 text-accent border-none leading-none">
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 border-emerald-200 bg-emerald-50 leading-none">
                            Free
                          </Badge>
                        )}
                        {/* Mock unread badge */}
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                          2
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
