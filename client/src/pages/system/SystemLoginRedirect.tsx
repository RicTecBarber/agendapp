import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function SystemLoginRedirect() {
  const { user, isSystemAdmin } = useAuth();

  useEffect(() => {
    // Log para depuração
    console.log("SystemLoginRedirect - user:", user);
    console.log("SystemLoginRedirect - isSystemAdmin:", isSystemAdmin);

    // Redirecionar após 1 segundo para dar tempo ao sistema de carregar
    const timer = setTimeout(() => {
      window.location.href = "/system/dashboard";
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, isSystemAdmin]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Login bem-sucedido!</h2>
        <p className="text-gray-600">Redirecionando para o dashboard do sistema...</p>
      </div>
    </div>
  );
}