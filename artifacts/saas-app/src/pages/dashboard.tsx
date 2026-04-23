import { useGetDashboardStats, useGetMonthlyRevenue, useGetRecentSessions, getGetDashboardStatsQueryKey, getGetMonthlyRevenueQueryKey, getGetRecentSessionsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Calendar, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

function StatCard({ title, value, icon: Icon, description, loading }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? variants.pending}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  const { data: monthlyRevenue, isLoading: revenueLoading } = useGetMonthlyRevenue({
    query: { queryKey: getGetMonthlyRevenueQueryKey() }
  });
  const { data: recentSessions, isLoading: sessionsLoading } = useGetRecentSessions({
    query: { queryKey: getGetRecentSessionsQueryKey() }
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your practice at a glance</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Clients"
            value={stats?.totalClients ?? 0}
            icon={Users}
            loading={statsLoading}
            description="Active clients"
          />
          <StatCard
            title="Sessions This Week"
            value={stats?.weeklySessions ?? 0}
            icon={Calendar}
            loading={statsLoading}
            description="Scheduled this week"
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${(stats?.monthlyRevenue ?? 0).toFixed(2)}`}
            icon={TrendingUp}
            loading={statsLoading}
            description="Completed sessions this month"
          />
          <StatCard
            title="Unpaid Balance"
            value={`$${(stats?.unpaidRevenue ?? 0).toFixed(2)}`}
            icon={AlertCircle}
            loading={statsLoading}
            description="Outstanding payments"
          />
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue from completed sessions over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !monthlyRevenue?.length ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No revenue data yet. Complete sessions to see your revenue trend.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Latest 10 sessions across all clients</CardDescription>
            </div>
            <Link href="/sessions" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !recentSessions?.length ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No sessions yet. <Link href="/sessions" className="text-primary hover:underline">Create your first session.</Link>
              </div>
            ) : (
              <div className="divide-y">
                {recentSessions.map(session => (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <div className="py-3 flex items-center justify-between hover:bg-muted/50 px-2 -mx-2 rounded-md transition-colors cursor-pointer">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{session.clientName ?? "Unknown Client"}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(session.date), "MMM d, yyyy 'at' h:mm a")}</div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <StatusBadge status={session.status} />
                        <span className="text-sm font-medium">${Number(session.price).toFixed(2)}</span>
                        {session.paid ? (
                          <span className="text-xs text-green-600 font-medium">Paid</span>
                        ) : (
                          <span className="text-xs text-yellow-600 font-medium">Unpaid</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
