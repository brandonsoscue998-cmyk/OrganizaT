import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Slot = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
};

type Trainer = {
  name: string;
  username: string | null;
};

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function PublicBooking() {
  const [, params] = useRoute("/u/:username");
  const username = params?.username ?? "";

  const [weekOffset, setWeekOffset] = useState(0);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [bookingSlotId, setBookingSlotId] = useState<number | null>(null);
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [booked, setBooked] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const fromStr = format(weekStart, "yyyy-MM-dd");
  const toStr = format(weekEnd, "yyyy-MM-dd");

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/public/u/${username}?from=${fromStr}&to=${toStr}`);
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      setTrainer(data.trainer);
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username, fromStr, toStr]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function slotsForDay(day: Date) {
    const dateStr = format(day, "yyyy-MM-dd");
    return slots.filter(s => s.date === dateStr);
  }

  function openBooking(slot: Slot) {
    setBookingSlotId(slot.id);
    setBookName("");
    setBookPhone("");
    setBookError("");
  }

  async function handleBook() {
    if (!bookName.trim()) { setBookError("Por favor, introduce tu nombre."); return; }
    setBookLoading(true);
    setBookError("");
    try {
      const res = await fetch(`${BASE}/api/public/u/${username}/book/${bookingSlotId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: bookName.trim(), phone: bookPhone.trim() || undefined }),
      });
      if (res.status === 409) { setBookError("Este horario ya ha sido reservado."); return; }
      if (!res.ok) { const d = await res.json(); setBookError(d.error ?? "Error al reservar."); return; }
      const slot = slots.find(s => s.id === bookingSlotId)!;
      setBookedSlot(slot);
      setBooked(true);
      setBookingSlotId(null);
    } catch {
      setBookError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setBookLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-bold">Página no encontrada</h1>
          <p className="text-muted-foreground mt-2 text-sm">El enlace de reserva no existe o ha expirado.</p>
        </div>
      </div>
    );
  }

  if (booked && bookedSlot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">¡Sesión reservada!</h1>
            <p className="text-muted-foreground text-sm mb-4">
              Tu reserva con <span className="font-semibold text-foreground">{trainer?.name}</span> ha sido confirmada.
            </p>
            <div className="rounded-lg bg-muted p-4 text-sm text-left space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(bookedSlot.date + "T00:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{bookedSlot.startTime} – {bookedSlot.endTime}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Recibirás más detalles de tu profesional.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {loading ? "Cargando…" : trainer ? `Reservar con ${trainer.name}` : "Reserva de sesión"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Selecciona un horario disponible para reservar tu sesión</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-center">
            {format(weekStart, "d MMM", { locale: es })} – {format(weekEnd, "d MMM yyyy", { locale: es })}
          </div>
          <div className="flex gap-2">
            {weekOffset !== 0 && (
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Hoy</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, i) => {
              const daySlots = slotsForDay(day);
              const isPast = format(day, "yyyy-MM-dd") < format(new Date(), "yyyy-MM-dd");
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <div key={i} className="flex flex-col">
                  <div className={`text-center mb-2 py-1.5 rounded-md ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                    <div className="text-xs font-medium">{DAYS_ES[i]}</div>
                    <div className={`text-sm font-bold ${isToday ? "" : "text-muted-foreground"}`}>
                      {format(day, "d")}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {daySlots.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-4 px-1">
                        {isPast ? "–" : "Sin horarios"}
                      </div>
                    ) : (
                      daySlots.map(slot => (
                        <div key={slot.id}>
                          {bookingSlotId === slot.id ? (
                            <div className="rounded-lg border bg-card p-2 shadow-sm space-y-2">
                              <p className="text-xs font-medium text-center">{slot.startTime}–{slot.endTime}</p>
                              <Input
                                placeholder="Tu nombre *"
                                value={bookName}
                                onChange={e => setBookName(e.target.value)}
                                className="h-7 text-xs"
                              />
                              <Input
                                placeholder="Teléfono (opcional)"
                                value={bookPhone}
                                onChange={e => setBookPhone(e.target.value)}
                                className="h-7 text-xs"
                              />
                              {bookError && <p className="text-xs text-destructive">{bookError}</p>}
                              <div className="flex gap-1">
                                <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleBook} disabled={bookLoading}>
                                  {bookLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setBookingSlotId(null)}>
                                  ✕
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => !isPast && openBooking(slot)}
                              disabled={isPast}
                              className="w-full rounded-lg border bg-blue-50 border-blue-200 p-1.5 text-left hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <p className="text-xs font-semibold text-blue-800">{slot.startTime}</p>
                              <p className="text-xs text-blue-600">{slot.endTime}</p>
                              <p className="text-xs text-blue-700 mt-0.5 font-medium">Reservar</p>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10">
          Powered by Practitioner
        </p>
      </div>
    </div>
  );
}
