import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSession,
  useUpdateSession,
  useListClients,
  getGetSessionQueryKey,
  getListSessionsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetRecentSessionsQueryKey,
  getGetMonthlyRevenueQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";
import { t } from "@/lib/i18n";

const sessionSchema = z.object({
  clientId: z.coerce.number().min(1, t.sessions.clientRequired),
  date: z.string().min(1, t.sessions.dateRequired),
  status: z.enum(["pending", "completed", "cancelled"]),
  price: z.coerce.number().min(0),
  paid: z.boolean(),
  notes: z.string().optional().nullable(),
});

type SessionForm = z.infer<typeof sessionSchema>;

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function SessionDetail() {
  const [, params] = useRoute("/sessions/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id, 10) : 0;
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useGetSession(id, {
    query: { enabled: !!id, queryKey: getGetSessionQueryKey(id) }
  });
  const { data: clients } = useListClients({});
  const updateSession = useUpdateSession();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
  });

  useEffect(() => {
    if (session) {
      reset({
        clientId: session.clientId,
        date: toLocalDateTimeString(new Date(session.date)),
        status: session.status as "pending" | "completed" | "cancelled",
        price: Number(session.price),
        paid: session.paid,
        notes: session.notes ?? "",
      });
    }
  }, [session, reset]);

  const onSubmit = async (data: SessionForm) => {
    await updateSession.mutateAsync({
      id,
      data: {
        clientId: data.clientId,
        date: new Date(data.date).toISOString(),
        status: data.status,
        price: data.price,
        paid: data.paid,
        notes: data.notes ?? null,
      }
    });
    queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMonthlyRevenueQueryKey() });
    setLocation("/sessions");
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-xl">
        <div className="flex items-center gap-3">
          <Link href="/sessions">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.sessions.editTitle}</h1>
            <p className="text-muted-foreground text-sm">{t.sessions.editSubtitle}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.sessions.sessionDetails}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t.sessions.client}</Label>
                  <Select
                    value={watch("clientId") ? String(watch("clientId")) : undefined}
                    onValueChange={(v) => setValue("clientId", parseInt(v, 10), { shouldDirty: true })}
                  >
                    <SelectTrigger className={errors.clientId ? "border-destructive" : ""}>
                      <SelectValue placeholder={t.sessions.selectClient} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="date">{t.sessions.dateTime}</Label>
                  <Input id="date" type="datetime-local" {...register("date")} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t.sessions.status}</Label>
                    <Select
                      value={watch("status")}
                      onValueChange={(v) => setValue("status", v as "pending" | "completed" | "cancelled", { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t.sessions.filterPending}</SelectItem>
                        <SelectItem value="completed">{t.sessions.filterCompleted}</SelectItem>
                        <SelectItem value="cancelled">{t.sessions.filterCancelled}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="price">{t.sessions.price}</Label>
                    <Input id="price" type="number" step="0.01" min="0" {...register("price")} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="paid"
                    checked={watch("paid")}
                    onCheckedChange={(v) => setValue("paid", !!v, { shouldDirty: true })}
                  />
                  <Label htmlFor="paid">{t.sessions.markAsPaid}</Label>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">{t.sessions.sessionNotes} <span className="text-muted-foreground">{t.sessions.notesOptional}</span></Label>
                  <Textarea id="notes" rows={3} placeholder={t.sessions.notesPlaceholder} {...register("notes")} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Link href="/sessions">
                    <Button type="button" variant="outline">{t.sessions.cancel}</Button>
                  </Link>
                  <Button type="submit" disabled={updateSession.isPending || !isDirty}>
                    {updateSession.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t.sessions.save}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
