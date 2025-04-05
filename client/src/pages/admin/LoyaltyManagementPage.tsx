import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Gift, 
  Check, 
  AlertTriangle, 
  Info, 
  Loader2,
  User,
  Phone,
  Calendar,
  Award
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface LoyaltyData {
  client_name: string;
  client_phone: string;
  total_attendances: number;
  free_services_used: number;
  eligible_rewards: number;
  attendances_until_next_reward: number;
  last_reward_at: string | null;
}

const LoyaltyManagementPage = () => {
  const { toast } = useToast();
  const [searchPhone, setSearchPhone] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [addRewardDialogOpen, setAddRewardDialogOpen] = useState(false);
  
  // Fetch top clients with rewards eligible
  const { data: topClients, isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    select: (data) => {
      // Group appointments by client phone
      const clientAppointments = data.reduce((acc: any, appointment: any) => {
        const { client_phone, client_name } = appointment;
        if (!acc[client_phone]) {
          acc[client_phone] = {
            client_phone,
            client_name,
            count: 0,
          };
        }
        
        // Only count completed appointments
        if (appointment.status === "completed") {
          acc[client_phone].count++;
        }
        
        return acc;
      }, {});
      
      // Convert to array and sort by count
      const sortedClients = Object.values(clientAppointments)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10); // Top 10 clients
      
      return sortedClients;
    },
  });
  
  // Mutation to add a reward manually
  const addRewardMutation = useMutation({
    mutationFn: async (clientPhone: string) => {
      const res = await apiRequest("POST", "/api/loyalty/reward", { client_phone: clientPhone });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Recompensa adicionada",
        description: "A recompensa foi adicionada com sucesso.",
        variant: "default",
      });
      setAddRewardDialogOpen(false);
      
      // Re-fetch loyalty data if we have a client
      if (loyaltyData) {
        handleLookup(loyaltyData.client_phone);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar recompensa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleLookup = async (phone: string) => {
    if (!phone) {
      toast({
        title: "Telefone necessário",
        description: "Por favor, informe o telefone do cliente.",
        variant: "destructive",
      });
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await fetch(`/api/loyalty/${phone}`);
      
      if (!response.ok) {
        throw new Error("Cliente não encontrado");
      }
      
      const data = await response.json();
      setLoyaltyData(data);
    } catch (error) {
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : "Não foi possível carregar os dados do cliente",
        variant: "destructive",
      });
      setLoyaltyData(null);
    } finally {
      setSearchLoading(false);
    }
  };
  
  const handleAddReward = () => {
    if (loyaltyData) {
      setAddRewardDialogOpen(true);
    }
  };
  
  const confirmAddReward = () => {
    if (loyaltyData) {
      addRewardMutation.mutate(loyaltyData.client_phone);
    }
  };
  
  return (
    <AdminLayout title="Programa de Fidelidade">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Consulta de Fidelidade</CardTitle>
              <CardDescription>
                Procure um cliente pelo telefone para verificar seu status no programa de fidelidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por telefone..."
                    className="pl-10"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => handleLookup(searchPhone)}
                  disabled={searchLoading || !searchPhone}
                >
                  {searchLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {loyaltyData && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{loyaltyData.client_name}</CardTitle>
                    <CardDescription>{loyaltyData.client_phone}</CardDescription>
                  </div>
                  {loyaltyData.eligible_rewards > 0 && (
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <Gift className="h-4 w-4 mr-1" />
                      {loyaltyData.eligible_rewards} brindes disponíveis
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="text-muted-foreground text-sm mb-1">Atendimentos Totais</h4>
                    <p className="text-2xl font-bold">{loyaltyData.total_attendances}</p>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="text-muted-foreground text-sm mb-1">Brindes Utilizados</h4>
                    <p className="text-2xl font-bold">{loyaltyData.free_services_used}</p>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="text-muted-foreground text-sm mb-1">Último Brinde</h4>
                    <p className="text-2xl font-bold">
                      {loyaltyData.last_reward_at ? 
                        format(new Date(loyaltyData.last_reward_at), "dd/MM/yyyy", { locale: ptBR })
                        : "Nunca"}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Progresso para próximo brinde</h4>
                    <span>
                      {loyaltyData.total_attendances % 10}/10 atendimentos
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-secondary h-3 rounded-full"
                      style={{
                        width: `${(loyaltyData.total_attendances % 10) * 10}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {loyaltyData.attendances_until_next_reward > 0 
                      ? `Faltam ${loyaltyData.attendances_until_next_reward} atendimentos para o próximo brinde` 
                      : "Cliente elegível para um brinde"}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  onClick={handleAddReward}
                  disabled={addRewardMutation.isPending}
                  className="w-full"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  {addRewardMutation.isPending ? "Processando..." : "Adicionar Recompensa Manualmente"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
        
        <div>
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Estatísticas de Fidelidade</CardTitle>
              <CardDescription>
                Visão geral do programa de fidelidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Total de clientes</span>
                <span className="font-bold">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    topClients?.length || 0
                  )}
                </span>
              </div>
              
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Brindes concedidos</span>
                <span className="font-bold">12</span>
              </div>
              
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Taxa de resgate</span>
                <span className="font-bold">87%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Clientes com mais atendimentos</CardTitle>
              <CardDescription>
                Top clientes no programa de fidelidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : topClients?.length ? (
                <div className="space-y-3">
                  {topClients.map((client: any, index: number) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleLookup(client.client_phone)}
                    >
                      <div className="flex items-center">
                        <div className="bg-primary-light/30 w-10 h-10 rounded-full flex items-center justify-center mr-3">
                          <span className="text-primary text-xs font-bold">
                            {client.client_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{client.client_name}</p>
                          <p className="text-xs text-muted-foreground">{client.client_phone}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="gap-1 flex items-center">
                        <Award className="h-3 w-3" />
                        {client.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum cliente com atendimentos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add reward dialog */}
      <Dialog open={addRewardDialogOpen} onOpenChange={setAddRewardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Recompensa</DialogTitle>
            <DialogDescription>
              Conceda manualmente uma recompensa para este cliente.
            </DialogDescription>
          </DialogHeader>
          
          {loyaltyData && (
            <div className="py-4 space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label>Cliente</Label>
                <div className="flex items-center p-3 bg-muted/50 rounded-lg">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{loyaltyData.client_name}</span>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label>Telefone</Label>
                <div className="flex items-center p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{loyaltyData.client_phone}</span>
                </div>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Isso adicionará pontos de fidelidade suficientes para que o cliente receba um brinde gratuito na próxima visita.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRewardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="default" 
              onClick={confirmAddReward}
              disabled={addRewardMutation.isPending}
            >
              {addRewardMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Conceder Recompensa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default LoyaltyManagementPage;
