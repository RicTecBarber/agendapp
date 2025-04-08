import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { VirtualList } from '@/components/ui/virtual-list';
import { useMobile, useShouldOptimize } from '@/hooks/use-mobile';
import { Appointment, Professional, User } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ArrowLeft, User as UserIcon, X, AlertTriangle } from 'lucide-react';
import { useLocalCache } from '@/hooks/use-cache';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

  // Estado para controlar o profissional selecionado
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | undefined>(() => {
    const cachedState = cache.getItem('selected-week');
    return cachedState?.selectedProfessionalId;
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

  // Buscar dados do usuário
  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/user');
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error('Falha ao carregar usuário');
        }
        return await response.json() as User;
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return null;
      }
    },
  });

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
          // Apenas atualizamos o profissional selecionado se ele não estiver definido ou se o selecionado não for o do usuário
          if (!selectedProfessionalId || (userProfessionalId && selectedProfessionalId !== userProfessionalId)) {
            setSelectedProfessionalId(matchingProfessional.id);
          }
        }
      }
    }
  }, [userData, professionals, userProfessionalId, selectedProfessionalId]);

  // Calcular os dias da semana baseado na data selecionada
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Carregar agendamentos da semana
  const startDate = format(weekDays[0], 'yyyy-MM-dd');
  const endDate = format(weekDays[6], 'yyyy-MM-dd');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['/api/appointments', startDate, endDate, selectedProfessionalId],
    queryFn: async () => {
      let url = `/api/appointments?startDate=${startDate}&endDate=${endDate}`;
      
      // Adicionar filtro de profissional se estiver selecionado
      if (selectedProfessionalId) {
        url += `&professionalId=${selectedProfessionalId}`;
      }
      
      try {
        console.log('Buscando agendamentos:', url);
        const response = await apiRequest('GET', url);
        
        if (!response.ok) {
          if (response.status === 403 || response.status === 401) {
            console.log('Usuário não autenticado ou não autorizado');
            return [];
          }
          console.error('Erro ao buscar agendamentos:', response.statusText);
          throw new Error('Falha ao carregar agendamentos');
        }
        
        const data = await response.json();
        console.log('Agendamentos recebidos:', data);
        return data as Appointment[];
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
  });

  // Navegação entre semanas
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setSelectedDate(current => {
      const newDate = direction === 'prev' 
        ? addDays(current, -7) 
        : addDays(current, 7);
      
      // Salvar no cache
      cache.setItem('selected-week', { 
        selectedDate: newDate.toISOString(),
        selectedProfessionalId
      });
      
      return newDate;
    });
  }, [cache, selectedProfessionalId]);

  // Handler para mudança de profissional
  const handleProfessionalChange = useCallback((professionalId: string) => {
    // Se for "all", define como undefined para mostrar todos
    const id = professionalId === "all" ? undefined : parseInt(professionalId);
    setSelectedProfessionalId(id);
    
    // Atualizar o cache
    cache.setItem('selected-week', {
      selectedDate: selectedDate.toISOString(),
      selectedProfessionalId: id
    });
  }, [cache, selectedDate]);

  // Agrupar agendamentos por dia da semana
  const appointmentsByDay = useMemo(() => {
    if (!appointments) return new Map();
    
    const grouped = new Map<string, Appointment[]>();
    
    // Inicializar todos os dias da semana com arrays vazios
    weekDays.forEach(day => {
      grouped.set(format(day, 'yyyy-MM-dd'), []);
    });
    
    // Agrupar agendamentos por dia
    appointments.forEach(appointment => {
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

  // Renderizar um dia da semana
  const renderDay = useCallback((day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayAppointments = appointmentsByDay.get(dayKey) || [];
    const isToday = isSameDay(day, new Date());
    
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
              {Array.from({ length: 3 }).map((_, i) => (
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
                .map((appointment: Appointment) => (
                <div 
                  key={appointment.id}
                  onClick={() => appointment.status !== 'cancelled' && handleSelectAppointment(appointment)}
                  className={cn(
                    'p-2 rounded-md text-sm border cursor-pointer transition-colors hover:bg-muted/50',
                    appointment.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                    appointment.status === 'cancelled' ? 'bg-red-50 border-red-200' :
                    'bg-blue-50 border-blue-200'
                  )}
                >
                  <div className="font-medium">
                    <span>{appointment.client_name}</span>
                  </div>
                  <div className="flex items-center mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatAppointmentTime(appointment.appointment_date)}
                  </div>
                </div>
              ))}
              
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
  }, [appointmentsByDay, isLoading, shouldOptimize]);

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
      
      // Invalidar a query para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
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
  
  // Verificar se o usuário é admin ou profissional para mostrar ou não o seletor de profissional
  const showProfessionalSelector = currentUser?.role === 'admin';

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

        {/* Seletor de profissional */}
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
          {professionals.length > 0 && (
            <div className={cn(
              "w-full sm:w-auto",
              !showProfessionalSelector && "hidden" // Esconder se o usuário não for admin
            )}>
              <Select 
                value={selectedProfessionalId?.toString() || "all"} 
                onValueChange={handleProfessionalChange}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {professionals.map(prof => (
                    <SelectItem key={prof.id} value={prof.id.toString()}>
                      {prof.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          {weekDays.map(day => (
            <div key={format(day, 'yyyy-MM-dd')} className="h-auto">
              {renderDay(day)}
            </div>
          ))}
        </div>
      ) : (
        // Versão desktop - Grade de dias lado a lado
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map(day => (
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
            <DialogTitle>Cancelar Agendamento</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja cancelar este agendamento?
              {selectedAppointment && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="font-medium">{selectedAppointment.client_name}</div>
                  <div className="text-sm mt-1">
                    {formatAppointmentDateShort(selectedAppointment.appointment_date)} às {formatAppointmentTime(selectedAppointment.appointment_date)}
                  </div>
                  <div className="text-sm mt-1 text-muted-foreground">
                    Telefone: {selectedAppointment.client_phone}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAppointment}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">&#8987;</span>
                  Cancelando...
                </>
              ) : (
                'Cancelar Agendamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;