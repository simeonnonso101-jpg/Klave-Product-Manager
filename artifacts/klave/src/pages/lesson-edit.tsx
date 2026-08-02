import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { ArrowLeft, Check, Loader2, Video, BookOpen, Paperclip, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Lesson = {
  id: number; groupId: number; title: string; body: string | null;
  videoUrl: string | null; attachmentUrl: string | null;
  position: number; isPublished: boolean;
};

export default function LessonEditPage() {
  const { id: groupIdStr, lessonId: lessonIdStr } = useParams<{ id: string; lessonId: string }>();
  const groupId = Number(groupIdStr);
  const lessonId = lessonIdStr && lessonIdStr !== "new" ? Number(lessonIdStr) : null;
  const isNew = lessonId === null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [publishAt, setPublishAt] = useState(""); // ISO datetime-local string
  const [hydrated, setHydrated] = useState(isNew); // new lessons start hydrated

  const { data: existingLesson, isLoading } = useQuery<{ lesson: Lesson }>({
    queryKey: ["lesson", groupId, lessonId],
    queryFn: () =>
      customFetch<{ lesson: Lesson }>(`/api/groups/${groupId}/lessons/${lessonId}`, { method: "GET" }),
    enabled: !isNew && !!groupId && !!lessonId,
  });

  useEffect(() => {
    if (existingLesson && !hydrated) {
      const l = existingLesson.lesson;
      setTitle(l.title);
      setBody(l.body ?? "");
      setVideoUrl(l.videoUrl ?? "");
      setAttachmentUrl(l.attachmentUrl ?? "");
      setIsPublished(l.isPublished);
      if ((l as any).publishAt) {
        // Convert stored UTC ISO string → local datetime-local value
        const d = new Date((l as any).publishAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        setPublishAt(
          `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        );
      }
      setHydrated(true);
    }
  }, [existingLesson, hydrated]);

  const createLesson = useMutation({
    mutationFn: (payload: object) =>
      customFetch<Lesson>(`/api/groups/${groupId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (lesson) => {
      qc.invalidateQueries({ queryKey: ["lessons", groupId] });
      toast({ title: "Lesson created" });
      setLocation(`/groups/${groupId}/lessons/${lesson.id}`);
    },
    onError: (e: any) => toast({ title: "Couldn't create lesson", description: e?.message, variant: "destructive" }),
  });

  const updateLesson = useMutation({
    mutationFn: (payload: object) =>
      customFetch<Lesson>(`/api/groups/${groupId}/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (lesson) => {
      qc.invalidateQueries({ queryKey: ["lessons", groupId] });
      qc.invalidateQueries({ queryKey: ["lesson", groupId, lessonId] });
      toast({ title: "Lesson saved" });
      setLocation(`/groups/${groupId}/lessons/${lesson.id}`);
    },
    onError: (e: any) => toast({ title: "Couldn't save lesson", description: e?.message, variant: "destructive" }),
  });

  const isPending = createLesson.isPending || updateLesson.isPending;

  const [aiWriteLoading, setAiWriteLoading] = useState(false);
  const handleAiWrite = async () => {
    if (!title.trim()) {
      toast({ title: "Enter a lesson title first", variant: "destructive" });
      return;
    }
    setAiWriteLoading(true);
    try {
      const result = await customFetch<{ content: string }>("/api/ai/write-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      setBody(result.content);
      toast({ title: "AI content ready", description: "Review and edit as needed before saving." });
    } catch (err: any) {
      toast({ title: "AI error", description: err?.message ?? "Could not generate content.", variant: "destructive" });
    } finally {
      setAiWriteLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const payload = {
      title: title.trim(),
      body: body.trim() || null,
      videoUrl: videoUrl.trim() || null,
      attachmentUrl: attachmentUrl.trim() || null,
      isPublished,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
    };
    if (isNew) createLesson.mutate(payload);
    else updateLesson.mutate(payload);
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <header className="h-14 flex items-center gap-2 px-2 sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/60 shrink-0">
        <Link
          href={isNew ? `/groups/${groupId}` : `/groups/${groupId}/lessons/${lessonId}`}
          className="p-2 rounded-full hover:bg-muted text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-[17px] font-bold truncate">
          {isNew ? "New lesson" : "Edit lesson"}
        </h1>
        <Button
          type="submit"
          form="lesson-form"
          disabled={isPending || !title.trim()}
          className="h-9 px-4 mr-2 rounded-full bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 disabled:opacity-50 shadow-sm"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving</>
          ) : (
            <><Check className="h-4 w-4 mr-1.5" /> Save</>
          )}
        </Button>
      </header>

      <form id="lesson-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pt-6 pb-32 space-y-5 max-w-screen-md mx-auto w-full">
        <section className="space-y-2">
          <Label htmlFor="lesson-title" className="font-semibold text-sm">Title</Label>
          <Input
            id="lesson-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to the course"
            className="h-12 rounded-xl border-border/60 text-base"
            autoFocus={isNew}
          />
        </section>

        <section className="space-y-2">
          <Label htmlFor="lesson-video" className="font-semibold text-sm flex items-center gap-1.5">
            <Video className="h-4 w-4 text-muted-foreground" /> Video URL
          </Label>
          <Input
            id="lesson-video"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube, Vimeo, or direct .mp4 link"
            className="h-12 rounded-xl border-border/60 text-base"
            type="url"
          />
          <p className="text-[11px] text-muted-foreground">Paste a YouTube or Vimeo URL — it'll embed automatically.</p>
        </section>

        <section className="space-y-2">
          <Label htmlFor="lesson-body" className="font-semibold text-sm flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-muted-foreground" /> Content
          </Label>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#5A1DE6]/5 border border-[#5A1DE6]/15">
            <Sparkles className="h-3.5 w-3.5 text-[#5A1DE6] shrink-0" />
            <p className="flex-1 text-xs text-[#5A1DE6] font-medium">Enter a title above, then let AI draft the lesson content for you.</p>
            <button
              type="button"
              onClick={handleAiWrite}
              disabled={aiWriteLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5A1DE6] text-white text-xs font-semibold hover:bg-[#4A0DD6] disabled:opacity-50 transition-colors shrink-0"
            >
              {aiWriteLoading
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Sparkles className="h-3 w-3" />}
              {aiWriteLoading ? "Writing…" : "AI Write"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span />
          </div>
          <Textarea
            id="lesson-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Write your lesson notes here. Markdown is supported:\n\n# Heading\n**Bold text**\n- Bullet point\n`inline code`"}
            className="min-h-[260px] resize-none rounded-xl border-border/60 text-base font-mono leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground">Supports # headers, **bold**, *italic*, `code`, and - bullet lists.</p>
        </section>

        <section className="space-y-2">
          <Label htmlFor="lesson-attachment" className="font-semibold text-sm flex items-center gap-1.5">
            <Paperclip className="h-4 w-4 text-muted-foreground" /> Attachment URL <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="lesson-attachment"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="Link to a PDF, worksheet, template..."
            className="h-12 rounded-xl border-border/60 text-base"
            type="url"
          />
        </section>

        <section className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl">
          <div className="flex items-center gap-2.5">
            {isPublished ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm font-semibold text-foreground">Published</p>
              <p className="text-[11px] text-muted-foreground">
                {isPublished ? "Students can see this lesson." : "Hidden from students."}
              </p>
            </div>
          </div>
          <Switch
            checked={isPublished}
            onCheckedChange={setIsPublished}
            className="data-[state=checked]:bg-emerald-500"
          />
        </section>

        {/* Drip scheduling */}
        <section className="p-4 bg-card border border-border rounded-2xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#5A1DE6]/10 flex items-center justify-center shrink-0">
              <span className="text-sm">⏰</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Schedule Release</p>
              <p className="text-[11px] text-muted-foreground">
                Set a future date to auto-release this lesson (drip). Leave empty for instant access.
              </p>
            </div>
          </div>
          <input
            type="datetime-local"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            className="w-full h-11 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5A1DE6]/30"
          />
          {publishAt && (
            <button type="button" onClick={() => setPublishAt("")}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors underline">
              Clear schedule (release immediately)
            </button>
          )}
        </section>

        <p className="text-[12px] text-muted-foreground pt-1">
          Tap <span className="font-semibold text-foreground">Save</span> at the top when you're done.
        </p>
      </form>
    </div>
  );
}
