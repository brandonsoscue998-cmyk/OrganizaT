import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSessions,
  useCreateSession,
  useUpdateSession,
  useListClients,
  useDeleteSession,
  getListSessionsQueryKey,
  getListClientsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetRecentSessionsQueryKey,
  getGetMonthlyRevenueQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, ChevronRight, ChevronDown, Loader2, Package, Info, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { t, locale, formatCurrency, statusLabel } from "@/lib/i18n";

const sessionSchema = z.object({
  clientId: z.coerce.number().min(1, t.sessions.clientRequired),
  date: z.string().min(1, t.sessions.dateRequired),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  price: z.coerce.number().min(0, t.sessions.priceMin).default(0),
  paid: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

type SessionForm = z.infer<typeof sessionSchema>;

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

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const filterOptions = [
  { value: "all", label: t.sessions.filterAll },
  { value: "pending", label: t.sessions.filterPending },
  { value: "completed", label: t.sessions.filterCompleted },
  { value: "cancelled", label: t.sessions.filterCancelled },
];

export default function Sessions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: sessions, isLoading } = useListSessions(undefined, { query: { queryKey: getListSessionsQueryKey() } });
  const { data: clients } = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const togglePaid = async (session: { id: number; paid: boolean }) => {
    const newPaid = !session.paid;
    const newStatus = newPaid ? "completed" : "pending";
    queryClient.setQueryData(getListSessionsQueryKey(), (old: typeof sessions) =>
      old?.map(s => s.id === session.id ? { ...s, paid: newPaid, status: newStatus } : s)
    );
    await updateSession.mutateAsync({ id: session.id, data: { paid: newPaid, status: newStatus } });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    toast({ title: newPaid ? t.sessions.markedPaid : t.sessions.markedUnpaid });
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: toLocalDateTimeString(new Date()),
      status: "pending",
      paid: false,
      price: 0,
    },
  });

  const watchedClientId = watch("clientId");
  const selectedClient = clients?.find(c => c.id === Number(watchedClientId));
  const packActive = !!selectedClient && selectedClient.totalSessions > 0 && selectedClient.remainingSessions > 0;
  const autoPrice = packActive
    ? Number(selectedClient.packPrice) / selectedClient.totalSessions
    : null;

  const onSubmit = async (data: SessionForm) => {
    await createSession.mutateAsync({
      data: {
        clientId: data.clientId,
        date: new Date(data.date).toISOString(),
        status: data.status,
        price: packActive ? (autoPrice ?? 0) : data.price,
        paid: data.paid,
        notes: data.notes ?? null,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMonthlyRevenueQueryKey() });
    toast({ title: t.sessions.createdSuccess });
    reset();
    setOpen(false);
  };

  const handleDelete = async (id: number) => {
    await deleteSession.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMonthlyRevenueQueryKey() });
  };

  const filtered = sessions?.filter(s => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return !s.paid && s.status !== "cancelled";
    if (filterStatus === "completed") return s.paid;
    if (filterStatus === "cancelled") return s.status === "cancelled";
    return true;
  }) ?? [];
  const totalIsEmpty = !isLoading && sessions?.length === 0;

  const handleRemind = (clientName: string, clientId: number | undefined) => {
    const phone = clients?.find(c => c.id === clientId)?.phone ?? "";
    const msg = `Hola ${clientName}! 👋\nTienes sesiones pendientes de pago conmigo 😊\nCuando puedas lo vemos, gracias!`;
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      toast({ title: "Mensaje copiado al portapapeles" });
    }
  };

  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const toggleClient = (key: string) =>
    setExpandedClients(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const grouped = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    };
    const map = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const key = String(s.clientId ?? s.clientName ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).map(([key, ss]) => {
      const paymentMode = clients?.find(c => c.id === ss[0].clientId)?.paymentMode ?? "per_session";
      const monthSessions = ss.filter(s => isCurrentMonth(s.date));
      return {
        key,
        clientName: ss[0].clientName ?? t.sessions.unknownClient,
        clientId: ss[0].clientId,
        paymentMode,
        sessions: ss.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        allPaid: ss.every(s => s.paid),
        anyPaid: ss.some(s => s.paid),
        totalAmount: ss.reduce((sum, s) => sum + Number(s.price), 0),
        paidAmount: ss.filter(s => s.paid).reduce((sum, s) => sum + Number(s.price), 0),
        pendingAmount: ss.filter(s => !s.paid).reduce((sum, s) => sum + Number(s.price), 0),
        pendingSessions: ss.filter(s => !s.paid).length,
        monthSessionCount: monthSessions.length,
        monthAmount: monthSessions.reduce((sum, s) => sum + Number(s.price), 0),
      };
    });
  }, [filtered, clients]);

  const newSessionDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={`gap-2 transition-all ${totalIsEmpty ? "ring-2 ring-primary ring-offset-2 shadow-md" : ""}`}
        >
          <Plus className="h-4 w-4" />
          {t.sessions.newSession}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.sessions.newSessionTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>{t.sessions.client}</Label>
            <Select onValueChange={(v) => setValue("clientId", parseInt(v, 10))}>
              <SelectTrigger className={errors.clientId ? "border-destructive" : ""}>
                <SelectValue placeholder={t.sessions.selectClient} />
              </SelectTrigger>
              <SelectContent>
                {clients?.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <span className="flex items-center gap-2">
                      {c.name}
                      {c.totalSessions > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.remainingSessions === 0 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                          {c.remainingSessions === 0 ? t.clients.packExhausted : `${c.remainingSessions}/${c.totalSessions}`}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
          </div>

          {packActive && selectedClient ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span>{t.sessions.packRemainingHint(selectedClient.remainingSessions, selectedClient.totalSessions)}</span>
            </div>
          ) : !watchedClientId ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border text-muted-foreground text-xs">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>{t.sessions.packPriceHint}</span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="date">{t.sessions.dateTime}</Label>
            <Input id="date" type="datetime-local" {...register("date")} className={errors.date ? "border-destructive" : ""} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.sessions.status}</Label>
              <Select defaultValue="pending" onValueChange={(v) => setValue("status", v as "pending" | "completed" | "cancelled")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t.sessions.filterPending}</SelectItem>
                  <SelectItem value="completed">{t.sessions.filterCompleted}</SelectItem>
                  <SelectItem value="cancelled">{t.sessions.filterCancelled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">{t.sessions.price}</Label>
              {packActive && autoPrice !== null ? (
                <div className="relative">
                  <Input
                    id="price"
                    type="text"
                    value={formatCurrency(autoPrice)}
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium pointer-events-none">
                    Auto
                  </span>
                </div>
              ) : (
                <>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t.sessions.pricePlaceholder}
                    {...register("price")}
                    className={errors.price ? "border-destructive" : ""}
                  />
                  {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
                </>
              )}
              {packActive && autoPrice !== null && (
                <p className="text-xs text-blue-600">{t.sessions.priceAutoHint(formatCurrency(autoPrice))}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="paid"
              checked={watch("paid")}
              onCheckedChange={(v) => setValue("paid", !!v)}
            />
            <Label htmlFor="paid">{t.sessions.markAsPaid}</Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t.sessions.sessionNotes} <span className="text-muted-foreground">{t.sessions.notesOptional}</span></Label>
            <Textarea id="notes" rows={2} placeholder={t.sessions.notesPlaceholder} {...register("notes")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.sessions.cancel}</Button>
            <Button type="submit" disabled={createSession.isPending}>
              {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.sessions.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.sessions.title}</h1>
            <p className="text-muted-foreground text-sm">{t.sessions.subtitle}</p>
          </div>
          {newSessionDialog}
        </div>

        {!totalIsEmpty && (
          <div className="flex gap-2 flex-wrap">
            {filterOptions.map(opt => (
              <Button
                key={opt.value}
                variant={filterStatus === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        <Card>
          {!totalIsEmpty && (
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t.sessions.sessionCount(filtered.length, filterStatus)}
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : totalIsEmpty ? (
              <div className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <p className="font-semibold text-sm mb-1">{t.sessions.noSessions}</p>
                <p className="text-muted-foreground text-xs mb-5 max-w-xs mx-auto">{t.sessions.noSessionsEmpty}</p>
                <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t.sessions.createFirst}
                </Button>
              </div>
            ) : !filtered.length ? (
              <div className="py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm font-medium">{t.sessions.noSessions}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {t.sessions.noSessionsDesc(filterStatus)}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {grouped.map(group => {
                  const isOpen = expandedClients.has(group.key);
                  return (
                    <div key={group.key}>
                      {/* Client group header */}
                      <div className="flex items-center">
                      <div
                        onClick={() => toggleClient(group.key)}
                        className="flex-1 flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="font-medium text-sm flex items-center gap-2">
                              <Link
                                href={group.clientId ? `/clients/${group.clientId}` : "#"}
                                onClick={e => e.stopPropagation()}
                                className="hover:text-primary transition-colors truncate"
                              >
                                {group.clientName}
                              </Link>
                              <span className="text-xs text-muted-foreground font-normal shrink-0">
                                {group.sessions.length} {group.sessions.length === 1 ? "sesión" : "sesiones"}
                              </span>
                            </div>
                            {group.paymentMode === "monthly" ? (
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">Mensual</span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{group.monthSessionCount}</span> sesiones este mes</span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground">Total a cobrar: <span className="font-semibold text-foreground">{formatCurrency(group.monthAmount)}</span></span>
                                <span className="text-[10px] text-blue-600 italic">Se cobra a final de mes</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {group.allPaid ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">Todas pagadas</span>
                                ) : group.anyPaid ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">Parcialmente pagada</span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">Pendiente de pago</span>
                                )}
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground">Total <span className="font-semibold text-foreground">{formatCurrency(group.totalAmount)}</span></span>
                                {group.paidAmount > 0 && (
                                  <span className="text-[10px] text-green-700">Pagado <span className="font-semibold">{formatCurrency(group.paidAmount)}</span></span>
                                )}
                                {group.pendingAmount > 0 && (
                                  <span className="text-[10px] text-yellow-700">Pendiente <span className="font-semibold">{formatCurrency(group.pendingAmount)}</span></span>
                                )}
                                {group.pendingSessions === 0 ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">✔ Cliente frecuente</span>
                                ) : group.pendingSessions <= 2 ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">⚠ Tiene pagos pendientes</span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">🚨 Alto riesgo de impago</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center shrink-0">
                          {isOpen
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                        </div>
                      </div>
                      {group.pendingSessions > 0 && (
                        <button
                          onClick={() => handleRemind(group.clientName, group.clientId ?? undefined)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 mx-3 rounded-md text-xs font-medium text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors shrink-0"
                          title={clients?.find(c => c.id === group.clientId)?.phone ? "Abrir WhatsApp" : "Copiar mensaje"}
                        >
                          <MessageCircle className="h-3 w-3" />
                          {clients?.find(c => c.id === group.clientId)?.phone ? "Recordar pago" : "Copiar mensaje"}
                        </button>
                      )}
                      </div>

                      {/* Expanded session rows */}
                      {isOpen && (
                        <div className="bg-muted/20 border-t divide-y">
                          {group.sessions.map(session => (
                            <div key={session.id} className="px-8 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                              <Link href={`/sessions/${session.id}`} className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium text-foreground">
                                      {format(new Date(session.date), "d MMM yyyy 'a las' HH:mm", { locale })}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <StatusBadge status={session.status} />
                                      <span className="text-xs text-muted-foreground">{formatCurrency(Number(session.price))}</span>
                                      {session.isGroup && (
                                        <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                          Grupal ({session.people})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {session.paid ? (
                                  <button
                                    onClick={() => togglePaid(session)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 transition-colors"
                                  >
                                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor"><path fillRule="evenodd" d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.5 5.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06L4.25 7.19l4.97-4.97a.75.75 0 0 1 1.06.06Z" clipRule="evenodd" /></svg>
                                    {t.sessions.paidButton}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => togglePaid(session)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition-colors whitespace-nowrap"
                                  >
                                    {t.sessions.markPaidButton}
                                  </button>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t.sessions.deleteTitle}</AlertDialogTitle>
                                      <AlertDialogDescription>{t.sessions.deleteDesc}</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t.sessions.cancel}</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(session.id)}>
                                        {t.sessions.deleteConfirm}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
