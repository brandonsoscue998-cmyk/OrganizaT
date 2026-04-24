import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Calendar, Clock, Zap, ShieldCheck, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  role?: string;
  spaceName?: string | null;
  pricePerSlot?: string | null;
  groupExtraPrice?: string | null;
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
  const [bookPeople, setBookPeople] = useState(1);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [booked, setBooked] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);
  const [bookPending, setBookPending] = useState(false);

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
    setBookPeople(1);
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
        body: JSON.stringify({ name: bookName.trim(), phone: bookPhone.trim() || undefined, people: bookPeople }),
      });
      if (res.status === 409) { setBookError("Este horario ya ha sido reservado."); return; }
      if (!res.ok) { const d = await res.json(); setBookError(d.error ?? "Error al reservar."); return; }
      const slot = slots.find(s => s.id === bookingSlotId)!;
      setBookedSlot(slot);
      setBookPending(res.status === 202);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex items-center justify-center mb-6">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center shadow-md ${bookPending ? "bg-amber-100" : "bg-green-100"}`}>
              <CheckCircle2 className={`h-10 w-10 ${bookPending ? "text-amber-600" : "text-green-600"}`} />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">{bookPending ? "¡Solicitud enviada!" : "¡Reserva confirmada!"}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {bookPending
              ? <>Tu solicitud ha sido enviada a <span className="font-semibold text-foreground">{trainer?.name}</span>. Te confirmará la cita pronto.</>
              : <>Tu sesión con <span className="font-semibold text-foreground">{trainer?.name}</span> está lista.</>
            }
          </p>
          <Card className="shadow-sm">
            <CardContent className="pt-5 pb-5 space-y-3 text-sm text-left">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <span className="capitalize">{format(new Date(bookedSlot.date + "T00:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <span>{bookedSlot.startTime} – {bookedSlot.endTime}</span>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-5">{bookPending ? "Recibirás confirmación cuando el profesional acepte tu solicitud." : "Tu profesional se pondrá en contacto contigo pronto."}</p>
          <p className="text-[11px] text-muted-foreground/50 mt-8">Powered by <span className="font-semibold">Organiza<span className="text-primary/70">T</span></span></p>
        </div>
      </div>
    );
  }

  const availableCount = slots.filter(s => !s.isBooked).length;
  const initials = trainer ? trainer.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const subtitle = trainer?.role === "owner" && trainer.spaceName ? trainer.spaceName : "Entrenador Personal";
  const price = trainer?.pricePerSlot ? Number(trainer.pricePerSlot) : null;
  const groupExtra = trainer?.groupExtraPrice ? Number(trainer.groupExtraPrice) : 0;
  const bookIsGroup = bookPeople > 2;
  const totalPrice = price !== null ? price + (bookIsGroup ? groupExtra : 0) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Profile hero ── */}
        <div className="text-center mb-8">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-40 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          ) : (
            <>
              {/* Avatar */}
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto mb-4 shadow-md">
                {initials}
              </div>

              {/* Name + role */}
              <h1 className="text-2xl font-bold tracking-tight">{trainer?.name ?? "Reserva de sesión"}</h1>
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>

              {/* Price chip */}
              {price !== null && price > 0 && (
                <div className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  Desde {price.toLocaleString("es-ES", { style: "currency", currency: "EUR" })} / sesión
                </div>
              )}

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                  <Zap className="h-3 w-3" />
                  Reserva instantánea
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                  <ShieldCheck className="h-3 w-3" />
                  Sin registro previo
                </span>
                {availableCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-medium border border-violet-100">
                    <CalendarDays className="h-3 w-3" />
                    {availableCount} horario{availableCount !== 1 ? "s" : ""} disponible{availableCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Section title ── */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-center">Elige tu horario</h2>
        </div>

        {/* ── Week nav ── */}
        <div className="flex items-center justify-between mb-4">
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

        {/* ── Calendar grid ── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day, i) => {
              const daySlots = slotsForDay(day);
              const isPast = format(day, "yyyy-MM-dd") < format(new Date(), "yyyy-MM-dd");
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <div key={i} className="flex flex-col">
                  <div className={`text-center mb-2 py-1.5 rounded-lg ${isToday ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{DAYS_ES[i]}</div>
                    <div className={`text-sm font-bold ${isToday ? "" : "text-foreground"}`}>
                      {format(day, "d")}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {daySlots.length === 0 ? (
                      <div className="text-center text-[10px] text-muted-foreground/50 py-4 px-1">
                        {isPast ? "–" : "·"}
                      </div>
                    ) : (
                      daySlots.map(slot => (
                        <div key={slot.id}>
                          {bookingSlotId === slot.id ? (
                            <div className="rounded-xl border-2 border-primary bg-card p-2.5 shadow-md space-y-2">
                              <p className="text-[11px] font-semibold text-center text-primary">{slot.startTime}–{slot.endTime}</p>
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
                              {trainer?.role === "owner" && (
                                <Input
                                  type="number"
                                  min="1"
                                  max="20"
                                  placeholder="Personas"
                                  value={bookPeople}
                                  onChange={e => setBookPeople(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="h-7 text-xs w-full"
                                />
                              )}
                              {totalPrice !== null && totalPrice > 0 && (
                                <div className="text-[10px] bg-muted/40 rounded p-1.5 space-y-0.5">
                                  {bookIsGroup && groupExtra > 0 ? (
                                    <>
                                      <div className="flex justify-between text-muted-foreground">
                                        <span>Precio base:</span>
                                        <span>{price?.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                                      </div>
                                      <div className="flex justify-between text-primary">
                                        <span>Extra grupal:</span>
                                        <span>+{groupExtra.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                                      </div>
                                      <div className="flex justify-between font-semibold border-t border-border pt-0.5 mt-0.5">
                                        <span>Total:</span>
                                        <span>{totalPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex justify-between font-medium">
                                      <span>Precio:</span>
                                      <span>{totalPrice.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {bookError && <p className="text-[10px] text-destructive leading-tight">{bookError}</p>}
                              <div className="flex gap-1">
                                <Button size="sm" className="flex-1 h-8 text-xs font-semibold" onClick={handleBook} disabled={bookLoading}>
                                  {bookLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setBookingSlotId(null)}>
                                  ✕
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => !isPast && openBooking(slot)}
                              disabled={isPast}
                              className="w-full rounded-xl border-2 border-primary/20 bg-white p-2 text-center hover:border-primary hover:bg-primary/5 hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                            >
                              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{slot.startTime}</p>
                              <p className="text-[10px] text-muted-foreground">{slot.endTime}</p>
                              <p className="text-[10px] font-semibold text-primary mt-1">Reservar →</p>
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

        <p className="text-center text-[11px] text-muted-foreground/50 mt-12">
          Powered by <span className="font-semibold">Organiza<span className="text-primary/70">T</span></span>
        </p>
      </div>
    </div>
  );
}
