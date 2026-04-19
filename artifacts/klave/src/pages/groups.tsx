import { useListGroups } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, Users, Plus, Star } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroupsPage() {
  const { data: groups, isLoading } = useListGroups();

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <header className="px-4 pt-12 pb-4 bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b border-border flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
            <Link href="/groups/new">
              <Button size="sm" className="gap-2 rounded-full shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" /> Create Class
              </Button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search classes, topics, creators..." 
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-accent" /> Featured Classes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-card border-border overflow-hidden">
                    <Skeleton className="h-32 w-full rounded-none" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                  </Card>
                ))
              ) : groups?.length === 0 ? (
                <div className="col-span-full py-8 text-center text-muted-foreground">
                  No classes available yet.
                </div>
              ) : (
                groups?.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <Card className="bg-card border-border hover:border-primary/50 transition-colors overflow-hidden group cursor-pointer h-full flex flex-col">
                      <div className="h-32 bg-muted relative overflow-hidden">
                        {group.coverImageUrl ? (
                          <img src={group.coverImageUrl} alt={group.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-muted flex items-center justify-center">
                            <Users className="h-8 w-8 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-2">
                          <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-foreground border-none font-semibold">
                            {group.price ? `$${group.price}` : "Free"}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg leading-tight line-clamp-2">{group.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                          {group.description || group.subject || "Learn from the best in this exclusive group."}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Users className="h-3.5 w-3.5" /> {group.memberCount} members
                          </div>
                          <span className="text-xs font-semibold text-primary">View Details &rarr;</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}