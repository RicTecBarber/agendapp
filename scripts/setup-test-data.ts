/**
 * Script para configurar dados de teste no sistema
 * Este script cria serviços, profissionais e disponibilidade para o tenant padrão
 */

import { hashPassword } from "../server/auth";
import { db } from "../server/db";
import { storage } from "../server/storage";
import { sql } from "drizzle-orm";
import { 
  availability,
  professionals, 
  services,
  professionalToService,
  users 
} from "../shared/schema";

async function createTestData() {
  try {
    console.log("Iniciando configuração de dados de teste...");
    
    // Verificar existência do tenant padrão
    const tenant = await storage.getTenantBySlug("barbearia-modelo");
    if (!tenant) {
      console.error("Tenant padrão 'barbearia-modelo' não encontrado. Execute o servidor primeiro para criá-lo.");
      return;
    }
    console.log(`Tenant padrão encontrado: ${tenant.name} (ID: ${tenant.id})`);
    
    // Criar um usuário admin para o tenant
    const existingAdmin = await db.select().from(users).where(
      sql => sql`${users.username} = 'admin_barbearia' AND ${users.tenant_id} = ${tenant.id}`
    ).limit(1);
    
    if (existingAdmin.length === 0) {
      const hashedPassword = await hashPassword("senha123");
      
      await db.insert(users).values({
        username: "admin_barbearia",
        password: hashedPassword,
        name: "Administrador",
        email: "admin@barbearia-modelo.com",
        role: "admin",
        tenant_id: tenant.id,
        is_active: true,
        permissions: ["all"]
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
      const existingService = await db.select().from(services).where(
        sql => sql`${services.name} = ${serviceData.name} AND ${services.tenant_id} = ${tenant.id}`
      ).limit(1);
      
      if (existingService.length === 0) {
        await db.insert(services).values(serviceData);
        console.log(`Serviço '${serviceData.name}' criado`);
      } else {
        console.log(`Serviço '${serviceData.name}' já existe`);
      }
    }
    
    // Buscar todos os serviços criados
    const allServices = await db.select().from(services).where(
      sql => sql`${services.tenant_id} = ${tenant.id}`
    );
    
    console.log(`Total de serviços: ${allServices.length}`);
    
    // Criar profissionais de teste
    const testProfessionals = [
      { 
        name: "João Silva", 
        description: "Especialista em cortes modernos", 
        services_offered: [],
        tenant_id: tenant.id 
      },
      { 
        name: "Maria Oliveira", 
        description: "Especialista em cabelos femininos", 
        services_offered: [],
        tenant_id: tenant.id 
      }
    ];
    
    const createdProfessionals = [];
    
    for (const profData of testProfessionals) {
      const existingProf = await db.select().from(professionals).where(
        sql => sql`${professionals.name} = ${profData.name} AND ${professionals.tenant_id} = ${tenant.id}`
      ).limit(1);
      
      if (existingProf.length === 0) {
        const [newProf] = await db.insert(professionals).values(profData).returning();
        createdProfessionals.push(newProf);
        console.log(`Profissional '${profData.name}' criado com ID ${newProf.id}`);
      } else {
        createdProfessionals.push(existingProf[0]);
        console.log(`Profissional '${profData.name}' já existe com ID ${existingProf[0].id}`);
      }
    }
    
    // Associar serviços aos profissionais
    for (const prof of createdProfessionals) {
      for (const service of allServices) {
        const existingAssoc = await db.select().from(professionalServices).where(
          sql => sql`${professionalServices.professional_id} = ${prof.id} AND ${professionalServices.service_id} = ${service.id}`
        ).limit(1);
        
        if (existingAssoc.length === 0) {
          await db.insert(professionalServices).values({
            professional_id: prof.id,
            service_id: service.id
          });
          console.log(`Associado serviço '${service.name}' ao profissional '${prof.name}'`);
        } else {
          console.log(`Serviço '${service.name}' já associado ao profissional '${prof.name}'`);
        }
      }
    }
    
    // Criar disponibilidade para os profissionais
    const daysOfWeek = [1, 2, 3, 4, 5, 6]; // Segunda a Sábado
    
    for (const prof of createdProfessionals) {
      for (const day of daysOfWeek) {
        const existingAvailability = await db.select().from(availabilities).where(
          sql => sql`${availabilities.professional_id} = ${prof.id} AND ${availabilities.day_of_week} = ${day} AND ${availabilities.tenant_id} = ${tenant.id}`
        ).limit(1);
        
        if (existingAvailability.length === 0) {
          await db.insert(availabilities).values({
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
      }
    }
    
    console.log("Configuração de dados de teste concluída com sucesso!");
    
  } catch (error) {
    console.error("Erro durante a configuração dos dados de teste:", error);
  } finally {
    // Fechar conexão com o banco de dados
    await db.end?.();
    process.exit(0);
  }
}

createTestData();