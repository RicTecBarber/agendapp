import { Link } from "wouter";
import ClientLayout from "@/components/layout/ClientLayout";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";

interface BarbershopSettings {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  open_time: string;
  close_time: string;
  open_days: number[];
  description: string | null;
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
}

const ClientHomePage = () => {
  const { getUrlWithTenant } = useTenant();
  
  // Buscar as configurações da empresa
  const { data: barbershopSettings } = useQuery<BarbershopSettings>({
    queryKey: ['/api/business-settings'],
    refetchOnWindowFocus: false,
  });

  return (
    <ClientLayout title="">
      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">
            Bem-vindo{barbershopSettings?.name ? ` à ${barbershopSettings.name}` : ''}
          </h2>
          <p className="text-neutral-dark text-lg max-w-2xl mx-auto">
            {barbershopSettings?.description || 'O jeito mais fácil de agendar serviços.'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href={getUrlWithTenant("/new-appointment")} className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center text-center hover:shadow-xl transition duration-300 cursor-pointer">
            <div className="bg-secondary-light/20 p-4 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Novo Agendamento</h3>
            <p className="text-neutral-dark">Agende um novo serviço com nossos profissionais.</p>
          </Link>
          
          <Link href={getUrlWithTenant("/check-appointment")} className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center text-center hover:shadow-xl transition duration-300 cursor-pointer">
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
              <p className="text-neutral-dark">
                {barbershopSettings?.open_days.includes(1) 
                  ? `${barbershopSettings.open_time} - ${barbershopSettings.close_time}` 
                  : 'Fechado'}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Terça-Feira</p>
              <p className="text-neutral-dark">
                {barbershopSettings?.open_days.includes(2) 
                  ? `${barbershopSettings.open_time} - ${barbershopSettings.close_time}` 
                  : 'Fechado'}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Quarta-Feira</p>
              <p className="text-neutral-dark">
                {barbershopSettings?.open_days.includes(3) 
                  ? `${barbershopSettings.open_time} - ${barbershopSettings.close_time}` 
                  : 'Fechado'}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Quinta-Feira</p>
              <p className="text-neutral-dark">
                {barbershopSettings?.open_days.includes(4) 
                  ? `${barbershopSettings.open_time} - ${barbershopSettings.close_time}` 
                  : 'Fechado'}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Sexta-Feira</p>
              <p className="text-neutral-dark">
                {barbershopSettings?.open_days.includes(5) 
                  ? `${barbershopSettings.open_time} - ${barbershopSettings.close_time}` 
                  : 'Fechado'}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Sábado</p>
              <p className="text-neutral-dark">
                {barbershopSettings?.open_days.includes(6) 
                  ? `${barbershopSettings.open_time} - ${barbershopSettings.close_time}` 
                  : 'Fechado'}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Domingo</p>
              <p className="text-neutral-dark">
                {barbershopSettings?.open_days.includes(0) 
                  ? `${barbershopSettings.open_time} - ${barbershopSettings.close_time}` 
                  : 'Fechado'}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">Feriados</p>
              <p className="text-neutral-dark">Consultar</p>
            </div>
          </div>
        </div>
        
      </section>
    </ClientLayout>
  );
};

export default ClientHomePage;
