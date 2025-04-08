import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Scissors } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, 'Nome de usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

interface BarbershopSettings {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  open_time: string;
  close_time: string;
  open_days: number[];
  description: string | null;
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
}

const AuthPage = () => {
  const [location, navigate] = useLocation();
  const { user, loginMutation } = useAuth();
  
  // Buscar as configurações da barbearia
  const { data: barbershopSettings } = useQuery<BarbershopSettings>({
    queryKey: ['/api/barbershop-settings'],
    refetchOnWindowFocus: false,
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  return (
    <div id="admin-interface" className="min-h-screen bg-neutral-light flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Scissors className="h-12 w-12 text-secondary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-primary">
            {barbershopSettings?.name || 'AgendApp'}
          </h1>
          <p className="text-neutral-dark mt-2">Área Administrativa</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o painel administrativo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de usuário</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input type="password" {...field} />
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
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <Button variant="link" onClick={() => navigate("/")}>
            Voltar para área do cliente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;