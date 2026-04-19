import { useListGroups, useGetCurrentUser } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MessageCircle, Search, Compass } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatsPage() {
  const { data: user } = useGetCurrentUser();
  const { data: groups, isLoading } = useListGroups(
    { memberId: user?.id },
    { query: { enabled: !!user } as any }
  );

  return (
    <MainLayout>
      <div className="flex flex-col h-full bg-background">
        <header className="px-4 pt-10 pb-3 bg-primary text-primary-foreground sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[28px] font-bold tracking-tight">Chats</h1>
            {user && (
              <Avatar className="h-9 w-9 ring-2 ring-primary-foreground/20 border border-primary">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
            <Input 
              placeholder="Search classes..." 
              className="pl-10 bg-background text-foreground border-none focus-visible:ring-0 rounded-xl h-10 shadow-inner"
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
            <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6">
              <div className="bg-primary/10 p-8 rounded-full mb-6 relative">
                <MessageCircle className="h-12 w-12 text-primary" />
                <div className="absolute -right-1 -bottom-1 bg-background rounded-full p-1.5">
                  <Compass className="h-5 w-5 text-accent" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3 text-foreground tracking-tight">Your chats will live here</h2>
              <p className="text-[15px] text-muted-foreground mb-8 max-w-[280px] leading-relaxed">
                Discover real estate courses or create your first paid group.
              </p>
              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <Link href="/groups">
                  <Button className="w-full h-12 rounded-xl font-bold text-base shadow-sm">
                    Browse courses
                  </Button>
                </Link>
                <Link href="/groups/new">
                  <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-base border-border">
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
