import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AppointmentOptions {
  date?: Date;
  professionalIds?: number[]; // Múltiplos profissionais
  startDate?: Date;
  endDate?: Date;
}

export function useAppointments(options: AppointmentOptions = {}) {
  const { toast } = useToast();
  const { date, professionalIds, startDate, endDate } = options;
  
  // Construir a queryKey com base nos parâmetros fornecidos
  let queryKey: any[] = ["/api/appointments"];
  
  // Adicionar cada filtro à queryKey
  if (date) queryKey.push("date", format(date, "yyyy-MM-dd"));
  // Incluir todos os IDs de profissionais, se houver
  if (professionalIds && professionalIds.length > 0) {
    queryKey.push("professionals", professionalIds);
  }
  if (startDate && endDate) {
    queryKey.push("range", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd"));
  }
  
  const { data: appointments, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: async ({ queryKey }) => {
      // Construir os parâmetros de consulta URL com base nos filtros
      const params = new URLSearchParams();
      
      if (date) {
        params.append("date", format(date, "yyyy-MM-dd"));
      }
      
      // Tratamento especial para professionalIds (array de IDs de profissionais)
      if (professionalIds && professionalIds.length > 0) {
        // Enviar cada ID como um parâmetro separado
        professionalIds.forEach(id => {
          params.append("professionalId[]", id.toString());
        });
        console.log(`Adicionando filtro para ${professionalIds.length} profissionais: ${professionalIds.join(', ')}`);
      } else {
        // Array vazio ou undefined significa "todos os profissionais"
        params.append("professionalId", "all");
        console.log("Adicionando filtro para TODOS os profissionais");
      }
      
      if (startDate && endDate) {
        params.append("startDate", format(startDate, "yyyy-MM-dd"));
        params.append("endDate", format(endDate, "yyyy-MM-dd"));
      }
      
      const url = `/api/appointments${params.toString() ? `?${params.toString()}` : ''}`;
      
      console.log("Buscando agendamentos com URL:", url);
      
      try {
        // Log completo da requisição para debug
        console.log("Parâmetros completos:", {
          url,
          date: date ? format(date, "yyyy-MM-dd") : null,
          professionalIds: professionalIds || [],
          startDate: startDate ? format(startDate, "yyyy-MM-dd") : null,
          endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
          queryKey
        });
        
        const res = await apiRequest("GET", url);
        
        if (!res.ok) {
          console.error("Erro ao buscar agendamentos:", res.status, await res.text());
          throw new Error("Falha ao buscar agendamentos");
        }
        
        const data = await res.json();
        
        // O filtro já acontece no servidor, não precisamos refiltrá-lo aqui
        // Isso pode estar causando agendamentos perdidos por inconsistências de tipos
        console.log(`Agendamentos recebidos: ${data.length}`);
        
        return data;
      } catch (err) {
        console.error("Erro na requisição de agendamentos:", err);
        throw new Error("Falha ao buscar agendamentos");
      }
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // Mutation to update appointment status
  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PUT", `/api/appointments/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Return the appointments data and mutation
  return {
    appointments,
    isLoading,
    error,
    updateAppointmentStatus,
  };
}
