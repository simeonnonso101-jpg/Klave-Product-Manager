import { useCreateGroup, useGetCurrentUser, getListGroupsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Image as ImageIcon, CheckCircle2, Lock } from "lucide-react";
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

import defaultImg1 from "../assets/real-estate-1.png";

export default function CreateGroupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  
  const createGroup = useCreateGroup();
  
  const [isPaid, setIsPaid] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "Real Estate",
    description: "",
    price: "",
    subscriptionModel: "monthly",
    coverImageUrl: ""
  });

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
        coverImageUrl: formData.coverImageUrl || undefined
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

  return (
    <div className="flex flex-col h-[100dvh] bg-muted/30 overflow-y-auto pb-8">
      <header className="h-[68px] border-b border-border/50 flex items-center px-4 sticky top-0 bg-card z-10 gap-3 shadow-sm">
        <Link href="/groups" className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[20px] font-bold tracking-tight">New Course Group</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto w-full mt-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border-none shadow-sm overflow-hidden rounded-2xl">
            <div className="h-40 bg-muted relative flex items-center justify-center group cursor-pointer hover:opacity-90 transition-opacity overflow-hidden">
              {formData.coverImageUrl ? (
                <img src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full relative">
                  <img src={defaultImg1} alt="Default cover" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center text-white">
                    <ImageIcon className="h-8 w-8 mb-2 drop-shadow-md" />
                    <span className="text-xs font-semibold drop-shadow-md">Tap to add custom cover</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3">
                <Input 
                  placeholder="Paste image URL here..." 
                  className="h-9 text-xs bg-background/90 backdrop-blur-md border-none shadow-sm w-full font-medium"
                  value={formData.coverImageUrl}
                  onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            
            <CardContent className="p-5 space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-sm font-semibold text-foreground">Course / Group Name <span className="text-accent">*</span></Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Property Investment Mastery" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-background h-12 rounded-xl border-border focus-visible:ring-primary shadow-sm text-base"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="subject" className="text-sm font-semibold text-foreground">Category</Label>
                <Input 
                  id="subject" 
                  placeholder="e.g. Real Estate, Wholesaling..." 
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="bg-background h-12 rounded-xl border-border focus-visible:ring-primary shadow-sm"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="What will students learn in this group?" 
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-background rounded-xl border-border focus-visible:ring-primary shadow-sm resize-none"
                />
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
