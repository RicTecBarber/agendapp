/**
 * Script para popular a base de dados com serviços, profissionais e agendamentos
 * Este script cria dados aleatórios para permitir testar a aplicação
 */

import { storage } from '../server/storage';
import { formatISO, addDays, addHours } from 'date-fns';

const TENANT_IDS = [1, 2, 3]; // IDs dos tenants (salão-teste, salao-maria, barbearia-silva)
const TENANT_SLUGS = ['salao-teste', 'salao-maria', 'barbearia-silva']; // Slugs dos tenants

// Mapeia o nome dos tenants para seus IDs
const TENANT_NAMES: Record<number, string> = {
  1: 'Salão Teste',
  2: 'Salão da Maria',
  3: 'Barbearia Silva'
};

const SERVICES = [
  { name: 'Corte de Cabelo Masculino', duration: 30, price: 35 },
  { name: 'Corte de Cabelo Feminino', duration: 60, price: 70 },
  { name: 'Barba', duration: 30, price: 25 },
  { name: 'Coloração', duration: 120, price: 150 },
  { name: 'Hidratação', duration: 60, price: 85 },
  { name: 'Penteado', duration: 45, price: 60 },
  { name: 'Manicure', duration: 40, price: 45 },
  { name: 'Pedicure', duration: 40, price: 50 },
  { name: 'Depilação', duration: 90, price: 120 },
  { name: 'Design de Sobrancelhas', duration: 20, price: 35 },
  { name: 'Maquiagem', duration: 60, price: 100 },
  { name: 'Massagem Relaxante', duration: 60, price: 120 },
  { name: 'Escova', duration: 45, price: 60 },
  { name: 'Escova Progressiva', duration: 180, price: 250 },
  { name: 'Botox Capilar', duration: 90, price: 180 },
];

const PROFESSIONALS_DATA = [
  { name: 'João Silva', description: 'Especialista em cortes masculinos', avatar_url: null },
  { name: 'Maria Oliveira', description: 'Cabeleireira com 10 anos de experiência', avatar_url: null },
  { name: 'Carlos Santos', description: 'Barbeiro profissional', avatar_url: null },
  { name: 'Ana Paula', description: 'Especialista em coloração e mechas', avatar_url: null },
  { name: 'Roberto Almeida', description: 'Especialista em barba e bigode', avatar_url: null },
  { name: 'Fernanda Costa', description: 'Maquiadora profissional', avatar_url: null },
  { name: 'Lucas Mendes', description: 'Especialista em cortes modernos', avatar_url: null },
  { name: 'Juliana Ferreira', description: 'Manicure e pedicure', avatar_url: null },
  { name: 'Paulo Ricardo', description: 'Massagista terapêutico', avatar_url: null },
  { name: 'Camila Sousa', description: 'Especialista em tratamentos capilares', avatar_url: null },
];

const CLIENTS_DATA = [
  { name: 'Pedro Alves', phone: '11999991111' },
  { name: 'Sandra Oliveira', phone: '11999992222' },
  { name: 'Eduardo Santos', phone: '11999993333' },
  { name: 'Marcia Pereira', phone: '11999994444' },
  { name: 'Roberto Carlos', phone: '11999995555' },
  { name: 'Lucia Ferreira', phone: '11999996666' },
  { name: 'Gabriel Silva', phone: '11999997777' },
  { name: 'Beatriz Almeida', phone: '11999998888' },
  { name: 'Fernando Costa', phone: '11999999999' },
  { name: 'Larissa Souza', phone: '11988889999' },
];

// Dias da semana para disponibilidade
const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5]; // Domingo a Sábado (0-6)

// Horários de trabalho
const WORK_HOURS = [
  { start: '09:00', end: '12:00' },
  { start: '13:00', end: '18:00' },
];

/**
 * Função para gerar um número aleatório dentro de um intervalo
 */
function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Função para criar serviços para um tenant específico
 */
async function createServicesForTenant(tenantId: number) {
  console.log(`\n[Tenant ${tenantId} - ${TENANT_NAMES[tenantId]}] Criando serviços...`);
  const services = [];

  for (const service of SERVICES) {
    // Cria apenas alguns serviços aleatoriamente para cada tenant
    if (Math.random() < 0.7) { // 70% de chance de criar o serviço
      try {
        const createdService = await storage.createService({
          ...service,
          description: `${service.name} - ${TENANT_NAMES[tenantId]}`,
          tenant_id: tenantId
        });
        services.push(createdService);
        console.log(`  - Serviço criado: ${service.name}`);
      } catch (error) {
        console.error(`  - Erro ao criar serviço ${service.name}:`, error);
      }
    }
  }

  return services;
}

/**
 * Função para criar profissionais para um tenant específico
 */
