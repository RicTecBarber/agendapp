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

type LoginData = z.infer<typeof loginSchema>;

export default function SystemAuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, isSystemAdmin, refetchUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const { toast } = useToast();

  // Efeito para redirecionar após login bem-sucedido
  useEffect(() => {
    if (user && user.isSystemAdmin) {
      console.log("Usuário logado como admin do sistema:", user);
      setLocation("/system/dashboard");
    } else if (user) {
      // Se estiver logado mas não for admin do sistema
      toast({
        title: "Acesso restrito",
        description: "Você não tem permissão para acessar a área do sistema",
        variant: "destructive",
      });
    }
  }, [user, isSystemAdmin, setLocation, toast]);

  // Formulário de login
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "admin",
      password: "admin123",
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    console.log("Tentando fazer login com:", data);
    loginMutation.mutate(data, {
      onSuccess: (userData: any) => {
        console.log("Login bem-sucedido, usuário:", userData);
        refetchUser?.().then((result) => {
          console.log("Dados do usuário após refetch:", result);
          // Forçar navegação após login bem-sucedido
          if (userData?.isSystemAdmin) {
            window.location.href = "/system/dashboard";
          }
        });
      },
      onError: (error: any) => {
        console.error("Erro de login:", error);
      }
    });
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
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
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