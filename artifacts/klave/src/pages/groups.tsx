import { useListGroups } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, Users, Plus, Star, Building2, TrendingUp } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Using our generated real estate images as fallbacks
import defaultImg1 from "../assets/real-estate-1.png";
import defaultImg2 from "../assets/real-estate-2.png";
import defaultImg3 from "../assets/real-estate-3.png";

export default function GroupsPage() {
  const { data: groups, isLoading } = useListGroups();

  const getFallbackImage = (id: number) => {
    const images = [defaultImg1, defaultImg2, defaultImg3];
    return images[id % images.length];
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <header className="px-4 pt-10 pb-4 bg-primary text-primary-foreground sticky top-0 z-10 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-[28px] font-bold tracking-tight">Discover</h1>
            <Link href="/groups/new">
              <Button size="sm" variant="secondary" className="gap-1.5 rounded-full font-semibold bg-background text-foreground hover:bg-background/90">
                <Plus className="h-4 w-4" /> New Course
              </Button>
            </Link>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground" />
            <Input 
              placeholder="Find real estate courses, investing strategies..." 
              className="pl-10 bg-background text-foreground border-none focus-visible:ring-0 rounded-xl h-10 shadow-inner"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 bg-background">
          {/* Categories row */}
          <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 text-sm whitespace-nowrap cursor-pointer">
              <Building2 className="w-3.5 h-3.5 mr-1.5" /> Real Estate
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-sm whitespace-nowrap cursor-pointer">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Investing
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-sm whitespace-nowrap cursor-pointer">
              Wholesaling
            </Badge>
            <Badge variant="outline" className="px-3 py-1.5 text-sm whitespace-nowrap cursor-pointer">
              Property Mgmt
            </Badge>
          </div>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Star className="h-4 w-4 text-accent" /> Featured Courses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="bg-card border-none shadow-sm overflow-hidden">
                    <Skeleton className="h-36 w-full rounded-none" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : groups?.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-card rounded-2xl border border-border shadow-sm">
                  <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-medium text-foreground">No courses found</h3>
                  <p className="text-sm text-muted-foreground mt-1">Be the first to create a property investing class.</p>
                </div>
              ) : (
                groups?.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer h-full flex flex-col rounded-2xl">
                      <div className="h-36 bg-muted relative overflow-hidden">
                        <img 
                          src={group.coverImageUrl || getFallbackImage(group.id)} 
                          alt={group.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-3 right-3 flex gap-2">
                          <Badge className="bg-background/95 text-foreground hover:bg-background border-none font-semibold shadow-sm backdrop-blur-sm">
                            {group.price ? `$${group.price}` : "Free"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                           <h3 className="font-bold text-lg text-white leading-tight drop-shadow-sm">{group.name}</h3>
                        </div>
                      </div>
                      <CardContent className="p-4 flex-1 flex flex-col">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                          {group.description || group.subject || "Learn proven real estate strategies and connect with other investors."}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Users className="h-3.5 w-3.5" /> {group.memberCount} enrolled
                          </div>
                          <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline">
                            View Course
                          </span>
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
