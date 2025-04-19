import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/hooks/use-auth";
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
import { useParams, useLocation } from "wouter";
import { 
  Calendar,
  Clock,
  Save,
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Edit
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Dias da semana para exibição
const DIAS_SEMANA = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" }
];

// A lista de horários será gerada dinamicamente com base nas configurações da barbearia
const HORARIOS: string[] = [];

const AvailabilityManagementPage = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { id } = useParams();
  const professionalId = parseInt(id || "0");
  const { tenant, getTenantFromUrl } = useTenant();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [location] = useLocation();
  const tenantParam = getTenantFromUrl(location);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("regularHours");
  const [selectedAvailability, setSelectedAvailability] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Carrega horários disponíveis
  const [timeOptions, setTimeOptions] = useState<string[]>([]);

  // Formulário de disponibilidade
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [lunchStart, setLunchStart] = useState<string>("");
  const [lunchEnd, setLunchEnd] = useState<string>("");
  const [hasLunchBreak, setHasLunchBreak] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Verificar autenticação e permissões ao carregar a página
  useEffect(() => {
    // Redirecionar se não tiver ID de profissional válido
    if (professionalId === 0) {
      navigate("/admin/professionals");
      return;
    }
    
    // Verificar autenticação quando os dados de autenticação estiverem carregados
    if (!isAuthLoading && !user) {
      toast({
        title: "Acesso negado",
        description: "Você precisa estar autenticado como administrador para gerenciar horários de disponibilidade.",
        variant: "destructive",
      });
      navigate("/admin/auth?redirect=" + encodeURIComponent(location));
      return;
    }
    
    // Verificar permissões quando os dados de autenticação estiverem carregados
    if (!isAuthLoading && user && user.role !== 'admin' && !('isSystemAdmin' in user)) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem gerenciar horários de disponibilidade.",
        variant: "destructive",
      });
      navigate("/admin/professionals");
      return;
    }
  }, [professionalId, navigate, user, isAuthLoading, toast, location]);

  // Buscar profissional
  const { data: professional, isLoading: isLoadingProfessional } = useQuery({
    queryKey: [`/api/professionals/${professionalId}`, tenantParam],
    enabled: !!professionalId && !!tenantParam,
    onError: () => {
      toast({
        title: "Erro",
        description: "Profissional não encontrado",
        variant: "destructive",
      });
      navigate("/admin/professionals");
    }
  });

  // Buscar disponibilidades
  const { data: availabilities, isLoading: isLoadingAvailabilities } = useQuery({
    queryKey: [`/api/availability/professional/${professionalId}`, tenantParam],
    enabled: !!professionalId && !!tenantParam,
  });
  
  // Buscar configurações da barbearia para obter horário de funcionamento
  const { data: barbershopSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/business-settings', tenantParam],
    enabled: !!tenantParam,
    onSuccess: (data: any) => {
      console.log("Configurações carregadas com sucesso:", data);
      
      // Se não houver dados ou se os horários estiverem faltando, vamos gerar horários padrão
      if (!data || !data.open_time || !data.close_time) {
        console.warn("Configurações de horário não encontradas, usando valores padrão");
        
        // Gerar horários padrão de 8h às 18h
        const timeList: string[] = [];
        
        for (let hour = 8; hour <= 18; hour++) {
          timeList.push(`${hour.toString().padStart(2, '0')}:00`);
          timeList.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        
        console.log("Horários padrão gerados:", timeList);
        setTimeOptions(timeList);
      }
    }
  });

  // Mutation para criar disponibilidade
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/availability", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Disponibilidade adicionada",
        description: "A disponibilidade foi adicionada com sucesso.",
        variant: "default",
      });
      resetForm();
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/availability/professional/${professionalId}`, tenantParam] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para atualizar disponibilidade
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/availability/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Disponibilidade atualizada",
        description: "A disponibilidade foi atualizada com sucesso.",
        variant: "default",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/availability/professional/${professionalId}`, tenantParam] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para excluir disponibilidade
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (data: { id: number, tenant_id: number | undefined }) => {
      const res = await apiRequest("DELETE", `/api/availability/${data.id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Disponibilidade removida",
        description: "A disponibilidade foi removida com sucesso.",
        variant: "default",
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/availability/professional/${professionalId}`, tenantParam] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Resetar formulário
  const resetForm = () => {
    setSelectedDay("");
    setStartTime("");
    setEndTime("");
    setLunchStart("");
    setLunchEnd("");
    setHasLunchBreak(false);
    setIsAvailable(true);
  };

  // Preparar para editar
  const prepareForEdit = (availability: any) => {
    setSelectedAvailability(availability);
    setSelectedDay(availability.day_of_week.toString());
    setStartTime(availability.start_time);
    setEndTime(availability.end_time);
    
    // Campos de almoço não existem no banco de dados
    setLunchStart("");
    setLunchEnd("");
    setHasLunchBreak(false);
    
    setIsAvailable(availability.is_available);
    setIsEditDialogOpen(true);
  };

  // Preparar para excluir
  const prepareForDelete = (availability: any) => {
    setSelectedAvailability(availability);
    setIsDeleteDialogOpen(true);
  };

  // Enviar formulário de criação
  const handleCreateSubmit = () => {
    // Verificar se o usuário está autenticado
    if (!user) {
      toast({
        title: "Acesso negado",
        description: "Você precisa estar autenticado como administrador para adicionar horários de disponibilidade.",
        variant: "destructive",
      });
      navigate("/admin/auth?redirect=" + encodeURIComponent(location));
      return;
    }

    // Verificar se o usuário tem permissão de administrador
    if (user.role !== 'admin' && !('isSystemAdmin' in user)) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem gerenciar horários de disponibilidade.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDay || !startTime || !endTime) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validar horário de almoço se estiver ativado
    if (hasLunchBreak && (!lunchStart || !lunchEnd)) {
      toast({
        title: "Erro",
        description: "Preencha o horário de almoço corretamente",
        variant: "destructive",
      });
      return;
    }

    const availabilityData: any = {
      professional_id: professionalId,
      day_of_week: parseInt(selectedDay),
      start_time: startTime,
      end_time: endTime,
      is_available: isAvailable,
      tenant_id: Number(tenantParam)
    };

    // Removemos referência aos campos de horário de almoço
    // Os campos lunch_start e lunch_end não existem no banco de dados atual

    createAvailabilityMutation.mutate(availabilityData);
  };

  // Enviar formulário de edição
  const handleUpdateSubmit = () => {
    // Verificar se o usuário está autenticado
    if (!user) {
      toast({
        title: "Acesso negado",
        description: "Você precisa estar autenticado como administrador para editar horários de disponibilidade.",
        variant: "destructive",
      });
      navigate("/admin/auth?redirect=" + encodeURIComponent(location));
      return;
    }

    // Verificar se o usuário tem permissão de administrador
    if (user.role !== 'admin' && !('isSystemAdmin' in user)) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem gerenciar horários de disponibilidade.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDay || !startTime || !endTime) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validar horário de almoço se estiver ativado
    if (hasLunchBreak && (!lunchStart || !lunchEnd)) {
      toast({
        title: "Erro",
        description: "Preencha o horário de almoço corretamente",
        variant: "destructive",
      });
      return;
    }

    const availabilityData: any = {
      id: selectedAvailability.id,
      professional_id: professionalId,
      day_of_week: parseInt(selectedDay),
      start_time: startTime,
      end_time: endTime,
      is_available: isAvailable,
      tenant_id: Number(tenantParam)
    };

    // Removemos referência aos campos de horário de almoço
    // Os campos lunch_start e lunch_end não existem no banco de dados atual

    updateAvailabilityMutation.mutate(availabilityData);
  };

  // Confirmar exclusão
  const confirmDelete = () => {
    // Verificar se o usuário está autenticado
    if (!user) {
      toast({
        title: "Acesso negado",
        description: "Você precisa estar autenticado como administrador para excluir horários de disponibilidade.",
        variant: "destructive",
      });
      navigate("/admin/auth?redirect=" + encodeURIComponent(location));
      return;
    }

    // Verificar se o usuário tem permissão de administrador
    if (user.role !== 'admin' && !('isSystemAdmin' in user)) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem gerenciar horários de disponibilidade.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedAvailability) {
      deleteAvailabilityMutation.mutate({
        id: selectedAvailability.id,
        tenant_id: Number(tenantParam)
      });
    }
  };

  // Gerar opções de horário com base nas configurações da barbearia ou usar valores padrão
  useEffect(() => {
    const parseTime = (timeStr: string) => {
      try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
      } catch (error) {
        console.error(`Erro ao processar horário: ${timeStr}`, error);
        return { hours: 0, minutes: 0 };
      }
    };
    
    const generateTimeList = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
      const timeList: string[] = [];
      
      let currentHour = startHour;
      let currentMinute = startMinute;
      
      // Arredondar para o intervalo de 30 minutos mais próximo
      if (currentMinute > 0 && currentMinute < 30) {
        currentMinute = 30;
      } else if (currentMinute > 30) {
        currentHour++;
        currentMinute = 0;
      }
      
      // Gerar horários até o fechamento
      while (
        currentHour < endHour || 
        (currentHour === endHour && currentMinute <= endMinute)
      ) {
        timeList.push(
          `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
        );
        
        // Avançar 30 minutos
        currentMinute += 30;
        if (currentMinute >= 60) {
          currentHour++;
          currentMinute = 0;
        }
      }
      
      // Adicionar explicitamente o horário de fechamento se ele não estiver na lista
      // e não for múltiplo de 30 minutos
      if (endMinute % 30 !== 0) {
        timeList.push(
          `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`
        );
      }
      
      return timeList;
    };
    
    try {
      // Verificar se tem configurações válidas
      if (barbershopSettings && 
          typeof barbershopSettings === 'object' && 
          barbershopSettings.open_time && 
          barbershopSettings.close_time) {
        
        const openTime = parseTime(barbershopSettings.open_time);
        const closeTime = parseTime(barbershopSettings.close_time);
        
        console.log(`Gerando horários de ${openTime.hours}:${openTime.minutes} até ${closeTime.hours}:${closeTime.minutes}`);
        
        const timeList = generateTimeList(openTime.hours, openTime.minutes, closeTime.hours, closeTime.minutes);
        console.log("Horários gerados:", timeList);
        setTimeOptions(timeList);
      } else {
        // Usar valores padrão se não tiver configurações
        console.warn("Usando valores padrão para horários (8h às 18h)");
        const timeList = generateTimeList(8, 0, 18, 0);
        console.log("Horários padrão gerados:", timeList);
        setTimeOptions(timeList);
      }
    } catch (error) {
      console.error("Erro ao gerar horários:", error);
      // Em caso de erro, usar valores padrão simples
      const defaultTimes = [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00", "17:30", "18:00"
      ];
      setTimeOptions(defaultTimes);
    }
  }, [barbershopSettings]);

  // Obter nome do dia da semana
  const getDayName = (dayNumber: number) => {
    return DIAS_SEMANA.find(dia => dia.value === dayNumber.toString())?.label || "Desconhecido";
  };

  return (
    <AdminLayout title="Gerenciar Disponibilidade">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" onClick={() => navigate("/admin/professionals")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Profissionais
        </Button>
        
        {!isLoadingProfessional && professional && (
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={professional.avatar_url || ""} alt={professional.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {professional.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-medium text-primary">{professional.name}</h2>
          </div>
        )}
      </div>

      <Tabs defaultValue="regularHours" onValueChange={setCurrentTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="regularHours">Horários Regulares</TabsTrigger>
          <TabsTrigger value="exceptions">Exceções & Folgas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="regularHours">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle>Horários de Disponibilidade</CardTitle>
                <CardDescription>
                  Configure os horários em que o profissional estará disponível para atendimento.
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Horário
              </Button>
            </CardHeader>
            
            <CardContent>
              {isLoadingAvailabilities ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !availabilities || availabilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhum horário configurado</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    Adicionar Horário de Disponibilidade
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dia da Semana</TableHead>
                        <TableHead>Horário Início</TableHead>
                        <TableHead>Horário Fim</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availabilities.map((availability: any) => (
                        <TableRow key={availability.id}>
                          <TableCell>{getDayName(availability.day_of_week)}</TableCell>
                          <TableCell>{availability.start_time}</TableCell>
                          <TableCell>{availability.end_time}</TableCell>
                          <TableCell>
                            {availability.is_available ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                Disponível
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                                Indisponível
                              </Badge>
                            )}
                            {availability.lunch_start && availability.lunch_end && (
                              <div className="mt-2">
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 hover:bg-amber-50">
                                  Almoço: {availability.lunch_start} - {availability.lunch_end}
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => prepareForEdit(availability)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-destructive"
                                onClick={() => prepareForDelete(availability)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Excluir</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="exceptions">
          <Card>
            <CardHeader>
              <CardTitle>Exceções e Folgas</CardTitle>
              <CardDescription>
                Configure datas específicas em que o profissional estará indisponível.
                Esta funcionalidade será implementada em breve.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Funcionalidade em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo para criar disponibilidade */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Disponibilidade</DialogTitle>
            <DialogDescription>
              Defina os dias e horários em que o profissional estará disponível.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="day">Dia da Semana</Label>
                <Select
                  value={selectedDay}
                  onValueChange={setSelectedDay}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((dia) => (
                      <SelectItem key={dia.value} value={dia.value}>
                        {dia.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Hora Início</Label>
                  <Select
                    value={startTime}
                    onValueChange={setStartTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hora início" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((hora) => (
                        <SelectItem key={`start-${hora}`} value={hora}>
                          {hora}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="endTime">Hora Fim</Label>
                  <Select
                    value={endTime}
                    onValueChange={setEndTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hora fim" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((hora) => (
                        <SelectItem key={`end-${hora}`} value={hora}>
                          {hora}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="isAvailable" 
                  checked={isAvailable} 
                  onCheckedChange={(checked) => setIsAvailable(checked as boolean)}
                />
                <Label htmlFor="isAvailable">
                  Disponível para agendamentos
                </Label>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox 
                    id="hasLunchBreak" 
                    checked={hasLunchBreak} 
                    onCheckedChange={(checked) => setHasLunchBreak(checked as boolean)}
                  />
                  <Label htmlFor="hasLunchBreak">
                    Definir horário de almoço
                  </Label>
                </div>
                
                {hasLunchBreak && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="lunchStart">Início do Almoço</Label>
                      <Select
                        value={lunchStart}
                        onValueChange={setLunchStart}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Hora início" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((hora) => (
                            <SelectItem key={`lunch-start-${hora}`} value={hora}>
                              {hora}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="lunchEnd">Fim do Almoço</Label>
                      <Select
                        value={lunchEnd}
                        onValueChange={setLunchEnd}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Hora fim" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((hora) => (
                            <SelectItem key={`lunch-end-${hora}`} value={hora}>
                              {hora}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createAvailabilityMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateSubmit}
              disabled={createAvailabilityMutation.isPending}
            >
              {createAvailabilityMutation.isPending ? (
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar disponibilidade */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Disponibilidade</DialogTitle>
            <DialogDescription>
              Modifique os dias e horários de disponibilidade.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="day">Dia da Semana</Label>
                <Select
                  value={selectedDay}
                  onValueChange={setSelectedDay}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((dia) => (
                      <SelectItem key={dia.value} value={dia.value}>
                        {dia.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Hora Início</Label>
                  <Select
                    value={startTime}
                    onValueChange={setStartTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hora início" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((hora) => (
                        <SelectItem key={`edit-start-${hora}`} value={hora}>
                          {hora}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="endTime">Hora Fim</Label>
                  <Select
                    value={endTime}
                    onValueChange={setEndTime}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hora fim" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((hora) => (
                        <SelectItem key={`edit-end-${hora}`} value={hora}>
                          {hora}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="isAvailable" 
                  checked={isAvailable} 
                  onCheckedChange={(checked) => setIsAvailable(checked as boolean)}
                />
                <Label htmlFor="isAvailable">
                  Disponível para agendamentos
                </Label>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox 
                    id="hasLunchBreak" 
                    checked={hasLunchBreak} 
                    onCheckedChange={(checked) => setHasLunchBreak(checked as boolean)}
                  />
                  <Label htmlFor="hasLunchBreak">
                    Definir horário de almoço
                  </Label>
                </div>
                
                {hasLunchBreak && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="lunchStart">Início do Almoço</Label>
                      <Select
                        value={lunchStart}
                        onValueChange={setLunchStart}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Hora início" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((hora) => (
                            <SelectItem key={`edit-lunch-start-${hora}`} value={hora}>
                              {hora}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="lunchEnd">Fim do Almoço</Label>
                      <Select
                        value={lunchEnd}
                        onValueChange={setLunchEnd}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Hora fim" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((hora) => (
                            <SelectItem key={`edit-lunch-end-${hora}`} value={hora}>
                              {hora}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateAvailabilityMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateSubmit}
              disabled={updateAvailabilityMutation.isPending}
            >
              {updateAvailabilityMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Atualizar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para confirmar exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este horário de disponibilidade?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAvailability && (
            <div className="py-4">
              <div className="rounded-md bg-muted p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Dia:</span>
                    <p>{getDayName(selectedAvailability.day_of_week)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Horário:</span>
                    <p>{selectedAvailability.start_time} - {selectedAvailability.end_time}</p>
                  </div>
                  {selectedAvailability.lunch_start && selectedAvailability.lunch_end && (
                    <div className="col-span-2 mt-2">
                      <span className="text-sm font-medium text-muted-foreground">Almoço:</span>
                      <p>{selectedAvailability.lunch_start} - {selectedAvailability.lunch_end}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteAvailabilityMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteAvailabilityMutation.isPending}
            >
              {deleteAvailabilityMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AvailabilityManagementPage;