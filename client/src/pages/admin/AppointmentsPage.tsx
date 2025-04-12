import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAppointments } from "@/hooks/use-appointments";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createUtcDateFromLocalTime } from "@/lib/timezone-utils";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, MoreHorizontal, Calendar as CalendarIcon, CheckCircle, XCircle, Clock, ShoppingCart } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const AppointmentsPage = () => {
  const [, navigate] = useLocation();
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [professionalFilter, setProfessionalFilter] = useState<string[]>(["all"]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusDialog, setStatusDialog] = useState<{open: boolean, appointment: any | null, newStatus: string}>({
    open: false,
    appointment: null,
    newStatus: ""
  });
  
  // Estado para controlar o modal de novo agendamento
  const [newAppointmentDialog, setNewAppointmentDialog] = useState(false);
  
  // Estados para o formulário de novo agendamento
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [isRewardRedemption, setIsRewardRedemption] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  
  // Obter parâmetros da URL para pré-preencher o formulário
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteParam = params.get('cliente');
    const telefoneParam = params.get('telefone');
    
    if (clienteParam) {
      setClientName(decodeURIComponent(clienteParam));
    }
    
    if (telefoneParam) {
      setClientPhone(decodeURIComponent(telefoneParam));
    }
    
    // Se tiver parâmetros, abrir o diálogo de agendamento automaticamente
    if (clienteParam || telefoneParam) {
      setNewAppointmentDialog(true);
    }
  }, []);
  
  // Logging para debug
  useEffect(() => {
    console.log("selectedService alterado:", selectedService);
  }, [selectedService]);

  // Get appointments data
  const { 
    appointments, 
    isLoading, 
    updateAppointmentStatus 
  } = useAppointments({ 
    date: dateFilter,
    // Se "all" estiver incluído, não filtrar por profissional (undefined)
    // Caso contrário, converter os IDs para números
    professionalIds: professionalFilter.includes("all") 
      ? undefined 
      : professionalFilter
          .map(id => parseInt(id))
          .filter(id => !isNaN(id)) // Remover qualquer ID inválido
  });

  // Get professionals for filter
  const { data: professionals, isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ["/api/professionals"],
  });

  // Get services for new appointment
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services"],
  });
  
  // Get professionals by service for new appointment
  const { data: professionalsByService, isLoading: isLoadingProfessionalsByService } = useQuery({
    queryKey: ["/api/professionals/service", selectedService],
    enabled: !!selectedService, // Only run query when a service is selected
    queryFn: async () => {
      if (!selectedService) return [];
      
      // Extrair o tenant da URL para incluir na requisição
      const params = new URLSearchParams(window.location.search);
      const tenantParam = params.get('tenant');
      
      // Construir URL com o tenant, se disponível
      let url = `/api/professionals/service/${selectedService}`;
      if (tenantParam) {
        url += `?tenant=${tenantParam}`;
      }
      
      console.log("Buscando profissionais para o serviço:", selectedService, "URL:", url);
      
      // Usar apiRequest para garantir que o tenant seja incluído automaticamente
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Erro ao buscar profissionais:", errorText);
        throw new Error("Erro ao buscar profissionais");
      }
      return res.json();
    }
  });
  
  // Get availability for selected professional and date
  const { data: availability, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ["/api/availability", selectedProfessional, format(selectedDate, "yyyy-MM-dd")],
    enabled: !!selectedProfessional && !!selectedDate, // Only run query when both are selected
    queryFn: async () => {
      if (!selectedProfessional || !selectedDate) return [];
      
      // Extrair o tenant da URL para incluir na requisição
      const params = new URLSearchParams(window.location.search);
      const tenantParam = params.get('tenant');
      
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      
      // Construir URL com o tenant, se disponível
      let url = `/api/availability/${selectedProfessional}/${formattedDate}`;
      if (tenantParam) {
        url += `?tenant=${tenantParam}`;
      }
      
      console.log("Buscando disponibilidade para:", selectedProfessional, formattedDate, "URL:", url);
      
      // Usar apiRequest para garantir que o tenant seja incluído automaticamente
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Erro ao buscar disponibilidade:", errorText);
        throw new Error("Erro ao buscar disponibilidade");
      }
      const data = await res.json();
      console.log("Disponibilidade retornada:", data);
      return data;
    }
  });
  
  // Get toast
  const { toast } = useToast();

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: async (appointmentData: any) => {
      const res = await apiRequest("POST", "/api/appointments", appointmentData);
      return await res.json();
    },
    onSuccess: () => {
      // Reset form and close dialog
      setNewAppointmentDialog(false);
      resetNewAppointmentForm();
      // Invalidate appointments and professionals queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      if (selectedService) {
        queryClient.invalidateQueries({ queryKey: ["/api/professionals/service", selectedService] });
      }
      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Não precisamos mais filtrar os profissionais porque isso já está sendo 
