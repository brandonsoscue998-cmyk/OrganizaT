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
import { Plus, Trash2, ChevronRight, Users, Package, MessageCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { t } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type AppUser = { id: number; name: string; email: string; role: string };
const ROLE_LABEL: Record<string, string> = { client: "Cliente", trainer: "Entrenador", owner: "Emprendedor" };
const ROLE_BADGE: Record<string, string> = {
  client: "bg-blue-50 text-blue-700 border-blue-200",
  trainer: "bg-primary/10 text-primary border-primary/20",
  owner: "bg-purple-50 text-purple-700 border-purple-200",
};

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

  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const nameValue = watch("name") ?? "";
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

  const lastSessionByClient = useMemo(() => {
    const map = new Map<number, Date>();
    for (const s of allSessions ?? []) {
      if (!s.clientId) continue;
      const d = new Date(s.date);
      const existing = map.get(s.clientId);
      if (!existing || d > existing) map.set(s.clientId, d);
    }
    return map;
  }, [allSessions]);

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
          <Dialog open={open} onOpenChange={setOpen}>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.clients.allClients}</CardTitle>
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
              <div className="divide-y">
                {clients!.map(client => {
                  const hasPack = client.totalSessions > 0;
                  const packExhausted = hasPack && client.remainingSessions === 0;
                  const lastSession = lastSessionByClient.get(client.id);
                  const isInactive = !!lastSession && lastSession < sevenDaysAgo;
                  return (
                    <div key={client.id} className={`flex items-center justify-between px-6 py-4 transition-colors ${isInactive ? "bg-orange-50/40 hover:bg-orange-50/60" : "hover:bg-muted/30"}`}>
                      <Link href={`/clients/${client.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 cursor-pointer group">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${isInactive ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"}`}>
                            {client.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm group-hover:text-primary transition-colors">{client.name}</div>
                            {client.phone && <div className="text-xs text-muted-foreground">{client.phone}</div>}
                            {isInactive && (
                              <div className="text-[11px] text-orange-600 font-medium mt-0.5">● Cliente inactivo</div>
                            )}
                          </div>
                          {hasPack && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {packExhausted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                  <Package className="h-3 w-3" />
                                  {t.clients.packExhausted}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                  <Package className="h-3 w-3" />
                                  {t.clients.sessionsLabel(client.remainingSessions, client.totalSessions)}
                                </span>
                              )}
                            </div>
                          )}
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
