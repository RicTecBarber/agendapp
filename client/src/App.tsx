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
import UsersPage from "@/pages/admin/UsersPage";
import ProfessionalsPage from "@/pages/admin/ProfessionalsPage";
import AvailabilityManagementPage from "@/pages/admin/AvailabilityManagementPage";
import BarbershopSettingsPage from "@/pages/admin/BarbershopSettingsPage";

function Router() {
  return (
    <Switch>
      {/* Client Routes */}
      <Route path="/" component={ClientHomePage} />
      <Route path="/new-appointment" component={NewAppointmentPage} />
      <Route path="/client/consultar" component={CheckAppointmentPage} />
      <Route path="/check-appointment" component={CheckAppointmentPage} />
      <Route path="/loyalty" component={LoyaltyPage} />
      
      {/* Admin Routes */}
      <Route path="/admin/auth" component={AuthPage} />
      <ProtectedRoute path="/admin/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/admin/appointments" component={AppointmentsPage} />
      <ProtectedRoute path="/admin/clients" component={ClientsPage} />
      <ProtectedRoute path="/admin/loyalty" component={LoyaltyManagementPage} />
      <ProtectedRoute path="/admin/services" component={ServicesPage} />
      <ProtectedRoute path="/admin/professionals" component={ProfessionalsPage} />
      <ProtectedRoute path="/admin/professionals/:id/availability" component={AvailabilityManagementPage} />
      <ProtectedRoute path="/admin/users" component={UsersPage} />
      <ProtectedRoute path="/admin/settings" component={BarbershopSettingsPage} />
      <ProtectedRoute path="/admin/barbershop-settings" component={BarbershopSettingsPage} />
      
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
