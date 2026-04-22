import { useCreateGroup, useGetCurrentUser, getListGroupsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Image as ImageIcon, CheckCircle2, Lock, Sparkles, Megaphone, TrendingUp, Palette, Briefcase, GraduationCap, Check, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import defaultImg1 from "../assets/course-1.png";
import defaultImg2 from "../assets/course-2.png";
import defaultImg3 from "../assets/course-3.png";

type CoverChoice =
  | { kind: "preset"; src: string; label: string }
  | { kind: "gradient"; from: string; via: string; to: string; icon: React.ReactNode; label: string }
  | { kind: "url"; url: string };

const PRESET_COVERS: CoverChoice[] = [
  { kind: "preset", src: defaultImg1, label: "Cover 1" },
  { kind: "preset", src: defaultImg2, label: "Cover 2" },
  { kind: "preset", src: defaultImg3, label: "Cover 3" },
];

const GRADIENT_COVERS: CoverChoice[] = [
  { kind: "gradient", from: "#5A1DE6", via: "#4318B8", to: "#3A0CA3", icon: <Briefcase className="w-12 h-12" />, label: "Business" },
  { kind: "gradient", from: "#F59E0B", via: "#D97706", to: "#B45309", icon: <Megaphone className="w-12 h-12" />, label: "Marketing" },
  { kind: "gradient", from: "#10B981", via: "#059669", to: "#047857", icon: <TrendingUp className="w-12 h-12" />, label: "Finance" },
  { kind: "gradient", from: "#EC4899", via: "#DB2777", to: "#9D174D", icon: <Palette className="w-12 h-12" />, label: "Design" },
  { kind: "gradient", from: "#3B82F6", via: "#2563EB", to: "#1D4ED8", icon: <Code2 className="w-12 h-12" />, label: "Coding" },
  { kind: "gradient", from: "#8B5CF6", via: "#7C3AED", to: "#6D28D9", icon: <GraduationCap className="w-12 h-12" />, label: "Coaching" },
];

export default function CreateGroupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  
  const createGroup = useCreateGroup();
  
  const [isPaid, setIsPaid] = useState(false);
  const [coverChoice, setCoverChoice] = useState<CoverChoice>(GRADIENT_COVERS[0]);
  const [customUrl, setCustomUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "Business",
    description: "",
    price: "",
    subscriptionModel: "monthly",
    coverImageUrl: ""
  });

  // Encode the chosen cover into a URL the backend can store as-is.
  // Gradients are persisted as a small inline SVG data URI so they survive a refresh
  // without requiring a schema change.
  const gradientToDataUrl = (from: string, via: string, to: string) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400' preserveAspectRatio='none'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='${from}'/><stop offset='50%' stop-color='${via}'/><stop offset='100%' stop-color='${to}'/></linearGradient></defs><rect width='800' height='400' fill='url(%23g)'/></svg>`;
    return `data:image/svg+xml;utf8,${svg.replace(/#/g, "%23").replace(/\n/g, "")}`;
  };

  const resolvedCoverUrl = coverChoice.kind === "preset" ? coverChoice.src
    : coverChoice.kind === "url" ? coverChoice.url
    : coverChoice.kind === "gradient" ? gradientToDataUrl(coverChoice.from, coverChoice.via, coverChoice.to)
    : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    createGroup.mutate({
      data: {
        name: formData.name,
        subject: formData.subject,
        description: formData.description,
        price: isPaid && formData.price ? parseFloat(formData.price) : undefined,
        subscriptionModel: isPaid ? formData.subscriptionModel as any : undefined,
        type: "class",
        creatorId: user.id,
        coverImageUrl: resolvedCoverUrl || undefined
      }
    }, {
      onSuccess: (newGroup) => {
        toast({ title: "Course group created successfully!" });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setLocation(`/groups/${newGroup.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create group", variant: "destructive" });
      }
    });
  };

  const renderCoverPreview = () => {
    if (coverChoice.kind === "preset") {
      return <img src={coverChoice.src} alt="Cover" className="w-full h-full object-cover" />;
    }
    if (coverChoice.kind === "url" && coverChoice.url) {
      return <img src={coverChoice.url} alt="Cover" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />;
    }
    if (coverChoice.kind === "gradient") {
      return (
        <div className="w-full h-full flex items-center justify-center text-white/90" style={{ background: `linear-gradient(135deg, ${coverChoice.from}, ${coverChoice.via}, ${coverChoice.to})` }}>
          <div className="opacity-80 drop-shadow-lg">{coverChoice.icon}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative flex flex-col h-[100dvh] bg-background overflow-y-auto pb-8">
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-[#5A1DE6]/15 to-[#3A0CA3]/10 blur-3xl" />

      <header className="relative h-[68px] border-b border-border/60 flex items-center px-4 sticky top-0 bg-background/80 backdrop-blur-2xl z-10 gap-3 shadow-sm">
        <Link href="/groups" className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[20px] font-bold tracking-tight bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] bg-clip-text text-transparent">New Course</h1>
      </header>

      <div className="relative p-4 max-w-lg mx-auto w-full mt-2">
        {/* Big live preview card */}
        <Card className="bg-card border-border/60 shadow-md overflow-hidden rounded-3xl mb-5">
          <div className="h-48 bg-muted relative overflow-hidden">
            {renderCoverPreview()}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
              <Avatar className="h-14 w-14 border-2 border-white/80 shadow-lg shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-[#5A1DE6] to-[#3A0CA3] text-white font-bold text-lg">
                  {formData.name.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 pb-1">
                <h3 className="text-white font-bold text-lg leading-tight truncate drop-shadow-md">{formData.name || "Course name"}</h3>
                <p className="text-white/85 text-xs truncate drop-shadow-md">{formData.subject || "Category"}</p>
              </div>
              {isPaid && formData.price && (
                <span className="bg-white/95 text-[#5A1DE6] text-xs font-bold px-2.5 py-1 rounded-full shadow-md shrink-0">
                  ${formData.price}
                </span>
              )}
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cover picker */}
          <Card className="bg-card border-border/60 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#5A1DE6]/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#5A1DE6] dark:text-[#9F75FF]" />
                </div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Cover Art</h3>
              </div>
              <button type="button" onClick={() => setShowUrlInput(v => !v)} className="text-[11px] font-semibold text-[#5A1DE6] dark:text-[#9F75FF] hover:underline">
                {showUrlInput ? "Hide URL" : "Use URL"}
              </button>
            </div>
            <CardContent className="p-5 pt-2 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_COVERS.map((c, i) => {
                    const selected = coverChoice.kind === "preset" && c.kind === "preset" && coverChoice.src === c.src;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCoverChoice(c)}
                        className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all ${selected ? "border-[#5A1DE6] shadow-md shadow-[#5A1DE6]/30 scale-105" : "border-transparent hover:border-border"}`}
                      >
                        {c.kind === "preset" && <img src={c.src} alt={c.label} className="w-full h-full object-cover" />}
                        {selected && (
                          <span className="absolute top-1 right-1 bg-[#5A1DE6] rounded-full p-0.5 shadow">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Gradients</p>
                <div className="grid grid-cols-5 gap-2">
                  {GRADIENT_COVERS.map((c, i) => {
                    const selected = coverChoice.kind === "gradient" && c.kind === "gradient" && coverChoice.from === c.from;
                    if (c.kind !== "gradient") return null;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCoverChoice(c)}
                        title={c.label}
                        className={`relative h-14 rounded-xl border-2 transition-all overflow-hidden ${selected ? "border-foreground shadow-md scale-105" : "border-transparent hover:border-border"}`}
                        style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                      >
                        {selected && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Check className="h-5 w-5 text-white drop-shadow" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              {showUrlInput && (
                <div className="space-y-1.5">
                  <Label htmlFor="custom-url" className="text-xs font-semibold text-muted-foreground">Custom image URL</Label>
                  <Input
                    id="custom-url"
                    placeholder="https://..."
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      if (e.target.value.trim()) setCoverChoice({ kind: "url", url: e.target.value.trim() });
                    }}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course details */}
          <Card className="bg-card border-border/60 shadow-sm rounded-2xl">
            <div className="px-5 pt-5 pb-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#5A1DE6]/10 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-[#5A1DE6] dark:text-[#9F75FF]" />
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Course Details</h3>
            </div>
            <CardContent className="p-5 pt-3 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-foreground">Course name <span className="text-[#F59E0B]">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Productivity Mastery"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-12 rounded-xl border-border/60 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-semibold text-foreground">Category</Label>
                <Select value={formData.subject} onValueChange={(val) => setFormData({ ...formData, subject: val })}>
                  <SelectTrigger id="subject" className="h-12 rounded-xl border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Coding">Coding</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Coaching">Coaching</SelectItem>
                    <SelectItem value="Wellness">Wellness</SelectItem>
                    <SelectItem value="Languages">Languages</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Photography">Photography</SelectItem>
                    <SelectItem value="Cooking">Cooking</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What will students learn? Be specific — this helps people decide to join."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl border-border/60 resize-none"
                />
                <p className="text-[11px] text-muted-foreground">{formData.description.length}/500</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-border/50 bg-primary/5">
              <div className="flex flex-col">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" /> Paid Group
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Require payment to join</p>
              </div>
              <Switch 
                checked={isPaid} 
                onCheckedChange={setIsPaid} 
              />
            </div>
            
            {isPaid ? (
              <CardContent className="p-5 space-y-5 bg-background">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <Label htmlFor="price" className="text-sm font-semibold">Price ($)</Label>
                    <Input 
                      id="price" 
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="99.00" 
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="h-12 rounded-xl font-mono text-base"
                      required={isPaid}
                    />
                  </div>
                  
                  <div className="space-y-2.5">
                    <Label htmlFor="model" className="text-sm font-semibold">Billing Cycle</Label>
                    <Select 
                      value={formData.subscriptionModel} 
                      onValueChange={(val) => setFormData({ ...formData, subscriptionModel: val })}
                    >
                      <SelectTrigger id="model" className="h-12 rounded-xl">
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one_time">One-time payment</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            ) : (
              <div className="p-6 flex flex-col items-center justify-center text-center bg-background">
                <div className="bg-emerald-100 p-3 rounded-full mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-emerald-700">Free Group</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
                  Anyone can join this group instantly for free. Great for lead generation!
                </p>
              </div>
            )}
          </Card>

          <Button 
            type="submit" 
            className="w-full h-14 text-[17px] font-bold shadow-lg shadow-primary/30 rounded-2xl" 
            disabled={!formData.name || createGroup.isPending}
          >
            {createGroup.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Create Group
          </Button>
        </form>
      </div>
    </div>
  );
}
