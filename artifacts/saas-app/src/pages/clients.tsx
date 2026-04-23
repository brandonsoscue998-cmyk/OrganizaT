import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListClients,
  useCreateClient,
  useDeleteClient,
  getListClientsQueryKey,
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
import { Plus, Trash2, ChevronRight, Users } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { t } from "@/lib/i18n";

const clientSchema = z.object({
  name: z.string().min(1, t.clients.nameRequired),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ClientForm = z.infer<typeof clientSchema>;

export default function Clients() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: clients, isLoading } = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  });

  const onSubmit = async (data: ClientForm) => {
    await createClient.mutateAsync({ data: { name: data.name, phone: data.phone ?? null, notes: data.notes ?? null } });
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
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
              <Button size="sm" className="gap-2">
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
                  <Input id="name" placeholder={t.clients.fullNamePlaceholder} {...register("name")} className={errors.name ? "border-destructive" : ""} />
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
            ) : !clients?.length ? (
              <div className="p-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm font-medium">{t.clients.noClients}</p>
                <p className="text-muted-foreground text-xs mt-1">{t.clients.noClientsDesc}</p>
              </div>
            ) : (
              <div className="divide-y">
                {clients.map(client => (
                  <div key={client.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                    <Link href={`/clients/${client.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                          {client.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">{client.name}</div>
                          {client.phone && <div className="text-xs text-muted-foreground">{client.phone}</div>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
