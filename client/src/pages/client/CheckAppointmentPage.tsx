import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface Appointment {
  id: number;
  client_name: string;
  client_phone: string;
  service_id: number;
  professional_id: number;
  appointment_date: string;
  status: string;
  created_at: string;
  notify_whatsapp: boolean;
  is_loyalty_reward: boolean;
  service_name: string;
  service_price: number;
  professional_name: string;
}

const CheckAppointmentPage = () => {
  const { toast } = useToast();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  
  // Mutation for looking up appointments
  const lookupMutation = useMutation({
    mutationFn: async (data: { client_name: string; client_phone: string }) => {
      const res = await apiRequest("POST", "/api/appointments/lookup", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAppointments(data);
      if (data.length === 0) {
        toast({
          title: "Nenhum agendamento encontrado",
          description: "Não encontramos agendamentos com os dados informados.",
          variant: "default",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na busca",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for cancelling appointment
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/appointments/${id}/status`, { status: "cancelled" });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi cancelado com sucesso.",
        variant: "default",
      });
      
      // Update the appointment in the list
      if (appointmentToCancel) {
        setAppointments(appointments.map(apt => 
          apt.id === appointmentToCancel.id 
            ? { ...apt, status: "cancelled" } 
            : apt
        ));
      }
      
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone && !name) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, preencha pelo menos o telefone ou nome para buscar seus agendamentos.",
        variant: "destructive",
      });
      return;
    }
    
    // Enviar os dados preenchidos para a API
    lookupMutation.mutate({ 
      client_name: name,
      client_phone: phone 
    });
  };
  
  const handleCancelClick = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setCancelDialogOpen(true);
  };
  
  const confirmCancel = () => {
    if (appointmentToCancel) {
      cancelMutation.mutate(appointmentToCancel.id);
    }
  };
  
  return (
    <ClientLayout title="Consultar Agendamento">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <form className="mb-6" onSubmit={handleLookup}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="check-name">Nome</Label>
                  <Input
                    id="check-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="check-phone">Celular</Label>
                  <Input
                    id="check-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="text-right">
                <Button 
                  type="submit" 
                  disabled={lookupMutation.isPending}
                  className="bg-primary hover:bg-primary-light"
                >
                  {lookupMutation.isPending ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </form>
            
            {appointments.length > 0 && (
              <div id="appointments-results">
                <h3 className="text-lg font-bold text-primary mb-4">Seus Agendamentos</h3>
                
                {appointments.map((appointment) => {
                  const appointmentDate = new Date(appointment.appointment_date);
                  const isPastAppointment = isPast(appointmentDate) && !isToday(appointmentDate);
                  const canCancel = appointment.status === "scheduled" && !isPastAppointment;
                  
                  let statusClass = "";
                  let statusText = "";
                  
                  switch (appointment.status) {
                    case "scheduled":
                      statusClass = "bg-blue-100 text-blue-700";
                      statusText = "Agendado";
                      break;
                    case "completed":
                      statusClass = "bg-green-100 text-green-700";
                      statusText = "Realizado";
                      break;
                    case "cancelled":
                      statusClass = "bg-red-100 text-red-700";
                      statusText = "Cancelado";
                      break;
                  }
                  
                  return (
                    <div key={appointment.id} className="border border-neutral rounded-lg p-4 mb-4">
                      <div className="flex flex-col md:flex-row justify-between mb-3">
                        <div>
                          <span className={`${statusClass} text-xs font-medium py-1 px-2 rounded-full`}>
                            {statusText}
                          </span>
                          <h4 className="font-bold text-primary mt-2">{appointment.service_name}</h4>
                          <p className="text-neutral-dark text-sm">com {appointment.professional_name}</p>
                        </div>
                        <div className="mt-3 md:mt-0 md:text-right">
                          <p className="font-bold text-primary">
                            {format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-neutral-dark">
                            {/* SOLUÇÃO RADICAL - Extrair o horário diretamente da string */}
                            {appointment.appointment_date.substring(11, 16)}
                          </p>
                          <p className="text-secondary font-bold mt-1">
                            {appointment.is_loyalty_reward 
                              ? "Grátis (Brinde)" 
                              : `R$ ${appointment.service_price.toFixed(2)}`
                            }
                          </p>
                        </div>
                      </div>
                      {canCancel && (
                        <div className="flex justify-end mt-2">
                          <button 
                            onClick={() => handleCancelClick(appointment)}
                            className="text-red-600 hover:text-red-800 transition font-medium"
                          >
                            Cancelar Agendamento
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cancelamento</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {appointmentToCancel && (
            <div className="py-4">
              <div className="flex items-center mb-4 p-3 bg-amber-50 text-amber-800 rounded-md">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                <p className="text-sm">
                  Cancelamentos com menos de 24h de antecedência podem estar sujeitos à política de cancelamento.
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-dark">Serviço:</span>
                  <span className="font-medium">{appointmentToCancel.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-dark">Data:</span>
                  <span className="font-medium">
                    {format(new Date(appointmentToCancel.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-dark">Horário:</span>
                  <span className="font-medium">
                    {/* SOLUÇÃO RADICAL - Extrair o horário diretamente da string */}
                    {appointmentToCancel.appointment_date.substring(11, 16)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
};

export default CheckAppointmentPage;
