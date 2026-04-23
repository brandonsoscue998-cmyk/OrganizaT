import { useState, useCallback } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, CalendarCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Slot = { id: number; date: string; startTime: string; endTime: string; isBooked: boolean };
type Trainer = { name: string; username: string | null };

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function ClientBook() {
  const { data: me } = useGetMe({ query: { queryKey: ["getMe"], retry: false } });

  const [trainerInput, setTrainerInput] = useState("");
  const [username, setUsername] = useState("");
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [phone, setPhone] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [booked, setBooked] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const fromStr = format(weekStart, "yyyy-MM-dd");
  const toStr = format(weekEnd, "yyyy-MM-dd");

  const fetchSlots = useCallback(async (u: string) => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`${BASE}/api/public/u/${u}?from=${fromStr}&to=${toStr}`);
      if (res.status === 404) { setNotFound(true); setTrainer(null); setSlots([]); setLoading(false); return; }
      const data = await res.json();
      setTrainer(data.trainer);
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [fromStr, toStr]);

  const handleFind = async () => {
    const u = trainerInput.trim();
    if (!u) return;
    setUsername(u);
    setSelectedSlot(null);
    setBooked(false);
    await fetchSlots(u);
  };

  const handleWeekChange = async (dir: number) => {
    const next = weekOffset + dir;
    setWeekOffset(next);
    setSelectedSlot(null);
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    try {
      const ws = startOfWeek(addWeeks(new Date(), next), { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      const f = format(ws, "yyyy-MM-dd");
      const to = format(we, "yyyy-MM-dd");
      const res = await fetch(`${BASE}/api/public/u/${username}?from=${f}&to=${to}`);
      if (res.status === 404) { setNotFound(true); setSlots([]); return; }
      const data = await res.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  };

  const handleBook = async () => {
    if (!selectedSlot || !me?.name) return;
    setBookLoading(true);
    setBookError("");
    try {
      const res = await fetch(`${BASE}/api/public/u/${username}/book/${selectedSlot.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: me.name, phone: phone || "" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setBookError(err.error ?? "Error al reservar. Inténtalo de nuevo.");
        return;
      }
      setBookedSlot(selectedSlot);
      setBooked(true);
    } catch {
      setBookError("Error al reservar. Inténtalo de nuevo.");
    } finally {
      setBookLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

  const slotsByDay = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayStr = format(day, "yyyy-MM-dd");
    return {
      day,
      label: DAYS_ES[i],
      num: format(day, "d"),
      slots: slots.filter(s => s.date === dayStr && !s.isBooked),
    };
  });

  const weekLabel = `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`;

  if (booked && bookedSlot) {
    const bookedDate = `${format(new Date(bookedSlot.date), "EEEE d 'de' MMMM", { locale: es })} · ${bookedSlot.startTime.slice(0, 5)}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t.clientView.bookingSuccess}</h1>
        <p className="text-muted-foreground mb-6 capitalize">{t.clientView.bookingSuccessDesc(bookedDate)}</p>
        <Button onClick={() => { setBooked(false); setSelectedSlot(null); setSlots([]); setTrainer(null); setUsername(""); setTrainerInput(""); setWeekOffset(0); }}>
          {t.clientView.newBooking}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-semibold text-base">Practitioner</div>
          {me && <div className="text-xs text-muted-foreground truncate">{me.name}</div>}
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t.clientView.logout}</span>
        </Button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{t.clientView.title}</h1>
          <p className="text-sm text-muted-foreground">{t.clientView.subtitle}</p>
        </div>

        {/* Trainer search */}
        <div className="space-y-2">
          <Label>{t.clientView.trainerLabel}</Label>
          <div className="flex gap-2">
            <Input
              placeholder={t.clientView.trainerPlaceholder}
              value={trainerInput}
              onChange={e => setTrainerInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFind()}
            />
            <Button onClick={handleFind} disabled={loading || !trainerInput.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.clientView.findButton}
            </Button>
          </div>
          {notFound && <p className="text-sm text-destructive">{t.clientView.notFound}</p>}
        </div>

        {/* Trainer found — availability */}
        {trainer && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{trainer.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{weekLabel}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleWeekChange(-1)} disabled={weekOffset <= 0 || loading}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleWeekChange(1)} disabled={loading}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : slots.filter(s => !s.isBooked).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CalendarCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t.clientView.noSlots}</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {slotsByDay.map(({ day, label, num, slots: daySlots }) => (
                  <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                    <span className="text-xs font-semibold mb-1">{num}</span>
                    {daySlots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                        className={`w-full rounded-md py-1.5 text-[11px] font-medium transition-colors ${selectedSlot?.id === slot.id ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}
                      >
                        {slot.startTime.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Booking confirmation */}
        {selectedSlot && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="font-semibold text-sm">
              {format(new Date(`${selectedSlot.date}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })} · {selectedSlot.startTime.slice(0, 5)} – {selectedSlot.endTime.slice(0, 5)}
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">{t.clientView.phonePlaceholder}</Label>
              <Input
                placeholder="+34 600 000 000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-9"
              />
            </div>
            {bookError && <p className="text-xs text-destructive">{bookError}</p>}
            <Button className="w-full" onClick={handleBook} disabled={bookLoading}>
              {bookLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.clientView.book}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
