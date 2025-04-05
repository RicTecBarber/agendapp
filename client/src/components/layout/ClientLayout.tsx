import { ReactNode } from "react";
import { Link, useLocation } from "wouter";

interface ClientLayoutProps {
  children: ReactNode;
  title: string;
}

const ClientLayout = ({ children, title }: ClientLayoutProps) => {
  const [location] = useLocation();
  
  return (
    <div id="client-interface" className="min-h-screen bg-neutral-light">
      <header className="bg-primary shadow-md">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <Link href="/">
            <a className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-secondary-light" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
              </svg>
              <h1 className="ml-2 text-2xl font-display font-bold text-white">BarberSync</h1>
            </a>
          </Link>
          <Link href="/admin/auth">
            <a className="text-sm text-white/60 hover:text-white">
              Área do Administrador
            </a>
          </Link>
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
