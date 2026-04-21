import { useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const getFallbackImage = (id: number) => {
    const images = [defaultImg1, defaultImg2, defaultImg3];
    return images[id % images.length];
  };

  const filteredGroups = groups?.filter((group) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      group.name.toLowerCase().includes(q) || 
      (group.subject && group.subject.toLowerCase().includes(q)) || 
      (group.description && group.description.toLowerCase().includes(q));
      
    const matchesCategory = !activeCategory || 
      (group.subject && group.subject.toLowerCase().includes(activeCategory.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { label: "Real Estate", icon: <Building2 className="w-3.5 h-3.5 mr-1.5" /> },
    { label: "Investing", icon: <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> },
    { label: "Wholesaling", icon: null },
    { label: "Property Mgmt", icon: null }
  ];

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
              placeholder="Find real estate courses, investing strategies..."
              className="pl-10 bg-card/80 text-foreground border-border/60 focus-visible:ring-2 focus-visible:ring-[#5A1DE6]/30 rounded-2xl h-11 backdrop-blur-sm shadow-sm"
            />
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          {/* Categories row */}
          <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
            {categories.map((cat) => (
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
              <Star className="h-4 w-4 text-[#F59E0B]" /> Featured Courses
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
              ) : filteredGroups?.length === 0 ? (
                <div className="col-span-full py-14 px-6 text-center bg-card rounded-2xl border border-border shadow-sm">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#5A1DE6]/10 text-[#5A1DE6] mb-4">
                    <Building2 className="h-6 w-6" />
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
                filteredGroups?.map((group) => (
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
