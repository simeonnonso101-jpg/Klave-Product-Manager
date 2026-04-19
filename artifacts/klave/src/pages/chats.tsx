import { useListGroups, useGetCurrentUser } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MessageCircle, Users, Search } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function ChatsPage() {
  const { data: user } = useGetCurrentUser();
  const { data: groups, isLoading } = useListGroups();

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <header className="px-4 pt-12 pb-4 bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight">Chats</h1>
            {user && (
              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border animate-pulse">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))
          ) : groups?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No chats yet</p>
              <p className="text-sm mt-1">Join a group to start chatting</p>
            </div>
          ) : (
            groups?.map((group) => (
              <Link 
                key={group.id} 
                href={`/chat/${group.id}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card hover:bg-muted/50 border border-transparent hover:border-border transition-all active:scale-[0.98]"
              >
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={group.coverImageUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-sm truncate pr-2">{group.name}</h3>
                    {group.price ? (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-none">
                        ${group.price}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                        Free
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.subject || group.description || "No description"}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}