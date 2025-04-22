/**
 * Script para inicializar dados de teste no sistema
 * Este script cria serviços, profissionais e disponibilidade para o tenant padrão
 */

import { hashPassword } from "../server/auth";
import { db } from "../server/db";
import { storage } from "../server/storage";
import { eq, and } from "drizzle-orm";
import { 
  availability,
  professionals, 
  services,
  users 
} from "../shared/schema";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function initializeTestData() {
  try {
    console.log("Iniciando configuração de dados de teste...");
    
    // Verificar existência do tenant padrão
    const tenant = await storage.getTenantBySlug("barbearia-modelo");
    if (!tenant) {
      console.error("Tenant padrão 'barbearia-modelo' não encontrado. Execute o servidor primeiro para criá-lo.");
      return;
    }
    console.log(`Tenant padrão encontrado: ${tenant.name} (ID: ${tenant.id})`);
    
    // Criar um usuário admin para o tenant se não existir
    const existingAdmin = await db.query.users.findFirst({
      where: and(
        eq(users.username, "admin_barbearia"),
        eq(users.tenant_id, tenant.id)
      )
    });
    
    if (!existingAdmin) {
      const hashedPassword = await hashPassword("senha123");
      
      await db.insert(users).values({
        username: "admin_barbearia",
        password: hashedPassword,
        name: "Administrador",
        email: "admin@barbearia-modelo.com",
        role: "admin",
        tenant_id: tenant.id,
        is_active: true
        // Removido campo permissions que não existe no banco
      });
      
      console.log("Usuário admin criado para o tenant");
    } else {
      console.log("Usuário admin já existe para o tenant");
    }
    
    // Criar serviços de teste
    const testServices = [
      { name: "Corte Masculino", description: "Corte de cabelo masculino", price: 45.0, duration: 30, tenant_id: tenant.id },
      { name: "Barba", description: "Barba tradicional com toalha quente", price: 35.0, duration: 20, tenant_id: tenant.id },
      { name: "Corte + Barba", description: "Pacote completo corte e barba", price: 70.0, duration: 45, tenant_id: tenant.id }
    ];
    
    for (const serviceData of testServices) {
      const existingService = await db.query.services.findFirst({
        where: and(
          eq(services.name, serviceData.name),
          eq(services.tenant_id, tenant.id)
        )
      });
      
      if (!existingService) {
        await db.insert(services).values(serviceData);
        console.log(`Serviço '${serviceData.name}' criado`);
      } else {
        console.log(`Serviço '${serviceData.name}' já existe`);
      }
    }
    
    // Buscar todos os serviços criados
    const allServices = await db.query.services.findMany({
      where: eq(services.tenant_id, tenant.id)
    });
    
    console.log(`Total de serviços: ${allServices.length}`);
    
    // Criar profissionais de teste
    const testProfessionals = [
      { 
        name: "João Silva", 
        description: "Especialista em cortes modernos", 
        services_offered: allServices.map(s => s.id),
        tenant_id: tenant.id 
      },
      { 
        name: "Maria Oliveira", 
        description: "Especialista em cabelos femininos", 
        services_offered: allServices.map(s => s.id),
        tenant_id: tenant.id 
      }
    ];
    
    const createdProfessionals = [];
    
    for (const profData of testProfessionals) {
      const existingProf = await db.query.professionals.findFirst({
        where: and(
          eq(professionals.name, profData.name),
          eq(professionals.tenant_id, tenant.id)
        )
      });
      
      if (!existingProf) {
        // Inserir e obter o profissional criado
        const [newProf] = await db.insert(professionals).values(profData).returning();
        createdProfessionals.push(newProf);
        console.log(`Profissional '${profData.name}' criado com ID ${newProf.id}`);
      } else {
        // Atualizar services_offered do profissional existente
        await db.update(professionals)
          .set({ services_offered: allServices.map(s => s.id) })
          .where(eq(professionals.id, existingProf.id));
        
        createdProfessionals.push(existingProf);
        console.log(`Profissional '${profData.name}' atualizado com ID ${existingProf.id}`);
      }
    }
    
    // Criar disponibilidade para os profissionais
    const daysOfWeek = [1, 2, 3, 4, 5, 6]; // Segunda a Sábado
    
    for (const prof of createdProfessionals) {
      for (const day of daysOfWeek) {
        const existingAvailability = await db.query.availability.findFirst({
          where: and(
            eq(availability.professional_id, prof.id),
            eq(availability.day_of_week, day),
            eq(availability.tenant_id, tenant.id)
          )
        });
        
        if (!existingAvailability) {
          await db.insert(availability).values({
            professional_id: prof.id,
            day_of_week: day,
            start_time: "09:00",
            end_time: "18:00",
            lunch_start: "12:00",
            lunch_end: "13:00",
            tenant_id: tenant.id
          });
          console.log(`Criada disponibilidade para '${prof.name}' no dia ${day}`);
        } else {
          console.log(`Disponibilidade para '${prof.name}' no dia ${day} já existe`);
        }
        
        // Pequena pausa para evitar sobrecarga do banco
        await sleep(100);
      }
    }
    
    console.log("Configuração de dados de teste concluída com sucesso!");
    
  } catch (error) {
    console.error("Erro durante a configuração dos dados de teste:", error);
  } finally {
    // Fechar conexão com o banco de dados
    process.exit(0);
  }
}

initializeTestData();