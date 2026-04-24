import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useGetDashboardStats, useGetMonthlyRevenue, useGetRecentSessions, getGetDashboardStatsQueryKey, getGetMonthlyRevenueQueryKey, getGetRecentSessionsQueryKey, customFetch } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Calendar, TrendingUp, AlertCircle, AlertTriangle, CalendarX, Banknote, Link2, Copy, Building2, Pencil, Check, X, Share2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Link } from "wouter";
import { t, locale, formatCurrency, statusLabel } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function SpaceSettingsCard({ spaceName, pricePerSlot, onSaved }: { spaceName?: string | null; pricePerSlot?: string | null; onSaved: () => void }) {
  const [editing, setEditing] = useState(!spaceName);
  const [name, setName] = useState(spaceName ?? "");
  const [price, setPrice] = useState(pricePerSlot ?? "0");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE}/api/auth/me/space`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        body: JSON.stringify({ spaceName: name, pricePerSlot: price }),
      });
      setEditing(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Configuración del espacio
          {!editing && (
            <button onClick={() => setEditing(true)} className="ml-auto text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre del espacio</Label>
              <Input placeholder="ej. Sala 1, Silla Barbería..." value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Precio por hora (€)</Label>
              <Input type="number" min="0" step="0.01" placeholder="20" value={price} onChange={e => setPrice(e.target.value)} className="h-8 text-sm w-32" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
                <Check className="h-3 w-3" /> Guardar
              </Button>
              {spaceName && (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setEditing(false); setName(spaceName ?? ""); setPrice(pricePerSlot ?? "0"); }}>
                  <X className="h-3 w-3" /> Cancelar
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm space-y-0.5">
            <p className="font-semibold">{spaceName || <span className="text-muted-foreground italic">Sin nombre</span>}</p>
            <p className="text-muted-foreground">{Number(pricePerSlot ?? 0) > 0 ? `${Number(pricePerSlot).toFixed(2).replace(".", ",")}€/hora` : "Sin precio configurado"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type AlertsData = {
  lowSessions: { id: number; name: string; remainingSessions: number }[];
  noUpcomingSessions: { id: number; name: string }[];
  unpaidSessions: number;
};

function StatCard({ title, value, icon: Icon, description, loading }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

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

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  const { data: monthlyRevenue, isLoading: revenueLoading } = useGetMonthlyRevenue({
    query: { queryKey: getGetMonthlyRevenueQueryKey() }
  });
  const { data: recentSessions, isLoading: sessionsLoading } = useGetRecentSessions({
    query: { queryKey: getGetRecentSessionsQueryKey() }
  });
  const { data: alerts, isLoading: alertsLoading } = useQuery<AlertsData>({
    queryKey: ["alerts"],
    queryFn: () => customFetch<AlertsData>("/api/alerts"),
  });
  const queryClient = useQueryClient();
  const { data: me } = useQuery<{ username?: string | null; role?: string | null; spaceName?: string | null; pricePerSlot?: string | null; referralsEnabled?: boolean }>({
    queryKey: ["me"],
    queryFn: () => customFetch<{ username?: string | null; role?: string | null; spaceName?: string | null; pricePerSlot?: string | null; referralsEnabled?: boolean }>("/api/auth/me"),
  });

  const [referralToggling, setReferralToggling] = useState(false);
  const handleReferralToggle = async (enabled: boolean) => {
    setReferralToggling(true);
    try {
      await fetch(`${BASE}/api/auth/me/referrals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        body: JSON.stringify({ enabled }),
      });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } finally { setReferralToggling(false); }
  };

  const allAlerts: { key: string; icon: React.ComponentType<{ className?: string }>; text: string; href: string; variant: "yellow" | "red" }[] = [];
  if (alerts) {
    alerts.lowSessions.forEach(c =>
      allAlerts.push({ key: `low-${c.id}`, icon: AlertTriangle, text: t.alerts.lowSessions(c.name, c.remainingSessions), href: `/clients/${c.id}`, variant: "yellow" })
    );
    alerts.noUpcomingSessions.forEach(c =>
      allAlerts.push({ key: `noup-${c.id}`, icon: CalendarX, text: t.alerts.noUpcoming(c.name), href: `/clients/${c.id}`, variant: "yellow" })
    );
    if (alerts.unpaidSessions > 0) {
      allAlerts.push({ key: "unpaid", icon: Banknote, text: t.alerts.unpaidSessions(alerts.unpaidSessions), href: "/sessions", variant: "red" });
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <p className="text-muted-foreground text-sm">{t.dashboard.subtitle}</p>
        </div>

        {/* Space settings — owners only */}
        {me?.role === "owner" && (
          <SpaceSettingsCard
            spaceName={me.spaceName}
            pricePerSlot={me.pricePerSlot}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["me"] })}
          />
        )}

        {/* Alertas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              {t.alerts.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : allAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.alerts.noAlerts}</p>
            ) : (
              <div className="space-y-2">
                {allAlerts.map(alert => (
                  <Link key={alert.key} href={alert.href}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-opacity hover:opacity-80 ${
                      alert.variant === "red"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-yellow-50 border-yellow-200 text-yellow-800"
                    }`}>
                      <alert.icon className="h-4 w-4 shrink-0" />
                      <span>{alert.text}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enlace público de reserva */}
        {me?.username && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Tu enlace de reserva para clientes</p>
                  <p className="text-sm font-mono truncate text-foreground">
                    {window.location.origin}{import.meta.env.BASE_URL}u/{me.username}
                  </p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}u/${me.username}`)}
                  className="shrink-0 h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted transition-colors"
                  title="Copiar enlace"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral toggle — trainers & owners only */}
        {me?.username && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Share2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Activar sistema de referidos</p>
                  <p className="text-xs text-muted-foreground">Tus clientes podrán invitar a amigos con un enlace personalizado</p>
                </div>
                <Switch
                  checked={me.referralsEnabled ?? false}
                  onCheckedChange={handleReferralToggle}
                  disabled={referralToggling}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estadísticas */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t.dashboard.totalClients}
            value={stats?.totalClients ?? 0}
            icon={Users}
            loading={statsLoading}
            description={t.dashboard.totalClientsDesc}
          />
          <StatCard
            title={t.dashboard.weeklySessions}
            value={stats?.weeklySessions ?? 0}
            icon={Calendar}
            loading={statsLoading}
            description={t.dashboard.weeklySessionsDesc}
          />
          <StatCard
            title={t.dashboard.monthlyRevenue}
            value={formatCurrency(stats?.monthlyRevenue ?? 0)}
            icon={TrendingUp}
            loading={statsLoading}
            description={t.dashboard.monthlyRevenueDesc}
          />
          <StatCard
            title={t.dashboard.unpaidBalance}
            value={formatCurrency(stats?.unpaidRevenue ?? 0)}
            icon={AlertCircle}
            loading={statsLoading}
            description={t.dashboard.unpaidBalanceDesc}
          />
        </div>

        {/* Gráfico de ingresos */}
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.revenueChart}</CardTitle>
            <CardDescription>{t.dashboard.revenueChartDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !monthlyRevenue?.length ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                {t.dashboard.noRevenueData}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}€`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), t.dashboard.revenueTooltipLabel]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sesiones recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t.dashboard.recentSessions}</CardTitle>
              <CardDescription>{t.dashboard.recentSessionsDesc}</CardDescription>
            </div>
            <Link href="/sessions" className="text-sm text-primary hover:underline">{t.dashboard.viewAll}</Link>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !recentSessions?.length ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {t.dashboard.noSessions}{" "}
                <Link href="/sessions" className="text-primary hover:underline">{t.dashboard.createFirstSession}</Link>
              </div>
            ) : (
              <div className="divide-y">
                {recentSessions.map(session => (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <div className="py-3 flex items-center justify-between hover:bg-muted/50 px-2 -mx-2 rounded-md transition-colors cursor-pointer">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{session.clientName ?? t.sessions.unknownClient}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(session.date), "d MMM yyyy 'a las' HH:mm", { locale })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <StatusBadge status={session.status} />
                        <span className="text-sm font-medium">{formatCurrency(Number(session.price))}</span>
                        {session.paid ? (
                          <span className="text-xs text-green-600 font-medium">{t.sessions.paid}</span>
                        ) : (
                          <span className="text-xs text-yellow-600 font-medium">{t.sessions.unpaid}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
