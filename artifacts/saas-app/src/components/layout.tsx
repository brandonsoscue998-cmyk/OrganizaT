import React from "react";
import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Users, Calendar, LayoutDashboard, LogOut, Loader2, Menu, CalendarDays, Sun, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { t } from "@/lib/i18n";

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

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

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

  const NavItems = () => (
    <>
      <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/dashboard" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
        <LayoutDashboard className="h-5 w-5" />
        {t.nav.dashboard}
      </Link>
      <Link href="/clients" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.startsWith("/clients") ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
        <Users className="h-5 w-5" />
        {t.nav.clients}
      </Link>
      <Link href="/sessions" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.startsWith("/sessions") ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
        <Calendar className="h-5 w-5" />
        {t.nav.sessions}
      </Link>
      <Link href="/hoy" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/hoy" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
        <Sun className="h-5 w-5" />
        {t.nav.today}
      </Link>
      <Link href="/calendar" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.startsWith("/calendar") ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
        <CalendarDays className="h-5 w-5" />
        {t.nav.calendar}
      </Link>
      {user.role === "trainer" && (
        <Link href="/book-space" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.startsWith("/book-space") || location.startsWith("/space-book") ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}>
          <Building2 className="h-5 w-5" />
          {t.nav.spaceBook}
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="font-semibold text-lg tracking-tight">{t.app.name}</div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] flex flex-col gap-4">
            <div className="font-semibold text-lg tracking-tight mb-4">{t.app.name}</div>
            <nav className="flex flex-col gap-2">
              <NavItems />
            </nav>
            <div className="mt-auto">
              <div className="text-sm font-medium mb-1 truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground mb-4 truncate">{user.email}</div>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                {t.nav.logout}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card p-4">
        <div className="font-semibold text-xl tracking-tight mb-8 px-2">{t.app.name}</div>
        <nav className="flex flex-col gap-2 flex-1">
          <NavItems />
        </nav>
        <div className="mt-auto pt-4 border-t">
          <div className="px-2 mb-4">
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
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
