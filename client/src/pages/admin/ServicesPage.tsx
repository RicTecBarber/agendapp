import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  DollarSign 
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
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const ServicesPage = () => {
  const { toast } = useToast();
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<any | null>(null);
  
  // Form for service create/edit
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      duration: 30,
    },
  });
  
  // Get services
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services"],
  });
  
  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const res = await apiRequest("POST", "/api/services", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço criado",
        description: "O serviço foi criado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
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
    mutationFn: async ({ id, data }: { id: number, data: ServiceFormValues }) => {
      const res = await apiRequest("PUT", `/api/services/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço atualizado",
        description: "O serviço foi atualizado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
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
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/services/${id}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Serviço excluído",
        description: "O serviço foi excluído com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
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
  
  const onSubmit = (data: ServiceFormValues) => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };
  
  const handleAddNewClick = () => {
    setEditingService(null);
    form.reset({
      name: "",
      description: "",
      price: 0,
      duration: 30,
    });
    setServiceDialogOpen(true);
  };
  
  const handleEditClick = (service: any) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
    });
    setServiceDialogOpen(true);
  };
  
  const handleDeleteClick = (service: any) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (serviceToDelete) {
      deleteServiceMutation.mutate(serviceToDelete.id);
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
            <Card key={service.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{service.name}</CardTitle>
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
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">{serviceToDelete.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{serviceToDelete.description}</p>
                <div className="mt-2 text-sm flex justify-between">
                  <span>R$ {serviceToDelete.price.toFixed(2)}</span>
                  <span>{serviceToDelete.duration} minutos</span>
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
