import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAppointments } from "@/hooks/use-appointments";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createUtcDateFromLocalTime } from "@/lib/timezone-utils";
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
import { Loader2, MoreHorizontal, Calendar as CalendarIcon, CheckCircle, XCircle, Clock } from "lucide-react";
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
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
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
  } = useAppointments(dateFilter);

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
      const res = await fetch(`/api/professionals/service/${selectedService}`);
      if (!res.ok) throw new Error("Erro ao buscar profissionais");
      return res.json();
    }
  });
  
  // Get availability for selected professional and date
  const { data: availability, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ["/api/availability", selectedProfessional, format(selectedDate, "yyyy-MM-dd")],
    enabled: !!selectedProfessional && !!selectedDate, // Only run query when both are selected
    queryFn: async () => {
      if (!selectedProfessional || !selectedDate) return [];
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch(`/api/availability/${selectedProfessional}/${formattedDate}`);
      console.log("Buscando disponibilidade para:", selectedProfessional, formattedDate);
      if (!res.ok) throw new Error("Erro ao buscar disponibilidade");
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

  // Filter appointments by tab and professional
  const filteredAppointments = appointments?.filter((appointment: any) => {
    // Filter by tab (date range)
    if (selectedTab === "today" && !isToday(parseISO(appointment.appointment_date))) {
      return false;
    }
    if (selectedTab === "tomorrow" && !isTomorrow(parseISO(appointment.appointment_date))) {
      return false;
    }
    if (selectedTab === "week" && !isThisWeek(parseISO(appointment.appointment_date), { weekStartsOn: 1 })) {
      return false;
    }
    if (selectedTab === "month" && !isThisMonth(parseISO(appointment.appointment_date))) {
      return false;
    }
    
    // Filter by professional
    if (professionalFilter !== "all" && appointment.professional_id !== parseInt(professionalFilter)) {
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
  }, [availability, selectedTime]);
  
  // Handle appointment submission
  const handleCreateAppointment = () => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios para continuar.",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare date with time using timezone utility
    const [hours, minutes] = selectedTime.split(':').map(Number);
    // Usar a função que lida corretamente com timezone
    const appointmentDate = createUtcDateFromLocalTime(selectedDate, `${hours}:${minutes}`);
    console.log(`Data local selecionada: ${selectedDate.toLocaleString()}`);
    console.log(`Horário selecionado: ${selectedTime}`);
    console.log(`Data UTC criada para envio: ${appointmentDate.toISOString()}`);
    
    // Create appointment data
    const appointmentData = {
      service_id: selectedService,
      professional_id: selectedProfessional,
      appointment_date: appointmentDate.toISOString(),
      client_name: clientName,
      client_phone: clientPhone,
      notify_whatsapp: notifyWhatsapp,
      is_loyalty_reward: isRewardRedemption,
      status: "scheduled"
    };
    
    createAppointment.mutate(appointmentData);
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

              <Select
                value={professionalFilter}
                onValueChange={setProfessionalFilter}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {!isLoadingProfessionals && Array.isArray(professionals) && professionals.map((professional: any) => (
                    <SelectItem key={professional.id} value={professional.id.toString()}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                              : `R$ ${appointment.service_price.toFixed(2)}`
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
        <DialogContent className="sm:max-w-[600px]">
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
                      {service.name} - R$ {service.price.toFixed(2)}
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
              
              <div className="grid gap-2">
                <Label htmlFor="time">Horário</Label>
                {!selectedProfessional || !selectedDate ? (
                  <div className="border rounded p-3 text-center text-muted-foreground bg-muted/20">
                    Selecione um profissional e uma data para ver horários disponíveis
                  </div>
                ) : isLoadingAvailability ? (
                  <div className="border rounded p-3 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    <span className="text-sm text-muted-foreground">Carregando horários...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id="time-select"
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={selectedTime || ''}
                      onChange={(e) => {
                        console.log("Horário selecionado:", e.target.value);
                        setSelectedTime(e.target.value);
                      }}
                      disabled={!selectedProfessional || !selectedDate || isLoadingAvailability || availableTimes.length === 0}
                    >
                      <option value="" disabled>Selecione um horário</option>
                      {availableTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    {availableTimes.length === 0 && !isLoadingAvailability && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-sm text-muted-foreground">Nenhum horário disponível</span>
                      </div>
                    )}
                  </div>
                )}
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
              disabled={createAppointment.isPending}
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
