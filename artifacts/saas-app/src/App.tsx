import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAuthenticated } from "@/lib/auth";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Sessions from "@/pages/sessions";
import SessionDetail from "@/pages/session-detail";
import CalendarPage from "@/pages/calendar";
import TodayPage from "@/pages/today";
import ClientBook from "@/pages/client-book";
import SpaceBook from "@/pages/space-book";
import PublicBooking from "@/pages/public-booking";
import UsersAdmin from "@/pages/users-admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRedirect() {
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return <Redirect to="/dashboard" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProtectedRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/:id" component={ClientDetail} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/sessions/:id" component={SessionDetail} />
      <Route path="/hoy" component={TodayPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/client" component={ClientBook} />
      <Route path="/space-book" component={SpaceBook} />
      <Route path="/book-space" component={SpaceBook} />
      <Route path="/u/:username" component={PublicBooking} />
      <Route path="/users" component={UsersAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
