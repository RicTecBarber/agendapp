import { Link } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

const ClientHomePage = () => {
  const [showLoyaltyDialog, setShowLoyaltyDialog] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkLoyalty = async () => {
    if (!loyaltyPhone) {
      toast({
        title: "Telefone necessário",
        description: "Por favor, informe seu número de telefone.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/loyalty/lookup", { client_phone: loyaltyPhone });
      const data = await response.json();
      setLoyaltyData(data);
    } catch (error) {
      toast({
        title: "Erro ao buscar fidelidade",
        description: "Não foi possível encontrar seus dados de fidelidade.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientLayout title="">
      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">Bem-vindo à BarberSync</h2>
          <p className="text-neutral-dark text-lg max-w-2xl mx-auto">O jeito mais fácil de agendar seu corte ou barba na nossa barbearia.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/new-appointment" className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center text-center hover:shadow-xl transition duration-300 cursor-pointer">
            <div className="bg-secondary-light/20 p-4 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Novo Agendamento</h3>
            <p className="text-neutral-dark">Agende um novo serviço com nossos profissionais.</p>
          </Link>
          
          <Link href="/check-appointment" className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center text-center hover:shadow-xl transition duration-300 cursor-pointer">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Consultar Agendamento</h3>
            <p className="text-neutral-dark">Verifique ou cancele seu agendamento existente.</p>
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Horário de Funcionamento
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="font-bold mb-1">Segunda-Feira</p>
              <p className="text-neutral-dark">9:00 - 20:00</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Terça-Feira</p>
              <p className="text-neutral-dark">9:00 - 20:00</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Quarta-Feira</p>
              <p className="text-neutral-dark">9:00 - 20:00</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Quinta-Feira</p>
              <p className="text-neutral-dark">9:00 - 20:00</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Sexta-Feira</p>
              <p className="text-neutral-dark">9:00 - 21:00</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Sábado</p>
              <p className="text-neutral-dark">8:00 - 18:00</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Domingo</p>
              <p className="text-neutral-dark">Fechado</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Feriados</p>
              <p className="text-neutral-dark">Consultar</p>
            </div>
          </div>
        </div>
        
        <div className="bg-secondary-light/10 rounded-xl p-6 border border-secondary-light/30">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-primary ml-2">Programa de Fidelidade</h3>
          </div>
          <p className="text-neutral-dark mb-4">Acumule 10 atendimentos e ganhe um serviço gratuito! Consulte seu progresso informando seu telefone.</p>
          <Button variant="secondary" onClick={() => setShowLoyaltyDialog(true)}>
            Verificar minha fidelidade
          </Button>
        </div>
      </section>

      <Dialog open={showLoyaltyDialog} onOpenChange={setShowLoyaltyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar Fidelidade</DialogTitle>
            <DialogDescription>
              Informe seu número de telefone para verificar seu progresso no programa de fidelidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!loyaltyData ? (
              <>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">Telefone</label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={loyaltyPhone}
                    onChange={(e) => setLoyaltyPhone(e.target.value)}
                  />
                </div>
                <Button onClick={checkLoyalty} disabled={loading} className="w-full">
                  {loading ? "Buscando..." : "Verificar"}
                </Button>
              </>
            ) : (
              <div className="text-center">
                <h4 className="text-xl font-bold mb-4">{loyaltyData.client_name}</h4>
                <div className="bg-secondary-light/10 p-4 rounded-lg mb-4">
                  <p className="text-lg font-semibold mb-2">
                    {loyaltyData.total_attendances} atendimentos realizados
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
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
                  <div className="bg-green-100 p-4 rounded-lg mb-4 text-green-800">
                    <p className="font-bold">Você tem {loyaltyData.eligible_rewards} brinde(s) disponível(is)!</p>
                    <p className="text-sm mt-1">
                      Informe ao barbeiro no seu próximo agendamento para utilizar.
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-4">Você já utilizou {loyaltyData.free_services_used} brinde(s)</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
};

export default ClientHomePage;
