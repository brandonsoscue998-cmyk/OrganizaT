import { useRoute } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetClient,
  useUpdateClient,
  useListSessions,
  getGetClientQueryKey,
  getListClientsQueryKey,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, StickyNote, Calendar, Package, Pencil, Loader2 } from "lucide-react";
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

const packSchema = z.object({
  totalSessions: z.coerce.number().min(0, t.clients.packSessionsMin),
  packPrice: z.coerce.number().min(0, t.clients.packPriceMin),
});

type PackForm = z.infer<typeof packSchema>;

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const id = params ? parseInt(params.id, 10) : 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [packDialogOpen, setPackDialogOpen] = useState(false);

  const { data: client, isLoading: clientLoading } = useGetClient(id, {
    query: { enabled: !!id, queryKey: getGetClientQueryKey(id) }
  });

  const { data: sessions, isLoading: sessionsLoading } = useListSessions({ clientId: id }, {
    query: { enabled: !!id, queryKey: getListSessionsQueryKey({ clientId: id }) }
  });

  const updateClient = useUpdateClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PackForm>({
    resolver: zodResolver(packSchema),
    values: {
      totalSessions: client?.totalSessions ?? 0,
      packPrice: client?.packPrice ?? 0,
    },
  });

  const onPackSubmit = async (data: PackForm) => {
    await updateClient.mutateAsync({
      id,
      data: {
        totalSessions: data.totalSessions,
        packPrice: data.packPrice,
      },
    });
    queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    toast({ title: t.clients.packUpdated });
    setPackDialogOpen(false);
  };

  const hasPack = (client?.totalSessions ?? 0) > 0;
  const packExhausted = hasPack && client!.remainingSessions === 0;
  const packUsed = hasPack ? client!.totalSessions - client!.remainingSessions : 0;
  const progressPct = hasPack ? Math.round((client!.remainingSessions / client!.totalSessions) * 100) : 0;

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

        {/* Pack de sesiones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t.clients.packStatus}</CardTitle>
            </div>
            <Dialog open={packDialogOpen} onOpenChange={setPackDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={clientLoading}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t.clients.editPack}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t.clients.editPack}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onPackSubmit)} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="totalSessions">{t.clients.packSessions}</Label>
                    <Input
                      id="totalSessions"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={t.clients.packSessionsPlaceholder}
                      {...register("totalSessions")}
                      className={errors.totalSessions ? "border-destructive" : ""}
                    />
                    {errors.totalSessions && <p className="text-xs text-destructive">{errors.totalSessions.message}</p>}
                    {client && (
                      <p className="text-xs text-muted-foreground">
                        Actualmente: {client.remainingSessions} de {client.totalSessions} restantes
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="packPrice">{t.clients.packPrice}</Label>
                    <Input
                      id="packPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t.clients.packPricePlaceholder}
                      {...register("packPrice")}
                      className={errors.packPrice ? "border-destructive" : ""}
                    />
                    {errors.packPrice && <p className="text-xs text-destructive">{errors.packPrice.message}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground border rounded-md px-3 py-2 bg-muted/40">
                    {t.clients.packHint}
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" onClick={() => { reset(); setPackDialogOpen(false); }}>
                      {t.clients.cancel}
                    </Button>
                    <Button type="submit" disabled={updateClient.isPending}>
                      {updateClient.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {t.clients.updatePack}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {clientLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-2 w-full" />
              </div>
            ) : !hasPack ? (
              <div className="text-center py-4">
                <p className="text-sm font-medium text-muted-foreground">{t.clients.noPack}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.clients.noPackDesc}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.clients.packRemaining(client!.remainingSessions, client!.totalSessions)}</span>
                  {packExhausted ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                      {t.clients.packExhausted}
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      {t.clients.packActive}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${packExhausted ? "bg-red-400" : "bg-blue-500"}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{packUsed} sesión{packUsed !== 1 ? "es" : ""} usada{packUsed !== 1 ? "s" : ""}</span>
                  <span>{t.clients.packPriceLabel}: {formatCurrency(client!.packPrice)}</span>
                </div>
              </div>
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
