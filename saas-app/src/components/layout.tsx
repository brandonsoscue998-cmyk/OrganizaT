import React from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Users, Calendar, LayoutDashboard, LogOut, Loader2, Menu, CalendarDays, Sun, Building2, UserCog } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "./ui/sheet";
import { t } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({
    query: {
      queryKey: ["getMe"],
      retry: false,
    },
  });

  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

  const [pendingCount, setPendingCount] = React.useState(0);
  React.useEffect(() => {
    if (!user || user.role === "client") return;
    const token = localStorage.getItem("auth_token");
    fetch(`${BASE}/api/booking-requests/count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setPendingCount(d.count ?? 0))
      .catch(() => {});
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const activeClass = "bg-primary/[0.07] text-foreground font-semibold";
  const inactiveClass = "text-muted-foreground hover:bg-muted/70 hover:text-foreground";
  const linkBase = "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200";

  const NavItems = () => (
    <>
      <Link href="/dashboard" className={`${linkBase} ${location === "/dashboard" ? activeClass : inactiveClass}`}>
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        {t.nav.dashboard}
        {pendingCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold leading-none">
            {pendingCount}
          </span>
        )}
      </Link>
      <Link href="/clients" className={`${linkBase} ${location.startsWith("/clients") ? activeClass : inactiveClass}`}>
        <Users className="h-4 w-4 shrink-0" />
        {t.nav.clients}
      </Link>
      <Link href="/sessions" className={`${linkBase} ${location.startsWith("/sessions") ? activeClass : inactiveClass}`}>
        <Calendar className="h-4 w-4 shrink-0" />
        {t.nav.sessions}
      </Link>
      <Link href="/hoy" className={`${linkBase} ${location === "/hoy" ? activeClass : inactiveClass}`}>
        <Sun className="h-4 w-4 shrink-0" />
        {t.nav.today}
      </Link>
      <Link href="/calendar" className={`${linkBase} ${location.startsWith("/calendar") ? activeClass : inactiveClass}`}>
        <CalendarDays className="h-4 w-4 shrink-0" />
        {t.nav.calendar}
      </Link>
      {user.role === "trainer" && (
        <Link href="/book-space" className={`${linkBase} ${location.startsWith("/book-space") || location.startsWith("/space-book") ? activeClass : inactiveClass}`}>
          <Building2 className="h-4 w-4 shrink-0" />
          {t.nav.spaceBook}
        </Link>
      )}
      {user.role !== "client" && (
        <Link href="/users" className={`${linkBase} ${location.startsWith("/users") ? activeClass : inactiveClass}`}>
          <UserCog className="h-4 w-4 shrink-0" />
          Usuarios
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-[10px] font-bold leading-none">OT</span>
          </div>
          <span className="font-bold text-lg tracking-tight">Organiza<span className="text-primary">T</span></span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[80vw] max-w-[320px] p-0 gap-0 bg-background flex flex-col rounded-r-2xl border-r border-border/70 shadow-2xl"
          >
            <SheetTitle className="sr-only">OrganizaT</SheetTitle>
            <SheetDescription className="sr-only">Menú de navegación</SheetDescription>
            <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border/70 shrink-0">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-xs font-bold leading-none">OT</span>
              </div>
              <span className="font-bold text-lg tracking-tight">Organiza<span className="text-primary">T</span></span>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
              <NavItems />
            </nav>
            <div className="border-t border-border/70 px-4 py-4 shrink-0">
              <div className="mb-3">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              <Button variant="outline" className="w-full justify-center gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                {t.nav.logout}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/70 bg-muted/40 p-4">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold leading-none">OT</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Organiza<span className="text-primary">T</span></span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavItems />
        </nav>
        <div className="mt-auto pt-4 border-t border-border/60">
          <div className="px-3 mb-3">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {t.nav.logout}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
