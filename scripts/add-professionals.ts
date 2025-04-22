/**
 * Script simplificado para adicionar profissionais
 */

import { db } from "../server/db";
import { storage } from "../server/storage";
import { professionals, availability } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    console.log("Adicionando profissionais ao tenant padrão...");
    
    // Verificar existência do tenant padrão
    const tenant = await storage.getTenantBySlug("barbearia-modelo");
    if (!tenant) {
      console.error("Tenant padrão 'barbearia-modelo' não encontrado.");
      return;
    }
    console.log(`Tenant encontrado: ${tenant.name} (ID: ${tenant.id})`);
    
    // Buscar todos os serviços para o tenant
    const services = await storage.getServices(tenant.id);
    console.log(`Serviços encontrados: ${services.length}`);
    
    if (services.length === 0) {
      console.log("Criando serviços básicos...");
      await storage.createService({
        name: "Corte Masculino",
        description: "Corte de cabelo masculino",
        price: 45.0,
        duration: 30,
        tenant_id: tenant.id
      });
      
      await storage.createService({
        name: "Barba",
        description: "Barba tradicional com toalha quente",
        price: 35.0,
        duration: 20,
        tenant_id: tenant.id
      });
      
      await storage.createService({
        name: "Corte + Barba",
        description: "Pacote completo corte e barba",
        price: 70.0,
        duration: 45,
        tenant_id: tenant.id
      });
      
      // Buscar novamente após criar
      const updatedServices = await storage.getServices(tenant.id);
      console.log(`Serviços atualizados: ${updatedServices.length}`);
      services.push(...updatedServices);
    }
    
    // Obter IDs dos serviços
    const serviceIds = services.map(s => s.id);
    
    // Criar profissionais
    const profData = { 
      name: "João Silva", 
      description: "Especialista em cortes modernos", 
      services_offered: serviceIds,
      tenant_id: tenant.id 
    };
    
    // Verificar se já existe
    const existingProf = await db.select().from(professionals)
      .where(eq(professionals.name, profData.name))
      .limit(1);
    
    let profId;
    
    if (existingProf.length === 0) {
      const [newProf] = await db.insert(professionals)
        .values(profData)
        .returning();
      
      profId = newProf.id;
      console.log(`Profissional criado com ID ${profId}`);
    } else {
      profId = existingProf[0].id;
      console.log(`Profissional já existe com ID ${profId}`);
      
      // Atualizar serviços do profissional
      await db.update(professionals)
        .set({ services_offered: serviceIds })
        .where(eq(professionals.id, profId));
      
      console.log("Serviços do profissional atualizados");
    }
    
    // Criar disponibilidade de segunda a sábado
    for (let day = 1; day <= 6; day++) {
      const existingAvail = await db.select().from(availability)
        .where(eq(availability.professional_id, profId))
        .where(eq(availability.day_of_week, day))
        .limit(1);
      
      if (existingAvail.length === 0) {
        await db.insert(availability).values({
          professional_id: profId,
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
          lunch_start: "12:00",
          lunch_end: "13:00",
          tenant_id: tenant.id
        });
        
        console.log(`Disponibilidade criada para dia ${day}`);
      } else {
        console.log(`Disponibilidade já existe para dia ${day}`);
      }
    }
    
    console.log("Processo concluído com sucesso!");
    
  } catch (error) {
    console.error("Erro durante a execução:", error);
  } finally {
    process.exit(0);
  }
}

run();