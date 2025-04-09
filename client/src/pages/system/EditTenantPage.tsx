import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tenant, insertTenantSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Building,
  UserCog,
  LogOut,
  Check,
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

// Estender o schema para validação do formulário
const tenantSchema = insertTenantSchema.extend({
  slug: z.string()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
});

type TenantData = z.infer<typeof tenantSchema>;

export default function EditTenantPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!id && id !== "new";

  // Formulário
  const form = useForm<TenantData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
      slug: "",
      active: true,
      is_active: true,
      production_url: "",
    },
  });

  // Buscar tenant para edição
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/system/tenants", id],
    queryFn: isEditMode 
      ? getQueryFn(`/api/system/tenants/${id}`) 
      : () => Promise.resolve(undefined),
    enabled: isEditMode,
  });

  // Configurar valores do formulário quando os dados do tenant forem carregados
  useEffect(() => {
    if (tenant && isEditMode) {
      form.reset({
        name: tenant.name,
        slug: tenant.slug,
        active: tenant.active || tenant.is_active,
        is_active: tenant.is_active || tenant.active,
        production_url: tenant.production_url || "",
      });
    }
  }, [tenant, form, isEditMode]);

  // Mutation para criar tenant
  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantData) => {
      const res = await apiRequest("POST", "/api/system/tenants", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao criar tenant");
      }
      return await res.json();
    },
    onSuccess: () => {
      // Invalidar query de listagem para forçar atualização
      queryClient.invalidateQueries({ queryKey: ["/api/system/tenants"] });
      
      toast({
        title: "Tenant criado",
        description: "Tenant criado com sucesso",
      });
      setLocation("/system/tenants");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar tenant
  const updateTenantMutation = useMutation({
    mutationFn: async (data: TenantData) => {
      const res = await apiRequest("PUT", `/api/system/tenants/${id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao atualizar tenant");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/tenants"] });
      toast({
        title: "Tenant atualizado",
        description: "Tenant atualizado com sucesso",
      });
      setLocation("/system/tenants");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TenantData) => {
    if (isEditMode) {
      updateTenantMutation.mutate(data);
    } else {
      createTenantMutation.mutate(data);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isPending = createTenantMutation.isPending || updateTenantMutation.isPending;

  // Função auxiliar para buscar de API
  function getQueryFn(url: string) {
    return async () => {
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Erro ao buscar dados");
      }
      return res.json();
    };
  }

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
            <Button variant="outline" size="sm" onClick={() => setLocation("/system/tenants")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h2 className="text-2xl font-bold">
              {isEditMode ? "Editar Tenant" : "Novo Tenant"}
            </h2>
          </div>
        </div>
        
        {isLoading && isEditMode ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2 text-primary" />
                {isEditMode ? "Editar Informações do Tenant" : "Cadastrar Novo Tenant"}
              </CardTitle>
              <CardDescription>
                {isEditMode 
                  ? "Atualize as informações do tenant existente" 
                  : "Preencha os dados para criar um novo tenant no sistema"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Barbearia XYZ" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nome do tenant (barbearia, salão, etc.)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: barbearia-xyz" 
                            {...field} 
                            disabled={isEditMode}
                          />
                        </FormControl>
                        <FormDescription>
                          Identificador único para URL. Use apenas letras minúsculas, números e hífens.
                          {isEditMode && " O slug não pode ser alterado após a criação."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="production_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de Produção</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: https://barbearia-xyz.agendapp.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          URL do ambiente de produção (opcional).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativo</FormLabel>
                          <FormDescription>
                            Determina se o tenant está ativo no sistema.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              form.setValue("active", checked); // Atualiza o campo active também para compatibilidade
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/system/tenants")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}