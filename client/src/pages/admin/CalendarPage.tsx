import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, parseISO, isValid } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VirtualList } from '@/components/ui/virtual-list';
import { useMobile, useShouldOptimize } from '@/hooks/use-mobile';
import { Appointment } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useLocalCache } from '@/hooks/use-cache';
import { cn } from '@/lib/utils';

const CalendarPage = () => {
  // Cache para armazenar a semana selecionada
  const cache = useLocalCache<{ selectedDate: string }>({
    persistent: true,
    cacheName: 'calendar-state',
  });

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

  // Calcular os dias da semana baseado na data selecionada
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Carregar agendamentos da semana
  const startDate = format(weekDays[0], 'yyyy-MM-dd');
  const endDate = format(weekDays[6], 'yyyy-MM-dd');

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments', startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar agendamentos');
      }
      return response.json() as Promise<Appointment[]>;
    },
  });

  // Navegação entre semanas
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setSelectedDate(current => {
      const newDate = direction === 'prev' 
        ? addDays(current, -7) 
        : addDays(current, 7);
      
      // Salvar no cache
      cache.setItem('selected-week', { selectedDate: newDate.toISOString() });
      
      return newDate;
    });
  }, [cache]);

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
        const appointmentDate = typeof appointment.appointment_date === 'string'
          ? appointment.appointment_date.split('T')[0]
          : format(appointment.appointment_date, 'yyyy-MM-dd');
        
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
                .map(appointment => (
                <div 
                  key={appointment.id} 
                  className={cn(
                    'p-2 rounded-md text-sm border',
                    appointment.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                    appointment.status === 'cancelled' ? 'bg-red-50 border-red-200' :
                    'bg-blue-50 border-blue-200'
                  )}
                >
                  <div className="font-medium">{appointment.client_name}</div>
                  <div className="flex items-center mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {(typeof appointment.appointment_date === 'string' 
                        ? appointment.appointment_date.split('T')[1]?.substring(0, 5) || '00:00'
                        : format(appointment.appointment_date, 'HH:mm')
                     )}
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Calendário de Agendamentos</h1>
        
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
                renderItem={(appointment) => (
                  <div 
                    key={appointment.id}
                    className="p-4 border-b last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{appointment.client_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.client_phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {typeof appointment.appointment_date === 'string' 
                          ? format(new Date(appointment.appointment_date), 'dd/MM/yyyy')
                          : format(appointment.appointment_date, 'dd/MM/yyyy')}
                      </div>
                      <div className="text-sm font-medium">
                        {typeof appointment.appointment_date === 'string'
                          ? appointment.appointment_date.split('T')[1]?.substring(0, 5) || '00:00'
                          : format(appointment.appointment_date, 'HH:mm')}
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
    </div>
  );
};

export default CalendarPage;