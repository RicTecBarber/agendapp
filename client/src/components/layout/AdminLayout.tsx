import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, Calendar, Users, DollarSign, Scissors, Settings, UserPlus, UserCircle } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
    window.location.href = "/";
  };
  
  return (
    <div id="admin-interface" className="min-h-screen bg-neutral-light">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-primary text-white h-screen fixed inset-y-0 left-0 overflow-y-auto">
          <div className="px-6 py-6">
            <div className="flex items-center mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary-light mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
              </svg>
              <h1 className="text-xl font-display font-bold">BarberSync</h1>
            </div>
            
            <nav className="space-y-1">
              <Link href="/admin/dashboard">
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/dashboard" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </a>
              </Link>
              <Link href="/admin/appointments">
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/appointments" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Calendar className="h-5 w-5 mr-3" />
                  Agenda
                </a>
              </Link>
              <Link href="/admin/clients">
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/clients" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Users className="h-5 w-5 mr-3" />
                  Clientes
                </a>
              </Link>
              <Link href="/admin/loyalty">
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/loyalty" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <DollarSign className="h-5 w-5 mr-3" />
                  Fidelidade
                </a>
              </Link>
              <Link href="/admin/services">
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/services" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <Scissors className="h-5 w-5 mr-3" />
                  Serviços
                </a>
              </Link>
              <Link href="/admin/professionals">
                <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/professionals" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                  <UserCircle className="h-5 w-5 mr-3" />
                  Profissionais
                </a>
              </Link>
              {user?.role === "admin" && (
                <>
                  <Link href="/admin/users">
                    <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/users" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                      <UserPlus className="h-5 w-5 mr-3" />
                      Usuários
                    </a>
                  </Link>
                  <Link href="/admin/settings">
                    <a className={`flex items-center py-3 px-4 rounded-lg text-white ${location === "/admin/settings" ? "bg-primary-light" : "text-white/80 hover:bg-primary-light hover:text-white"} transition`}>
                      <Settings className="h-5 w-5 mr-3" />
                      Configurações
                    </a>
                  </Link>
                </>
              )}
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
