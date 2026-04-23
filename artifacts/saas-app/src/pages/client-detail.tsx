import { useRoute } from "wouter";
import {
  useGetClient,
  useListSessions,
  getGetClientQueryKey,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, StickyNote, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { t, locale, formatCurrency, statusLabel } from "@/lib/i18n";

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

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const id = params ? parseInt(params.id, 10) : 0;

  const { data: client, isLoading: clientLoading } = useGetClient(id, {
    query: { enabled: !!id, queryKey: getGetClientQueryKey(id) }
  });

  const { data: sessions, isLoading: sessionsLoading } = useListSessions({ clientId: id }, {
    query: { enabled: !!id, queryKey: getListSessionsQueryKey({ clientId: id }) }
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            {clientLoading ? (
              <Skeleton className="h-7 w-40" />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight">{client?.name}</h1>
            )}
            <p className="text-muted-foreground text-sm">{t.clients.profile}</p>
          </div>
        </div>

        {/* Información de contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.clients.contactInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-64" />
              </div>
            ) : (
              <>
                {client?.phone ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t.clients.noPhone}</p>
                )}
                {client?.notes ? (
                  <div className="flex items-start gap-2 text-sm">
                    <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="whitespace-pre-wrap">{client.notes}</span>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        {/* Sesiones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t.clients.clientSessions}</CardTitle>
            <Link href={`/sessions?clientId=${id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {t.clients.viewAllSessions}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {sessionsLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !sessions?.length ? (
              <div className="py-10 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm">{t.clients.noSessionsForClient}</p>
              </div>
            ) : (
              <div className="divide-y">
                {sessions.map(session => (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <div className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                      <div>
                        <div className="text-sm font-medium">
                          {format(new Date(session.date), "EEEE, d MMM yyyy", { locale })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(session.date), "HH:mm", { locale })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={session.status} />
                        <span className="text-sm font-medium">{formatCurrency(Number(session.price))}</span>
                        {session.paid ? (
                          <span className="text-xs text-green-600 font-medium">{t.sessions.paid}</span>
                        ) : (
                          <span className="text-xs text-yellow-600 font-medium">{t.sessions.unpaid}</span>
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
