import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  // Buscar configurações da barbearia
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["/api/barbershop-settings"]
  });
  
  // Handle query error
  React.useEffect(() => {
    if (error) {
      const errorMessage = error.toString();
      const isNotFound = errorMessage.includes("404");
      
      if (!isNotFound) {
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
      form.reset(settings);
    }
  }, [settings, form]);

  // Mutação para criar configurações
  const createMutation = useMutation({
    mutationFn: async (data: BarbershopSettingsFormData) => {
      const response = await apiRequest("POST", "/api/barbershop-settings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações criadas com sucesso",
        description: "As configurações da barbearia foram salvas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/barbershop-settings"] });
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
      const response = await apiRequest("PUT", "/api/barbershop-settings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas com sucesso",
        description: "As alterações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/barbershop-settings"] });
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

  return (
    <AdminLayout title="Configurações da Barbearia">
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle>
            {isCreating ? "Criar Configurações da Barbearia" : "Editar Configurações da Barbearia"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <FormControl>
                        <Input placeholder="America/Sao_Paulo" {...field} value={field.value || "America/Sao_Paulo"} />
                      </FormControl>
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

              <div className="flex justify-end pt-4">
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