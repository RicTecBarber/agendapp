import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { SystemAdminRoute } from "@/lib/system-admin-route";
import { TenantProvider } from "@/hooks/use-tenant";

// Client Pages
import ClientHomePage from "@/pages/client/ClientHomePage";
import NewAppointmentPage from "@/pages/client/NewAppointmentPage";
import CheckAppointmentPage from "@/pages/client/CheckAppointmentPage";
import LoyaltyPage from "@/pages/client/LoyaltyPage";

// Admin Pages
import AuthPage from "@/pages/admin/AuthPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import AppointmentsPage from "@/pages/admin/AppointmentsPage";
import CalendarPage from "@/pages/admin/CalendarPage";
import ClientsPage from "@/pages/admin/ClientsPage";
import LoyaltyManagementPage from "@/pages/admin/LoyaltyManagementPage";
import ServicesPage from "@/pages/admin/ServicesPage";
import UsersPage from "@/pages/admin/UsersPage";
import UsersManagementPage from "@/pages/admin/UsersManagementPage";
import ProfessionalsPage from "@/pages/admin/ProfessionalsPage";
import AvailabilityManagementPage from "@/pages/admin/AvailabilityManagementPage";
import BusinessSettingsPage from "@/pages/admin/BusinessSettingsPage";
import ProductsPage from "@/pages/admin/ProductsPage";
import OrdersPage from "@/pages/admin/OrdersPage";
import CreateOrderPage from "@/pages/admin/CreateOrderPage";
import UploadTest from "@/pages/admin/UploadTest";

// System Admin Pages
import SystemAuthPage from "@/pages/system/SystemAuthPage";
import SystemDashboardPage from "@/pages/system/SystemDashboardPage";
import TenantsPage from "@/pages/system/TenantsPage";
import EditTenantPage from "@/pages/system/EditTenantPage";
import SystemAdminsPage from "@/pages/system/SystemAdminsPage";
import SystemLoginRedirect from "@/pages/system/SystemLoginRedirect";

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
      <ProtectedRoute path="/admin/calendar" component={CalendarPage} />
      <ProtectedRoute path="/admin/agendamentos/novo" component={AppointmentsPage} />
      <ProtectedRoute path="/admin/clients" component={ClientsPage} />
      <ProtectedRoute path="/admin/clientes" component={ClientsPage} />
      <ProtectedRoute path="/admin/loyalty" component={LoyaltyManagementPage} />
      <ProtectedRoute path="/admin/services" component={ServicesPage} />
      <ProtectedRoute path="/admin/professionals" component={ProfessionalsPage} />
      <ProtectedRoute path="/admin/professionals/:id/availability" component={AvailabilityManagementPage} />
      <ProtectedRoute path="/admin/availability/:id" component={AvailabilityManagementPage} />
      <ProtectedRoute path="/admin/users" component={UsersPage} />
      <ProtectedRoute path="/admin/users-management" component={UsersManagementPage} />
      <ProtectedRoute path="/admin/settings" component={BusinessSettingsPage} />
      <ProtectedRoute path="/admin/barbershop-settings" component={BusinessSettingsPage} />
      <ProtectedRoute path="/admin/products" component={ProductsPage} />
      <ProtectedRoute path="/admin/orders" component={OrdersPage} />
      <ProtectedRoute path="/admin/orders/new" component={CreateOrderPage} />
      <Route path="/admin/upload-test" component={UploadTest} />
      
      {/* System Admin Routes */}
      <Route path="/system/auth" component={SystemAuthPage} />
      <Route path="/system/redirect" component={SystemLoginRedirect} />
      <SystemAdminRoute path="/system/dashboard" component={SystemDashboardPage} />
      <SystemAdminRoute path="/system/tenants" component={TenantsPage} />
      <SystemAdminRoute path="/system/tenants/new" component={EditTenantPage} />
      <SystemAdminRoute path="/system/tenants/:id" component={EditTenantPage} />
      <SystemAdminRoute path="/system/admins" component={SystemAdminsPage} />
      
      {/* Fallback Route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <Router />
          <Toaster />
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
