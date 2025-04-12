import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { VirtualList } from '@/components/ui/virtual-list';
import { useMobile, useShouldOptimize } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';
import { useAppointments } from '@/hooks/use-appointments';
import { Appointment, Professional, User } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ArrowLeft, User as UserIcon, Users as UsersIcon, X, AlertTriangle, ShoppingCart } from 'lucide-react';
import { useLocalCache } from '@/hooks/use-cache';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Funções utilitárias para formatação de datas e horas
const formatAppointmentDate = (date: string | Date): string => {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  return format(date, 'yyyy-MM-dd');
};

const formatAppointmentDateShort = (date: string | Date): string => {
  if (typeof date === 'string') {
    return format(new Date(date), 'dd/MM/yyyy');
  }
  return format(date, 'dd/MM/yyyy');
};

const formatAppointmentTime = (date: string | Date): string => {
  if (typeof date === 'string') {
    const timePart = date.split('T')[1];
    return timePart ? timePart.substring(0, 5) : '00:00';
  }
  return format(date, 'HH:mm');
};

const CalendarPage = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Estado para agendamento selecionado e modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // Cache para armazenar a semana selecionada
  const cache = useLocalCache<{ selectedDate: string; selectedProfessionalId?: number }>({
    persistent: true,
    cacheName: 'calendar-state',
  });

  // Estado para controlar os profissionais selecionados (array de IDs)
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<number[]>(() => {
    const cachedState = cache.getItem('selected-week');
    // Se existe um ID no cache, transformar em array
    if (cachedState?.selectedProfessionalId !== undefined) {
      return [cachedState.selectedProfessionalId];
    }
    return []; // Array vazio significa todos os profissionais
  });

  // Estado para o usuário atual
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfessionalId, setUserProfessionalId] = useState<number | null>(null);
  
  // Estado para controlar a data selecionada (semana atual por padrão)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Tentar recuperar do cache
    const cachedDate = cache.getItem('selected-week');
    if (cachedDate && cachedDate.selectedDate) {
      const parsedDate = parseISO(cachedDate.selectedDate);
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return new Date();
  });

  // Verificar otimização
  const isMobile = useMobile();
  const shouldOptimize = useShouldOptimize();

  // Usar o hook de autenticação diretamente em vez de fazer query separada
  const { user: userData, refetchUser } = useAuth();

  // Buscar todos os profissionais
  const { data: professionals = [], isLoading: isLoadingProfessionals } = useQuery({
    queryKey: ['/api/professionals'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/professionals');
        if (!response.ok) {
          throw new Error('Falha ao carregar profissionais');
        }
        return await response.json() as Professional[];
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        return [];
      }
    },
  });

  // Efeito para definir o profissional do usuário se ele for um profissional
  useEffect(() => {
    if (userData && professionals.length > 0) {
      setCurrentUser(userData);

      // Se o usuário é um profissional (barber), procuramos o ID correspondente
      if (userData.role === 'barber') {
        const matchingProfessional = professionals.find(p => p.name === userData.name);
        if (matchingProfessional) {
          setUserProfessionalId(matchingProfessional.id);
          // Apenas atualizamos o profissional selecionado se não houver nenhum selecionado ou se o do usuário não estiver na lista
          if (selectedProfessionalIds.length === 0 || 
              (userProfessionalId && !selectedProfessionalIds.includes(userProfessionalId))) {
            setSelectedProfessionalIds([matchingProfessional.id]);
          }
        }
      }
    }
  }, [userData, professionals, userProfessionalId, selectedProfessionalIds]);

  // Calcular os dias da semana baseado na data selecionada
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Calcular o intervalo de datas para a semana atual
  const startDate = format(weekDays[0], 'yyyy-MM-dd');
  const endDate = format(weekDays[6], 'yyyy-MM-dd');

  // Usar o hook useAppointments para buscar agendamentos com filtros
  const { 
    appointments = [], 
    isLoading,
    error
  } = useAppointments({
    startDate: weekDays[0],
    endDate: weekDays[6],
    professionalIds: selectedProfessionalIds.length > 0 ? selectedProfessionalIds : undefined
  });
  
  // Registrar erros se ocorrerem
  useEffect(() => {
    if (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  }, [error]);

  // Navegação entre semanas
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setSelectedDate(current => {
      const newDate = direction === 'prev' 
        ? addDays(current, -7) 
        : addDays(current, 7);
      
      // Salvar no cache - armazenamos apenas o primeiro ID da lista se houver algum
      // (por compatibilidade com código legado)
      cache.setItem('selected-week', { 
        selectedDate: newDate.toISOString(),
        selectedProfessionalId: selectedProfessionalIds.length > 0 ? selectedProfessionalIds[0] : undefined
      });
      
      return newDate;
    });
  }, [cache, selectedProfessionalIds]);

  // Handler para toggle de profissional selecionado
  const toggleProfessional = useCallback((professionalId: number, isChecked: boolean) => {
    setSelectedProfessionalIds(current => {
      let newSelection: number[];
      
      if (isChecked) {
        // Adicionar o profissional à lista se não estiver
        newSelection = [...current, professionalId];
      } else {
        // Remover o profissional da lista
        newSelection = current.filter(id => id !== professionalId);
      }
      
      // Atualizar o cache - armazenamos apenas o primeiro ID (compatibilidade)
      cache.setItem('selected-week', {
        selectedDate: selectedDate.toISOString(),
        selectedProfessionalId: newSelection.length > 0 ? newSelection[0] : undefined
      });
      
      return newSelection;
    });
  }, [cache, selectedDate]);
  
  // Selecionar todos os profissionais
  const selectAllProfessionals = useCallback(() => {
    const allIds = professionals.map(p => p.id);
    setSelectedProfessionalIds(allIds);
    
    // Atualizar o cache
    cache.setItem('selected-week', {
      selectedDate: selectedDate.toISOString(),
      selectedProfessionalId: allIds.length > 0 ? allIds[0] : undefined
    });
  }, [professionals, cache, selectedDate]);
  
  // Desmarcar todos os profissionais
  const deselectAllProfessionals = useCallback(() => {
    setSelectedProfessionalIds([]);
    
    // Atualizar o cache
    cache.setItem('selected-week', {
      selectedDate: selectedDate.toISOString(),
      selectedProfessionalId: undefined
    });
  }, [cache, selectedDate]);

  // Agrupar agendamentos por dia da semana
  const appointmentsByDay = useMemo(() => {
    if (!appointments) return new Map();
    
    const grouped = new Map<string, Appointment[]>();
    
    // Inicializar todos os dias da semana com arrays vazios
    weekDays.forEach((day: Date) => {
      grouped.set(format(day, 'yyyy-MM-dd'), []);
    });
    
    // Agrupar agendamentos por dia
    appointments.forEach((appointment: Appointment) => {
      try {
        // Extrair a data do appointment_date (formato ISO)
        const appointmentDate = formatAppointmentDate(appointment.appointment_date);
        
        if (grouped.has(appointmentDate)) {
          grouped.get(appointmentDate)!.push(appointment);
        }
      } catch (error) {
        console.error('Erro ao processar agendamento:', error);
      }
    });
    
    return grouped;
  }, [appointments, weekDays]);

  // Define uma lista de cores para profissionais diferentes
  const professionalColors = useMemo(() => [
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', indicator: 'bg-indigo-400' },
    { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', indicator: 'bg-pink-400' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', indicator: 'bg-amber-400' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', indicator: 'bg-emerald-400' },
    { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', indicator: 'bg-sky-400' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', indicator: 'bg-orange-400' },
    { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800', indicator: 'bg-violet-400' },
    { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-800', indicator: 'bg-lime-400' },
  ], []);

  // Mapear profissionais para cores
  const professionalColorMap = useMemo(() => {
    const colorMap = new Map<number, any>();
    
    // Se apenas um profissional está selecionado, usar cores padrão do estado
    if (selectedProfessionalIds.length <= 1) {
      return colorMap;
    }
    
    // Caso contrário, atribuir uma cor para cada profissional
    professionals.forEach((prof, index) => {
      // Usar cores cíclicas se houver mais profissionais que cores
      const colorIndex = index % professionalColors.length;
      colorMap.set(prof.id, professionalColors[colorIndex]);
    });
    
    return colorMap;
  }, [professionals, selectedProfessionalIds, professionalColors]);

  // Obter o profissional pelo ID
  const getProfessionalById = useCallback((professionalId: number) => {
    return professionals.find(p => p.id === professionalId);
  }, [professionals]);

  // Renderizar um dia da semana
  const renderDay = useCallback((day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayAppointments = appointmentsByDay.get(dayKey) || [];
    const isToday = isSameDay(day, new Date());
    
    // Determinar se estamos usando cores específicas de profissionais
    const useMultiProfColors = selectedProfessionalIds.length > 1;
    
    return (
      <Card 
        key={dayKey} 
        className={cn(
          'min-h-[300px] h-full',
          isToday && 'border-primary'
        )}
      >
        <CardHeader className={cn(
          'pb-2',
          isToday ? 'bg-primary/10' : 'bg-muted/50'
        )}>
          <CardTitle className="text-base flex justify-between items-center">
            <span>{format(day, 'EEEE', { locale: pt })}</span>
            <span className="text-sm font-normal">{format(day, 'dd/MM')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {isLoading ? (
            // Esqueleto para carregamento
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i: number) => (
                <Skeleton 
                  key={i} 
                  className="w-full h-16 rounded-md"
                />
              ))}
            </div>
          ) : dayAppointments.length === 0 ? (
            // Mensagem quando não há agendamentos
            <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center text-sm">
              Sem agendamentos para este dia
            </div>
          ) : (
            // Lista de agendamentos
            <div className="space-y-2">
              {/* Renderiza no máximo 20 agendamentos se estiver otimizando */}
              {(shouldOptimize ? dayAppointments.slice(0, 20) : dayAppointments)
                .map((appointment: Appointment) => {
                  // Obter profissional para este agendamento
                  const professional = getProfessionalById(appointment.professional_id);
                  const profName = professional?.name || '';
                  
                  // Obter iniciais do profissional (até 2 caracteres)
                  const initials = profName
                    .split(' ')
                    .map(name => name.charAt(0))
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                    
                  // Determinar as cores a usar (cores fixas de estado ou cores de múltiplos profissionais)
                  const profColors = useMultiProfColors 
                    ? professionalColorMap.get(appointment.professional_id)
                    : null;
                    
                  const baseClasses = cn(
                    'p-2 rounded-md text-sm border cursor-pointer transition-colors hover:bg-muted/50',
                    // Se o agendamento estiver cancelado, sempre usar cores de cancelamento
                    appointment.status === 'cancelled' ? 'bg-red-50 border-red-200' :
                    // Se estamos usando cores específicas de profissionais, use-as
                    useMultiProfColors && profColors
                      ? `${profColors.bg} ${profColors.border}`
                      : // Caso contrário, usar cores padrão baseadas no estado
                        (appointment.status === 'confirmed' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200')
                  );
                  
                  return (
                    <div 
                      key={appointment.id}
                      onClick={() => appointment.status !== 'cancelled' && handleSelectAppointment(appointment)}
                      className={baseClasses}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          <span>{appointment.client_name}</span>
                        </div>
                        
                        {/* Exibir badge com inicial do profissional quando múltiplos estão selecionados */}
                        {useMultiProfColors && profColors && (
                          <div 
                            className={cn(
                              "rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-medium",
                              profColors.indicator
                            )}
                            title={profName}
                          >
                            {initials}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatAppointmentTime(appointment.appointment_date)}
                      </div>
                    </div>
                  );
                })}
              
              {/* Indicador de "mais agendamentos" */}
              {shouldOptimize && dayAppointments.length > 20 && (
                <div className="text-center text-xs text-muted-foreground pt-1">
                  + {dayAppointments.length - 20} agendamentos
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }, [appointmentsByDay, isLoading, shouldOptimize, selectedProfessionalIds, professionalColorMap, getProfessionalById]);

  // Mutation para cancelar agendamento
  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiRequest(
        'PUT', 
        `/api/appointments/${appointmentId}/status`,
        { status: 'cancelled' }
      );
      
      if (!response.ok) {
        throw new Error('Falha ao cancelar o agendamento');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Agendamento cancelado",
        description: "O agendamento foi cancelado com sucesso.",
      });
      
      // Fechar o diálogo e limpar o agendamento selecionado
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
      
      // Verificar autenticação antes de recarregar dados
      refetchUser?.().then(() => {
        // Invalidar a query para recarregar os dados
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      }).catch((error: Error) => {
        console.error('Erro ao recarregar dados do usuário:', error);
        // Se falhar, tenta recarregar mesmo assim
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handler para selecionar um agendamento
  const handleSelectAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };
  
  // Handler para cancelar um agendamento
  const handleCancelAppointment = () => {
    if (selectedAppointment) {
      cancelMutation.mutate(selectedAppointment.id);
    }
  };
  
  // Handler para criar uma comanda a partir do agendamento
  const handleCreateOrder = () => {
    if (selectedAppointment) {
      const queryParams = new URLSearchParams({
        appointmentId: selectedAppointment.id.toString(),
        clientName: selectedAppointment.client_name,
        clientPhone: selectedAppointment.client_phone
      });
      setLocation(`/admin/orders/new?${queryParams.toString()}`);
      setCancelDialogOpen(false);
    }
  };
  
  // Permitir que todos os usuários possam filtrar por profissional
  const showProfessionalSelector = true;

  return (
    <div className="container mx-auto py-6">
      {/* Botão Voltar e Título */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation('/admin/dashboard')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Calendário de Agendamentos</h1>
        </div>

        {/* Seletor múltiplo de profissionais (checkboxes) */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
          {professionals.length > 0 && (
            <div className={cn(
              "w-full sm:w-auto",
              !showProfessionalSelector && "hidden" // Esconder se o usuário não for admin
            )}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-[200px]"
                    size="sm"
                  >
                    <UsersIcon className="h-4 w-4 mr-2" />
                    {selectedProfessionalIds.length === 0 
                      ? "Todos os profissionais" 
                      : `${selectedProfessionalIds.length} selecionado${selectedProfessionalIds.length > 1 ? 's' : ''}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <h4 className="font-medium text-sm">Filtrar profissionais</h4>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={selectAllProfessionals}
                        >
                          Selecionar todos
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={deselectAllProfessionals}
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 pt-1">
                      {professionals.map((prof: Professional) => (
                        <div key={prof.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`professional-${prof.id}`}
                            checked={selectedProfessionalIds.includes(prof.id)}
                            onCheckedChange={(checked) => toggleProfessional(prof.id, !!checked)}
                          />
                          <label 
                            htmlFor={`professional-${prof.id}`}
                            className="text-sm cursor-pointer flex-1 py-1"
                          >
                            {prof.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Controles de navegação de data */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="font-medium"
              onClick={() => setSelectedDate(new Date())}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Hoje
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mostrar qual profissional está visualizando (se for barbeiro) */}
      {currentUser?.role === 'barber' && userProfessionalId && (
        <div className="mb-4 p-2 bg-primary/10 rounded-md flex items-center">
          <UserIcon className="h-4 w-4 mr-2 text-primary" />
          <span className="text-sm font-medium">
            Visualizando sua agenda de atendimentos
          </span>
        </div>
      )}
      
      {isMobile ? (
        // Versão mobile - Lista vertical de dias
        <div className="space-y-4">
          {weekDays.map((day: Date) => (
            <div key={format(day, 'yyyy-MM-dd')} className="h-auto">
              {renderDay(day)}
            </div>
          ))}
        </div>
      ) : (
        // Versão desktop - Grade de dias lado a lado
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day: Date) => (
            <div key={format(day, 'yyyy-MM-dd')} className="h-[500px]">
              {renderDay(day)}
            </div>
          ))}
        </div>
      )}
      
      {/* Agenda otimizada para visualização em lista (alternativa) */}
      {appointments && appointments.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Todos os Agendamentos da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <VirtualList
                items={appointments}
                estimateSize={() => 80}
                renderItem={(appointment: Appointment) => (
                  <div 
                    key={appointment.id}
                    onClick={() => appointment.status !== 'cancelled' && handleSelectAppointment(appointment)}
                    className={cn(
                      "p-4 border-b last:border-0 flex justify-between items-center",
                      appointment.status !== 'cancelled' && "cursor-pointer hover:bg-muted/50",
                      appointment.status === 'cancelled' && "opacity-70"
                    )}
                  >
                    <div>
                      <div className="font-medium">{appointment.client_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.client_phone}
                      </div>
                      <div className={cn(
                        "text-xs mt-1 rounded-full px-2 py-0.5 inline-block",
                        appointment.status === 'confirmed' ? "bg-green-100 text-green-800" :
                        appointment.status === 'cancelled' ? "bg-red-100 text-red-800" :
                        "bg-blue-100 text-blue-800"
                      )}>
                        {appointment.status === 'confirmed' ? 'Confirmado' :
                         appointment.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {formatAppointmentDateShort(appointment.appointment_date)}
                      </div>
                      <div className="text-sm font-medium">
                        {formatAppointmentTime(appointment.appointment_date)}
                      </div>
                    </div>
                  </div>
                )}
                className="h-full"
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Modal de confirmação para cancelar agendamento */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>
              {selectedAppointment && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="font-medium">{selectedAppointment.client_name}</div>
                  <div className="text-sm mt-1">
                    {formatAppointmentDateShort(selectedAppointment.appointment_date)} às {formatAppointmentTime(selectedAppointment.appointment_date)}
                  </div>
                  <div className="text-sm mt-1 text-muted-foreground">
                    Telefone: {selectedAppointment.client_phone}
                  </div>
                  <div className={cn(
                    "text-xs mt-2 rounded-full px-2 py-0.5 inline-block",
                    selectedAppointment.status === 'confirmed' ? "bg-green-100 text-green-800" :
                    selectedAppointment.status === 'cancelled' ? "bg-red-100 text-red-800" :
                    "bg-blue-100 text-blue-800"
                  )}>
                    {selectedAppointment.status === 'confirmed' ? 'Confirmado' :
                     selectedAppointment.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              className="flex items-center justify-start p-4 h-auto hover:bg-orange-50 border-orange-200 hover:border-orange-300 hover:text-orange-700 transition-colors"
              onClick={handleCreateOrder}
            >
              <ShoppingCart className="h-5 w-5 mr-2 text-orange-600" />
              <div className="text-left">
                <div className="font-medium">Criar Comanda</div>
                <div className="text-xs text-muted-foreground">Adicionar produtos ao atendimento</div>
              </div>
            </Button>
          </div>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAppointment}
              disabled={cancelMutation.isPending || (selectedAppointment?.status === 'cancelled')}
              className="w-full sm:w-auto"
            >
              {cancelMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">&#8987;</span>
                  Cancelando...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar Agendamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;