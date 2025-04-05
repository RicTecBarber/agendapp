import { useState } from "react";
import ClientLayout from "@/components/layout/ClientLayout";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LoyaltyData {
  client_name: string;
  client_phone: string;
  total_attendances: number;
  free_services_used: number;
  eligible_rewards: number;
  attendances_until_next_reward: number;
  last_reward_at: string | null;
}

const LoyaltyPage = () => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast({
        title: "Telefone necessário",
        description: "Por favor, informe seu número de telefone.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/loyalty/lookup", { client_phone: phone });
      const data = await response.json();
      setLoyaltyData(data);
    } catch (error) {
      toast({
        title: "Erro ao buscar fidelidade",
        description: "Não foi possível encontrar seus dados de fidelidade.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ClientLayout title="Programa de Fidelidade">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Programa de Fidelidade BarberSync</CardTitle>
            <CardDescription>
              A cada 10 atendimentos, você ganha um serviço gratuito na sua próxima visita!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-neutral-dark mb-4">
                Nosso programa de fidelidade é uma forma de agradecer pela sua preferência.
                Acumule atendimentos e ganhe recompensas exclusivas.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-secondary/10 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-secondary mb-1">1</div>
                  <p className="text-neutral-dark">Realize atendimentos</p>
                </div>
                <div className="bg-secondary/10 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-secondary mb-1">2</div>
                  <p className="text-neutral-dark">Acumule 10 atendimentos</p>
                </div>
                <div className="bg-secondary/10 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-secondary mb-1">3</div>
                  <p className="text-neutral-dark">Ganhe um serviço grátis</p>
                </div>
              </div>
              
              <div className="border-t border-b border-neutral py-6 my-6">
                <h3 className="text-lg font-bold text-primary mb-4">Verifique sua fidelidade</h3>
                <form onSubmit={handleLookup}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="loyalty-phone">Telefone</Label>
                      <Input
                        id="loyalty-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1"
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                        {isLoading ? "Buscando..." : "Verificar"}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
              
              {loyaltyData && (
                <div className="text-center">
                  <h4 className="text-xl font-bold mb-4">{loyaltyData.client_name}</h4>
                  <div className="bg-secondary-light/10 p-6 rounded-lg mb-6">
                    <p className="text-lg font-semibold mb-4">
                      {loyaltyData.total_attendances} atendimentos realizados
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                      <div
                        className="bg-secondary h-2.5 rounded-full"
                        style={{ width: `${(loyaltyData.total_attendances % 10) * 10}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {loyaltyData.attendances_until_next_reward > 0
                        ? `Faltam ${loyaltyData.attendances_until_next_reward} atendimentos para seu próximo brinde`
                        : "Você já tem direito a um brinde!"}
                    </p>
                  </div>
                  
                  {loyaltyData.eligible_rewards > 0 && (
                    <div className="bg-green-100 p-4 rounded-lg mb-6 text-green-800">
                      <p className="font-bold">Você tem {loyaltyData.eligible_rewards} brinde(s) disponível(is)!</p>
                      <p className="text-sm mt-1">
                        Informe ao barbeiro no seu próximo agendamento para utilizar.
                      </p>
                    </div>
                  )}
                  
                  {loyaltyData.free_services_used > 0 && loyaltyData.last_reward_at && (
                    <div className="text-sm text-gray-600">
                      <p>Você já utilizou {loyaltyData.free_services_used} brinde(s)</p>
                      <p>Último brinde utilizado em: {format(new Date(loyaltyData.last_reward_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="bg-primary/5 p-4 rounded-lg text-sm">
              <h4 className="font-bold mb-2">Regras do Programa:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>A cada 10 atendimentos completos, você ganha 1 serviço grátis.</li>
                <li>O serviço gratuito pode ser qualquer um disponível no nosso menu.</li>
                <li>Para utilizar o brinde, informe seu telefone no momento do agendamento.</li>
                <li>Você pode acumular brindes para uso futuro.</li>
                <li>Brindes não podem ser transferidos para outra pessoa.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default LoyaltyPage;
