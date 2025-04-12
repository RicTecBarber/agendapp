import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useTenant } from "@/hooks/use-tenant";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Loader2,
  Clock,
  DollarSign,
  Scissors, 
  Image
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Service form schema
const serviceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  price: z.coerce.number().min(0, "Preço não pode ser negativo"),
  duration: z.coerce.number().min(5, "Duração deve ser pelo menos 5 minutos"),
  image_url: z.string().optional().nullable(),
  image: z
    .instanceof(FileList)
    .optional()
    .refine(
      (files) => {
        if (!files) return true;
        if (files.length === 0) return true;
        return Array.from(files).every(
          (file) => 
            file.type === "image/jpeg" || 
            file.type === "image/png" || 
            file.type === "image/gif" || 
            file.type === "image/webp"
        );
      },
      {
        message: "Apenas imagens JPEG, PNG, GIF e WebP são permitidas",
      }
    )
    .refine(
      (files) => {
        if (!files) return true;
        if (files.length === 0) return true;
        return Array.from(files).every((file) => file.size <= 5 * 1024 * 1024);
      },
      {
        message: "O tamanho máximo do arquivo é 5MB",
      }
    ),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const ServicesPage = () => {
  const { toast } = useToast();
  const [location] = useLocation();
  const { getTenantFromUrl } = useTenant();
  const tenantParam = getTenantFromUrl();
  
  // Log para diagnóstico
  console.log(`ServicesPage - tenantParam: ${tenantParam}`);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<any | null>(null);
  
  // Estado para prévia da imagem
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Form for service create/edit
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      duration: 30,
      image_url: "",
    },
  });
  
  // Get services
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services", tenantParam],
  });
  
  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/services", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço criado",
        description: "O serviço foi criado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services", tenantParam] });
      setServiceDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest("PUT", `/api/services/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço atualizado",
        description: "O serviço foi atualizado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services", tenantParam] });
      setServiceDialogOpen(false);
      setEditingService(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async ({id, tenant_id}: {id: number, tenant_id: number | null}) => {
      const res = await apiRequest("DELETE", `/api/services/${id}`, {tenant_id});
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Serviço excluído",
        description: "O serviço foi excluído com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services", tenantParam] });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Upload de imagem
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      // Adicionamos o tenant na URL
      let uploadUrl = '/api/upload/service';
      if (tenantParam) {
        uploadUrl += `?tenant=${tenantParam}`;
      }
      console.log(`Fazendo upload para: ${uploadUrl}`);
      
      // Usar apiRequest para manter o contexto do tenant
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        // Adicionamos os headers padrão do apiRequest, menos o Content-Type que é definido automaticamente pelo FormData
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Erro ao fazer upload da imagem');
      }
      
      return res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao fazer upload da imagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (formData: ServiceFormValues) => {
    // Registra informações de diagnóstico
    console.log(`ServicesPage.onSubmit - tenantParam: ${tenantParam}`);
    
    // Primeiro verifica se há uma imagem para upload
    if (formData.image && formData.image.length > 0) {
      try {
        // Faz o upload da imagem primeiro
        const uploadResult = await uploadImageMutation.mutateAsync(formData.image[0]);
        
        // Atualiza o campo image_url com o URL retornado pelo servidor
        formData.image_url = uploadResult.url;
      } catch (error) {
        // Erro tratado no onError da mutation
        return;
      }
    }
    
    // Limpa o campo image para não enviar no request JSON
    const { image, ...dataToSubmit } = formData;
    
    // Adiciona o tenant_id 
    const tenantId = tenantParam ? parseInt(tenantParam) : null;
    console.log(`ServicesPage.onSubmit - convertendo tenant para tenant_id: ${tenantParam} -> ${tenantId}`);
    
    const dataWithTenant = {
      ...dataToSubmit,
      tenant_id: tenantId
    };
    
    console.log("ServicesPage.onSubmit - Dados a enviar:", dataWithTenant);
    
    // Procede com a criação/atualização do serviço
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: dataWithTenant });
    } else {
      createServiceMutation.mutate(dataWithTenant);
    }
  };
  
  const handleAddNewClick = () => {
    setEditingService(null);
    setImagePreview(null);
    form.reset({
      name: "",
      description: "",
      price: 0,
      duration: 30,
      image_url: "",
    });
    setServiceDialogOpen(true);
  };
  
  const handleEditClick = (service: any) => {
    setEditingService(service);
    
    // Resetar o formulário com os dados existentes
    form.reset({
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      image_url: service.image_url || "",
    });
    
    // Se o serviço já tem uma imagem, mostra a prévia
    if (service.image_url) {
      setImagePreview(service.image_url);
    } else {
      setImagePreview(null);
    }
    
    setServiceDialogOpen(true);
  };
  
  const handleDeleteClick = (service: any) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (serviceToDelete) {
      // Usando tenant_id do tenant atual
      const tenantId = tenantParam ? parseInt(tenantParam) : null;
      console.log(`ServicesPage.confirmDelete - convertendo tenant para tenant_id: ${tenantParam} -> ${tenantId}`);
      
      deleteServiceMutation.mutate({
        id: serviceToDelete.id,
        tenant_id: tenantId
      });
    }
  };
  
  return (
    <AdminLayout title="Serviços">
      <div className="flex justify-end mb-6">
        <Button onClick={handleAddNewClick}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>
      
      {isLoadingServices ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services?.map((service: any) => (
            <Card key={service.id} className="overflow-hidden">
              {service.image_url ? (
                <div className="w-full h-40 relative">
                  <img 
                    src={service.image_url} 
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="shadow-md opacity-90 hover:opacity-100">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditClick(service)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteClick(service)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ) : null}
              <CardHeader className={service.image_url ? "pt-3" : ""}>
                <div className="flex justify-between items-start">
                  <CardTitle>{service.name}</CardTitle>
                  {!service.image_url && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditClick(service)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteClick(service)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">R$ {service.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">{service.duration} minutos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {services?.length === 0 && (
            <div className="col-span-full text-center py-16 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground mb-2">Nenhum serviço cadastrado</p>
              <Button variant="outline" onClick={handleAddNewClick}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Adicionar Serviço
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Service Create/Edit Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
            <DialogDescription>
              {editingService 
                ? "Atualize as informações do serviço abaixo." 
                : "Preencha as informações para criar um novo serviço."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Serviço</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="0.01" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (minutos)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Campo para upload de imagem */}
              <FormField
                control={form.control}
                name="image"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Imagem do Serviço</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {/* Exibe a prévia da imagem quando disponível */}
                        {imagePreview && (
                          <div className="w-full max-h-32 relative rounded-md overflow-hidden border">
                            <img 
                              src={imagePreview} 
                              alt="Prévia da imagem" 
                              className="w-auto max-w-full h-32 object-contain mx-auto"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => {
                                setImagePreview(null);
                                onChange(null);
                                form.setValue("image_url", "");
                              }}
                            >
                              Remover
                            </Button>
                          </div>
                        )}
                        
                        {/* Input para seleção de arquivo */}
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              onChange(files);
                              
                              // Criar URL temporária para prévia da imagem
                              const previewUrl = URL.createObjectURL(files[0]);
                              setImagePreview(previewUrl);
                            }
                          }}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Selecione uma imagem para o serviço (máximo 5MB, formatos aceitos: JPG, PNG, GIF, WebP)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Campo oculto para URL da imagem - será preenchida pelo backend após upload */}
              <input type="hidden" {...form.register("image_url")} />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setServiceDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                >
                  {createServiceMutation.isPending || updateServiceMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>Salvar</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {serviceToDelete && (
            <div className="py-4">
              <div className="p-4 border rounded-lg space-y-3">
                {serviceToDelete.image_url && (
                  <div className="w-full h-32 rounded-md overflow-hidden">
                    <img 
                      src={serviceToDelete.image_url} 
                      alt={serviceToDelete.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{serviceToDelete.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{serviceToDelete.description}</p>
                  <div className="mt-2 text-sm flex justify-between">
                    <span>R$ {serviceToDelete.price.toFixed(2)}</span>
                    <span>{serviceToDelete.duration} minutos</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteServiceMutation.isPending}
            >
              {deleteServiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>Excluir</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default ServicesPage;
