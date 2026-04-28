import { useQueryClient } from "@tanstack/react-query";
import {
  useListSessions,
  useUpdateSession,
  useDeleteSession,
  getListSessionsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetRecentSessionsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CheckCircle2, Sun, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { t, statusLabel } from "@/lib/i18n";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? variants.pending}`}>
      {statusLabel(status)}
    </span>
  );
}

export default function Today() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sessions, isLoading } = useListSessions(undefined, {
    query: { queryKey: getListSessionsQueryKey() },
  });
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const now = new Date();
  const todaySessions = (sessions ?? [])
    .filter(s => {
      const d = new Date(s.date);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleMarkPaid = async (id: number) => {
    await updateSession.mutateAsync({ id, data: { paid: true, status: "completed" } });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentSessionsQueryKey() });
    toast({ title: t.today.markedPaid });
  };

  const handleComplete = async (id: number) => {
    await updateSession.mutateAsync({ id, data: { status: "completed" } });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentSessionsQueryKey() });
    toast({ title: t.today.completedSuccess });
  };

  const handleDelete = async (id: number) => {
    await deleteSession.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    toast({ title: t.today.deletedSuccess });
  };

  const todayLabel = format(now, "EEEE, d 'de' MMMM", { locale: es });

  const totalCount = todaySessions.length;
  const completedCount = todaySessions.filter(s => s.status === "completed").length;
  const paidCount = todaySessions.filter(s => s.paid).length;
  const pendingCount = todaySessions.filter(s => s.status === "pending").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight capitalize">{todayLabel}</h1>
          <p className="text-muted-foreground text-sm">{t.today.subtitle}</p>
        </div>

        {!isLoading && totalCount > 0 && (
          <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-semibold text-foreground">{totalCount} {totalCount === 1 ? "sesión" : "sesiones"}</span>
            <span>·</span>
            <span><span className="font-medium text-green-700">{paidCount}</span> pagadas</span>
            <span>·</span>
            <span><span className="font-medium text-yellow-700">{pendingCount}</span> pendientes</span>
            <span>·</span>
            <span><span className="font-medium text-green-600">{completedCount}</span> completadas</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : todaySessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-yellow-50 flex items-center justify-center mb-4">
              <Sun className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-lg font-semibold mb-1">{t.today.noSessions}</p>
            <p className="text-muted-foreground text-sm mb-5 max-w-xs">{t.today.noSessionsDesc}</p>
            <Button asChild size="sm" className="gap-2">
              <Link href="/sessions">
                <Calendar className="h-4 w-4" />
                {t.today.goToSessions}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySessions.map(s => {
              const time = format(new Date(s.date), "HH:mm");
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition-colors ${s.status === "completed" ? "bg-green-50 border-green-200" : "bg-card"}`}
                >
                  <div className={`text-lg font-bold tabular-nums w-14 shrink-0 ${s.status === "completed" ? "text-green-700" : "text-primary"}`}>
                    {time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {s.clientName ?? t.sessions.unknownClient}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={s.status} />
                      {s.paid ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          {t.today.paid}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t.sessions.unpaid}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.status !== "completed" && (
                      <>
                        <Button
                          size="sm"
                          className="h-8 text-xs px-3 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleComplete(s.id)}
                          disabled={updateSession.isPending}
                        >
                          {t.today.complete}
                        </Button>
                        {!s.paid && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-3 text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => handleMarkPaid(s.id)}
                            disabled={updateSession.isPending}
                          >
                            {t.today.markPaid}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                      disabled={deleteSession.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
