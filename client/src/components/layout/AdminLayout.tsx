import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, Calendar, CalendarRange, Users, DollarSign, Scissors, Settings, UserPlus, UserCircle, ShoppingCart, Package } from "lucide-react";
import LogoIcon from "../../components/LogoIcon";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  // Função para preservar o parâmetro tenant em todos os links
  const getUrlWithTenant = (path: string) => {
    const url = new URL(window.location.href);
    const tenant = url.searchParams.get('tenant');
    
    if (tenant) {
      return `${path}?tenant=${tenant}`;
    }
    
    return path;
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
    
    // Preservar o parâmetro tenant ao fazer logout
    const url = new URL(window.location.href);
    const tenant = url.searchParams.get('tenant');
    
    if (tenant) {
      window.location.href = `/?tenant=${tenant}`;
    } else {
      window.location.href = "/";
    }
  };
  
  return (
    <div id="admin-interface" className="min-h-screen bg-neutral-light">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-primary text-white h-screen fixed inset-y-0 left-0 overflow-y-auto">
          <div className="px-6 py-6">
            <div className="flex items-center mb-8">
              <LogoIcon className="h-8 w-8" showText={true} textClassName="text-xl font-display font-bold" />
            </div>
            
            <nav className="space-y-1">
              <Link href={getUrlWithTenant("/admin/dashboard")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/dashboard" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </a>
              </Link>
              <Link href={getUrlWithTenant("/admin/appointments")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/appointments" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Calendar className="h-5 w-5 mr-3" />
                  Agenda
                </a>
              </Link>
              <Link href={getUrlWithTenant("/admin/calendar")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/calendar" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <CalendarRange className="h-5 w-5 mr-3" />
                  Calendário
                </a>
              </Link>
              <Link href={getUrlWithTenant("/admin/clients")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/clients" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Users className="h-5 w-5 mr-3" />
                  Clientes
                </a>
              </Link>
              <Link href={getUrlWithTenant("/admin/loyalty")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/loyalty" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <DollarSign className="h-5 w-5 mr-3" />
                  Fidelidade
                </a>
              </Link>
              <Link href={getUrlWithTenant("/admin/services")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/services" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Scissors className="h-5 w-5 mr-3" />
                  Serviços
                </a>
              </Link>
              <Link href={getUrlWithTenant("/admin/professionals")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/professionals" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <UserCircle className="h-5 w-5 mr-3" />
                  Profissionais
                </a>
              </Link>
              <Link href={getUrlWithTenant("/admin/products")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/products" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Package className="h-5 w-5 mr-3" />
                  Produtos
                </a>
              </Link>
              <Link href={getUrlWithTenant("/admin/orders")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location.startsWith("/admin/orders") ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <ShoppingCart className="h-5 w-5 mr-3" />
                  Comandas
                </a>
              </Link>
              {/* Link de Usuários apenas para administradores da barbearia */}
              {user?.role === "admin" && (
                <Link href={getUrlWithTenant("/admin/users")}>
                  <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/users" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                    <UserPlus className="h-5 w-5 mr-3" />
                    Usuários
                  </a>
                </Link>
              )}
              
              {/* Link de Configurações disponível para todos os tipos de admin */}
              <Link href={getUrlWithTenant("/admin/barbershop-settings")}>
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/barbershop-settings" || location === "/admin/settings" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Settings className="h-5 w-5 mr-3" />
                  Configurações
                </a>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center py-3 px-4 rounded-lg text-white/80 hover:bg-primary-light hover:text-white transition mt-4"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sair
              </button>
            </nav>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-display font-bold text-primary">{title}</h2>
            <div className="flex items-center">
              <div className="relative">
                <div className="flex items-center p-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <span className="text-primary text-xs font-bold">
                      {user?.name?.charAt(0) || "U"}
                    </span>
                  </div>
                  <span className="text-primary font-medium mr-2">{user?.name || "Usuário"}</span>
                </div>
              </div>
            </div>
          </div>
          
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
