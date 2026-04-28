import { useState, useCallback, useEffect, useRef } from "react";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { t, formatCurrency } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Slot = { id: number; date: string; startTime: string; endTime: string; isBooked: boolean; bookedSubSlots?: string };
type OwnerOption = { id: number; name: string; username: string | null; email: string; role: string; spaceName?: string | null; pricePerSlot?: string | null };
type Owner = { name: string; username: string | null; spaceName?: string | null; pricePerSlot?: string | null };

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function SpaceBook() {
  const [ownerInput, setOwnerInput] = useState("");
  const [username, setUsername] = useState("");
  const [owner, setOwner] = useState<Owner | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const [allOwners, setAllOwners] = useState<OwnerOption[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [slotDuration, setSlotDuration] = useState<30 | 45 | 60>(60);
  const [selectedSlots, setSelectedSlots] = useState<Array<{ slot: Slot; subStart: string }>>([]);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [booked, setBooked] = useState(false);
  const [bookedInfo, setBookedInfo] = useState<{ date: string; subStart: string } | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/public/trainers`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllOwners(data.filter((d: OwnerOption) => d.role === "owner")); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOwners = ownerInput.trim()
    ? allOwners.filter(o =>
        o.name.toLowerCase().includes(ownerInput.toLowerCase()) ||
        (o.spaceName ?? "").toLowerCase().includes(ownerInput.toLowerCase()) ||
        (o.username ?? "").toLowerCase().includes(ownerInput.toLowerCase())
      )
    : allOwners;

  const timeToMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

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
      if (res.status === 404) { setNotFound(true); setOwner(null); setSlots([]); setLoading(false); return; }
      const data = await res.json();
      setOwner(data.trainer);
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [fromStr, toStr]);

  const handleSelectOwner = async (o: OwnerOption) => {
    if (!o.username) return;
    setOwnerInput(o.spaceName ?? o.name);
    setUsername(o.username);
    setDropdownOpen(false);
    setSelectedSlots([]);
    setBooked(false);
    await fetchSlots(o.username);
  };

  const handleWeekChange = async (dir: number) => {
    const next = weekOffset + dir;
    setWeekOffset(next);
    setSelectedSlots([]);
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    try {
      const ws = startOfWeek(addWeeks(new Date(), next), { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      const res = await fetch(`${BASE}/api/public/u/${username}?from=${format(ws, "yyyy-MM-dd")}&to=${format(we, "yyyy-MM-dd")}`);
      if (res.status === 404) { setNotFound(true); setSlots([]); return; }
      const data = await res.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  };

  const handleSlotClick = (slot: Slot, subStart: string) => {
    const bookedTimes: string[] = JSON.parse(slot.bookedSubSlots || "[]");
    if (bookedTimes.includes(subStart)) return;
    const alreadyIdx = selectedSlots.findIndex(s => s.slot.id === slot.id && s.subStart === subStart);
    if (alreadyIdx >= 0) { setSelectedSlots(prev => prev.filter((_, i) => i !== alreadyIdx)); return; }

    if (selectedSlots.length > 0) {
      const last = selectedSlots[selectedSlots.length - 1];
      const sameDay = last.slot.date === slot.date;
      const lastEnd = addMinutes(last.subStart, slotDuration);
      if (sameDay && lastEnd === subStart) {
        setSelectedSlots(prev => [...prev, { slot, subStart }]);
      } else {
        setSelectedSlots([{ slot, subStart }]);
      }
    } else {
      setSelectedSlots([{ slot, subStart }]);
    }
  };

  const handleBook = async () => {
    if (selectedSlots.length === 0) return;
    setBookLoading(true);
    setBookError("");
    const token = localStorage.getItem("auth_token");
    const sorted = [...selectedSlots].sort((a, b) => timeToMins(a.subStart) - timeToMins(b.subStart));
    try {
      for (const { slot, subStart } of sorted) {
        const res = await fetch(`${BASE}/api/spaces/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ownerUsername: username, availabilityId: slot.id, subStart }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setBookError(err.error ?? "Error al reservar");
          return;
        }
        setSlots(prev => prev.map(s => s.id === slot.id
          ? { ...s, bookedSubSlots: JSON.stringify([...JSON.parse(s.bookedSubSlots || "[]"), subStart]) }
          : s
        ));
      }
      setBookedInfo({ date: sorted[0].slot.date, subStart: sorted[0].subStart });
      setBooked(true);
      setSelectedSlots([]);
    } catch {
      setBookError("Error al reservar. Inténtalo de nuevo.");
    } finally {
      setBookLoading(false);
    }
  };

  const slotsByDay = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayStr = format(day, "yyyy-MM-dd");
    return { day, label: DAYS_ES[i], num: format(day, "d"), slots: slots.filter(s => s.date === dayStr) };
  });

  const weekLabel = `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`;

  if (booked && bookedInfo) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-16 space-y-4">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">{t.spaceBook.successTitle}</h2>
          <p className="text-muted-foreground text-sm">{t.spaceBook.successDesc}</p>
          <p className="text-sm font-medium">
            {owner?.spaceName ?? owner?.name} — {format(new Date(`${bookedInfo.date}T${bookedInfo.subStart}`), "d MMM yyyy 'a las' HH:mm", { locale: es })}
          </p>
          <Button variant="outline" onClick={() => { setBooked(false); setBookedInfo(null); }}>
            Reservar otro horario
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.spaceBook.title}</h1>
          <p className="text-muted-foreground text-sm">{t.spaceBook.subtitle}</p>
        </div>

        {/* Owner search */}
        <div className="relative max-w-sm" ref={searchRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 pr-3"
              placeholder={t.spaceBook.searchPlaceholder}
              value={ownerInput}
              onChange={e => { setOwnerInput(e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
            />
          </div>
          {dropdownOpen && filteredOwners.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border rounded-lg shadow-lg overflow-hidden">
              {filteredOwners.map(o => (
                <button
                  key={o.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex items-center gap-3"
                  onClick={() => handleSelectOwner(o)}
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{o.spaceName ?? o.name}</div>
                    {o.pricePerSlot && Number(o.pricePerSlot) > 0 && (
                      <div className="text-xs text-muted-foreground">{formatCurrency(Number(o.pricePerSlot))} / bloque</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {dropdownOpen && ownerInput.trim() && filteredOwners.length === 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border rounded-lg shadow p-3 text-sm text-muted-foreground">
              {t.spaceBook.noSpaces}
            </div>
          )}
        </div>

        {notFound && (
          <p className="text-sm text-destructive">Espacio no encontrado.</p>
        )}

        {owner && (
          <>
            {/* Owner card */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border max-w-sm">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{owner.spaceName ?? owner.name}</div>
                {owner.pricePerSlot && Number(owner.pricePerSlot) > 0 && (
                  <div className="text-xs text-muted-foreground">{t.spaceBook.pricePerSlot}: {formatCurrency(Number(owner.pricePerSlot))}</div>
                )}
              </div>
            </div>

            {/* Duration picker */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Duración:</span>
              {([30, 45, 60] as const).map(d => (
                <button
                  key={d}
                  onClick={() => { setSlotDuration(d); setSelectedSlots([]); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${slotDuration === d ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {d} min
                </button>
              ))}
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => handleWeekChange(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[180px] text-center">{weekLabel}</span>
              <Button variant="outline" size="icon" onClick={() => handleWeekChange(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Slot grid */}
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando horarios…
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {slotsByDay.map(({ label, num, slots: daySLots }) => {
                  const subSlotsAll = daySLots.flatMap(s => {
                    const booked: string[] = JSON.parse(s.bookedSubSlots || "[]");
                    return expandSlot(s.startTime, s.endTime, slotDuration).map(sub => ({ slot: s, subStart: sub, isBooked: booked.includes(sub) }));
                  });
                  return (
                    <div key={label} className="flex flex-col gap-1 min-w-0">
                      <div className="text-center text-[11px] font-semibold text-muted-foreground pb-1">
                        <div>{label}</div>
                        <div className="text-[10px]">{num}</div>
                      </div>
                      {subSlotsAll.length === 0 ? (
                        <div className="text-[10px] text-center text-muted-foreground/40 py-2">—</div>
                      ) : subSlotsAll.map(({ slot, subStart, isBooked }) => {
                        const isSelected = selectedSlots.some(s => s.slot.id === slot.id && s.subStart === subStart);
                        return (
                          <button
                            key={`${slot.id}-${subStart}`}
                            disabled={isBooked}
                            onClick={() => handleSlotClick(slot, subStart)}
                            className={`w-full text-[10px] px-1 py-1.5 rounded border text-center transition-colors leading-tight ${
                              isBooked
                                ? "bg-muted/40 text-muted-foreground/40 border-border/40 cursor-not-allowed line-through"
                                : isSelected
                                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                                  : "bg-card hover:bg-primary/10 border-border text-foreground"
                            }`}
                          >
                            {subStart}
                            <div className="text-[9px] opacity-70">{addMinutes(subStart, slotDuration)}</div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Booking summary */}
            {selectedSlots.length > 0 && (() => {
              const sorted = [...selectedSlots].sort((a, b) => timeToMins(a.subStart) - timeToMins(b.subStart));
              const startLabel = sorted[0].subStart;
              const endLabel = addMinutes(sorted[sorted.length - 1].subStart, slotDuration);
              const dateLabel = format(new Date(`${sorted[0].slot.date}T${startLabel}`), "EEEE d 'de' MMMM", { locale: es });
              const totalPrice = owner.pricePerSlot ? Number(owner.pricePerSlot) * sorted.length : 0;
              return (
                <div className="border rounded-lg p-4 space-y-3 bg-card max-w-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground capitalize">{dateLabel}</p>
                    <p className="text-sm font-semibold">{startLabel} – {endLabel} ({sorted.length * slotDuration} min)</p>
                    {totalPrice > 0 && (
                      <p className="text-sm text-primary font-medium">{formatCurrency(totalPrice)}</p>
                    )}
                  </div>
                  {bookError && <p className="text-xs text-destructive">{bookError}</p>}
                  <Button className="w-full" onClick={handleBook} disabled={bookLoading}>
                    {bookLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t.spaceBook.bookBtn}
                  </Button>
                </div>
              );
            })()}
          </>
        )}

        {!owner && !loading && allOwners.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t.spaceBook.noSpaces}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
