import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, UserCog } from "lucide-react";
import { format } from "date-fns";
import { locale } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type AppUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  username: string | null;
  createdAt: string;
};

const ROLE_LABEL: Record<string, string> = {
  client: "Cliente",
  trainer: "Entrenador",
  owner: "Emprendedor",
};

const ROLE_STYLE: Record<string, string> = {
  client: "bg-blue-50 text-blue-700 border-blue-200",
  trainer: "bg-primary/10 text-primary border-primary/20",
  owner: "bg-purple-50 text-purple-700 border-purple-200",
};

const TABS = [
  { value: "all", label: "Todos" },
  { value: "client", label: "Clientes" },
  { value: "trainer", label: "Entrenadores" },
  { value: "owner", label: "Emprendedores" },
];

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLE[role] ?? "bg-muted text-muted-foreground border-border"}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

export default function UsersAdmin() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = users.filter(u => {
    const matchRole = tab === "all" || u.role === tab;
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const counts: Record<string, number> = { all: users.length };
  for (const u of users) counts[u.role] = (counts[u.role] ?? 0) + 1;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground text-sm">Todos los usuarios registrados en el sistema</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {counts[t.value] !== undefined && (
                <span className="ml-1.5 text-xs text-muted-foreground">({counts[t.value] ?? 0})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <UserCog className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map(user => (
                  <li key={user.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary text-sm font-semibold leading-none">
                        {user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <RoleBadge role={user.role} />
                      <span className="text-[10px] text-muted-foreground">
                        Desde {format(new Date(user.createdAt), "MMM yyyy", { locale })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
    </Layout>
  );
}
