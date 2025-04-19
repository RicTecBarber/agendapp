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
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [showLunchOptions, setShowLunchOptions] = useState<boolean>(false);

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
    setIsAvailable(true);
    setShowLunchOptions(false);
  };

  // Preparar para editar
  const prepareForEdit = (availability: any) => {
    setSelectedAvailability(availability);
    setSelectedDay(availability.day_of_week.toString());
    setStartTime(availability.start_time);
    setEndTime(availability.end_time);
    setLunchStart(availability.lunch_start || "");
    setLunchEnd(availability.lunch_end || "");
    setIsAvailable(availability.is_available);
    // Mostrar opções de almoço se houver horário de almoço definido
    setShowLunchOptions(!!(availability.lunch_start || availability.lunch_end));
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

    // Horário de almoço é opcional
    
    const availabilityData: any = {
      professional_id: professionalId,
      day_of_week: parseInt(selectedDay),
      start_time: startTime,
      end_time: endTime,
      is_available: isAvailable,
      tenant_id: Number(tenantParam)
    };
    
    // Adicionar horário de almoço se informado
    if (lunchStart) {
      availabilityData.lunch_start = lunchStart;
    }
    
    if (lunchEnd) {
      availabilityData.lunch_end = lunchEnd;
    }

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

    // Horário de almoço é opcional
    
    const availabilityData: any = {
      id: selectedAvailability.id,
      professional_id: professionalId,
      day_of_week: parseInt(selectedDay),
      start_time: startTime,
      end_time: endTime,
      is_available: isAvailable,
      tenant_id: Number(tenantParam)
    };
    
    // Adicionar horário de almoço se informado
    if (lunchStart) {
      availabilityData.lunch_start = lunchStart;
    }
    
    if (lunchEnd) {
      availabilityData.lunch_end = lunchEnd;
    }

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
      } else if (!timeOptions.length) {
        // Se não tiver as configurações e ainda não tiver gerado os horários, gera o padrão
        console.warn("Configurações de horário inválidas, usando valores padrão");
        
        // Gerar horários padrão de 8h às 18h
        const timeList: string[] = [];
        
        for (let hour = 8; hour <= 18; hour++) {
          timeList.push(`${hour.toString().padStart(2, '0')}:00`);
          timeList.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        
        console.log("Horários padrão gerados:", timeList);
        setTimeOptions(timeList);
      }
    } catch (error) {
      console.error("Erro ao processar configurações de horário:", error);
      
      // Se ocorrer erro, gera horários padrão
      if (!timeOptions.length) {
        console.warn("Erro ao processar horários, usando valores padrão");
        
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
  }, [barbershopSettings, timeOptions.length]);

  const getDayName = (dayOfWeek: number) => {
    const day = DIAS_SEMANA.find(d => parseInt(d.value) === dayOfWeek);
    return day ? day.label : "Desconhecido";
  };

  // Renderizar carregamento
  if (isLoadingProfessional || isAuthLoading) {
    return (
      <AdminLayout>
        <div className="w-full flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando informações...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={() => navigate("/admin/professionals")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold ml-2">
            Gerenciar Disponibilidade
          </h1>
        </div>
        
        {professional && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center">
                <Avatar className="h-12 w-12 mr-4">
                  {professional.image_url ? (
                    <AvatarImage src={professional.image_url} />
                  ) : (
                    <AvatarFallback>
                      {professional.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <CardTitle>{professional.name}</CardTitle>
                  <CardDescription>
                    {professional.specialization || "Barbeiro/Cabeleireiro"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Horários de Disponibilidade</h2>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Horário
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="regularHours">Horários Regulares</TabsTrigger>
              </TabsList>
              
              <TabsContent value="regularHours">
                {isLoadingAvailabilities ? (
                  <div className="w-full flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Carregando horários...</p>
                  </div>
                ) : (
                  availabilities && availabilities.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dia da Semana</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availabilities.map((availability: any) => (
                          <TableRow key={availability.id}>
                            <TableCell>{getDayName(availability.day_of_week)}</TableCell>
                            <TableCell>
                              <div>
                                {availability.start_time} - {availability.end_time}
                                {availability.lunch_start && availability.lunch_end && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Almoço: {availability.lunch_start} - {availability.lunch_end}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {availability.is_available ? (
                                <Badge variant="default" className="bg-green-500">Disponível</Badge>
                              ) : (
                                <Badge variant="secondary">Indisponível</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => prepareForEdit(availability)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => prepareForDelete(availability)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">Nenhum horário cadastrado</p>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Horário
                      </Button>
                    </div>
                  )
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog para criar novo horário */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Horário de Disponibilidade</DialogTitle>
            <DialogDescription>
              Defina os dias e horários em que o profissional está disponível para atendimento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="day">Dia da Semana</Label>
              <Select
                value={selectedDay}
                onValueChange={setSelectedDay}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia da semana" />
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
              <div className="grid gap-2">
                <Label htmlFor="startTime">Horário de Início</Label>
                <Select
                  value={startTime}
                  onValueChange={setStartTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`start-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="endTime">Horário de Término</Label>
                <Select
                  value={endTime}
                  onValueChange={setEndTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`end-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="showLunchTime"
                  checked={showLunchOptions}
                  onCheckedChange={(checked) => {
                    setShowLunchOptions(checked === true);
                    // Limpar os campos de almoço se desmarcar a opção
                    if (checked !== true) {
                      setLunchStart("");
                      setLunchEnd("");
                    }
                  }}
                />
                <Label
                  htmlFor="showLunchTime"
                  className="text-sm font-medium cursor-pointer"
                >
                  Definir horário de almoço
                </Label>
              </div>
              
              {showLunchOptions && (
                <div className="mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="lunchStart">Início do Almoço</Label>
                      <Select
                        value={lunchStart}
                        onValueChange={setLunchStart}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não definido</SelectItem>
                          {timeOptions.map((time) => (
                            <SelectItem key={`lunch-start-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="lunchEnd">Fim do Almoço</Label>
                      <Select
                        value={lunchEnd}
                        onValueChange={setLunchEnd}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não definido</SelectItem>
                          {timeOptions.map((time) => (
                            <SelectItem key={`lunch-end-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAvailable"
                checked={isAvailable}
                onCheckedChange={(checked) => 
                  setIsAvailable(checked === true)
                }
              />
              <Label
                htmlFor="isAvailable"
                className="text-sm font-normal cursor-pointer"
              >
                Disponível para agendamentos
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit}>
              {createAvailabilityMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para editar horário */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Horário de Disponibilidade</DialogTitle>
            <DialogDescription>
              Altere os dias e horários de disponibilidade do profissional.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="day">Dia da Semana</Label>
              <Select
                value={selectedDay}
                onValueChange={setSelectedDay}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia da semana" />
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
              <div className="grid gap-2">
                <Label htmlFor="startTime">Horário de Início</Label>
                <Select
                  value={startTime}
                  onValueChange={setStartTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`edit-start-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="endTime">Horário de Término</Label>
                <Select
                  value={endTime}
                  onValueChange={setEndTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={`edit-end-${time}`} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="showLunchTimeEdit"
                  checked={showLunchOptions}
                  onCheckedChange={(checked) => {
                    setShowLunchOptions(checked === true);
                    // Limpar os campos de almoço se desmarcar a opção
                    if (checked !== true) {
                      setLunchStart("");
                      setLunchEnd("");
                    }
                  }}
                />
                <Label
                  htmlFor="showLunchTimeEdit"
                  className="text-sm font-medium cursor-pointer"
                >
                  Definir horário de almoço
                </Label>
              </div>
              
              {showLunchOptions && (
                <div className="mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="lunchStartEdit">Início do Almoço</Label>
                      <Select
                        value={lunchStart}
                        onValueChange={setLunchStart}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não definido</SelectItem>
                          {timeOptions.map((time) => (
                            <SelectItem key={`edit-lunch-start-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="lunchEndEdit">Fim do Almoço</Label>
                      <Select
                        value={lunchEnd}
                        onValueChange={setLunchEnd}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não definido</SelectItem>
                          {timeOptions.map((time) => (
                            <SelectItem key={`edit-lunch-end-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isAvailableEdit"
                checked={isAvailable}
                onCheckedChange={(checked) => 
                  setIsAvailable(checked === true)
                }
              />
              <Label
                htmlFor="isAvailableEdit"
                className="text-sm font-normal cursor-pointer"
              >
                Disponível para agendamentos
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateSubmit}>
              {updateAvailabilityMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para confirmar exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Horário de Disponibilidade</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este horário de disponibilidade? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAvailability && (
            <div className="py-4">
              <p>
                <strong>Dia:</strong> {getDayName(selectedAvailability.day_of_week)}
              </p>
              <p>
                <strong>Horário:</strong> {selectedAvailability.start_time} - {selectedAvailability.end_time}
              </p>
              {selectedAvailability.lunch_start && selectedAvailability.lunch_end && (
                <p>
                  <strong>Almoço:</strong> {selectedAvailability.lunch_start} - {selectedAvailability.lunch_end}
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              {deleteAvailabilityMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AvailabilityManagementPage;