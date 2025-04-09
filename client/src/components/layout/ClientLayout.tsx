import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import logoSvg from "@/assets/logo.svg";

interface ClientLayoutProps {
  children: ReactNode;
  title: string;
}

const ClientLayout = ({ children, title }: ClientLayoutProps) => {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Se já estiver autenticado, vá direto para o dashboard
    if (user) {
      navigate('/admin/dashboard');
    } else {
      // Senão, vá para a página de autenticação
      navigate('/admin/auth');
    }
  };
  
  return (
    <div id="client-interface" className="min-h-screen bg-neutral-light">
      <header className="bg-primary shadow-md">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/">
            <a className="flex items-center">
              <img src={logoSvg} alt="AgendApp Logo" className="h-10 w-10" />
              <h1 className="ml-2 text-2xl font-display font-bold text-white">AgendApp</h1>
            </a>
          </Link>
          <button 
            onClick={handleAdminClick}
            className="text-sm text-white/60 hover:text-white focus:outline-none"
          >
            Área do Administrador
          </button>
        </div>
      </header>

      <main>
        {location !== "/" && (
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center mb-8">
              <Link href="/">
                <a className="mr-4 hover:bg-neutral/20 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
              </Link>
              <h2 className="text-2xl font-display font-bold text-primary">{title}</h2>
            </div>
          </div>
        )}
        
        {children}
      </main>

      <script type="text/javascript" src="https://replit.com/public/js/replit-badge-v3.js"></script>
    </div>
  );
};

export default ClientLayout;
