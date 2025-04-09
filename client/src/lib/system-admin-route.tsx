import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function SystemAdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.ReactNode;
}) {
  const { user, isLoading, isSystemAdmin } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Se não estiver autenticado, redireciona para a página de login do sistema
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/system/auth" />
      </Route>
    );
  }

  // Se não for um administrador do sistema, redireciona para a página de não autorizado
  if (!isSystemAdmin) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso não autorizado</h1>
          <p className="text-gray-600 mb-6 text-center">
            Você não tem permissão para acessar esta área. Esta seção é reservada para administradores do sistema.
          </p>
          <a 
            href="/" 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Voltar para a página inicial
          </a>
        </div>
      </Route>
    );
  }

  // Se for um administrador do sistema, renderiza o componente
  return <Route path={path} component={Component} />;
}