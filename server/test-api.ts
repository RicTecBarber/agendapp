/**
 * Script para testar diretamente a API de disponibilidade
 * Este script simula chamadas diretas para a API sem depender do frontend
 */

import { pool, db } from "./db";
import { storage } from "./storage";
import { parseISO, format, startOfDay, addMinutes, isWithinInterval, isPast, getDay } from "date-fns";
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";

async function testAvailabilityAPI() {
  try {
    console.log("------------------------------------------------------------");
    console.log("TESTE DE API DE DISPONIBILIDADE");
    console.log("------------------------------------------------------------");
    
    // Parâmetros de teste
    const professionalId = 5; // ID do profissional que queremos testar
    const tenantId = 4; // ID do tenant que queremos testar (barbearia-modelo)
    const testDate = new Date(); // Data atual para teste
    const dateStr = format(testDate, "yyyy-MM-dd");
    const timezone = "America/Sao_Paulo";
    
    console.log(`\nTestando disponibilidade para:`);
    console.log(`- Profissional: ${professionalId}`);
    console.log(`- Tenant: ${tenantId}`);
    console.log(`- Data: ${dateStr}`);
    console.log(`- Fuso horário: ${timezone}`);
    
    // 1. Verificar se o profissional existe
    console.log("\n1. Verificando se o profissional existe...");
    const professional = await storage.getProfessional(professionalId, tenantId);
    if (!professional) {
      console.error(`ERRO: Profissional ${professionalId} não encontrado para o tenant ${tenantId}`);
      return;
    }
    console.log(`✓ Profissional encontrado: ${professional.name}`);
    
    // 2. Verificar configurações do barbershop
    console.log("\n2. Verificando configurações do estabelecimento...");
    const settings = await storage.getBarbershopSettings(tenantId);
    if (!settings) {
      console.error(`ERRO: Configurações não encontradas para o tenant ${tenantId}`);
      return;
    }
    console.log(`✓ Configurações encontradas - Horário: ${settings.open_time} às ${settings.close_time}`);
    
    // 3. Buscar a disponibilidade do profissional
    console.log("\n3. Buscando disponibilidade do profissional...");
    const availabilitySettings = await storage.getAvailabilityByProfessionalId(professionalId, tenantId);
    console.log(`✓ Encontradas ${availabilitySettings.length} configurações de disponibilidade`);
    
    if (availabilitySettings.length === 0) {
      console.error(`ERRO: Nenhuma disponibilidade configurada para o profissional ${professionalId}`);
      return;
    }
    
    // Imprimir disponibilidades encontradas
    availabilitySettings.forEach(a => {
      console.log(`   - Dia ${a.day_of_week} (${getDayName(a.day_of_week)}): ${a.start_time} às ${a.end_time}`);
    });
    
    // 4. Verificar disponibilidade para o dia atual
    const dayOfWeek = getDay(testDate); // 0 = Domingo, 1 = Segunda, ...
    console.log(`\n4. Verificando disponibilidade para o dia ${dayOfWeek} (${getDayName(dayOfWeek)})...`);
    
    const dayConfig = availabilitySettings.find(a => a.day_of_week === dayOfWeek);
    if (!dayConfig) {
      console.log(`! Profissional não disponível para o dia ${getDayName(dayOfWeek)}`);
      return;
    }
    
    console.log(`✓ Disponibilidade encontrada: ${dayConfig.start_time} às ${dayConfig.end_time}`);
    
    // 5. Gerar slots para o dia
    console.log("\n5. Gerando slots de horário disponíveis...");
    
    // Configurações de horário
    const startTime = dayConfig.start_time || settings?.open_time || "09:00";
    const endTime = dayConfig.end_time || settings?.close_time || "18:00";
    const lunchStart = dayConfig.lunch_start;
    const lunchEnd = dayConfig.lunch_end;
    const slotDuration = 30; // minutos
    
    console.log(`   Usando configurações:`);
    console.log(`   - Horário de trabalho: ${startTime} às ${endTime}`);
    if (lunchStart && lunchEnd) {
      console.log(`   - Horário de almoço: ${lunchStart} às ${lunchEnd}`);
    }
    
    // Converter horários para objetos Date
    const [startHours, startMinutes] = parseTime(startTime);
    const [endHours, endMinutes] = parseTime(endTime);
    
    const dateObj = startOfDay(parseISO(dateStr));
    
    // Converter para fuso horário local
    const localStartDate = utcToZonedTime(dateObj, timezone);
    localStartDate.setHours(startHours, startMinutes, 0, 0);
    
    const localEndDate = utcToZonedTime(dateObj, timezone);
    localEndDate.setHours(endHours, endMinutes, 0, 0);
    
    // Gerar slots
    const slots = generateTimeSlots(localStartDate, localEndDate, slotDuration, timezone);
    
    console.log(`✓ Gerados ${slots.length} slots de horário`);
    console.log("\nSlots disponíveis:");
    slots.forEach(slot => {
      console.log(`   - ${slot}`);
    });
    
    console.log("\nTESTE CONCLUÍDO COM SUCESSO");
    
  } catch (error) {
    console.error("ERRO AO TESTAR API:", error);
  } finally {
    // Encerrar conexão
    await pool.end();
  }
}

function getDayName(dayIndex: number): string {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return days[dayIndex] || "Desconhecido";
}

function parseTime(timeString: string): [number, number] {
  const [hours, minutes] = timeString.split(":").map(Number);
  return [hours, minutes];
}

function generateTimeSlots(
  start: Date,
  end: Date,
  slotDurationMinutes: number,
  timezone: string
): string[] {
  const slots: string[] = [];
  let current = new Date(start);
  
  while (current < end) {
    // Formatar o horário na timezone solicitada
    const timeStr = format(current, "HH:mm");
    slots.push(timeStr);
    
    // Avançar para o próximo slot
    current = addMinutes(current, slotDurationMinutes);
  }
  
  return slots;
}

// Executar teste
testAvailabilityAPI()
  .then(() => console.log("Teste finalizado"))
  .catch(err => console.error("Erro no teste:", err));