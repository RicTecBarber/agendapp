import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAppointments } from "@/hooks/use-appointments";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isTomorrow, isThisWeek, isThisMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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

  // Filter appointments by tab and professional
  const filteredAppointments = appointments?.filter(appointment => {
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
                  {!isLoadingProfessionals && professionals?.map((professional: any) => (
                    <SelectItem key={professional.id} value={professional.id.toString()}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center">
              <Button variant="default">
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
                            {format(parseISO(appointment.appointment_date), "HH:mm")}
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
                    {format(parseISO(statusDialog.appointment.appointment_date), "HH:mm")}
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
    </AdminLayout>
  );
};

export default AppointmentsPage;
