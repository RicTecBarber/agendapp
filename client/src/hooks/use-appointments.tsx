import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function useAppointments(date?: Date) {
  const { toast } = useToast();
  
  // Query for appointments, filtered by date if provided
  const queryKey = date ? ["/api/appointments", "date", format(date, "yyyy-MM-dd")] : ["/api/appointments"];
  const { data: appointments, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: async ({ queryKey }) => {
      const url = date 
        ? `/api/appointments?date=${format(date, "yyyy-MM-dd")}` 
        : "/api/appointments";
      try {
        const res = await apiRequest("GET", url);
        
        if (!res.ok) {
          console.error("Erro ao buscar agendamentos:", res.status, await res.text());
          throw new Error("Falha ao buscar agendamentos");
        }
        
        const data = await res.json();
        console.log("Agendamentos recebidos:", data);
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
