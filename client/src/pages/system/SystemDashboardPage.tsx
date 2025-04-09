import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, UserCog, LogOut } from "lucide-react";

export default function SystemDashboardPage() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <UserCog className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">AgendApp Sistema</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Olá, {user?.name}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Dashboard do Sistema</h2>
          <p className="text-gray-600">
            Gerencie os tenants e administradores do sistema AgendApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2 text-primary" />
                Tenants
              </CardTitle>
              <CardDescription>
                Gerencie os tenants (barbearias/salões) da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Adicione, edite ou desative tenants do sistema. Cada tenant representa uma instância da aplicação para um cliente.
              </p>
              <Link href="/system/tenants">
                <Button className="w-full">Gerenciar Tenants</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <UserCog className="h-5 w-5 mr-2 text-primary" />
                Administradores
              </CardTitle>
              <CardDescription>
                Gerencie os administradores do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Adicione ou remova administradores do sistema. Estes usuários têm acesso a todas as funcionalidades de gestão da plataforma.
              </p>
              <Link href="/system/admins">
                <Button className="w-full">Gerenciar Administradores</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}