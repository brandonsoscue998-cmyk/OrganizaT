import { useState, useCallback, useEffect, useRef } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, CalendarCheck, LogOut, Search, Building2, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Slot = { id: number; date: string; startTime: string; endTime: string; isBooked: boolean; bookedSubSlots?: string };
type Trainer = { name: string; username: string | null; role?: string | null; spaceName?: string | null; pricePerSlot?: string | null; referralsEnabled?: boolean | null };
type TrainerOption = { id: number; name: string; username: string | null; email: string; role: string; spaceName?: string | null; pricePerSlot?: string | null };

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

  const [allTrainers, setAllTrainers] = useState<TrainerOption[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [clientInfo, setClientInfo] = useState<{ remainingSessions: number; totalSessions: number; packPrice: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/public/trainers`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllTrainers(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredTrainers = trainerInput.trim()
    ? allTrainers.filter(tr =>
        tr.name.toLowerCase().includes(trainerInput.toLowerCase()) ||
        tr.email.toLowerCase().includes(trainerInput.toLowerCase()) ||
        (tr.username ?? "").toLowerCase().includes(trainerInput.toLowerCase())
      )
    : allTrainers;

  const handleSelectTrainer = async (tr: TrainerOption) => {
    if (!tr.username) return;
    setTrainerInput(tr.name);
    setUsername(tr.username);
    setDropdownOpen(false);
    setSelectedSlot(null);
    setSelectedSubStart(null);
    setClientInfo(null);
    setBooked(false);
    await fetchSlots(tr.username);
    if (me?.name) {
      fetch(`${BASE}/api/public/u/${tr.username}/my-info?name=${encodeURIComponent(me.name)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setClientInfo(data); })
        .catch(() => {});
    }
  };

  const [slotDuration, setSlotDuration] = useState<30 | 45 | 60>(60);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedSubStart, setSelectedSubStart] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState(1);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [booked, setBooked] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);
  const [bookedSubStart, setBookedSubStart] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  const expandSlot = (startTime: string, endTime: string, durationMins: number): string[] => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    const result: string[] = [];
    for (let m = startM; m + durationMins <= endM; m += durationMins) {
      result.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return result;
  };

  const addMinutes = (time: string, mins: number): string => {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

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
        body: JSON.stringify({ name: me.name, phone: phone || "", slotStartTime: selectedSubStart ?? selectedSlot.startTime, people }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setBookError(err.error ?? "Error al reservar. Inténtalo de nuevo.");
        return;
      }
      const bookedTime = selectedSubStart ?? selectedSlot.startTime;
      setSlots(prev => prev.map(s => s.id === selectedSlot!.id
        ? { ...s, bookedSubSlots: JSON.stringify([...JSON.parse(s.bookedSubSlots || "[]"), bookedTime]) }
        : s
      ));
      setBookedSlot(selectedSlot);
      setBookedSubStart(selectedSubStart);
      setBooked(true);
      setSelectedSlot(null);
      setSelectedSubStart(null);
      setPeople(1);
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
      slots: slots.filter(s => s.date === dayStr),
    };
  });

  const weekLabel = `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`;

  const bookedBanner = booked && bookedSlot ? (() => {
    const displayTime = bookedSubStart ?? bookedSlot.startTime.slice(0, 5);
    const bookedDate = `${format(new Date(bookedSlot.date), "EEEE d 'de' MMMM", { locale: es })} · ${displayTime}`;
    return (
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
        <span className="capitalize flex-1">{t.clientView.bookingSuccessDesc(bookedDate)}</span>
        <button onClick={() => setBooked(false)} className="text-green-600 hover:text-green-800 font-medium">✕</button>
      </div>
    );
  })() : null;

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

      {bookedBanner}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{t.clientView.title}</h1>
          <p className="text-sm text-muted-foreground">{t.clientView.subtitle}</p>
        </div>

        {/* Trainer search */}
        <div className="space-y-2" ref={searchRef}>
          <Label>{t.clientView.trainerLabel}</Label>
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder={t.clientView.trainerPlaceholder}
                value={trainerInput}
                onChange={e => { setTrainerInput(e.target.value); setUsername(""); setDropdownOpen(true); setTrainer(null); setSlots([]); setNotFound(false); }}
                onFocus={() => setDropdownOpen(true)}
                onKeyDown={e => { if (e.key === "Enter") { setDropdownOpen(false); handleFind(); } if (e.key === "Escape") setDropdownOpen(false); }}
                autoComplete="off"
              />
              {loading && <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border bg-card shadow-lg overflow-hidden">
                {filteredTrainers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No se encontraron entrenadores</div>
                ) : (
                  <>
                    {!trainerInput.trim() && (
                      <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b bg-muted/40">
                        Entrenadores disponibles
                      </div>
                    )}
                    {filteredTrainers.map(tr => (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => handleSelectTrainer(tr)}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 border-b last:border-b-0"
                      >
                        {tr.role === "owner" && <Building2 className="h-4 w-4 text-primary/60 shrink-0" />}
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{tr.role === "owner" && tr.spaceName ? tr.spaceName : tr.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {tr.role === "owner"
                              ? `${tr.name}${tr.pricePerSlot && Number(tr.pricePerSlot) > 0 ? ` · ${Number(tr.pricePerSlot).toFixed(2).replace(".", ",")}€/hora` : ""}`
                              : tr.username ? `@${tr.username}` : ""}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
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

            {/* Duration picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Duración:</span>
              {([30, 45, 60] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSlotDuration(d); setSelectedSlot(null); setSelectedSubStart(null); }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${slotDuration === d ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted text-muted-foreground"}`}
                >
                  {d} min
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : slots.every(s => {
              const taken: string[] = JSON.parse(s.bookedSubSlots || "[]");
              return expandSlot(s.startTime, s.endTime, slotDuration).every(st => taken.includes(st));
            }) ? (
              <div className="text-center py-10 text-muted-foreground">
                <CalendarCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t.clientView.noSlots}</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {slotsByDay.map(({ day, label, num, slots: daySlots }) => {
                  const subSlots = daySlots.flatMap(slot => {
                    const taken: string[] = JSON.parse(slot.bookedSubSlots || "[]");
                    return expandSlot(slot.startTime, slot.endTime, slotDuration)
                      .filter(st => !taken.includes(st))
                      .map(st => ({ slot, subStart: st }));
                  });
                  return (
                    <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                      <span className="text-xs font-semibold mb-1">{num}</span>
                      {subSlots.map(({ slot, subStart }) => {
                        const isSelected = selectedSlot?.id === slot.id && selectedSubStart === subStart;
                        return (
                          <button
                            key={`${slot.id}-${subStart}`}
                            onClick={() => {
                              if (isSelected) { setSelectedSlot(null); setSelectedSubStart(null); }
                              else { setSelectedSlot(slot); setSelectedSubStart(subStart); }
                            }}
                            className={`w-full rounded-md py-1.5 text-[11px] font-medium transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"}`}
                          >
                            {subStart}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Booking confirmation */}
        {selectedSlot && selectedSubStart && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="font-semibold text-sm capitalize">
              {format(new Date(`${selectedSlot.date}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })} · {selectedSubStart} – {addMinutes(selectedSubStart, slotDuration)}
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
            <div className="space-y-1.5">
              <Label className="text-xs">Personas</Label>
              <input
                type="number"
                min="1"
                max="99"
                value={people}
                onChange={e => setPeople(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {people > 2 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                Las sesiones grupales pueden tener un coste extra. El precio lo define el entrenador.
              </div>
            )}
            {clientInfo && clientInfo.remainingSessions > 0 ? (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800 space-y-0.5">
                <p>Te quedan <span className="font-semibold">{clientInfo.remainingSessions}</span> sesión{clientInfo.remainingSessions !== 1 ? "es" : ""} del pack</p>
                <p className="text-xs text-blue-500">Se descontará 1 sesión · {clientInfo.totalSessions > 0 ? `${(Number(clientInfo.packPrice) / clientInfo.totalSessions).toFixed(2).replace(".", ",")}€/sesión` : ""}</p>
              </div>
            ) : clientInfo ? (
              <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Sin pack activo — el precio lo confirma el entrenador
              </div>
            ) : null}
            {bookError && <p className="text-xs text-destructive">{bookError}</p>}
            <Button className="w-full" onClick={handleBook} disabled={bookLoading}>
              {bookLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t.clientView.book}
            </Button>
          </div>
        )}
        {/* Invitar a un amigo — only when referrals are enabled */}
        {trainer?.referralsEnabled && trainer.username && me?.name && (
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Invitar a un amigo</p>
            </div>
            <p className="text-xs text-muted-foreground">Comparte este enlace con un amigo para que reserve una sesión con {trainer.name}.</p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-xs font-mono flex-1 truncate text-foreground">
                {window.location.origin}{BASE}/u/{trainer.username}?ref={encodeURIComponent(me.name)}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${BASE}/u/${trainer.username}?ref=${encodeURIComponent(me!.name!)}`);
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                }}
                className="shrink-0 h-7 w-7 rounded-md border flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            {referralCopied && <p className="text-xs text-green-600 font-medium">¡Enlace copiado!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
