import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/hooks/use-tenant";
import AdminLayout from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Pencil, 
  Trash2, 
  UserPlus, 
  Check, 
  X, 
  Loader2, 
  Scissors, 
  Briefcase,
  Calendar,
  ArrowUpRight
} from "lucide-react";
import { useLocation } from "wouter";
import { InsertProfessional } from "@shared/schema";

// Form validation schema
const professionalSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  services_offered: z.array(z.number()).min(1, "Selecione pelo menos um serviço"),
  avatar_url: z.string().url("URL inválida").or(z.string().length(0)).optional(),
});

type ProfessionalFormValues = z.infer<typeof professionalSchema>;

const ProfessionalsPage = () => {
  const { toast } = useToast();
  const { getTenantFromUrl } = useTenant();
  const [location] = useLocation();
  const tenantParam = getTenantFromUrl(location);
  const [, navigate] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editUploadedImage, setEditUploadedImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  // Fetch professionals
  const { data: professionals, isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ["/api/professionals", tenantParam],
    queryFn: async () => {
      console.log("Buscando profissionais para tenant:", tenantParam);
      const response = await apiRequest("GET", "/api/professionals");
      if (!response.ok) {
        throw new Error("Erro ao buscar profissionais");
      }
      return response.json();
    },
    enabled: !!tenantParam,
  });

  // Fetch services for selection
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services", tenantParam],
    queryFn: async () => {
      console.log("Buscando serviços para tenant:", tenantParam);
      const response = await apiRequest("GET", "/api/services");
      if (!response.ok) {
        throw new Error("Erro ao buscar serviços");
      }
      return response.json();
    },
    enabled: !!tenantParam,
  });

  // Create professional mutation
  const createProfessionalMutation = useMutation({
    mutationFn: async (data: InsertProfessional & { tenant_id?: number }) => {
      const res = await apiRequest("POST", "/api/professionals", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profissional criado",
        description: "O profissional foi cadastrado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals", tenantParam] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar profissional",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update professional mutation
  const updateProfessionalMutation = useMutation({
    mutationFn: async (data: any) => {
      // Removemos o tenant_id da URL, pois o middleware requireTenant já irá capturar o tenant_id da URL atual
      const res = await apiRequest("PUT", `/api/professionals/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profissional atualizado",
        description: "O profissional foi atualizado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals", tenantParam] });
      setIsEditDialogOpen(false);
      setSelectedProfessional(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar profissional",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete professional mutation
  const deleteProfessionalMutation = useMutation({
    mutationFn: async (data: { id: number, tenant_id: number | undefined }) => {
      // Removemos o tenant_id da URL, pois o middleware requireTenant já irá capturar o tenant_id da URL atual
      await apiRequest("DELETE", `/api/professionals/${data.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Profissional excluído",
        description: "O profissional foi excluído com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals", tenantParam] });
      setIsDeleteDialogOpen(false);
      setSelectedProfessional(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir profissional",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set up create form
  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: "",
      description: "",
      services_offered: [],
      avatar_url: "",
    },
  });

  // Set up edit form
  const editForm = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: "",
      description: "",
      services_offered: [],
      avatar_url: "",
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      console.log("Iniciando upload de imagem para profissional");
      
      // Usar a URL direta e deixar os headers cuidarem do tenant
      const res = await fetch('/api/upload/professional', {
        method: 'POST',
        body: formData,
        // Adicionamos os headers padrão do apiRequest, menos o Content-Type que é definido automaticamente pelo FormData
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Erro no upload:", res.status, errorText);
        throw new Error(`Falha ao fazer upload da imagem: ${res.status} ${errorText}`);
      }
      
      const result = await res.json();
      console.log("Upload de imagem concluído com sucesso:", result);
      return result;
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao fazer upload da imagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditForm = false) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Verifica se o arquivo é uma imagem
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione uma imagem",
          variant: "destructive",
        });
        return;
      }
      
      // Limite de tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 5MB",
          variant: "destructive",
        });
        return;
      }
      
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (event) => {
        if (isEditForm) {
          setEditUploadedImage(file);
          setEditImagePreview(event.target?.result as string);
        } else {
          setUploadedImage(file);
          setImagePreview(event.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset image handler
  const handleResetImage = (isEditForm = false) => {
    if (isEditForm) {
      setEditUploadedImage(null);
      setEditImagePreview(null);
      
      // Se houver um profissional selecionado, restaura a URL da imagem
      if (selectedProfessional?.avatar_url) {
        editForm.setValue('avatar_url', selectedProfessional.avatar_url);
      } else {
        editForm.setValue('avatar_url', '');
      }
    } else {
      setUploadedImage(null);
      setImagePreview(null);
      form.setValue('avatar_url', '');
    }
  };

  // Submit handler for create form
  const onSubmit = async (data: ProfessionalFormValues) => {
    // Se houver uma imagem selecionada, primeiro faz o upload
    if (uploadedImage) {
      try {
        const uploadResult = await uploadImageMutation.mutateAsync(uploadedImage);
        // Atualiza a URL da imagem no payload
        data.avatar_url = uploadResult.url; // A API retorna 'url', não 'imageUrl'
      } catch (error) {
        // Erro já tratado no mutation
        return;
      }
    }
    
    // Adiciona o tenant_id ao payload
    createProfessionalMutation.mutate({
      ...data,
      tenant_id: Number(tenantParam)
    });
  };
  
  // Submit handler for edit form
  const onSubmitEdit = async (data: ProfessionalFormValues) => {
    if (!selectedProfessional) return;
    
    // Se houver uma imagem selecionada, primeiro faz o upload
    if (editUploadedImage) {
      try {
        const uploadResult = await uploadImageMutation.mutateAsync(editUploadedImage);
        // Atualiza a URL da imagem no payload
        data.avatar_url = uploadResult.url; // A API retorna 'url', não 'imageUrl'
      } catch (error) {
        // Erro já tratado no mutation
        return;
      }
    }
    
    updateProfessionalMutation.mutate({
      id: selectedProfessional.id,
      tenant_id: Number(tenantParam),
      ...data
    });
  };
  
  // Handler for opening edit dialog
  const handleEdit = (professional: any) => {
    setSelectedProfessional(professional);
    
    // Reset and set form values
    editForm.reset({
      name: professional.name,
      description: professional.description,
      services_offered: professional.services_offered,
      avatar_url: professional.avatar_url || "",
    });
    
    setIsEditDialogOpen(true);
  };
  
  // Handler for opening delete dialog
  const handleDelete = (professional: any) => {
    setSelectedProfessional(professional);
    setIsDeleteDialogOpen(true);
  };
  
  // Handler for confirming delete
  const confirmDelete = () => {
    if (selectedProfessional) {
      deleteProfessionalMutation.mutate({
        id: selectedProfessional.id,
        tenant_id: Number(tenantParam)
      });
    }
  };
  
  // Handler for opening availability management
  const handleManageAvailability = (professional: any) => {
    navigate(`/admin/professionals/${professional.id}/availability?tenant=${tenantParam}`);
  };

  return (
    <AdminLayout title="Gerenciamento de Profissionais">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle>Profissionais</CardTitle>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Profissional
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingProfessionals ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !professionals || professionals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum profissional cadastrado</p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Adicionar Profissional
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Serviços</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionals.map((professional: any) => {
                    const professionalServices = services?.filter(
                      (service: any) => professional.services_offered.includes(service.id)
                    );
                    
                    return (
                      <TableRow key={professional.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={professional.avatar_url || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {professional.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{professional.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {professional.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {professionalServices?.map((service: any) => (
                              <span
                                key={service.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                              >
                                <Scissors className="h-3 w-3 mr-1" />
                                {service.name}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => handleEdit(professional)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => handleManageAvailability(professional)}
                              title="Gerenciar Disponibilidade"
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="sr-only">Disponibilidade</span>
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive"
                              onClick={() => handleDelete(professional)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Excluir</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Professional Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Profissional</DialogTitle>
            <DialogDescription>
              Preencha as informações abaixo para cadastrar um novo profissional.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Profissional</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João Silva" {...field} />
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
                    <FormLabel>Descrição / Especialidade</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: Especialista em cortes modernos com 5 anos de experiência" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto do Profissional (opcional)</FormLabel>
                    <div className="space-y-4">
                      {imagePreview ? (
                        <div className="relative w-24 h-24 mx-auto">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => handleResetImage(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <FormControl>
                              <Input 
                                type="file"
                                onChange={(e) => handleImageUpload(e, false)}
                                accept="image/*"
                                className="hidden"
                                id="professional-image"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('professional-image')?.click()}
                              className="w-full"
                            >
                              Selecionar Imagem
                            </Button>
                          </div>
                          <FormControl>
                            <Input 
                              placeholder="Ou informe a URL da imagem" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                        </>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="services_offered"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Serviços Oferecidos</FormLabel>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {isLoadingServices ? (
                        <div className="col-span-2 flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        services?.map((service: any) => (
                          <FormField
                            key={service.id}
                            control={form.control}
                            name="services_offered"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={service.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(service.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, service.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== service.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-medium">
                                      {service.name}
                                    </FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                      {service.duration} min - R$ {service.price.toFixed(2)}
                                    </p>
                                  </div>
                                </FormItem>
                              )
                            }}
                          />
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createProfessionalMutation.isPending}
                >
                  {createProfessionalMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Salvar Profissional
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Professional Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
            <DialogDescription>
              Atualize as informações do profissional conforme necessário.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-6">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Profissional</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição / Especialidade</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: Especialista em cortes modernos com 5 anos de experiência" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto do Profissional (opcional)</FormLabel>
                    <div className="space-y-4">
                      {editImagePreview ? (
                        <div className="relative w-24 h-24 mx-auto">
                          <img 
                            src={editImagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => handleResetImage(true)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : selectedProfessional?.avatar_url ? (
                        <div className="relative w-24 h-24 mx-auto">
                          <img 
                            src={selectedProfessional.avatar_url} 
                            alt="Imagem atual" 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => {
                              editForm.setValue('avatar_url', '');
                              setSelectedProfessional({
                                ...selectedProfessional,
                                avatar_url: ''
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <FormControl>
                              <Input 
                                type="file"
                                onChange={(e) => handleImageUpload(e, true)}
                                accept="image/*"
                                className="hidden"
                                id="professional-image-edit"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('professional-image-edit')?.click()}
                              className="w-full"
                            >
                              Selecionar Imagem
                            </Button>
                          </div>
                          <FormControl>
                            <Input 
                              placeholder="Ou informe a URL da imagem" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                        </>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="services_offered"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Serviços Oferecidos</FormLabel>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {isLoadingServices ? (
                        <div className="col-span-2 flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        services?.map((service: any) => (
                          <FormField
                            key={service.id}
                            control={editForm.control}
                            name="services_offered"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={service.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(service.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, service.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== service.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-medium">
                                      {service.name}
                                    </FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                      {service.duration} min - R$ {service.price.toFixed(2)}
                                    </p>
                                  </div>
                                </FormItem>
                              )
                            }}
                          />
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={updateProfessionalMutation.isPending}
                >
                  {updateProfessionalMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Atualizar Profissional
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Professional Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedProfessional && (
            <div className="my-4 p-4 border rounded-md">
              <div className="flex items-center gap-3 mb-2">
                <Avatar>
                  <AvatarImage src={selectedProfessional.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedProfessional.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedProfessional.name}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{selectedProfessional.description}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteProfessionalMutation.isPending}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteProfessionalMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProfessionalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default ProfessionalsPage;