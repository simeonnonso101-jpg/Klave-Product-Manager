import { useGetCreatorDashboard, useGetCurrentUser, useListReplicationJobs, useListPayments } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, Sparkles, AlertCircle, CheckCircle2, Clock } from "lucide-react";
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

  const { data: payments, isLoading: isPaymentsLoading } = useListPayments(
    { userId: undefined }, // List all payments to my groups? Actually params are { userId?: number, groupId?: number }. We can just list all for demo or pass groupId.
    // The spec says ListPaymentsParams: userId, groupId. We'll just fetch all.
    { query: { enabled: !!user } }
  );

  const StatCard = ({ title, value, icon, loading }: { title: string, value: string | number, icon: React.ReactNode, loading?: boolean }) => (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-bold tracking-tight">{value}</div>
        )}
      </CardContent>
    </Card>
  );

  const getJobStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'processing': return <Activity className="h-4 w-4 text-primary animate-pulse" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <header className="px-4 pt-12 pb-4 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-2xl font-bold tracking-tight">Creator Growth</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              title="Total Revenue" 
              value={`$${dashboard?.totalEarnings?.toLocaleString() || '0'}`} 
              icon={<DollarSign className="h-4 w-4" />} 
              loading={isLoading} 
            />
            <StatCard 
              title="Active Students" 
              value={dashboard?.totalStudents || 0} 
              icon={<Users className="h-4 w-4" />} 
              loading={isLoading} 
            />
            <StatCard 
              title="Active Classes" 
              value={dashboard?.activeGroups || 0} 
              icon={<TrendingUp className="h-4 w-4" />} 
              loading={isLoading} 
            />
            <StatCard 
              title="Conversion" 
              value="4.2%" 
              icon={<Activity className="h-4 w-4" />} 
              loading={isLoading} 
            />
          </div>

          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold tracking-tight uppercase">AI Replication Jobs</h3>
            </div>
            
            <Card className="bg-card border-border overflow-hidden">
              {isJobsLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : jobs?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No AI replication jobs yet.</p>
                  <p className="text-xs mt-1">Use AI to multiply your lectures across groups.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {jobs?.map((job) => (
                    <div key={job.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-full">
                          {getJobStatusIcon(job.status)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Lecture sync</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()} • {job.replicatedCount}/{job.totalTargets} targets
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`capitalize ${
                        job.status === 'completed' ? 'border-emerald-500/50 text-emerald-500' :
                        job.status === 'processing' ? 'border-primary/50 text-primary' : ''
                      }`}>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
          
          <div className="space-y-4 mt-8">
            <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">Recent Subscribers</h3>
            <Card className="bg-card border-border overflow-hidden">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : dashboard?.recentPayments?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No recent subscribers
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {dashboard?.recentPayments?.map((payment) => (
                    <div key={payment.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {payment.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{payment.user?.name || 'User'}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[150px]">
                            {payment.group?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-500">+${payment.amount}</p>
                        <p className="text-xs text-muted-foreground">
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