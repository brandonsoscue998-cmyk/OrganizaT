import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useListClients,
  useCreateClient,
  useDeleteClient,
  useListSessions,
  getListClientsQueryKey,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronRight, Users, Package, MessageCircle, AlertTriangle, Zap, Bell, Copy } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { t } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type AppUser = { id: number; name: string; email: string; role: string };
const ROLE_LABEL: Record<string, string> = { client: "Cliente", trainer: "Entrenador", owner: "Emprendedor" };
const ROLE_BADGE: Record<string, string> = {
  client: "bg-blue-50 text-blue-700 border-blue-200",
  trainer: "bg-primary/10 text-primary border-primary/20",
  owner: "bg-purple-50 text-purple-700 border-purple-200",
};

function getClientStatus(last: Date | null): { label: string; cls: string } | null {
  if (!last) return null;
  const days = (Date.now() - last.getTime()) / 86400000;
  if (days < 7)  return { label: "Activo",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (days < 30) return { label: "Medio",    cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return           { label: "Inactivo", cls: "bg-red-50 text-red-600 border-red-200" };
}

const clientSchema = z.object({
  name: z.string().min(1, t.clients.nameRequired),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  totalSessions: z.coerce.number().min(0, t.clients.packSessionsMin).default(0),
  packPrice: z.coerce.number().min(0, t.clients.packPriceMin).default(0),
  paymentMode: z.enum(["per_session", "monthly"]).default("per_session"),
});

type ClientForm = z.infer<typeof clientSchema>;

export default function Clients() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { data: clients, isLoading } = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: { totalSessions: 0, packPrice: 0, paymentMode: "per_session" },
  });

  const [, setLocation] = useLocation();
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [dismissedDuplicateName, setDismissedDuplicateName] = useState("");
  const nameValue = watch("name") ?? "";
  const phoneValue = watch("phone") ?? "";

  const duplicateClient = useMemo(() => {
    if (!clients?.length) return null;
    const nameTrimmed = nameValue.trim();
    const phoneTrimmed = phoneValue.trim();
    // Phone exact match takes priority
    if (phoneTrimmed.length >= 6) {
      const byPhone = clients.find(c => c.phone && c.phone.replace(/\D/g, "") === phoneTrimmed.replace(/\D/g, ""));
      if (byPhone) return byPhone;
    }
    // Name partial match (at least 2 chars)
    if (nameTrimmed.length >= 2) {
      return clients.find(c => c.name.toLowerCase().includes(nameTrimmed.toLowerCase())) ?? null;
    }
    return null;
  }, [clients, nameValue, phoneValue]);

  const { data: allUsers = [] } = useQuery<AppUser[]>({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/users`, { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });
  const nameMatches = nameValue.trim()
    ? allUsers.filter(u => u.name.toLowerCase().includes(nameValue.toLowerCase()))
    : allUsers;
  const nameReg = register("name");

  const { data: allSessions } = useListSessions({}, { query: { queryKey: getListSessionsQueryKey() } });

  const clientInsights = useMemo(() => {
    const map = new Map<number, { revenue: number; count: number; last: Date | null }>();
    for (const s of allSessions ?? []) {
      if (!s.clientId) continue;
      const ins = map.get(s.clientId) ?? { revenue: 0, count: 0, last: null };
      ins.count++;
      if (s.paid) ins.revenue += parseFloat(String(s.price) || "0");
      const d = new Date(s.date);
      if (!ins.last || d > ins.last) ins.last = d;
      map.set(s.clientId, ins);
    }
    return map;
  }, [allSessions]);

  const lastSessionByClient = useMemo(() => {
    const map = new Map<number, Date>();
    for (const [id, ins] of clientInsights) { if (ins.last) map.set(id, ins.last); }
    return map;
  }, [clientInsights]);

  const [clientSort, setClientSort] = useState<"default" | "revenue">("default");
  const displayedClients = useMemo(() => {
    if (!clients) return [];
    if (clientSort === "revenue") {
      return [...clients].sort((a, b) =>
        (clientInsights.get(b.id)?.revenue ?? 0) - (clientInsights.get(a.id)?.revenue ?? 0)
      );
    }
    return clients;
  }, [clients, clientSort, clientInsights]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const handleReactivate = (name: string, phone?: string | null) => {
    const msg = `Hola ${name}! 👋\nHace unos días que no entrenamos 😊\n¿Te apetece volver esta semana?`;
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      toast({ title: "Mensaje copiado al portapapeles" });
    }
  };

  const isEmpty = !isLoading && clients?.length === 0;

  const [autoSuggestEnabled, setAutoSuggestEnabled] = useState(false);

  type AutoItem = {
    type: "payment" | "inactive";
    client: { id: number; name: string; phone?: string | null };
    detail: string;
    message: string;
  };

  const automationItems = useMemo<AutoItem[]>(() => {
    if (!clients?.length || !allSessions) return [];
    const items: AutoItem[] = [];

    // 1. Payment reminders — sum unpaid sessions per client
    const pendingByClient = new Map<number, number>();
    for (const s of allSessions) {
      if (!s.clientId || s.paid) continue;
      pendingByClient.set(s.clientId, (pendingByClient.get(s.clientId) ?? 0) + parseFloat(String(s.price) || "0"));
    }
    for (const [clientId, amount] of pendingByClient) {
      const client = clients.find(c => c.id === clientId);
      if (!client || amount <= 0) continue;
      items.push({
        type: "payment",
        client,
        detail: `${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}€ pendiente`,
        message: `Hola ${client.name}! 😊 Tienes un pago pendiente de ${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}€. ¿Cuándo te viene bien abonarlo?`,
      });
    }

    // 2. Inactive client reactivation — lastSession > 7 days
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    for (const client of clients) {
      const last = clientInsights.get(client.id)?.last;
      if (!last) continue;
      const days = Math.floor((Date.now() - last.getTime()) / 86400000);
      if (days >= 7) {
        items.push({
          type: "inactive",
          client,
          detail: `Sin sesión hace ${days} días`,
          message: `Hola ${client.name}! 👋 Hace ${days} días que no entrenamos 💪 ¿Te apetece volver esta semana?`,
        });
      }
    }

    return items;
  }, [clients, allSessions, clientInsights]);

  const sendOrCopy = (item: AutoItem, mode: "whatsapp" | "copy") => {
    if (mode === "whatsapp" && item.client.phone) {
      window.open(`https://wa.me/${item.client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(item.message)}`, "_blank");
    } else {
      navigator.clipboard.writeText(item.message);
      toast({ title: "Mensaje copiado al portapapeles" });
    }
  };

  const onSubmit = async (data: ClientForm) => {
    await createClient.mutateAsync({
      data: {
        name: data.name,
        phone: data.phone ?? null,
        notes: data.notes ?? null,
        totalSessions: data.totalSessions,
        packPrice: data.packPrice,
        paymentMode: data.paymentMode,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    toast({ title: t.clients.createdSuccess });
    reset();
    setOpen(false);
  };

  const handleDelete = async (id: number) => {
    await deleteClient.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.clients.title}</h1>
            <p className="text-muted-foreground text-sm">{t.clients.subtitle}</p>
          </div>
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setDismissedDuplicateName(""); }}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className={`gap-2 transition-all ${isEmpty ? "ring-2 ring-primary ring-offset-2 shadow-md" : ""}`}
              >
                <Plus className="h-4 w-4" />
                {t.clients.addClient}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.clients.newClient}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t.clients.fullName}</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      placeholder={t.clients.fullNamePlaceholder}
                      {...nameReg}
                      onFocus={() => setShowNameDropdown(true)}
                      onBlur={e => { nameReg.onBlur(e); setTimeout(() => setShowNameDropdown(false), 150); }}
                      autoComplete="off"
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {showNameDropdown && nameMatches.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {nameMatches.slice(0, 8).map(u => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                            onMouseDown={() => {
                              setValue("name", u.name, { shouldValidate: true });
                              setShowNameDropdown(false);
                            }}
                          >
                            <span className="truncate">{u.name}</span>
                            <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full border ${ROLE_BADGE[u.role] ?? "bg-muted text-muted-foreground border-border"}`}>
                              {ROLE_LABEL[u.role] ?? u.role}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t.clients.phone} <span className="text-muted-foreground">{t.clients.phoneOptional}</span></Label>
                  <Input id="phone" placeholder={t.clients.phonePlaceholder} {...register("phone")} />
                </div>

                {duplicateClient && duplicateClient.name !== dismissedDuplicateName && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-800">Este cliente ya existe</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          <span className="font-medium">{duplicateClient.name}</span>
                          {duplicateClient.phone && (
                            <span className="ml-2 text-amber-600">{duplicateClient.phone}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={() => {
                          setOpen(false);
                          setDismissedDuplicateName("");
                          setLocation(`/clients/${duplicateClient.id}`);
                        }}
                      >
                        Usar este cliente
                      </Button>
                      <button
                        type="button"
                        className="text-xs text-amber-600 hover:text-amber-800 underline underline-offset-2"
                        onClick={() => setDismissedDuplicateName(duplicateClient.name)}
                      >
                        Crear de todas formas
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="notes">{t.clients.notes} <span className="text-muted-foreground">{t.clients.notesOptional}</span></Label>
                  <Textarea id="notes" placeholder={t.clients.notesPlaceholder} {...register("notes")} rows={3} />
                </div>

                <div className="space-y-1.5">
                  <Label>Modo de pago</Label>
                  <Select value={watch("paymentMode")} onValueChange={v => setValue("paymentMode", v as "per_session" | "monthly")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_session">Por sesión</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t.clients.packSection}</span>
                    <span className="text-xs text-muted-foreground">{t.clients.packOptional}</span>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">{t.clients.packHint}</p>
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.clients.cancel}</Button>
                  <Button type="submit" disabled={createClient.isPending}>
                    {createClient.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t.clients.add}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!isLoading && automationItems.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Automatizaciones
                  <span className="ml-1 text-xs font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {automationItems.length}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Sugerencias auto</span>
                  <button
                    onClick={() => setAutoSuggestEnabled(v => !v)}
                    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${autoSuggestEnabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition-transform ${autoSuggestEnabled ? "translate-x-3" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {automationItems.map((item, i) => (
                  <div key={i} className="px-5 py-3 flex items-start gap-3">
                    <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${item.type === "payment" ? "bg-amber-100" : "bg-blue-100"}`}>
                      {item.type === "payment"
                        ? <Bell className="h-3.5 w-3.5 text-amber-600" />
                        : <MessageCircle className="h-3.5 w-3.5 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-medium">{item.client.name}</span>
                        <span className={`text-xs ${item.type === "payment" ? "text-amber-600" : "text-blue-600"}`}>{item.detail}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.message}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.client.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => sendOrCopy(item, "whatsapp")}
                        >
                          <MessageCircle className="h-3 w-3" />
                          Enviar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-muted-foreground"
                        onClick={() => sendOrCopy(item, "copy")}
                      >
                        <Copy className="h-3 w-3" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{t.clients.allClients}</CardTitle>
              {!isEmpty && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setClientSort("default")}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${clientSort === "default" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setClientSort("revenue")}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${clientSort === "revenue" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    Top clientes
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : isEmpty ? (
              <div className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <p className="font-semibold text-sm mb-1">{t.clients.noClients}</p>
                <p className="text-muted-foreground text-xs mb-5 max-w-xs mx-auto">{t.clients.noClientsDesc}</p>
                <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t.clients.createFirst}
                </Button>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-1.5">
                {displayedClients.map(client => {
                  const hasPack = client.totalSessions > 0;
                  const packExhausted = hasPack && client.remainingSessions === 0;
                  const lastSession = lastSessionByClient.get(client.id);
                  const isInactive = !!lastSession && lastSession < sevenDaysAgo;
                  const ins = clientInsights.get(client.id);
                  const status = getClientStatus(ins?.last ?? null);
                  return (
                    <div key={client.id} className={`flex items-center justify-between px-4 py-3.5 rounded-lg transition-all duration-200 ${isInactive ? "bg-orange-50/30 border border-orange-100 hover:bg-orange-50/60" : "border border-transparent hover:border-border/50 hover:bg-muted/50"}`}>
                      <Link href={`/clients/${client.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 cursor-pointer group">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${isInactive ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"}`}>
                            {client.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm group-hover:text-primary transition-colors">{client.name}</div>
                            {client.phone && <div className="text-xs text-muted-foreground">{client.phone}</div>}
                            {ins && ins.count > 0 && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {ins.revenue > 0 ? `${ins.revenue % 1 === 0 ? ins.revenue.toFixed(0) : ins.revenue.toFixed(2)}€ generado · ` : ""}
                                {ins.count} {ins.count === 1 ? "sesión" : "sesiones"}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {status && (
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${status.cls}`}>
                                {status.label}
                              </span>
                            )}
                            {hasPack && (
                              <>
                                {packExhausted ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600 border border-red-200">
                                    <Package className="h-3 w-3" />
                                    {t.clients.packExhausted}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                                    <Package className="h-3 w-3" />
                                    {t.clients.sessionsLabel(client.remainingSessions, client.totalSessions)}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground ml-1 group-hover:text-primary transition-colors shrink-0" />
                        </div>
                      </Link>
                      {isInactive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-1 text-orange-500 hover:text-orange-700 hover:bg-orange-100 shrink-0"
                          title="Reactivar cliente"
                          onClick={e => { e.preventDefault(); handleReactivate(client.name, client.phone); }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.clients.deleteTitle(client.name)}</AlertDialogTitle>
                            <AlertDialogDescription>{t.clients.deleteDesc}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.clients.deleteCancelled}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(client.id)}
                            >
                              {t.clients.deleteConfirm}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
