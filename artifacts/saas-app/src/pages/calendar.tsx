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
import { startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, format, isToday } from "date-fns";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronLeft, ChevronRight, Trash2, Clock, Loader2, CalendarDays } from "lucide-react";
import { locale, formatCurrency, t } from "@/lib/i18n";

function toISODate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function weekRange(base: Date) {
  const start = startOfWeek(base, { weekStartsOn: 1 });
  const end = endOfWeek(base, { weekStartsOn: 1 });
  return { start, end, days: eachDayOfInterval({ start, end }) };
}

export default function Calendar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [weekBase, setWeekBase] = useState(() => new Date());
  const { start, end, days } = weekRange(weekBase);
  const from = toISODate(start);
  const to = toISODate(end);

  const [addOpen, setAddOpen] = useState(false);
  const [newDate, setNewDate] = useState(toISODate(new Date()));
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

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

  const handleCreate = async () => {
    setAddError(null);
    if (newEnd <= newStart) {
      setAddError("La hora de fin debe ser posterior a la de inicio");
      return;
    }
    setAddLoading(true);
    try {
      await createAvailability.mutateAsync({ data: { date: newDate, startTime: newStart, endTime: newEnd } });
      queryClient.invalidateQueries({ queryKey: getListAvailabilityQueryKey({ from, to }) });
      toast({ title: t.calendar.slotCreated });
      setAddOpen(false);
      setNewStart("09:00");
      setNewEnd("10:00");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setAddError(msg ?? "Error al crear la disponibilidad");
    } finally {
      setAddLoading(false);
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
    return (slots ?? []).filter(s => s.date === key);
  };

  const totalSlots = slots?.length ?? 0;

  const weekLabel = `${format(start, "d MMM", { locale })} – ${format(end, "d MMM yyyy", { locale })}`;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.calendar.title}</h1>
            <p className="text-muted-foreground text-sm">{t.calendar.subtitle}</p>
          </div>
          <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); setAddError(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t.calendar.addSlot}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t.calendar.newSlotTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="newDate">{t.calendar.date}</Label>
                  <Input id="newDate" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newStart">{t.calendar.startTime}</Label>
                    <Input id="newStart" type="time" value={newStart} onChange={e => setNewStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newEnd">{t.calendar.endTime}</Label>
                    <Input id="newEnd" type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                  </div>
                </div>
                {addError && <p className="text-xs text-destructive">{addError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>{t.calendar.cancel}</Button>
                  <Button onClick={handleCreate} disabled={addLoading}>
                    {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t.calendar.createSlot}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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

        {/* Week Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : totalSlots === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <p className="font-semibold text-sm mb-1">{t.calendar.noSlots}</p>
              <p className="text-muted-foreground text-xs mb-5 max-w-xs mx-auto">{t.calendar.noSlotsDesc}</p>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.calendar.addSlot}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {days.map(day => {
              const daySlots = slotsByDay(day);
              const dayName = format(day, "EEE", { locale });
              const dayNum = format(day, "d MMM", { locale });
              const today = isToday(day);
              return (
                <div key={toISODate(day)} className="flex flex-col gap-2">
                  <div className={`text-center py-1 rounded-md text-xs font-medium ${today ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    <div className="capitalize">{dayName}</div>
                    <div className={today ? "text-primary-foreground/80" : ""}>{dayNum}</div>
                  </div>
                  {daySlots.length === 0 ? (
                    <div className="border border-dashed rounded-lg h-16 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground/50">—</span>
                    </div>
                  ) : (
                    daySlots.map(slot => (
                      <Card key={slot.id} className={`text-xs ${slot.isBooked ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
                        <CardContent className="p-2 space-y-1.5">
                          <div className="flex items-center gap-1 text-muted-foreground font-medium">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{slot.startTime} – {slot.endTime}</span>
                          </div>
                          {slot.isBooked ? (
                            <>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                {t.calendar.booked}
                              </span>
                              {slot.clientName && (
                                <p className="text-muted-foreground truncate">{slot.clientName}</p>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                {t.calendar.available}
                              </span>
                              <div className="flex gap-1 pt-0.5">
                                <Button
                                  size="sm"
                                  className="h-6 text-xs px-2 flex-1"
                                  onClick={() => { setBookSlotId(slot.id); setBookClientId(""); setBookPrice("0"); }}
                                >
                                  {t.calendar.book}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDelete(slot.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book Dialog */}
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
