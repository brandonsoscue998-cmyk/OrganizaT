import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSessions,
  useCreateSession,
  useListClients,
  useDeleteSession,
  getListSessionsQueryKey,
  getListClientsQueryKey,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const sessionSchema = z.object({
  clientId: z.coerce.number().min(1, "Select a client"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  paid: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

type SessionForm = z.infer<typeof sessionSchema>;

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? variants.pending}`}>
      {status}
    </span>
  );
}

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Sessions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: sessions, isLoading } = useListSessions(undefined, { query: { queryKey: getListSessionsQueryKey() } });
  const { data: clients } = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      date: toLocalDateTimeString(new Date()),
      status: "pending",
      paid: false,
    },
  });

  const onSubmit = async (data: SessionForm) => {
    await createSession.mutateAsync({
      data: {
        clientId: data.clientId,
        date: new Date(data.date).toISOString(),
        status: data.status,
        price: data.price,
        paid: data.paid,
        notes: data.notes ?? null,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMonthlyRevenueQueryKey() });
    reset();
    setOpen(false);
  };

  const handleDelete = async (id: number) => {
    await deleteSession.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentSessionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMonthlyRevenueQueryKey() });
  };

  const filtered = sessions?.filter(s => filterStatus === "all" ? true : s.status === filterStatus) ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
            <p className="text-muted-foreground text-sm">Track all your client sessions</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Select onValueChange={(v) => setValue("clientId", parseInt(v, 10))}>
                    <SelectTrigger className={errors.clientId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a client" />
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
                  <Label htmlFor="date">Date & Time</Label>
                  <Input id="date" type="datetime-local" {...register("date")} className={errors.date ? "border-destructive" : ""} />
                  {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select defaultValue="pending" onValueChange={(v) => setValue("status", v as "pending" | "completed" | "cancelled")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input id="price" type="number" step="0.01" min="0" placeholder="0.00" {...register("price")} className={errors.price ? "border-destructive" : ""} />
                    {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="paid"
                    checked={watch("paid")}
                    onCheckedChange={(v) => setValue("paid", !!v)}
                  />
                  <Label htmlFor="paid">Mark as paid</Label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                  <Textarea id="notes" rows={2} placeholder="Session notes..." {...register("notes")} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createSession.isPending}>
                    {createSession.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Session
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "completed", "cancelled"].map(s => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className="capitalize"
            >
              {s === "all" ? "All" : s}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {filtered.length} session{filtered.length !== 1 ? "s" : ""}
              {filterStatus !== "all" ? ` · ${filterStatus}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !filtered.length ? (
              <div className="py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm font-medium">No sessions found</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {filterStatus !== "all" ? `No ${filterStatus} sessions` : "Create your first session to get started"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(session => (
                  <div key={session.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors group">
                    <Link href={`/sessions/${session.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div className="min-w-0">
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">{session.clientName ?? "Unknown Client"}</div>
                          <div className="text-xs text-muted-foreground">{format(new Date(session.date), "MMM d, yyyy 'at' h:mm a")}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <StatusBadge status={session.status} />
                      <span className="text-sm font-semibold">${Number(session.price).toFixed(2)}</span>
                      {session.paid ? (
                        <span className="text-xs text-green-600 font-medium">Paid</span>
                      ) : (
                        <span className="text-xs text-yellow-600 font-medium">Unpaid</span>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(session.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
