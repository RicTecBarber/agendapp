import { z } from "zod";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type LoginData = z.infer<typeof loginSchema>;

export default function SystemAuthPage() {
  const [, setLocation] = useLocation();
  const { user, isSystemAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { toast } = useToast();

  console.log("Render: Current user state:", user);
  console.log("isSystemAdmin:", isSystemAdmin);

  // Redirecionamento direto após login bem-sucedido
  useEffect(() => {
    if (loginSuccess) {
      window.location.href = "/system/dashboard";
    }
  }, [loginSuccess]);

  // Verificar se já está logado ao carregar a página
  useEffect(() => {
    if (user && isSystemAdmin) {
      console.log("Usuário já está logado como admin:", user);
      window.location.href = "/system/dashboard";
    } else if (user) {
      // Se estiver logado mas não for admin do sistema
      console.log("Usuário logado, mas não é admin do sistema:", user);
      toast({
        title: "Acesso restrito",
        description: "Você não tem permissão para acessar a área do sistema",
        variant: "destructive",
      });
    }
  }, [user, isSystemAdmin, toast]);

  // Formulário de login
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "superadmin",
      password: "Admin@123",
    },
  });

  const onLoginSubmit = async (data: LoginData) => {
    console.log("Tentando fazer login com:", data);
    setIsLoading(true);
    
    try {
      // Usar a nova rota específica de login para administradores do sistema
      const response = await apiRequest("POST", "/api/system/login", data);
      const userData = await response.json();
      
      console.log("Login bem-sucedido, usuário:", userData);
      
      if (userData && 'isSystemAdmin' in userData) {
        console.log("Usuário é um administrador do sistema");
        // Atualizar o estado do usuário (na próxima vez que a página for carregada)
        setLoginSuccess(true);
        // Usar navegação direta para a página do sistema
        window.location.href = "/system/dashboard";
      } else {
        console.log("Usuário não é um administrador do sistema");
        toast({
          title: "Acesso restrito",
          description: "Estas credenciais não pertencem a um administrador do sistema",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro de login:", error);
      toast({
        title: "Falha no login",
        description: error.message || "Não foi possível fazer login. Verifique suas credenciais.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center rounded-full bg-primary/10 p-2 mb-2">
            <UserCog className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Administração do Sistema</h1>
          <p className="text-sm text-gray-500">Central de gestão de tenants e administradores</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h3 className="text-xl font-medium mb-4">Login do Administrador</h3>
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de usuário</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <span className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></span>
                      Entrando...
                    </div>
                  ) : "Entrar"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>Esta é a área exclusiva para administradores do sistema.</p>
          <p>Se você é um usuário comum, acesse a <a href="/admin/auth" className="text-primary hover:underline">área administrativa</a>.</p>
        </div>
      </div>
    </div>
  );
}