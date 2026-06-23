import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Pencil, Trash2,
  BookOpen, Video, Paperclip, Loader2, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Lesson = {
  id: number; groupId: number; title: string; body: string | null;
  videoUrl: string | null; attachmentUrl: string | null;
  position: number; isPublished: boolean; createdAt: string; updatedAt: string;
};
type Sibling = { id: number; title: string; position: number } | null;
type LessonDetail = { lesson: Lesson; prev: Sibling; next: Sibling; isCreator: boolean };

function VideoEmbed({ url }: { url: string }) {
  // YouTube / Vimeo short-link conversion. Anything else renders as a link.
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (yt) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden shadow-lg mb-6 bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${yt[1]}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Lesson video"
        />
      </div>
    );
  }
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden shadow-lg mb-6 bg-black">
        <iframe
          className="w-full h-full"
          src={`https://player.vimeo.com/video/${vm[1]}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Lesson video"
        />
      </div>
    );
  }
  // Direct mp4 / other video URL.
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
    return (
      <video controls className="w-full rounded-2xl shadow-lg mb-6 bg-black" src={url}>
        Your browser doesn't support video playback.
      </video>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm font-semibold text-[#5A1DE6] dark:text-[#9F75FF] mb-4 hover:underline">
      <Video className="h-4 w-4" /> Watch video
    </a>
  );
}

function LessonBody({ body }: { body: string }) {
  // Simple Markdown-lite renderer: bold, italic, headers, code, line breaks.
  // Not a full MD parser — keeps bundle tiny without adding a dep.
  const paragraphs = body.split(/\n{2,}/);
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-base leading-relaxed text-foreground">
      {paragraphs.map((para, i) => {
        if (/^### /.test(para)) return <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-foreground">{para.replace(/^### /, "")}</h3>;
        if (/^## /.test(para)) return <h2 key={i} className="text-xl font-bold mt-8 mb-2 text-foreground">{para.replace(/^## /, "")}</h2>;
        if (/^# /.test(para)) return <h1 key={i} className="text-2xl font-bold mt-8 mb-3 text-foreground">{para.replace(/^# /, "")}</h1>;
        if (/^- /.test(para)) {
          const items = para.split("\n").filter(l => l.startsWith("- ")).map(l => l.replace(/^- /, ""));
          return <ul key={i} className="list-disc list-inside space-y-1 text-muted-foreground">{items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
        }
        const inline = para
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
          .replace(/\n/g, '<br/>');
        return <p key={i} className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: inline }} />;
      })}
    </div>
  );
}

export default function LessonViewPage() {
  const { id: groupIdStr, lessonId: lessonIdStr } = useParams<{ id: string; lessonId: string }>();
  const groupId = Number(groupIdStr);
  const lessonId = Number(lessonIdStr);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<LessonDetail>({
    queryKey: ["lesson", groupId, lessonId],
    queryFn: () => customFetch<LessonDetail>(`/api/groups/${groupId}/lessons/${lessonId}`, { method: "GET" }),
    enabled: !!groupId && !!lessonId,
  });

  const togglePublish = useMutation({
    mutationFn: (published: boolean) =>
      customFetch(`/api/groups/${groupId}/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: published }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson", groupId, lessonId] });
      qc.invalidateQueries({ queryKey: ["lessons", groupId] });
      toast({ title: data?.lesson.isPublished ? "Lesson hidden" : "Lesson published" });
    },
  });

  const deleteLesson = useMutation({
    mutationFn: () =>
      customFetch(`/api/groups/${groupId}/lessons/${lessonId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons", groupId] });
      toast({ title: "Lesson deleted" });
      setLocation(`/groups/${groupId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <div className="h-14 border-b border-border/50 flex items-center px-4 gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-3 p-6 text-center bg-background">
        <BookOpen className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold text-foreground">Lesson not found</p>
        <Link href={`/groups/${groupId}`}>
          <Button variant="outline" size="sm" className="rounded-full">Back to class</Button>
        </Link>
      </div>
    );
  }

  const { lesson, prev, next, isCreator } = data;

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <header className="h-14 flex items-center gap-2 px-2 sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/60 shrink-0">
        <Link href={`/groups/${groupId}`} className="p-2 rounded-full hover:bg-muted text-foreground transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lesson {lesson.position + 1}</p>
          <p className="text-[15px] font-bold text-foreground truncate leading-tight">{lesson.title}</p>
        </div>
        {isCreator && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost" size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => togglePublish.mutate(!lesson.isPublished)}
              disabled={togglePublish.isPending}
              title={lesson.isPublished ? "Hide lesson" : "Publish lesson"}
            >
              {togglePublish.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : lesson.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setLocation(`/groups/${groupId}/lessons/${lessonId}/edit`)}
              title="Edit lesson"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive"
                  title="Delete lesson"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone. Students will lose access immediately.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteLesson.mutate()}
                    disabled={deleteLesson.isPending}
                  >
                    {deleteLesson.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-6 pb-10 max-w-prose mx-auto w-full space-y-6">
          {!lesson.isPublished && (
            <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
              <EyeOff className="h-3 w-3 mr-1" /> Hidden from students
            </Badge>
          )}

          {lesson.videoUrl && <VideoEmbed url={lesson.videoUrl} />}

          {lesson.body && lesson.body.trim() && (
            <section>
              <LessonBody body={lesson.body} />
            </section>
          )}

          {lesson.attachmentUrl && (
            <a
              href={lesson.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 p-4 bg-card border border-border rounded-2xl hover:border-[#5A1DE6]/40 transition-colors group"
            >
              <div className="h-10 w-10 rounded-xl bg-[#5A1DE6]/10 text-[#5A1DE6] flex items-center justify-center shrink-0">
                <Paperclip className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-[#5A1DE6] transition-colors truncate">Download attachment</p>
                <p className="text-xs text-muted-foreground truncate">{lesson.attachmentUrl.split("/").pop()}</p>
              </div>
            </a>
          )}

          {!lesson.videoUrl && !lesson.body && !lesson.attachmentUrl && (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">This lesson has no content yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Prev / Next nav */}
      {(prev || next) && (
        <div className="shrink-0 border-t border-border/60 bg-background/90 backdrop-blur-xl px-4 py-3 flex gap-3">
          {prev ? (
            <Link href={`/groups/${groupId}/lessons/${prev.id}`} className="flex-1">
              <button className="w-full flex items-center gap-2 p-3 bg-card border border-border rounded-2xl hover:border-[#5A1DE6]/40 transition-colors text-left">
                <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Previous</p>
                  <p className="text-sm font-bold text-foreground truncate">{prev.title}</p>
                </div>
              </button>
            </Link>
          ) : <div className="flex-1" />}
          {next ? (
            <Link href={`/groups/${groupId}/lessons/${next.id}`} className="flex-1">
              <button className="w-full flex items-center justify-end gap-2 p-3 bg-card border border-border rounded-2xl hover:border-[#5A1DE6]/40 transition-colors text-right">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next</p>
                  <p className="text-sm font-bold text-foreground truncate">{next.title}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </Link>
          ) : <div className="flex-1" />}
        </div>
      )}
    </div>
  );
}
