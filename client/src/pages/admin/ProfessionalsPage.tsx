import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Briefcase 
} from "lucide-react";
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch professionals
  const { data: professionals, isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ["/api/professionals"],
  });

  // Fetch services for selection
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services"],
  });

  // Create professional mutation
  const createProfessionalMutation = useMutation({
    mutationFn: async (data: InsertProfessional) => {
      const res = await apiRequest("POST", "/api/professionals", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profissional criado",
        description: "O profissional foi cadastrado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
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

  // Set up form
  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: "",
      description: "",
      services_offered: [],
      avatar_url: "",
    },
  });

  // Submit handler
  const onSubmit = (data: ProfessionalFormValues) => {
    createProfessionalMutation.mutate(data);
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
                            <Button size="icon" variant="ghost">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive">
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
                    <FormLabel>URL da Foto (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://exemplo.com/foto.jpg" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
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
    </AdminLayout>
  );
};

export default ProfessionalsPage;