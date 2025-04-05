import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Loader2, 
  MoreHorizontal, 
  UserPlus, 
  Phone, 
  Calendar, 
  DollarSign,
  Scissors
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock client interface for type checking
interface Client {
  client_name: string;
  client_phone: string;
  total_attendances: number;
  free_services_used: number;
  eligible_rewards: number;
  attendances_until_next_reward: number;
  last_reward_at: string | null;
}

const ClientsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Get all appointments to extract clients
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["/api/appointments"],
  });

  // Extract unique clients from appointments
  const clients = !isLoadingAppointments && appointments
    ? Array.from(
        new Map(
          appointments.map((appointment: any) => [
            appointment.client_phone,
            {
              client_name: appointment.client_name,
              client_phone: appointment.client_phone,
            },
          ])
        ).values()
      )
    : [];

  // Filter clients by search term
  const filteredClients = clients.filter((client: any) => {
    if (!searchTerm) return true;
    return (
      client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.client_phone.includes(searchTerm)
    );
  });

  // Handle client click to view details
  const handleClientClick = async (client: any) => {
    try {
      // Fetch client loyalty data
      const response = await fetch(`/api/loyalty/${client.client_phone}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client data");
      }
      const loyaltyData = await response.json();
      
      setSelectedClient({
        ...client,
        ...loyaltyData
      });
      setIsClientInfoOpen(true);
    } catch (error) {
      console.error("Error fetching client data:", error);
      // Still show client info even if loyalty data fails
      setSelectedClient(client);
      setIsClientInfoOpen(true);
    }
  };

  return (
    <AdminLayout title="Clientes">
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="rewards">Com recompensas</TabsTrigger>
          <TabsTrigger value="frequent">Frequentes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>
                {filteredClients.length} clientes encontrados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingAppointments ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-16 text-neutral-dark">
                  <p className="mb-2">Nenhum cliente encontrado</p>
                  <p className="text-sm">Tente ajustar a busca ou adicionar novos clientes</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Telefone</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Último Atendimento</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Fidelidade</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-neutral-dark">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client: any, index: number) => {
                        // Find last appointment for this client
                        const clientAppointments = appointments.filter(
                          (a: any) => a.client_phone === client.client_phone
                        );
                        const lastAppointment = clientAppointments.length > 0
                          ? clientAppointments.sort((a: any, b: any) => 
                              new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
                            )[0]
                          : null;

                        return (
                          <tr 
                            key={index} 
                            className="border-b border-neutral hover:bg-muted/30 cursor-pointer"
                            onClick={() => handleClientClick(client)}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <div className="bg-primary-light/30 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                                  <span className="text-primary text-xs font-bold">
                                    {client.client_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <p className="font-medium">{client.client_name}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">{client.client_phone}</td>
                            <td className="py-3 px-4">
                              {lastAppointment ? (
                                <div>
                                  <p>{new Date(lastAppointment.appointment_date).toLocaleDateString('pt-BR')}</p>
                                  <p className="text-xs text-neutral-dark">{lastAppointment.service_name}</p>
                                </div>
                              ) : (
                                <span className="text-neutral-dark">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="bg-secondary-light/10 text-secondary border-0">
                                {clientAppointments.length} atendimentos
                              </Badge>
                            </td>
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-5 w-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleClientClick(client)}>
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Agendar serviço
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Editar dados
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rewards" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p>Filtragem por recompensas em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="frequent" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p>Filtragem por frequência em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Client info dialog */}
      <Dialog open={isClientInfoOpen} onOpenChange={setIsClientInfoOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações detalhadas e histórico de atendimentos.
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="bg-primary-light/30 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-xl font-bold">
                    {selectedClient.client_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-3 flex-grow">
                  <h3 className="text-xl font-bold">{selectedClient.client_name}</h3>
                  
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{selectedClient.client_phone}</span>
                  </div>
                  
                  {'total_attendances' in selectedClient && (
                    <div className="flex gap-4 flex-wrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{selectedClient.total_attendances} atendimentos</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Scissors className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{selectedClient.free_services_used} brindes usados</span>
                      </div>
                      
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{selectedClient.eligible_rewards} brindes disponíveis</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {'total_attendances' in selectedClient && (
                <div className="space-y-2">
                  <h4 className="font-medium">Programa de Fidelidade</h4>
                  <div className="bg-secondary-light/10 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Progresso para próximo brinde:</span>
                      <span className="font-medium">
                        {selectedClient.total_attendances % 10}/10 atendimentos
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                      <div
                        className="bg-secondary h-2.5 rounded-full"
                        style={{
                          width: `${(selectedClient.total_attendances % 10) * 10}%`
                        }}
                      ></div>
                    </div>
                    
                    {selectedClient.eligible_rewards > 0 && (
                      <div className="bg-green-100 p-2 rounded text-green-700 text-sm mt-2">
                        Este cliente possui {selectedClient.eligible_rewards} brinde(s) disponível(is)
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <h4 className="font-medium">Histórico de Atendimentos</h4>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {isLoadingAppointments ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                    </div>
                  ) : (
                    appointments?.filter((a: any) => a.client_phone === selectedClient.client_phone)
                      .sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
                      .map((appointment: any) => (
                        <div 
                          key={appointment.id}
                          className="p-3 border-b last:border-b-0 flex justify-between"
                        >
                          <div>
                            <p className="font-medium">{appointment.service_name}</p>
                            <p className="text-sm text-muted-foreground">
                              com {appointment.professional_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p>
                              {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-sm">
                              {appointment.is_loyalty_reward ? (
                                <span className="text-green-600">Brinde</span>
                              ) : (
                                <span>R$ {appointment.service_price.toFixed(2)}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                  
                  {!isLoadingAppointments && 
                   appointments?.filter((a: any) => a.client_phone === selectedClient.client_phone).length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      <p>Nenhum atendimento registrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClientInfoOpen(false)}>
              Fechar
            </Button>
            <Button>
              Agendar Serviço
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ClientsPage;
