import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createUtcDateFromLocalTime } from "@/lib/timezone-utils";
import { getTenantFromUrl } from "@/hooks/use-tenant";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock } from "lucide-react";

// Step types
type Step = "service" | "professional" | "datetime" | "info" | "confirmation";

// Interface para dados de fidelidade
interface LoyaltyData {
  client_name: string;
  client_phone: string;
  total_attendances: number;
  free_services_used: number;
  eligible_rewards: number;
  attendances_until_next_reward: number;
  last_reward_at: string | null;
}

const NewAppointmentPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // State for appointment form
  const [currentStep, setCurrentStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [appointment, setAppointment] = useState<any>(null);
  const [isRewardRedemption, setIsRewardRedemption] = useState(false);
  
  // Obter o tenant atual a partir da URL
  const [location] = useLocation();
  const tenantParam = getTenantFromUrl(location);
  const getUrlWithTenant = (url: string) => {
    return `${url}${url.includes('?') ? '&' : '?'}tenant=${tenantParam}`;
  };
  
  // Query for services
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services", tenantParam],
  });
  
  // Query for professionals based on selected service
  const { data: professionals, isLoading: isLoadingProfessionals } = useQuery({
    queryKey: [`/api/professionals/service/${selectedService?.id}`, tenantParam],
    enabled: !!selectedService?.id,
  });
  
  // Query for loyalty data
  const { data: loyaltyData, isLoading: isLoadingLoyalty } = useQuery<LoyaltyData>({
    queryKey: ["/api/loyalty", clientPhone, tenantParam],
    enabled: !!clientPhone && currentStep === "info",
    queryFn: async () => {
      if (!clientPhone) throw new Error("Telefone não informado");
      try {
        const response = await apiRequest("POST", "/api/loyalty/lookup", { client_phone: clientPhone, tenant_id: Number(tenantParam) });
        return await response.json();
      } catch (error) {
        console.error("Erro ao buscar fidelidade:", error);
        return null;
      }
    }
  });
  
  // Mutation to create appointment
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      // Adicionar tenant_id aos dados do agendamento
      const appointmentWithTenant = {
        ...appointmentData,
        tenant_id: Number(tenantParam)
      };
      
      const res = await apiRequest("POST", "/api/appointments", appointmentWithTenant);
      return await res.json();
    },
    onSuccess: (data) => {
      setAppointment(data);
      setCurrentStep("confirmation");
      // Invalidar consultas para atualizar dados
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty", clientPhone, tenantParam] });
      
      // Invalidar a consulta de disponibilidade para que os horários sejam atualizados
      if (selectedDate && selectedProfessional) {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        queryClient.invalidateQueries({ 
          queryKey: [`/api/availability/${selectedProfessional.id}/${formattedDate}`, tenantParam] 
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Query para buscar horários disponíveis
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery({
    queryKey: selectedDate && selectedProfessional 
      ? [`/api/availability/${selectedProfessional.id}/${format(selectedDate, "yyyy-MM-dd")}`, tenantParam]
      : ['no-availability', tenantParam],
    enabled: !!(selectedDate && selectedProfessional),
    staleTime: 0, // Não armazenar em cache para sempre garantir dados atualizados
    refetchOnWindowFocus: true, // Recarregar quando o usuário volta para a janela
  });
  
  // Processar dados de disponibilidade quando eles mudam
  useEffect(() => {
    // Limpar seleção ao mudar de dia ou profissional
    setSelectedTime(null);
    
    if (!availabilityData) {
      setAvailableTimes([]);
      return;
    }
    
    // Log detalhado de todas as informações recebidas do backend
    console.log("Resposta completa de disponibilidade:", JSON.stringify(availabilityData, null, 2));
    
    // Certificar-se de que estamos recebendo um array válido de horários
    if (availabilityData && availabilityData.available_slots && Array.isArray(availabilityData.available_slots)) {
      console.log("Horários disponíveis recebidos:", availabilityData.available_slots);
      
      // Verificar se temos informações de debug para identificar problemas
      if (availabilityData.debug_info && availabilityData.debug_info.slot_details) {
        console.log("Detalhes dos slots:", availabilityData.debug_info.slot_details);
        
        // Mostre slots indisponíveis
        const unavailableSlots = availabilityData.debug_info.slot_details
          .filter((slot: any) => !slot.available && slot.conflicts)
          .map((slot: any) => ({
            time: slot.time,
            conflicts: slot.conflicts
          }));
          
        if (unavailableSlots.length > 0) {
          console.log("Slots com conflito:", unavailableSlots);
        }
      }
      
      // Só atualizar com os horários que realmente estão disponíveis
      setAvailableTimes(availabilityData.available_slots);
    } else {
      console.error("Formato inválido de dados recebidos:", availabilityData);
      toast({
        title: "Erro ao carregar horários",
        description: "Os dados de horários disponíveis estão em formato inválido.",
        variant: "destructive",
      });
    }
    
    // Se tiver uma mensagem de indisponibilidade, exibir para o usuário
    if (availabilityData && availabilityData.message) {
      toast({
        title: "Horários Indisponíveis",
        description: availabilityData.message,
        variant: "destructive"
      });
    }
  }, [availabilityData, toast]);
  
  // Navigation functions
  const nextStep = () => {
    if (currentStep === "service" && !selectedService) {
      toast({
        title: "Selecione um serviço",
        description: "Por favor, selecione um serviço para continuar.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === "professional" && !selectedProfessional) {
      toast({
        title: "Selecione um profissional",
        description: "Por favor, selecione um profissional para continuar.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === "datetime" && (!selectedDate || !selectedTime)) {
      toast({
        title: "Selecione data e horário",
        description: "Por favor, selecione uma data e horário para continuar.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === "info") {
      if (!clientName || !clientPhone) {
        toast({
          title: "Preencha seus dados",
          description: "Por favor, preencha seu nome e telefone para continuar.",
          variant: "destructive",
        });
        return;
      }
      
      // Create appointment
      submitAppointment();
      return;
    }
    
    // Navigate to next step
    if (currentStep === "service") setCurrentStep("professional");
    else if (currentStep === "professional") setCurrentStep("datetime");
    else if (currentStep === "datetime") setCurrentStep("info");
  };
  
  const prevStep = () => {
    if (currentStep === "professional") setCurrentStep("service");
    else if (currentStep === "datetime") setCurrentStep("professional");
    else if (currentStep === "info") setCurrentStep("datetime");
  };
  
  // Submit the appointment
  const submitAppointment = () => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      toast({
        title: "Dados incompletos",
        description: "Certifique-se de preencher todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    // SOLUÇÃO FINAL: Enviar uma string no formato fake-ISO com o horário exato
    const [hours, minutes] = selectedTime.split(":").map(Number);
    
    // Formatamos a data manualmente para mantê-la no horário local sem conversão
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const hoursString = String(hours).padStart(2, '0');
    const minutesString = String(minutes).padStart(2, '0');
    
    // Criamos uma data local para debugar no console
    const appointmentDateTime = new Date(selectedDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    // Formatamos a data como uma string ISO, mas mantendo o horário original
    // Isso é importante: adicionamos 'LOCAL' para informar o servidor que essa não é uma data UTC
    const fakeISOString = `${year}-${month}-${day}T${hoursString}:${minutesString}:00.000LOCAL`;
    
    console.log(`SOLUÇÃO FINAL: Data local selecionada: ${selectedDate.toLocaleString()}`);
    console.log(`SOLUÇÃO FINAL: Horário selecionado exato: ${hours}:${minutes}`);
    console.log(`SOLUÇÃO FINAL: String para envio: ${fakeISOString}`);
    
    // Log para confirmar o problema (horário convertido para UTC)
    console.log(`Problema anterior (conversão para UTC): ${appointmentDateTime.toISOString()}`);
    
    const appointmentData = {
      client_name: clientName,
      client_phone: clientPhone,
      service_id: selectedService.id,
      professional_id: selectedProfessional.id,
      // Enviar a string formatada com o horário exato
      appointment_date: fakeISOString,
      notify_whatsapp: notifyWhatsapp,
      is_loyalty_reward: isRewardRedemption
    };
    
    createAppointmentMutation.mutate(appointmentData);
  };
  
  const returnToHome = () => {
    navigate(getUrlWithTenant("/"));
  };
  
  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case "service":
        return (
          <>
            <h3 className="text-xl font-bold text-primary mb-4">Selecione o Serviço</h3>
            {isLoadingServices ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {Array.isArray(services) && services.map((service: any) => (
                  <div 
                    key={service.id}
                    className={`bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition ${selectedService?.id === service.id ? 'ring-2 ring-secondary' : ''}`}
                    onClick={() => setSelectedService(service)}
                  >
                    {service.image_url && (
                      <div className="mb-3 w-full h-36 rounded-md overflow-hidden">
                        <img 
                          src={service.image_url} 
                          alt={service.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                    <div className="flex justify-between">
                      <h3 className="text-lg font-bold text-primary">{service.name}</h3>
                      <span className="font-bold text-secondary">R$ {service.price.toFixed(2)}</span>
                    </div>
                    <p className="text-neutral-dark mt-2 mb-3">{service.description}</p>
                    <div className="bg-neutral p-2 rounded text-sm text-neutral-dark">Duração: {service.duration} min</div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
        
      case "professional":
        return (
          <>
            <h3 className="text-xl font-bold text-primary mb-4">Escolha o Profissional</h3>
            {isLoadingProfessionals ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {Array.isArray(professionals) && professionals.map((professional: any) => (
                  <div 
                    key={professional.id}
                    className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition ${selectedProfessional?.id === professional.id ? 'ring-2 ring-secondary' : ''}`}
                    onClick={() => setSelectedProfessional(professional)}
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="mb-4 sm:mb-0">
                        <img 
                          src={professional.avatar_url || 'https://via.placeholder.com/150'} 
                          alt={professional.name} 
                          className="w-28 h-28 rounded-full object-cover border-2 border-secondary-light shadow-md mx-auto sm:mx-0" 
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/150?text=Profissional';
                            e.currentTarget.onerror = null;
                          }}
                        />
                      </div>
                      <div className="ml-0 sm:ml-5 text-center sm:text-left">
                        <h3 className="text-xl font-bold text-primary">{professional.name}</h3>
                        <p className="text-neutral-dark mb-3">{professional.description}</p>
                        <div className="flex flex-wrap justify-center sm:justify-start">
                          {Array.isArray(services) && services.filter((service: any) => 
                            (professional.services_offered as number[]).includes(service.id)
                          ).map((service: any) => (
                            <div key={service.id} className="bg-primary-light/10 px-2 py-1 rounded text-xs mr-1 mb-1">
                              {service.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
        
      case "datetime":
        return (
          <>
            <h3 className="text-xl font-bold text-primary mb-4">Escolha a Data e Horário</h3>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="font-medium mb-2">Selecione uma data:</p>
                  <div className="border rounded-md p-1">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={ptBR}
                      disabled={(date) => 
                        date < new Date(new Date().setHours(0, 0, 0, 0)) || // Disable past dates
                        date.getDay() === 0 // Disable Sundays
                      }
                      className="rounded-md border"
                    />
                  </div>
                </div>
                
                <div>
                  {selectedDate ? (
                    <>
                      <p className="font-medium mb-2">
                        Horários disponíveis - {format(selectedDate, "dd/MM/yyyy")}:
                      </p>
                      {availableTimes.length === 0 ? (
                        <div className="text-neutral-dark text-center py-4 bg-neutral-50 border border-neutral-200 rounded-md p-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p>Não há horários disponíveis para esta data.</p>
                          <p className="text-xs mt-1">Verifique outras datas ou entre em contato conosco.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-3 gap-3">
                            {availableTimes.map((time) => (
                              <button
                                key={time}
                                type="button"
                                className={`py-2 border ${
                                  selectedTime === time
                                    ? 'border-primary bg-primary/5 font-bold'
                                    : 'border-neutral hover:border-secondary hover:text-secondary'
                                } text-center rounded transition`}
                                onClick={() => {
                                  console.log("Horário selecionado (botão):", time);
                                  setSelectedTime(time);
                                }}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-neutral-dark">Selecione uma data para ver os horários disponíveis.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
        
      case "info":
        return (
          <>
            <h3 className="text-xl font-bold text-primary mb-4">Informe seus Dados</h3>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <form onSubmit={(e) => {
                e.preventDefault();
                submitAppointment();
              }}>
                <div className="mb-4">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <Label htmlFor="phone">Celular</Label>
                  <Input
                    id="phone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="mt-1"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
                
                {!isLoadingLoyalty && loyaltyData && loyaltyData.eligible_rewards > 0 && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Checkbox 
                        id="useReward" 
                        checked={isRewardRedemption}
                        onCheckedChange={(checked) => setIsRewardRedemption(checked as boolean)}
                      />
                      <label
                        htmlFor="useReward"
                        className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Usar um brinde do programa de fidelidade
                      </label>
                    </div>
                    <p className="text-sm text-green-700 pl-6">
                      Você tem {loyaltyData.eligible_rewards} brinde(s) disponível(is).
                    </p>
                  </div>
                )}
                
                <div className="mb-6">
                  <div className="flex items-center">
                    <Checkbox 
                      id="notifyWhatsapp" 
                      checked={notifyWhatsapp}
                      onCheckedChange={(checked) => setNotifyWhatsapp(checked as boolean)}
                    />
                    <label
                      htmlFor="notifyWhatsapp"
                      className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Desejo receber confirmação por WhatsApp
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <p className="text-neutral-dark text-sm">* Os dados fornecidos serão usados apenas para confirmar o seu agendamento.</p>
                </div>
              </form>
            </div>
          </>
        );
        
      case "confirmation":
        if (!appointment || !selectedService || !selectedProfessional) {
          return <div>Carregando...</div>;
        }
        
        return (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold text-primary mb-4">Agendamento Confirmado!</h2>
            <p className="text-neutral-dark mb-8">
              Seu agendamento foi realizado com sucesso.
              {notifyWhatsapp && " Enviamos um lembrete para o seu WhatsApp."}
            </p>
            
            <div className="bg-neutral-light p-6 rounded-lg max-w-md mx-auto mb-6">
              <div className="flex justify-between mb-3">
                <p className="text-neutral-dark">Serviço:</p>
                <p className="font-bold text-primary">{selectedService.name}</p>
              </div>
              <div className="flex justify-between mb-3">
                <p className="text-neutral-dark">Profissional:</p>
                <p className="font-bold text-primary">{selectedProfessional.name}</p>
              </div>
              <div className="flex justify-between mb-3">
                <p className="text-neutral-dark">Data:</p>
                <p className="font-bold text-primary">
                  {format(new Date(appointment.appointment_date), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="flex justify-between mb-3">
                <p className="text-neutral-dark">Horário:</p>
                <p className="font-bold text-primary">
                  {/* Extrair horário da data ISO ou usar o selectedTime */}
                  {selectedTime || appointment.appointment_date.toString().split('T')[1].substring(0, 5)}
                  <span className="text-xs text-gray-500 ml-1">(horário local)</span>
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-neutral-dark">Valor:</p>
                <p className="font-bold text-secondary">
                  {isRewardRedemption ? (
                    <span className="line-through mr-2">R$ {selectedService.price.toFixed(2)}</span>
                  ) : null}
                  {isRewardRedemption ? "Grátis (Brinde)" : `R$ ${selectedService.price.toFixed(2)}`}
                </p>
              </div>
            </div>
            
            <div className="flex justify-center mb-6 flex-wrap gap-2">
              <Button className="bg-primary hover:bg-primary/90">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Adicionar ao Calendário
              </Button>
              <Button className="bg-[#25D366] hover:bg-[#25D366]/90">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                Compartilhar
              </Button>
            </div>
            
            <Button variant="ghost" onClick={returnToHome}>
              Voltar à página inicial
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <ClientLayout title={
      currentStep === "confirmation" ? "Agendamento Confirmado" : "Novo Agendamento"
    }>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Steps Progress */}
        {currentStep !== "confirmation" && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "service" ? 'bg-secondary text-white' : 'bg-secondary/20 text-secondary'}`}>
                  1
                </div>
                <span className="text-xs mt-1">Serviço</span>
              </div>
              <div className="flex-1 h-1 mx-2 bg-secondary/20">
                <div className={`h-full bg-secondary ${currentStep === "service" ? 'w-0' : currentStep === "professional" ? 'w-1/3' : currentStep === "datetime" ? 'w-2/3' : 'w-full'}`}></div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "professional" ? 'bg-secondary text-white' : currentStep === "service" ? 'bg-secondary/20 text-secondary' : 'bg-secondary text-white'}`}>
                  2
                </div>
                <span className="text-xs mt-1">Profissional</span>
              </div>
              <div className="flex-1 h-1 mx-2 bg-secondary/20">
                <div className={`h-full bg-secondary ${currentStep === "service" || currentStep === "professional" ? 'w-0' : currentStep === "datetime" ? 'w-1/2' : 'w-full'}`}></div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "datetime" ? 'bg-secondary text-white' : currentStep === "service" || currentStep === "professional" ? 'bg-secondary/20 text-secondary' : 'bg-secondary text-white'}`}>
                  3
                </div>
                <span className="text-xs mt-1">Data/Hora</span>
              </div>
              <div className="flex-1 h-1 mx-2 bg-secondary/20">
                <div className={`h-full bg-secondary ${currentStep === "service" || currentStep === "professional" || currentStep === "datetime" ? 'w-0' : 'w-full'}`}></div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === "info" ? 'bg-secondary text-white' : 'bg-secondary/20 text-secondary'}`}>
                  4
                </div>
                <span className="text-xs mt-1">Seus Dados</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {renderStepContent()}
          </CardContent>
        </Card>
        
        {/* Navigation Buttons */}
        {currentStep !== "confirmation" && (
          <div className="flex justify-between mt-6">
            {currentStep !== "service" ? (
              <Button variant="outline" onClick={prevStep}>
                Voltar
              </Button>
            ) : (
              <div></div>
            )}
            <Button onClick={nextStep} disabled={createAppointmentMutation.isPending}>
              {currentStep === "info" ? (
                createAppointmentMutation.isPending ? "Confirmando..." : "Confirmar Agendamento"
              ) : (
                "Continuar"
              )}
            </Button>
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default NewAppointmentPage;
