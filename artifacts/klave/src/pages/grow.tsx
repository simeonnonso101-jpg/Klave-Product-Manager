import { useGetCreatorDashboard, useGetCurrentUser, useListReplicationJobs } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, Sparkles, AlertCircle, CheckCircle2, Clock, Building } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function GrowPage() {
  const { data: user } = useGetCurrentUser();
  const userId = user?.id || 1;
  
  const { data: dashboard, isLoading } = useGetCreatorDashboard(
    userId,
    { query: { enabled: !!user } }
  );

  const { data: jobs, isLoading: isJobsLoading } = useListReplicationJobs(
    { creatorId: userId },
    { query: { enabled: !!user } }
  );

  const StatCard = ({ title, value, icon, loading, subtext }: { title: string, value: string | number, icon: React.ReactNode, loading?: boolean, subtext?: string }) => (
    <Card className="bg-card border-none shadow-sm rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-5 px-5 space-y-0">
        <CardTitle className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <div className="text-primary/70 bg-primary/10 p-1.5 rounded-full">{icon}</div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <Skeleton className="h-8 w-20 mt-1" />
        ) : (
          <div>
            <div className="text-2xl font-bold tracking-tight mt-1">{value}</div>
            {subtext && <p className="text-[11px] text-muted-foreground mt-1">{subtext}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const getJobStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'processing': return <Activity className="h-5 w-5 text-primary animate-pulse" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-destructive" />;
      default: return <Clock className="h-5 w-5 text-accent" />;
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full bg-background">
        <header className="px-4 pt-10 pb-4 bg-background/90 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-[28px] font-bold tracking-tight">Growth</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              title="Total Revenue" 
              value={`$${dashboard?.totalEarnings?.toLocaleString() || '0'}`} 
              icon={<DollarSign className="h-4 w-4" />} 
              loading={isLoading} 
              subtext="Lifetime earnings"
            />
            <StatCard 
              title="Students" 
              value={dashboard?.totalStudents || 0} 
              icon={<Users className="h-4 w-4" />} 
              loading={isLoading} 
              subtext="Across all courses"
            />
            <StatCard 
              title="Active Groups" 
              value={dashboard?.activeGroups || 0} 
              icon={<Building className="h-4 w-4" />} 
              loading={isLoading} 
              subtext="Currently running"
            />
            <StatCard 
              title="Conversion" 
              value="4.2%" 
              icon={<TrendingUp className="h-4 w-4" />} 
              loading={isLoading} 
              subtext="Free to Paid"
            />
          </div>

          <div className="space-y-3 mt-8">
            <div className="flex items-center gap-2 mb-1 px-1">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase">AI Replications</h3>
            </div>
            
            <Card className="bg-card border-none shadow-sm rounded-3xl overflow-hidden">
              {isJobsLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              ) : jobs?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <div className="bg-primary/10 p-4 rounded-full mb-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">Scale your coaching</h4>
                  <p className="text-sm">Use AI to multiply your lectures across multiple student groups automatically.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {jobs?.map((job) => (
                    <div key={job.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${job.status === 'completed' ? 'bg-emerald-100' : 'bg-primary/10'}`}>
                          {getJobStatusIcon(job.status)}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold leading-tight">Lecture Broadcast</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(job.createdAt).toLocaleDateString()} • {job.replicatedCount}/{job.totalTargets} targets
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`capitalize font-bold text-[10px] tracking-wider px-2 py-0.5 ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        job.status === 'processing' ? 'bg-primary/10 text-primary' : ''
                      }`}>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
          
          <div className="space-y-3 mt-6">
            <h3 className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase px-1">Recent Subscribers</h3>
            <Card className="bg-card border-none shadow-sm rounded-3xl overflow-hidden">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : dashboard?.recentPayments?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No recent subscribers
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {dashboard?.recentPayments?.map((payment) => (
                    <div key={payment.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                          {payment.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold leading-tight">{payment.user?.name || 'User'}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[160px] mt-0.5">
                            {payment.group?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[16px] font-bold text-emerald-600">+${payment.amount}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
