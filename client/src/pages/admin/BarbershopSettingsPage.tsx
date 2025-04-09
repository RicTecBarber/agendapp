import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, AlertCircle, ArrowLeft, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription,
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Lista de fusos horários disponíveis no Brasil
const BRAZIL_TIMEZONES = [
  { id: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
  { id: "America/Recife", label: "Recife (UTC-3)" },
  { id: "America/Maceio", label: "Maceió (UTC-3)" },
  { id: "America/Fortaleza", label: "Fortaleza (UTC-3)" },
  { id: "America/Bahia", label: "Salvador (UTC-3)" },
  { id: "America/Belem", label: "Belém (UTC-3)" },
  { id: "America/Cuiaba", label: "Cuiabá (UTC-4)" },
  { id: "America/Manaus", label: "Manaus (UTC-4)" },
  { id: "America/Boa_Vista", label: "Boa Vista (UTC-4)" },
  { id: "America/Porto_Velho", label: "Porto Velho (UTC-4)" },
  { id: "America/Rio_Branco", label: "Rio Branco (UTC-5)" }
];

// Esquema para validação do formulário
const barbershopSettingsSchema = z.object({
  name: z.string().min(1, "Nome da barbearia é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido"),
  timezone: z.string().min(1, "Fuso horário é obrigatório"),
  open_time: z.string().min(1, "Horário de abertura é obrigatório"),
  close_time: z.string().min(1, "Horário de fechamento é obrigatório"),
  open_days: z.array(z.number()),
  description: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  tenant_id: z.number().optional(), // Campo opcional para armazenar o ID do tenant
  id: z.number().optional(), // ID das configurações (importante para atualizações)
  // Campos para exibir URLs do tenant (apenas visíveis para administradores do sistema)
  tenant_url: z.string().optional(),
  client_url: z.string().optional(),
  admin_url: z.string().optional(),
});

type BarbershopSettingsFormData = z.infer<typeof barbershopSettingsSchema>;

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export default function BarbershopSettingsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const { user, isSystemAdmin } = useAuth();
  const { tenant: tenantParam, getTenantFromUrl } = useTenant();
  const [location] = useLocation();
  
  // Buscar configurações da barbearia
  const { data: settings, isLoading, error } = useQuery<any, Error>({
    queryKey: ["/api/barbershop-settings", tenantParam],
    // Usar o getQueryFn padrão configurado no setup do queryClient
  });
  
  // Observar erros para detectar problemas de tenant
  React.useEffect(() => {
    if (error) {
      console.error("Erro ao carregar configurações:", error);
      
      // Verificar se é um erro de tenant não identificado
      if (error?.message?.includes("Tenant não identificado") || 
          error.toString().includes("Tenant não identificado")) {
        setTenantError("Para acessar esta página, você precisa especificar um tenant válido usando o parâmetro ?tenant=SLUG");
      }
    }
  }, [error]);
  
  // Handle query error
  React.useEffect(() => {
    if (error) {
      const errorMessage = error.toString();
      const isNotFound = errorMessage.includes("404");
      const isTenantError = errorMessage.includes("Tenant não identificado");
      
      if (!isNotFound && !isTenantError) {
        toast({
          title: "Erro ao carregar configurações",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      setIsCreating(true);
    }
  }, [error]);

  // Formulário
  const form = useForm<BarbershopSettingsFormData>({
    resolver: zodResolver(barbershopSettingsSchema),
    defaultValues: settings ?? {
      name: "",
      address: "",
      phone: "",
      email: "",
      timezone: "America/Sao_Paulo",
      open_time: "08:00",
      close_time: "20:00",
      open_days: [1, 2, 3, 4, 5, 6],
      description: "",
      logo_url: "",
      instagram: "",
      facebook: ""
    },
  });

  // Atualizar valores do formulário quando as configurações são carregadas
  React.useEffect(() => {
    if (settings) {
      // Para administradores do sistema, adicione o campo tenant_url
      const updatedSettings = { ...settings };
      if (isSystemAdmin && tenantParam) {
        const clientUrl = `${window.location.origin}/?tenant=${tenantParam}`;
        const adminUrl = `${window.location.origin}/admin/auth?tenant=${tenantParam}`;
        updatedSettings.tenant_url = clientUrl;
        
        // Adicionamos também URLs específicas para clientes e administradores
        updatedSettings.client_url = clientUrl;
        updatedSettings.admin_url = adminUrl;
      }
      form.reset(updatedSettings);
    }
  }, [settings, form, isSystemAdmin, tenantParam]);

  // Mutação para criar configurações
  const createMutation = useMutation({
    mutationFn: async (data: BarbershopSettingsFormData) => {
      // Se for admin do sistema, assegurar que o tenant_id está incluído
      if (isSystemAdmin && settings?.tenant_id) {
        data.tenant_id = settings.tenant_id;
      }
      
      // Adiciona o parâmetro tenant à URL, se existir
      const url = tenantParam
        ? `/api/barbershop-settings?tenant=${tenantParam}`
        : `/api/barbershop-settings`;
      
      const response = await apiRequest("POST", url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações criadas com sucesso",
        description: "As configurações da barbearia foram salvas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/barbershop-settings", tenantParam] });
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar configurações
  const updateMutation = useMutation({
    mutationFn: async (data: BarbershopSettingsFormData) => {
      // Se for admin do sistema, assegurar que o tenant_id está incluído
      if (isSystemAdmin && settings?.tenant_id) {
        data.tenant_id = settings.tenant_id;
      }
      
      // Garantir que o id esteja incluído para atualização
      if (settings?.id) {
        data.id = settings.id;
      }
      
      // Adiciona o parâmetro tenant à URL, se existir
      const url = tenantParam
        ? `/api/barbershop-settings?tenant=${tenantParam}`
        : `/api/barbershop-settings`;
      
      const response = await apiRequest("PUT", url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas com sucesso",
        description: "As alterações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/barbershop-settings", tenantParam] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submissão do formulário
  const onSubmit = (data: BarbershopSettingsFormData) => {
    // Verificar se temos um tenant_id quando for admin do sistema
    if (isSystemAdmin && !tenantParam && !settings?.tenant_id) {
      toast({
        title: "Tenant não especificado",
        description: "Como administrador do sistema, você precisa acessar esta página com o parâmetro ?tenant=SLUG",
        variant: "destructive",
      });
      return;
    }
    
    if (isCreating) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  // Se estiver carregando, mostrar spinner
  if (isLoading) {
    return (
      <AdminLayout title="Configurações da Barbearia">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Detectar o nome do tenant atual
  const currentTenantName = settings?.name || tenantParam || "Desconhecido";
  
  return (
    <AdminLayout title="Configurações da Barbearia">
      {/* Alerta para administradores do sistema quando não há tenant */}
      {isSystemAdmin && (
        <div className="mb-4">
          {tenantError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de tenant</AlertTitle>
              <AlertDescription>{tenantError}</AlertDescription>
            </Alert>
          ) : tenantParam ? (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertTitle>Modo administrador do sistema</AlertTitle>
              <AlertDescription>
                Você está editando configurações do tenant: <strong>{tenantParam}</strong>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}
      
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle>
            {isCreating ? "Criar Configurações da Barbearia" : "Editar Configurações da Barbearia"}
          </CardTitle>
          {isSystemAdmin && settings && (
            <CardDescription>
              Tenant: {currentTenantName} {settings.tenant_id ? `(ID: ${settings.tenant_id})` : ''}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Seção específica para administradores do sistema */}
              {isSystemAdmin && tenantParam && (
                <div className="mb-6 border p-4 rounded-lg bg-blue-50 border-blue-200">
                  <h3 className="text-md font-medium mb-3 text-blue-800">Links de Acesso ao Tenant</h3>
                  
                  {/* Link para clientes */}
                  <FormField
                    control={form.control}
                    name="client_url"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel className="text-blue-700">Link para Clientes</FormLabel>
                        <div className="flex">
                          <FormControl>
                            <Input 
                              value={field.value} 
                              readOnly 
                              className="bg-white font-mono text-sm"
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="ml-2"
                            onClick={() => {
                              navigator.clipboard.writeText(field.value || '');
                              toast({
                                title: "URL copiada",
                                description: "Link para clientes copiado para a área de transferência",
                              });
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </Button>
                        </div>
                        <FormDescription>
                          Compartilhe este link com os clientes para que eles possam acessar o sistema.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  {/* Link para administradores */}
                  <FormField
                    control={form.control}
                    name="admin_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700">Link para Administradores</FormLabel>
                        <div className="flex">
                          <FormControl>
                            <Input 
                              value={field.value} 
                              readOnly 
                              className="bg-white font-mono text-sm"
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="ml-2"
                            onClick={() => {
                              navigator.clipboard.writeText(field.value || '');
                              toast({
                                title: "URL copiada",
                                description: "Link para administradores copiado para a área de transferência",
                              });
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </Button>
                        </div>
                        <FormDescription>
                          Compartilhe este link com os administradores da barbearia para que eles possam acessar o painel administrativo.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome da barbearia */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Barbearia</FormLabel>
                      <FormControl>
                        <Input placeholder="BarberSync" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="contato@barbersync.com" 
                          type="email" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Endereço */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input placeholder="Av. Principal, 123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Telefone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Instagram */}
                <FormField
                  control={form.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="@barbersync" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Facebook */}
                <FormField
                  control={form.control}
                  name="facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="facebook.com/barbersync" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Logo URL */}
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Logo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://exemplo.com/logo.png" 
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Descrição */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Sobre a barbearia..." 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Fuso horário */}
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuso Horário</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "America/Sao_Paulo"}
                        value={field.value || "America/Sao_Paulo"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o fuso horário" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BRAZIL_TIMEZONES.map((timezone) => (
                            <SelectItem key={timezone.id} value={timezone.id}>
                              {timezone.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Horário de Abertura */}
                <FormField
                  control={form.control}
                  name="open_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de Abertura</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Horário de Fechamento */}
                <FormField
                  control={form.control}
                  name="close_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de Fechamento</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dias de funcionamento */}
              <FormField
                control={form.control}
                name="open_days"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Dias de Funcionamento</FormLabel>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {WEEKDAYS.map((day) => (
                        <FormField
                          key={day.value}
                          control={form.control}
                          name="open_days"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day.value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      return checked
                                        ? field.onChange([...currentValue, day.value])
                                        : field.onChange(
                                            currentValue.filter(
                                              (value) => value !== day.value
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {day.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                {/* Botão para voltar para a lista de tenants (apenas para administradores do sistema) */}
                {isSystemAdmin && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                )}
                
                <Button 
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="min-w-[150px]"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isCreating ? "Criar" : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}