// feito pela API através do hook useAppointments. Apenas filtramos por data/período
const filteredAppointments = appointments?.filter((appointment: any) => {
  // Garantir que o appointment tenha uma data válida
  if (!appointment.appointment_date) {
    console.warn('Agendamento sem data:', appointment);
    return false;
  }
  
  // Converter a string de data para objeto Date
  const appointmentDate = parseISO(appointment.appointment_date);
  
  // Filter by tab (date range)
  if (selectedTab === "today" && !isToday(appointmentDate)) {
    return false;
  }
  if (selectedTab === "tomorrow" && !isTomorrow(appointmentDate)) {
    return false;
  }
  if (selectedTab === "week" && !isThisWeek(appointmentDate, { weekStartsOn: 1 })) {
    return false;
  }
  if (selectedTab === "month" && !isThisMonth(appointmentDate)) {
    return false;
  }
  
  return true;
}) || [];

  // Change appointment status handler
  const handleStatusChange = (appointment: any, newStatus: string) => {
    setStatusDialog({
      open: true,
      appointment,
      newStatus
    });
  };

  // Confirm status change
  const confirmStatusChange = () => {
    if (statusDialog.appointment && statusDialog.newStatus) {
      updateAppointmentStatus.mutate({
        id: statusDialog.appointment.id,
        status: statusDialog.newStatus
      });
      
      setStatusDialog({
        open: false,
        appointment: null,
        newStatus: ""
      });
    }
  };

  // Reset new appointment form
  const resetNewAppointmentForm = () => {
    setSelectedService(null);
    setSelectedProfessional(null);
    setSelectedDate(new Date());
    setSelectedTime(null);
    setClientName("");
    setClientPhone("");
    setNotifyWhatsapp(true);
    setIsRewardRedemption(false);
    setAvailableTimes([]);
  };
  
  // Effect to update available times when availability data changes
  useEffect(() => {
    if (availability) {
      console.log("Disponibilidade recebida:", availability);
      // Limpar horários anteriores e seleção
      setAvailableTimes([]);
      setSelectedTime(null);
      
      // Se a disponibilidade tem a propriedade available_slots
      if (availability.available_slots && Array.isArray(availability.available_slots)) {
        const times = availability.available_slots;
        console.log("Horários disponíveis:", times);
        
        if (times.length === 0 && availability.message) {
          console.log("Mensagem do servidor:", availability.message);
          // Não é necessário definir uma mensagem de erro, o componente já exibe
          // uma mensagem apropriada quando availableTimes está vazio
        }
        
        setAvailableTimes(times);
      } else if (Array.isArray(availability)) {
        // Suporte para resposta que seja diretamente um array
        const times = availability.map((slot: any) => slot.time || slot);
        console.log("Horários disponíveis (formato alternativo):", times);
        setAvailableTimes(times);
      } else {
        console.log("Formato de disponibilidade não reconhecido:", availability);
      }
      
      // Se houver informações de debug, log detalhado
      if (availability.debug_info && availability.debug_info.slot_details) {
        console.log("Detalhes dos slots:", availability.debug_info.slot_details);
        
        // Mostre slots indisponíveis 
        const unavailableSlots = availability.debug_info.slot_details
          .filter((slot: any) => !slot.available && slot.conflicts)
          .map((slot: any) => ({
            time: slot.time,
            conflicts: slot.conflicts
          }));
          
        if (unavailableSlots.length > 0) {
          console.log("Slots com conflito:", unavailableSlots);
        }
      }
    } else {
      console.log("Nenhuma disponibilidade recebida");
      setAvailableTimes([]);
      setSelectedTime(null);
    }
  }, [availability]);
  
  // Handle appointment submission
  const handleCreateAppointment = () => {
    // Verificações específicas de cada campo
    if (!selectedService) {
      toast({
        title: "Serviço não selecionado",
        description: "Por favor, selecione um serviço para o agendamento.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedProfessional) {
      toast({
        title: "Profissional não selecionado",
        description: "Por favor, selecione um profissional para o agendamento.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedDate) {
      toast({
        title: "Data não selecionada",
        description: "Por favor, selecione uma data para o agendamento.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedTime) {
      toast({
        title: "Horário não selecionado",
        description: "Por favor, selecione um horário disponível para o agendamento.",
        variant: "destructive"
      });
      return;
    }
    
    if (!clientName || clientName.trim() === '') {
      toast({
        title: "Nome não informado",
        description: "Por favor, informe o nome do cliente.",
        variant: "destructive"
      });
      return;
    }
    
    if (!clientPhone || clientPhone.trim() === '') {
      toast({
        title: "Telefone não informado",
        description: "Por favor, informe o telefone do cliente.",
        variant: "destructive"
      });
      return;
    }
    
    // Extrair hora e minuto do horário selecionado
    const [hours, minutes] = selectedTime.split(':').map(Number);
    
    // Formatamos a data manualmente para mantê-la no formato esperado pelo backend
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    
    // Criar string de data formatada (YYYY-MM-DDThh:mm:00.000) com indicador LOCAL
    const formattedDate = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00.000LOCAL`;
    
    console.log("==== LOG DE DEPURAÇÃO DO AGENDAMENTO ====");
    console.log(`Data selecionada: ${selectedDate.toLocaleDateString()}`);
    console.log(`Horário selecionado: ${selectedTime}`);
    console.log(`Horário após formatação: ${hoursStr}:${minutesStr}`);
    console.log(`String formatada para envio: ${formattedDate}`);
    console.log(`Serviço ID: ${selectedService}`);
    console.log(`Profissional ID: ${selectedProfessional}`);
    console.log(`Cliente: ${clientName}`);
    console.log(`Telefone: ${clientPhone}`);
    console.log(`Notificar WhatsApp: ${notifyWhatsapp ? 'Sim' : 'Não'}`);
    console.log(`É resgate de fidelidade: ${isRewardRedemption ? 'Sim' : 'Não'}`);
    
    // Create appointment data
    const appointmentData = {
      service_id: selectedService,
      professional_id: selectedProfessional,
      // Enviar string formatada ao invés de data
      appointment_date: formattedDate,
      client_name: clientName,
      client_phone: clientPhone,
      notify_whatsapp: notifyWhatsapp,
      is_loyalty_reward: isRewardRedemption,
      status: "scheduled"
    };
    
    // Feedback ao usuário antes do envio
    toast({
      title: "Processando agendamento...",
      description: `Criando agendamento para ${clientName} às ${selectedTime}`,
    });
    
    // Enviar o agendamento com dados detalhados
    try {
      createAppointment.mutate(appointmentData);
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao processar o agendamento. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // Navigate to create order page with appointment details
  const navigateToCreateOrder = (appointment: any) => {
    // Encontrar o serviço correspondente ao agendamento
    const service = Array.isArray(services) ? 
      services.find((s: any) => s.id === appointment.service_id) : null;
    
    const queryParams = new URLSearchParams({
      appointmentId: appointment.id.toString(),
      clientName: appointment.client_name,
      clientPhone: appointment.client_phone,
      serviceId: appointment.service_id.toString(),
      serviceName: service ? service.name : '',
      servicePrice: service ? service.price.toString() : '0',
      paymentMethod: 'dinheiro' // Método de pagamento padrão
    });
    navigate(`/admin/orders/create?${queryParams.toString()}`);
  };

  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="bg-blue-100 text-blue-700 text-xs font-medium py-1 px-2 rounded-full inline-flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Agendado
          </span>
        );
      case "completed":
        return (
          <span className="bg-green-100 text-green-700 text-xs font-medium py-1 px-2 rounded-full inline-flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Realizado
          </span>
        );
      case "cancelled":
        return (
          <span className="bg-red-100 text-red-700 text-xs font-medium py-1 px-2 rounded-full inline-flex items-center">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelado
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <AdminLayout title="Agenda">
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal w-[240px]",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "PPP", { locale: ptBR }) : <span>Filtrar por data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                  {dateFilter && (
                    <div className="p-3 border-t border-border">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center"
                        onClick={() => setDateFilter(undefined)}
                      >
                        Limpar
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <div className="space-y-2">
                <div className="text-sm font-medium">Filtrar por profissional</div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center space-x-2 bg-background rounded-md border px-3 py-1 text-sm">
                    <input
                      type="checkbox"
                      id="professional-all"
                      checked={professionalFilter.includes("all")}
                      onChange={(e) => {
                        // Quando "todos" é marcado, limpar qualquer filtro existente e usar apenas "all"
                        if (e.target.checked) {
                          console.log("Adicionando filtro para TODOS os profissionais");
                          setProfessionalFilter(["all"]);
                          // Forçar recarregamento dos dados
                          queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                        } 
                        // Se "todos" está sendo desmarcado e havia outros filtros
                        else if (professionalFilter.length > 1) {
                          // Remover apenas o "all" e manter os profissionais selecionados
                          console.log("Removendo 'all' e mantendo filtros específicos");
                          const specificFilters = professionalFilter.filter(id => id !== "all");
                          setProfessionalFilter(specificFilters);
                          // Forçar recarregamento dos dados
                          queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="professional-all" className="font-medium text-sm cursor-pointer">
                      Todos
                    </label>
                  </div>
                  
                  {!isLoadingProfessionals && Array.isArray(professionals) && professionals.map((professional: any) => {
                    const proId = professional.id.toString();
                    const isChecked = professionalFilter.includes(proId) || professionalFilter.includes("all");
                    // Cores diferentes para cada profissional (repetindo se necessário)
                    const colorClasses = [
                      "bg-blue-50 border-blue-200 text-blue-700",
                      "bg-green-50 border-green-200 text-green-700",
                      "bg-purple-50 border-purple-200 text-purple-700",
                      "bg-amber-50 border-amber-200 text-amber-700",
                      "bg-teal-50 border-teal-200 text-teal-700",
                    ];
                    const colorIndex = (professional.id - 1) % colorClasses.length;
                    const colorClass = colorClasses[colorIndex];
                    
                    return (
                      <div 
                        key={professional.id} 
                        className={`flex items-center space-x-2 rounded-md border px-3 py-1 text-sm ${isChecked ? colorClass : "bg-background"}`}
                      >
                        <input
                          type="checkbox"
                          id={`professional-${professional.id}`}
                          checked={isChecked}
                          onChange={(e) => {
                            // Se "todos" está selecionado e o usuário desmarca uma opção específica
                            if (professionalFilter.includes("all")) {
                              if (!e.target.checked) {
                                // Converter para uma seleção específica (todos exceto este)
                                const otherPros = professionals
                                  .map((p: any) => p.id.toString())
                                  .filter((id: string) => id !== proId);
                                
                                console.log(`Removendo 'all' e selecionando todos exceto ${proId}`);
                                setProfessionalFilter(otherPros);
                                // Forçar atualização
                                queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                              }
                            } else {
                              // Modo de seleção específica
                              if (e.target.checked) {
                                // Adicionar este profissional ao filtro
                                if (!professionalFilter.includes(proId)) {
                                  const newFilter = [...professionalFilter, proId];
                                  console.log(`Adicionando profissional ${proId}`, newFilter);
                                  setProfessionalFilter(newFilter);
                                  // Forçar atualização
                                  queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                                }
                              } else {
                                // Remover este profissional do filtro
                                const newFilter = professionalFilter.filter(id => id !== proId);
                                console.log(`Removendo profissional ${proId}`, newFilter);
                                setProfessionalFilter(newFilter);
                                // Forçar atualização
                                queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                              }
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label 
                          htmlFor={`professional-${professional.id}`} 
                          className="font-medium text-sm cursor-pointer flex items-center gap-2"
                        >
                          <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold border">
                            {professional.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                          <span>{professional.name}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Button variant="default" onClick={() => setNewAppointmentDialog(true)}>
                Novo Agendamento
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs 
        defaultValue="all" 
        value={selectedTab} 
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <div className="border-b">
          <div className="container mx-auto">
            <TabsList className="bg-transparent h-auto pt-2 mb-[-1px]">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-10"
              >
                Todos
              </TabsTrigger>
              <TabsTrigger 
                value="today" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-10"
              >
                Hoje
              </TabsTrigger>
              <TabsTrigger 
                value="tomorrow" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-10"
              >
                Amanhã
              </TabsTrigger>
              <TabsTrigger 
                value="week" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-10"
              >
                Esta Semana
              </TabsTrigger>
              <TabsTrigger 
                value="month" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-10"
              >
                Este Mês
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <TabsContent value={selectedTab} className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Agendamentos</CardTitle>
              <CardDescription>
                {filteredAppointments.length} agendamentos encontrados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-16 text-neutral-dark">
                  <p className="mb-2">Nenhum agendamento encontrado</p>
                  <p className="text-sm">Tente ajustar os filtros ou criar um novo agendamento</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Serviço</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Profissional</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Data</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Horário</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Valor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.map((appointment: any) => (
                        <tr key={appointment.id} className="border-b border-neutral">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="bg-primary-light/30 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                                <span className="text-primary text-xs font-bold">
                                  {appointment.client_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{appointment.client_name}</p>
                                <p className="text-xs text-neutral-dark">{appointment.client_phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{appointment.service_name}</td>
                          <td className="py-3 px-4">{appointment.professional_name}</td>
                          <td className="py-3 px-4">
                            {format(parseISO(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                          </td>
                          <td className="py-3 px-4">
                            {/* SOLUÇÃO RADICAL - Extrair a hora diretamente sem conversão de Date */}
                            {appointment.appointment_date.substring(11, 16)}
                          </td>
                          <td className="py-3 px-4">
                            {appointment.is_loyalty_reward 
                              ? <span className="text-green-600 font-medium">Brinde</span>
                              : `R$ ${appointment.service_price ? appointment.service_price.toFixed(2) : '0.00'}`
                            }
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(appointment.status)}
                          </td>
                          <td className="py-3 px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {/* Opção de Criar Comanda disponível para todos os status */}
                                <DropdownMenuItem
                                  className="text-orange-600"
                                  onClick={() => navigateToCreateOrder(appointment)}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2" />
                                  Criar comanda
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                
                                {/* Outras ações específicas de status */}
                                {appointment.status === "scheduled" && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={() => handleStatusChange(appointment, "completed")}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Marcar como realizado
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleStatusChange(appointment, "cancelled")}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancelar agendamento
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {appointment.status === "cancelled" && (
                                  <DropdownMenuItem
                                    className="text-blue-600"
                                    onClick={() => handleStatusChange(appointment, "scheduled")}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Restaurar agendamento
                                  </DropdownMenuItem>
                                )}
                                {appointment.status === "completed" && (
                                  <DropdownMenuItem
                                    className="text-blue-600"
                                    onClick={() => handleStatusChange(appointment, "scheduled")}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Reverter para agendado
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for confirming status change */}
      <Dialog open={statusDialog.open} onOpenChange={(open) => {
        if (!open) {
          setStatusDialog({ open: false, appointment: null, newStatus: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteração de Status</DialogTitle>
            <DialogDescription>
              {statusDialog.newStatus === "completed" && "Tem certeza que deseja marcar este agendamento como realizado?"}
              {statusDialog.newStatus === "cancelled" && "Tem certeza que deseja cancelar este agendamento?"}
              {statusDialog.newStatus === "scheduled" && "Tem certeza que deseja alterar o status deste agendamento?"}
            </DialogDescription>
          </DialogHeader>
          {statusDialog.appointment && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-dark">Cliente:</p>
                  <p className="font-medium">{statusDialog.appointment.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-dark">Serviço:</p>
                  <p className="font-medium">{statusDialog.appointment.service_name}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-dark">Data:</p>
                  <p className="font-medium">
                    {format(parseISO(statusDialog.appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-dark">Horário:</p>
                  <p className="font-medium">
                    {/* SOLUÇÃO RADICAL - Extrair a hora diretamente sem conversão de Date */}
                    {statusDialog.appointment.appointment_date.substring(11, 16)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setStatusDialog({ open: false, appointment: null, newStatus: "" });
            }}>
              Cancelar
            </Button>
            <Button 
              variant={statusDialog.newStatus === "cancelled" ? "destructive" : "default"}
              onClick={confirmStatusChange}
              disabled={updateAppointmentStatus.isPending}
            >
              {updateAppointmentStatus.isPending ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog for creating a new appointment */}
      <Dialog open={newAppointmentDialog} onOpenChange={(open) => {
        if (!open) {
          setNewAppointmentDialog(false);
          resetNewAppointmentForm();
        }
      }}>
        <DialogContent className="max-w-[580px] overflow-y-auto max-h-[85vh] p-6">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar um novo agendamento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            {/* Service selection */}
            <div className="grid gap-2">
              <Label htmlFor="service">Serviço</Label>
              <Select
                value={selectedService ? selectedService.toString() : ''}
                onValueChange={(value) => {
                  console.log("Service selecionado:", value); 
                  const serviceId = parseInt(value);
                  setSelectedService(serviceId);
                  setSelectedProfessional(null);
                  setSelectedTime(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {!isLoadingServices && Array.isArray(services) && services.map((service: any) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} - R$ {service.price ? service.price.toFixed(2) : '0.00'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Professional selection */}
            <div className="grid gap-2">
              <Label htmlFor="professional">Profissional</Label>
              <Select
                value={selectedProfessional ? selectedProfessional.toString() : ''}
                onValueChange={(value) => {
                  setSelectedProfessional(parseInt(value));
                  setSelectedTime(null);
                }}
                disabled={!selectedService || isLoadingProfessionalsByService}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {!isLoadingProfessionalsByService && Array.isArray(professionalsByService) && professionalsByService.map((professional: any) => (
                    <SelectItem key={professional.id} value={professional.id.toString()}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date and time selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      disabled={!selectedProfessional}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date || new Date());
                        setSelectedTime(null);
                      }}
                      initialFocus
                      disabled={[
                        { before: new Date() }, 
                        (date) => date.getDay() === 0, // Disable Sundays
                      ]}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Seleção de horário super simplificada em HTML */}
              <div className="grid gap-2">
                <div>
                  <Label htmlFor="time-selection">
                    Horário: {selectedTime ? 
                      <span className="inline-block ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">{selectedTime}</span> 
                      : 
                      <span className="inline-block ml-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Nenhum selecionado</span>
                    }
                  </Label>
                  
                  {isLoadingAvailability && (
                    <div className="mt-2 p-3 border rounded-md bg-muted/10">
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Carregando horários...</span>
                      </div>
                    </div>
                  )}
                  
                  {!isLoadingAvailability && (!selectedProfessional || !selectedDate) && (
                    <div className="mt-2 p-3 border rounded-md bg-muted/10">
                      <span className="text-sm text-muted-foreground">
                        Selecione um profissional e data primeiro
                      </span>
                    </div>
                  )}
                  
                  {!isLoadingAvailability && selectedProfessional && selectedDate && availableTimes.length === 0 && (
                    <div className="mt-2 p-3 border rounded-md bg-muted/10">
                      <span className="text-sm text-muted-foreground">
                        {availability && availability.message ? (
                          <>
                            <p className="font-semibold">Nenhum horário disponível nesta data</p>
                            <p className="text-xs mt-1 text-gray-500">{availability.message}</p>
                            <p className="text-xs mt-2">Motivo: O profissional não possui disponibilidade configurada para este dia. Acesse a página de Disponibilidade para configurar.</p>
                          </>
                        ) : (
                          "Nenhum horário disponível nesta data"
                        )}
                      </span>
                    </div>
                  )}
                  
                  {!isLoadingAvailability && availableTimes.length > 0 && (
                    <div className="mt-2 border rounded-md p-3 bg-white">
                      <p className="text-sm font-bold mb-2">Escolha um horário:</p>
                      
                      {/* Lista de tempos em formato de select para compatibilidade máxima */}
                      <select
                        className="w-full p-3 rounded border focus:ring-2 focus:ring-primary"
                        value={selectedTime || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log(`Horário selecionado: ${value}`);
                          setSelectedTime(value);
                        }}
                      >
                        <option value="" disabled>Selecione um horário</option>
                        {availableTimes.map((timeValue) => (
                          <option key={timeValue} value={timeValue}>
                            {timeValue}
                          </option>
                        ))}
                      </select>
                      
                      {/* Mostra o horário selecionado em texto também */}
                      {selectedTime && (
                        <div className="mt-3 p-2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                          Horário selecionado: <strong>{selectedTime}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Customer info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do cliente</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </div>
            
            {/* Options */}
            <div className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="notify"
                  checked={notifyWhatsapp}
                  onCheckedChange={setNotifyWhatsapp}
                />
                <Label htmlFor="notify">Notificar cliente via WhatsApp</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="reward"
                  checked={isRewardRedemption}
                  onCheckedChange={setIsRewardRedemption}
                />
                <Label htmlFor="reward">Utilizar como resgate de fidelidade</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNewAppointmentDialog(false);
              resetNewAppointmentForm();
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAppointment}
              disabled={createAppointment.isPending || !selectedTime || !selectedService || !selectedProfessional || !selectedDate || !clientName || !clientPhone}
              className={selectedTime ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {createAppointment.isPending ? "Criando..." : "Criar Agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AppointmentsPage;
