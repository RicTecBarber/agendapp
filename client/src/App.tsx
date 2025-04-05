import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

// Client Pages
import ClientHomePage from "@/pages/client/ClientHomePage";
import NewAppointmentPage from "@/pages/client/NewAppointmentPage";
import CheckAppointmentPage from "@/pages/client/CheckAppointmentPage";
import LoyaltyPage from "@/pages/client/LoyaltyPage";

// Admin Pages
import AuthPage from "@/pages/admin/AuthPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import AppointmentsPage from "@/pages/admin/AppointmentsPage";
import ClientsPage from "@/pages/admin/ClientsPage";
import LoyaltyManagementPage from "@/pages/admin/LoyaltyManagementPage";
import ServicesPage from "@/pages/admin/ServicesPage";

function Router() {
  return (
    <Switch>
      {/* Client Routes */}
      <Route path="/" component={ClientHomePage} />
      <Route path="/new-appointment" component={NewAppointmentPage} />
      <Route path="/check-appointment" component={CheckAppointmentPage} />
      <Route path="/loyalty" component={LoyaltyPage} />
      
      {/* Admin Routes */}
      <Route path="/admin/auth" component={AuthPage} />
      <ProtectedRoute path="/admin/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/admin/appointments" component={AppointmentsPage} />
      <ProtectedRoute path="/admin/clients" component={ClientsPage} />
      <ProtectedRoute path="/admin/loyalty" component={LoyaltyManagementPage} />
      <ProtectedRoute path="/admin/services" component={ServicesPage} />
      
      {/* Fallback Route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
