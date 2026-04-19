import { useCreateGroup, useGetCurrentUser, getListGroupsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Image as ImageIcon } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateGroupPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser();
  
  const createGroup = useCreateGroup();
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
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
        price: formData.price ? parseFloat(formData.price) : undefined,
        subscriptionModel: formData.subscriptionModel as any,
        type: "class",
        creatorId: user.id,
        coverImageUrl: formData.coverImageUrl || undefined
      }
    }, {
      onSuccess: (newGroup) => {
        toast({ title: "Class created successfully!" });
        queryClient.invalidateQueries({ queryKey: getListGroupsQueryKey() });
        setLocation(`/groups/${newGroup.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create class", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-y-auto pb-8">
      <header className="h-16 border-b border-border flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 gap-4">
        <Link href="/groups" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Create New Class</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto w-full mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border-border overflow-hidden">
            <div className="h-32 bg-muted relative flex items-center justify-center border-b border-border group cursor-pointer hover:bg-muted/80 transition-colors">
              {formData.coverImageUrl ? (
                <img src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="text-xs font-medium">Add Cover Image URL</span>
                </div>
              )}
              <div className="absolute bottom-2 right-2 w-[calc(100%-1rem)]">
                <Input 
                  placeholder="https://..." 
                  className="h-8 text-xs bg-background/80 backdrop-blur-sm border-none shadow-sm w-full"
                  value={formData.coverImageUrl}
                  onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            
            <CardContent className="p-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Advanced Forex Strategies" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject" 
                  placeholder="e.g. Finance, Programming..." 
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="What will students learn in this class?" 
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-muted/50 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5 space-y-5">
              <h3 className="font-semibold text-lg flex items-center gap-2">Pricing & Access</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input 
                    id="price" 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00 (Free)" 
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="bg-muted/50 font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model">Billing Cycle</Label>
                  <Select 
                    value={formData.subscriptionModel} 
                    onValueChange={(val) => setFormData({ ...formData, subscriptionModel: val })}
                    disabled={!formData.price || parseFloat(formData.price) <= 0}
                  >
                    <SelectTrigger id="model" className="bg-muted/50">
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
          </Card>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" 
            disabled={!formData.name || createGroup.isPending}
          >
            {createGroup.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Launch Class
          </Button>
        </form>
      </div>
    </div>
  );
}