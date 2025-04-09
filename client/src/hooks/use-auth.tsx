import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { User, SystemAdmin, loginSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Tipo que representa um usuário autenticado (pode ser um usuário normal ou um administrador do sistema)
type AuthUser = (User | (SystemAdmin & { isSystemAdmin: true })) & { role?: string };

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  isSystemAdmin: boolean;
  loginMutation: any;
  logoutMutation: any;
  registerMutation: any;
  refetchUser?: () => Promise<any>;
};

type LoginData = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "barber"]).default("barber"),
});

type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<AuthUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 60 * 1000, // 1 minuto
  });

  // Verifica se o usuário é um administrador do sistema
  const isSystemAdmin = !!user?.isSystemAdmin;

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: AuthUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Mensagem personalizada para administradores do sistema
      if (user.isSystemAdmin) {
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo ao painel de administração do sistema, ${user.name}`,
        });
      } else {
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo, ${user.name}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Cadastro realizado com sucesso",
        description: `Bem-vindo, ${user.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no cadastro",
        description: error.message || "Não foi possível realizar o cadastro",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout realizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao sair",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Adicionar a reatualização de dados do usuário no método de login
  const loginMutationWithRefetch = {
    ...loginMutation,
    mutate: (credentials: LoginData) => {
      loginMutation.mutate(credentials, {
        onSuccess: () => {
          refetchUser?.();
        }
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isSystemAdmin,
        loginMutation: loginMutationWithRefetch,
        logoutMutation,
        registerMutation,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
