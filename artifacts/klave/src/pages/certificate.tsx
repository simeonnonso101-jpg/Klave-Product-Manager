import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { ArrowLeft, Award, Download, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Progress = { completed: number; total: number; completedIds: number[]; courseComplete: boolean };
type Group = { id: number; name: string; description: string | null; subject: string | null; creatorId: number };

function formatDate(date: Date) {
  return date.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
}

export default function CertificatePage() {
  const { id: groupIdStr } = useParams<{ id: string }>();
  const groupId = Number(groupIdStr);

  const { data: user } = useGetCurrentUser();

  const { data: group, isLoading: loadingGroup } = useQuery<Group>({
    queryKey: ["group", groupId],
    queryFn: () => customFetch<Group>(`/api/groups/${groupId}`, { method: "GET" }),
    enabled: !!groupId,
  });

  const { data: progress, isLoading: loadingProgress } = useQuery<Progress>({
    queryKey: ["progress", groupId],
    queryFn: () => customFetch<Progress>(`/api/groups/${groupId}/progress`, { method: "GET" }),
    enabled: !!groupId,
  });

  const isLoading = loadingGroup || loadingProgress;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F3FF]">
        <Loader2 className="h-8 w-8 animate-spin text-[#5A1DE6]" />
      </div>
    );
  }

  if (!progress?.courseComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F3FF] p-6 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Award className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Certificate not available yet</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          You've completed {progress?.completed ?? 0} of {progress?.total ?? 0} lessons.
          Finish all lessons to earn your certificate.
        </p>
        <Link href={`/groups/${groupId}`}>
          <Button variant="outline" size="sm" className="rounded-full">Back to class</Button>
        </Link>
      </div>
    );
  }

  const issuedDate = formatDate(new Date());

  return (
    <div className="min-h-screen bg-[#F5F3FF] flex flex-col">
      {/* Top bar */}
      <header className="h-14 flex items-center gap-2 px-4 bg-white border-b border-border sticky top-0 z-10">
        <Link href={`/groups/${groupId}`} className="p-2 rounded-full hover:bg-muted text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-bold text-foreground flex-1">Certificate of Completion</span>
        <Button
          size="sm"
          className="rounded-full bg-[#5A1DE6] text-white gap-1.5 hover:bg-[#4A0DD6]"
          onClick={() => window.print()}
        >
          <Download className="h-3.5 w-3.5" /> Save / Print
        </Button>
      </header>

      {/* Certificate card */}
      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div
          id="certificate"
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl shadow-[#5A1DE6]/10 overflow-hidden print:shadow-none print:rounded-none"
          style={{ border: "8px solid #5A1DE6" }}
        >
          {/* Top purple band */}
          <div className="bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] px-10 py-8 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl font-black tracking-tight">Klave</span>
              <span className="text-orange-400 text-2xl">•</span>
            </div>
            <p className="text-sm text-white/70 font-medium tracking-widest uppercase">Certificate of Completion</p>
          </div>

          {/* Body */}
          <div className="px-10 py-10 text-center space-y-6">
            {/* Medal */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                  <Award className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>

            {/* This certifies */}
            <div>
              <p className="text-sm text-muted-foreground tracking-widest uppercase font-semibold mb-1">This certifies that</p>
              <h1 className="text-3xl font-black text-foreground tracking-tight">{user?.name ?? "Student"}</h1>
            </div>

            <div className="w-20 h-1 bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] rounded-full mx-auto" />

            <div>
              <p className="text-sm text-muted-foreground tracking-widest uppercase font-semibold mb-2">has successfully completed</p>
              <h2 className="text-2xl font-bold text-[#5A1DE6] leading-tight">{group?.name}</h2>
              {group?.subject && (
                <p className="text-sm text-muted-foreground mt-1">{group.subject}</p>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-8 py-4 px-6 bg-[#F5F3FF] rounded-2xl">
              <div className="text-center">
                <p className="text-2xl font-black text-[#5A1DE6]">{progress.total}</p>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Lessons</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">100%</p>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Complete</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">{issuedDate}</p>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Issued</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 pb-8 flex items-end justify-between">
            <div className="text-center">
              <div className="w-32 h-px bg-border mb-2" />
              <p className="text-xs text-muted-foreground font-medium">Student Signature</p>
            </div>
            <div className="text-center">
              <div
                className="text-[#5A1DE6] font-black text-lg italic leading-none"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Klave
              </div>
              <div className="w-32 h-px bg-border mt-2 mb-2" />
              <p className="text-xs text-muted-foreground font-medium">Platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles injected inline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #certificate, #certificate * { visibility: visible; }
          #certificate { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
