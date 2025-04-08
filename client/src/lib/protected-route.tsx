import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  // Log para debugging da autenticação
  console.log(`ProtectedRoute para ${path}:`, { 
    isAuthenticated: !!user, 
    isLoading,
    userData: user
  });

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.warn(`Tentativa de acesso não autorizado à rota: ${path}`);
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-red-50 border border-red-100 rounded-lg p-6 max-w-md w-full text-center">
            <h2 className="text-red-600 text-xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-gray-800 mb-4">
              Você precisa fazer login para acessar esta área administrativa.
            </p>
            <button
              onClick={() => window.location.href = '/admin/auth'}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </Route>
    );
  }

  // Verificação adicional: se tiver o objeto user mas não tiver os dados mínimos necessários
  if (!user.id || !user.username) {
    console.error("Dados de usuário incompletos:", user);
    return (
      <Route path={path}>
        <Redirect to="/admin/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