async function createProfessionalsForTenant(tenantId: number, services: any[]) {
  console.log(`\n[Tenant ${tenantId} - ${TENANT_NAMES[tenantId]}] Criando profissionais...`);
  const professionals = [];

  // Seleciona aleatoriamente alguns profissionais para este tenant
  const selectedProfessionals = PROFESSIONALS_DATA
    .sort(() => 0.5 - Math.random()) // Embaralha o array
    .slice(0, getRandomInt(3, 6)); // Seleciona de 3 a 6 profissionais

  for (const professional of selectedProfessionals) {
    // Seleciona alguns serviços aleatórios para este profissional
    const serviceCount = getRandomInt(2, Math.min(5, services.length));
    const selectedServices = services
      .sort(() => 0.5 - Math.random()) // Embaralha o array
      .slice(0, serviceCount) // Seleciona a quantidade de serviços
      .map(s => s.id); // Extrai apenas os IDs dos serviços

    try {
      const createdProfessional = await storage.createProfessional({
        ...professional,
        services_offered: selectedServices,
        tenant_id: tenantId
      });
      professionals.push(createdProfessional);
      console.log(`  - Profissional criado: ${professional.name} (${selectedServices.length} serviços)`);
    } catch (error) {
      console.error(`  - Erro ao criar profissional ${professional.name}:`, error);
    }
  }

  return professionals;
}

/**
 * Função para criar disponibilidades para os profissionais
 */
async function createAvailabilityForProfessionals(tenantId: number, professionals: any[]) {
  console.log(`\n[Tenant ${tenantId} - ${TENANT_NAMES[tenantId]}] Criando disponibilidades...`);

  for (const professional of professionals) {
    // Seleciona alguns dias da semana aleatoriamente
    const selectedDays = DAYS_OF_WEEK.filter(() => Math.random() < 0.8); // 80% de chance por dia

    for (const day of selectedDays) {
      // Cria disponibilidades para os períodos de trabalho
      for (const period of WORK_HOURS) {
        try {
          await storage.createAvailability({
            professional_id: professional.id,
            day_of_week: day,
            start_time: period.start,
            end_time: period.end,
            is_available: true,
            tenant_id: tenantId
          });
          console.log(`  - Disponibilidade criada: ${professional.name}, Dia ${day}, ${period.start}-${period.end}`);
        } catch (error) {
          console.error(`  - Erro ao criar disponibilidade:`, error);
        }
      }
    }
  }
}

/**
 * Função para criar agendamentos
 */
async function createAppointmentsForTenant(tenantId: number, professionals: any[], services: any[]) {
  console.log(`\n[Tenant ${tenantId} - ${TENANT_NAMES[tenantId]}] Criando agendamentos...`);
  const today = new Date();
  const appointments = [];

  // Cria alguns agendamentos passados e futuros
  for (let i = -10; i <= 20; i++) {
    // Decide aleatoriamente se cria um agendamento para este dia
    if (Math.random() < 0.4) { // 40% de chance de criar agendamento para cada dia
      const appointmentDate = addDays(today, i);
      // Ajusta para horário comercial (9h às 18h)
      appointmentDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
      
      // Seleciona um profissional e um serviço aleatório
      const professional = professionals[Math.floor(Math.random() * professionals.length)];
      
      // Filtra serviços oferecidos pelo profissional
      const availableServices = services.filter(s => 
        professional.services_offered.includes(s.id)
      );
      
      if (availableServices.length === 0) {
        console.log(`  - Pulando agendamento: profissional ${professional.name} não oferece serviços`);
        continue;
      }
      
      const service = availableServices[Math.floor(Math.random() * availableServices.length)];
      
      // Seleciona um cliente aleatório
      const client = CLIENTS_DATA[Math.floor(Math.random() * CLIENTS_DATA.length)];
      
      // Define status com base na data (passado = concluído, futuro = agendado)
      const status = i < 0 ? 'concluido' : 'agendado';
      
      try {
        const appointment = await storage.createAppointment({
          client_name: client.name,
          client_phone: client.phone,
          service_id: service.id,
          professional_id: professional.id,
          appointment_date: formatISO(appointmentDate),
          status: status,
          notify_whatsapp: false,
          is_loyalty_reward: false,
          tenant_id: tenantId,
          created_at: new Date()
        });
        
        appointments.push(appointment);
        console.log(`  - Agendamento criado: ${client.name}, ${service.name}, ${formatISO(appointmentDate)}, Status: ${status}`);
      } catch (error) {
        console.error(`  - Erro ao criar agendamento:`, error);
      }
    }
  }

  return appointments;
}

/**
 * Função principal para popular o banco de dados
 */
async function populateDatabase() {
  console.log('Iniciando população do banco de dados...');

  for (const tenantId of TENANT_IDS) {
    console.log(`\n===== CRIANDO DADOS PARA TENANT ${tenantId} - ${TENANT_NAMES[tenantId]} =====`);
    
    // Criar serviços para o tenant
    const services = await createServicesForTenant(tenantId);
    
    if (services.length === 0) {
      console.log(`Nenhum serviço criado para o tenant ${tenantId}. Pulando...`);
      continue;
    }
    
    // Criar profissionais para o tenant
    const professionals = await createProfessionalsForTenant(tenantId, services);
    
    if (professionals.length === 0) {
      console.log(`Nenhum profissional criado para o tenant ${tenantId}. Pulando...`);
      continue;
    }
    
    // Criar disponibilidades para os profissionais
    await createAvailabilityForProfessionals(tenantId, professionals);
    
    // Criar agendamentos
    await createAppointmentsForTenant(tenantId, professionals, services);
  }

  console.log('\nPopulação do banco de dados concluída com sucesso!');
}

// Executar o script
populateDatabase()
  .then(() => {
    console.log('Script finalizado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro ao executar o script:', error);
    process.exit(1);
  });