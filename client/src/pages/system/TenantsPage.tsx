import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Tenant } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  UserCog,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ArrowLeft,
  ExternalLink,
  Link as LinkIcon,
  Copy,
  Cog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface para o gerador de links
interface LinkGeneratorState {
  tenant: Tenant | null;
  linkType: string;
  baseUrl: string;
  customPath: string;
  customParams: string;
}

// Função de ajuda para garantir a compatibilidade entre active e is_active
function getTenantActiveState(tenant: Tenant): boolean {
  if (tenant.hasOwnProperty('is_active')) {
    return tenant.is_active === true;
  }
  
  if (tenant.hasOwnProperty('active')) {
    return tenant.active === true;
  }
  
  // Valor padrão em caso de problemas
  return false;
}

export default function TenantsPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deletingTenantId, setDeletingTenantId] = useState<number | null>(null);
  
  // Estado para o gerador de links
  const [linkGeneratorOpen, setLinkGeneratorOpen] = useState(false);
  const [linkGenerator, setLinkGenerator] = useState<LinkGeneratorState>({
    tenant: null,
    linkType: 'client',
    baseUrl: window.location.origin,
    customPath: '',
    customParams: ''
  });

  // Buscar todos os tenants
  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/system/tenants"],
  });

  // Mutation para ativar/desativar tenant
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      // active = true significa que queremos ativar o tenant
      const endpoint = active
        ? `/api/system/tenants/${id}/activate`
        : `/api/system/tenants/${id}/deactivate`;
      const res = await apiRequest("POST", endpoint);
      return await res.json();
    },
    onSuccess: async () => {
      // Invalidar e refetch imediato dos dados para garantir que a lista esteja atualizada
      await queryClient.invalidateQueries({ queryKey: ["/api/system/tenants"] });
      await queryClient.refetchQueries({ queryKey: ["/api/system/tenants"] });
      
      toast({
        title: "Tenant atualizado",
        description: "Status do tenant alterado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir tenant
  const deleteTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/system/tenants/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao excluir tenant");
      }
      return await res.json();
    },
    onSuccess: async () => {
      // Invalidar e refetch imediato dos dados para garantir que a lista esteja atualizada
      await queryClient.invalidateQueries({ queryKey: ["/api/system/tenants"] });
      await queryClient.refetchQueries({ queryKey: ["/api/system/tenants"] });
      
      toast({
        title: "Tenant excluído",
        description: "Tenant excluído com sucesso",
      });
      setDeletingTenantId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir tenant",
        description: error.message,
        variant: "destructive",
      });
      setDeletingTenantId(null);
    },
  });

  const handleToggleActive = (id: number, currentlyActive: boolean) => {
    toggleActiveMutation.mutate({ id, active: !currentlyActive });
  };

  const handleDeleteTenant = (id: number) => {
    deleteTenantMutation.mutate(id);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const confirmDelete = (id: number) => {
    setDeletingTenantId(id);
  };

  // Abrir gerador de links para um tenant específico
  const openLinkGenerator = (tenant: Tenant) => {
    setLinkGenerator({
      ...linkGenerator,
      tenant: tenant,
    });
    setLinkGeneratorOpen(true);
  };

  // Atualizar estado do gerador de links
  const updateLinkGenerator = (field: string, value: string) => {
    setLinkGenerator({
      ...linkGenerator,
      [field]: value
    });
  };

  // Gerar link com base nas configurações
  const generateLink = () => {
    if (!linkGenerator.tenant) return '';

    const { tenant, linkType, baseUrl, customPath, customParams } = linkGenerator;
    let generatedLink = baseUrl;

    // Adicionar o caminho personalizado, se houver
    if (customPath && customPath.trim() !== '') {
      generatedLink += customPath.startsWith('/') ? customPath : `/${customPath}`;
    }

    // Adicionar parâmetros de acordo com o tipo de link
    let queryParams = '';
    
    if (linkType === 'client') {
      // Link para cliente - tenant apenas
      queryParams = `?tenant=${tenant.slug}`;
    } else if (linkType === 'admin') {
      // Link para administração - tenant + admin=true
      queryParams = `?tenant=${tenant.slug}&admin=true`;
    } else if (linkType === 'custom') {
      // Link personalizado - adicionar tenant e parâmetros personalizados
      queryParams = `?tenant=${tenant.slug}`;
      if (customParams && customParams.trim() !== '') {
        // Verificar se os parâmetros personalizados já começam com '&'
        if (customParams.startsWith('&')) {
          queryParams += customParams;
        } else {
          queryParams += `&${customParams}`;
        }
      }
    }

    return generatedLink + queryParams;
  };

  // Copiar link para a área de transferência
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Link copiado",
      description: "Link copiado para a área de transferência",
    });
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => setLocation("/system/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h2 className="text-2xl font-bold">Gerenciamento de Tenants</h2>
          </div>
          <Link href="/system/tenants/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tenant
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Tenants do Sistema</CardTitle>
            <CardDescription>
              Lista de todos os tenants (barbearias/salões) cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : tenants && tenants.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Link de Acesso</TableHead>
                      <TableHead>URL Produção</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.id}</TableCell>
                        <TableCell>{tenant.name}</TableCell>
                        <TableCell>{tenant.slug}</TableCell>
                        <TableCell>
                          <a 
                            href={`/?tenant=${tenant.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <span className="text-sm font-medium whitespace-nowrap">
                              {`/?tenant=${tenant.slug}`}
                            </span>
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                          <div className="text-xs text-gray-500 mt-1">
                            Adicione "?tenant=" + o slug à URL deste site
                          </div>
                        </TableCell>
                        <TableCell>
                          {tenant.production_url ? (
                            <a 
                              href={tenant.production_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                              {tenant.production_url.substring(0, 25)}
                              {tenant.production_url.length > 25 ? '...' : ''}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getTenantActiveState(tenant) ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(tenant.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openLinkGenerator(tenant)}
                              title="Gerador de Links"
                              className="bg-blue-50"
                            >
                              <LinkIcon className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleToggleActive(tenant.id, getTenantActiveState(tenant))}
                            >
                              {getTenantActiveState(tenant) ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Link href={`/system/tenants/${tenant.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => confirmDelete(tenant.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum tenant cadastrado.</p>
                <p className="text-sm">Clique em "Novo Tenant" para adicionar o primeiro.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={!!deletingTenantId} onOpenChange={() => setDeletingTenantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este tenant? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingTenantId && handleDeleteTenant(deletingTenantId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo do Gerador de Links */}
      <Dialog open={linkGeneratorOpen} onOpenChange={setLinkGeneratorOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <LinkIcon className="h-5 w-5 mr-2 text-primary" />
              Gerador de Links para Tenant
            </DialogTitle>
            <DialogDescription>
              {linkGenerator.tenant ? (
                <>Crie links personalizados para o tenant <strong>{linkGenerator.tenant.name}</strong> (slug: <code>{linkGenerator.tenant.slug}</code>)</>
              ) : 'Crie links personalizados para o tenant selecionado'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="client" className="w-full" onValueChange={(value) => updateLinkGenerator('linkType', value)}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="client">Link Cliente</TabsTrigger>
              <TabsTrigger value="admin">Link Admin</TabsTrigger>
              <TabsTrigger value="custom">Link Personalizado</TabsTrigger>
            </TabsList>
            
            <TabsContent value="client" className="space-y-4 mt-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Link para Clientes</h4>
                <p className="text-xs text-gray-500">
                  Link básico para acesso dos clientes ao ambiente do tenant.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="admin" className="space-y-4 mt-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Link para Administradores</h4>
                <p className="text-xs text-gray-500">
                  Link para acesso dos administradores ao ambiente de gestão do tenant.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Link Personalizado</h4>
                <p className="text-xs text-gray-500">
                  Personalize o caminho (path) e parâmetros adicionais para o link.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Caminho (Path)</label>
                  <Input 
                    placeholder="/caminho/personalizado" 
                    value={linkGenerator.customPath}
                    onChange={(e) => updateLinkGenerator('customPath', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Parâmetros adicionais</label>
                  <Input 
                    placeholder="param1=valor1&param2=valor2" 
                    value={linkGenerator.customParams}
                    onChange={(e) => updateLinkGenerator('customParams', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Não inclua o parâmetro 'tenant', ele será adicionado automaticamente.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">URL Base</label>
              <Input 
                placeholder="https://exemplo.com" 
                value={linkGenerator.baseUrl}
                onChange={(e) => updateLinkGenerator('baseUrl', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Link Gerado</label>
              <div className="flex gap-2">
                <Input 
                  value={generateLink()}
                  readOnly
                  className="font-mono text-sm bg-gray-50"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => copyToClipboard(generateLink())}
                  title="Copiar link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}