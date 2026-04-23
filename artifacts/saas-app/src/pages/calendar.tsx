import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAvailability,
  useCreateAvailability,
  useDeleteAvailability,
  useBookAvailability,
  useListClients,
  getListAvailabilityQueryKey,
  getListSessionsQueryKey,
  getListClientsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, format, isToday, startOfDay } from "date-fns";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock, Loader2, Check, X } from "lucide-react";
import { locale, formatCurrency, t } from "@/lib/i18n";

function toISODate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function weekRange(base: Date) {
  const start = startOfWeek(base, { weekStartsOn: 1 });
  const end = endOfWeek(base, { weekStartsOn: 1 });
  return { start, end, days: eachDayOfInterval({ start, end }) };
}

type InlineFormState = { startTime: string; endTime: string; error: string | null; loading: boolean };

export default function Calendar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [weekBase, setWeekBase] = useState(() => new Date());
  const { start, end, days } = weekRange(weekBase);
  const from = toISODate(start);
  const to = toISODate(end);

  // Per-day inline add forms: key = YYYY-MM-DD
  const [inlineForms, setInlineForms] = useState<Record<string, InlineFormState>>({});

  const [bookSlotId, setBookSlotId] = useState<number | null>(null);
  const [bookClientId, setBookClientId] = useState<string>("");
  const [bookPrice, setBookPrice] = useState<string>("0");
  const [bookLoading, setBookLoading] = useState(false);

  const { data: slots, isLoading } = useListAvailability(
    { from, to },
    { query: { queryKey: getListAvailabilityQueryKey({ from, to }) } }
  );

  const { data: clients } = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const createAvailability = useCreateAvailability();
  const deleteAvailability = useDeleteAvailability();
  const bookAvailability = useBookAvailability();

  const selectedClient = clients?.find(c => c.id === Number(bookClientId));
  const packActive = !!selectedClient && selectedClient.remainingSessions > 0 && selectedClient.totalSessions > 0;
  const autoPrice = packActive
    ? Number(selectedClient.packPrice) / selectedClient.totalSessions
    : null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListAvailabilityQueryKey({ from, to }) });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  const openInline = (dateKey: string) => {
    setInlineForms(prev => ({
      ...prev,
      [dateKey]: { startTime: "09:00", endTime: "10:00", error: null, loading: false },
    }));
  };

  const closeInline = (dateKey: string) => {
    setInlineForms(prev => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
  };

  const updateInline = (dateKey: string, patch: Partial<InlineFormState>) => {
    setInlineForms(prev => ({ ...prev, [dateKey]: { ...prev[dateKey], ...patch } }));
  };

  const handleInlineSave = async (dateKey: string) => {
    const form = inlineForms[dateKey];
    if (!form) return;
    if (form.endTime <= form.startTime) {
      updateInline(dateKey, { error: "La hora de fin debe ser posterior a la de inicio" });
      return;
    }
    updateInline(dateKey, { error: null, loading: true });
    try {
      await createAvailability.mutateAsync({ data: { date: dateKey, startTime: form.startTime, endTime: form.endTime } });
      queryClient.invalidateQueries({ queryKey: getListAvailabilityQueryKey({ from, to }) });
      toast({ title: t.calendar.slotCreated });
      closeInline(dateKey);
    } catch (e: unknown) {
      const raw = e as { response?: { data?: { error?: string } }; message?: string };
      const msg = raw?.response?.data?.error ?? raw?.message ?? "Error al guardar";
      updateInline(dateKey, { error: msg, loading: false });
    }
  };

  const handleDelete = async (id: number) => {
    await deleteAvailability.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListAvailabilityQueryKey({ from, to }) });
    toast({ title: t.calendar.slotDeleted });
  };

  const handleBook = async () => {
    if (!bookClientId) return;
    setBookLoading(true);
    try {
      await bookAvailability.mutateAsync({
        id: bookSlotId!,
        data: {
          clientId: Number(bookClientId),
          price: packActive ? (autoPrice ?? 0) : Number(bookPrice),
        },
      });
      invalidateAll();
      toast({ title: t.calendar.sessionBooked });
      setBookSlotId(null);
      setBookClientId("");
      setBookPrice("0");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast({ title: msg ?? "Error al reservar", variant: "destructive" });
    } finally {
      setBookLoading(false);
    }
  };

  const slotsByDay = (day: Date) => {
    const key = toISODate(day);
    return (slots ?? []).filter(s => s.date === key).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const weekLabel = `${format(start, "d MMM", { locale })} – ${format(end, "d MMM yyyy", { locale })}`;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.calendar.title}</h1>
          <p className="text-muted-foreground text-sm">{t.calendar.subtitle}</p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setWeekBase(d => addWeeks(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">{weekLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setWeekBase(d => addWeeks(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setWeekBase(new Date())}>
            {t.calendar.today}
          </Button>
        </div>

        {/* Week Grid — always shows all 7 days */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {days.map(day => {
              const dateKey = toISODate(day);
              const daySlots = slotsByDay(day);
              const dayName = format(day, "EEE", { locale });
              const dayNum = format(day, "d MMM", { locale });
              const todayDay = isToday(day);
              const pastDay = startOfDay(day) < startOfDay(new Date()) && !todayDay;
              const inlineForm = inlineForms[dateKey];

              return (
                <div key={dateKey} className="flex flex-col gap-1.5">
                  {/* Day header */}
                  <div className={`text-center py-1.5 rounded-md text-xs font-semibold ${
                    todayDay
                      ? "bg-primary text-primary-foreground"
                      : pastDay
                        ? "bg-muted/50 text-muted-foreground/60"
                        : "bg-muted/80 text-foreground"
                  }`}>
                    <div className="capitalize">{dayName}</div>
                    <div className={`text-[11px] ${todayDay ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{dayNum}</div>
                  </div>

                  {/* Slots */}
                  {daySlots.length === 0 && !inlineForm ? (
                    <div className="border border-dashed rounded-lg py-3 px-2 text-center">
                      <p className="text-[11px] text-muted-foreground/60 mb-2">No hay horarios</p>
                      {!pastDay && (
                        <button
                          onClick={() => openInline(dateKey)}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                        >
                          <Plus className="h-3 w-3" />
                          Añadir horario
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {daySlots.map(slot => (
                        <Card key={slot.id} className={`text-xs ${slot.isBooked ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
                          <CardContent className="p-2 space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 text-muted-foreground font-medium min-w-0">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span className="truncate">{slot.startTime} – {slot.endTime}</span>
                              </div>
                              {!slot.isBooked && (
                                <button
                                  onClick={() => handleDelete(slot.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                  title={t.calendar.deleteSlot}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            {slot.isBooked ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 border border-green-200">
                                  {t.calendar.booked}
                                </span>
                                {slot.clientName && (
                                  <p className="text-muted-foreground truncate text-[11px]">{slot.clientName}</p>
                                )}
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="h-6 text-[11px] px-2 w-full"
                                onClick={() => { setBookSlotId(slot.id); setBookClientId(""); setBookPrice("0"); }}
                              >
                                {t.calendar.book}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}

                      {/* Add more button (when slots exist) */}
                      {!inlineForm && !pastDay && (
                        <button
                          onClick={() => openInline(dateKey)}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium px-1 py-0.5"
                        >
                          <Plus className="h-3 w-3" />
                          Añadir horario
                        </button>
                      )}
                    </>
                  )}

                  {/* Inline add form */}
                  {inlineForm && (
                    <div className="border border-primary/30 rounded-lg bg-primary/5 p-2 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-0.5 block">{t.calendar.startTime}</Label>
                          <Input
                            type="time"
                            value={inlineForm.startTime}
                            onChange={e => updateInline(dateKey, { startTime: e.target.value })}
                            className="h-7 text-xs px-1.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground mb-0.5 block">{t.calendar.endTime}</Label>
                          <Input
                            type="time"
                            value={inlineForm.endTime}
                            onChange={e => updateInline(dateKey, { endTime: e.target.value })}
                            className="h-7 text-xs px-1.5"
                          />
                        </div>
                      </div>
                      {inlineForm.error && (
                        <p className="text-[10px] text-destructive leading-tight">{inlineForm.error}</p>
                      )}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-6 text-[11px] flex-1 gap-1 px-2"
                          onClick={() => handleInlineSave(dateKey)}
                          disabled={inlineForm.loading}
                        >
                          {inlineForm.loading
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Check className="h-3 w-3" />
                          }
                          {t.calendar.createSlot}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground"
                          onClick={() => closeInline(dateKey)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book Dialog — unchanged */}
      <Dialog open={bookSlotId !== null} onOpenChange={open => { if (!open) setBookSlotId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.calendar.bookTitle}</DialogTitle>
          </DialogHeader>
          {bookSlotId && (() => {
            const slot = slots?.find(s => s.id === bookSlotId);
            return (
              <div className="space-y-4 mt-2">
                {slot && (
                  <div className="px-3 py-2 bg-muted/50 rounded-lg text-sm">
                    <span className="font-medium">{slot.date}</span>
                    <span className="text-muted-foreground"> · {slot.startTime} – {slot.endTime}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>{t.calendar.selectClient}</Label>
                  <Select value={bookClientId} onValueChange={setBookClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.calendar.selectClient} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          <span className="flex items-center gap-2">
                            {c.name}
                            {c.totalSessions > 0 && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.remainingSessions === 0 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                                {c.remainingSessions}/{c.totalSessions}
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {bookClientId && (
                  <div className="space-y-1.5">
                    <Label>{t.calendar.price}</Label>
                    {packActive && autoPrice !== null ? (
                      <div className="flex items-center gap-2">
                        <Input value={formatCurrency(autoPrice)} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
                        <span className="text-xs text-blue-600 whitespace-nowrap font-medium">Auto</span>
                      </div>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t.calendar.pricePlaceholder}
                        value={bookPrice}
                        onChange={e => setBookPrice(e.target.value)}
                      />
                    )}
                    {packActive && (
                      <p className="text-xs text-blue-600">{t.calendar.priceAutoHint}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setBookSlotId(null)}>{t.calendar.cancel}</Button>
                  <Button onClick={handleBook} disabled={!bookClientId || bookLoading}>
                    {bookLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t.calendar.bookConfirm}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
