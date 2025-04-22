/**
 * Script temporário para depuração da API de disponibilidade
 * Este script simula chamadas para a API com parâmetros específicos
 */

import { storage } from "./storage";
import { format, parseISO, getDay } from "date-fns";

async function testSpecificAvailability() {
  try {
    console.log("------------------------------------------------------------");
    console.log("TESTE DIRETO DE DISPONIBILIDADE PARA DATA ESPECÍFICA");
    console.log("------------------------------------------------------------");
    
    // Parâmetros fixos para teste (altere conforme necessário)
    const professionalId = 5;
    const tenantId = 4;
    const dateStr = "2025-04-23"; // Data específica para teste
    
    console.log(`Testando disponibilidade para a data ${dateStr}`);
    console.log(`Profissional ID: ${professionalId}, Tenant ID: ${tenantId}`);
    
    // 1. Verificar se o profissional existe
    const professional = await storage.getProfessional(professionalId, tenantId);
    if (!professional) {
      console.error(`Profissional ID ${professionalId} não encontrado para o tenant ${tenantId}`);
      return;
    }
    console.log(`✓ Profissional encontrado: ${professional.name}`);
    
    // 2. Buscar configurações do estabelecimento
    const settings = await storage.getBarbershopSettings(tenantId);
    if (!settings) {
      console.error(`Configurações de estabelecimento não encontradas para o tenant ${tenantId}`);
      return;
    }
    console.log(`✓ Configurações encontradas. Horário: ${settings.open_time} - ${settings.close_time}`);
    
    // 3. Buscar disponibilidade do profissional
    const availabilitySettings = await storage.getAvailabilityByProfessionalId(professionalId, tenantId);
    console.log(`✓ Encontradas ${availabilitySettings.length} configurações de disponibilidade`);
    
    if (availabilitySettings.length === 0) {
      console.error(`ERRO: Nenhuma disponibilidade configurada para o profissional ${professionalId}`);
      return;
    }
    
    // 4. Verificar disponibilidade para o dia específico
    const dateObj = parseISO(dateStr);
    const dayOfWeek = getDay(dateObj);
    console.log(`Data de teste: ${dateStr}, dia da semana: ${dayOfWeek}`);
    
    const dayConfig = availabilitySettings.find(a => a.day_of_week === dayOfWeek);
    if (!dayConfig) {
      console.log(`! O profissional não trabalha no dia ${dayOfWeek} (${getDayName(dayOfWeek)})!`);
      return;
    }
    
    console.log(`✓ Configuração encontrada para ${getDayName(dayOfWeek)}: ${dayConfig.start_time} - ${dayConfig.end_time}`);
    if (dayConfig.lunch_start && dayConfig.lunch_end) {
      console.log(`  Horário de almoço: ${dayConfig.lunch_start} - ${dayConfig.lunch_end}`);
    }
    
    // 5. Buscar agendamentos existentes para esta data
    const appointments = await storage.getAppointmentsByProfessionalId(professionalId);
    console.log(`Total de agendamentos para o profissional: ${appointments.length}`);
    
    // Filtrar apenas agendamentos para o dia específico e do tenant correto
    const dateAppointments = appointments.filter(app => {
      const appDate = new Date(app.appointment_date);
      return (
        app.tenant_id === tenantId &&
        appDate.getFullYear() === dateObj.getFullYear() &&
        appDate.getMonth() === dateObj.getMonth() &&
        appDate.getDate() === dateObj.getDate() &&
        app.status !== 'cancelled'
      );
    });
    
    console.log(`Agendamentos para o dia ${dateStr}: ${dateAppointments.length}`);
    
    if (dateAppointments.length > 0) {
      console.log("Detalhes dos agendamentos:");
      dateAppointments.forEach(app => {
        const appDate = new Date(app.appointment_date);
        console.log(`  - ID: ${app.id}, Cliente: ${app.client_name}, Horário: ${format(appDate, "HH:mm")}, Status: ${app.status}`);
      });
    }
    
    // 6. Gerar slots disponíveis
    const dayStartTime = dayConfig.start_time || settings.open_time || "09:00";
    const dayEndTime = dayConfig.end_time || settings.close_time || "18:00";
    
    console.log(`\nGerando slots de horário para ${dayStartTime} - ${dayEndTime}`);
    
    // Dividir a string de horário em horas e minutos
    const [startHours, startMinutes] = dayStartTime.split(":").map(Number);
    const [endHours, endMinutes] = dayEndTime.split(":").map(Number);
    
    // Calcular slots
    const slotDuration = 30; // Duração de cada slot em minutos
    const slots = [];
    
    const startMinutesTotal = startHours * 60 + startMinutes;
    const endMinutesTotal = endHours * 60 + endMinutes;
    
    // Calcular quantos slots cabem no intervalo
    const slotCount = Math.floor((endMinutesTotal - startMinutesTotal) / slotDuration);
    
    console.log(`Calculados ${slotCount} slots possíveis`);
    
    // Gerar lista de slots
    for (let i = 0; i <= slotCount; i++) {
      const minutes = startMinutesTotal + (i * slotDuration);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours < endHours || (hours === endHours && mins <= endMinutes)) {
        slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
      }
    }
    
    console.log(`Slots gerados (${slots.length}):`);
    console.log(slots.join(", "));
    
    // 7. Verificar quais slots estão bloqueados por agendamentos
    const bookedSlots = dateAppointments.map(app => {
      const appDate = new Date(app.appointment_date);
      return `${appDate.getHours().toString().padStart(2, '0')}:${appDate.getMinutes().toString().padStart(2, '0')}`;
    });
    
    if (bookedSlots.length > 0) {
      console.log(`\nSlots já agendados (${bookedSlots.length}):`);
      console.log(bookedSlots.join(", "));
    }
    
    // 8. Verificar quais slots estão no horário de almoço
    let lunchSlots: string[] = [];
    
    if (dayConfig.lunch_start && dayConfig.lunch_end) {
      const [lunchStartHours, lunchStartMinutes] = dayConfig.lunch_start.split(":").map(Number);
      const [lunchEndHours, lunchEndMinutes] = dayConfig.lunch_end.split(":").map(Number);
      
      const lunchStartMinutesTotal = lunchStartHours * 60 + lunchStartMinutes;
      const lunchEndMinutesTotal = lunchEndHours * 60 + lunchEndMinutes;
      
      lunchSlots = slots.filter(slot => {
        const [hours, minutes] = slot.split(":").map(Number);
        const slotMinutesTotal = hours * 60 + minutes;
        return slotMinutesTotal >= lunchStartMinutesTotal && slotMinutesTotal < lunchEndMinutesTotal;
      });
      
      if (lunchSlots.length > 0) {
        console.log(`\nSlots no horário de almoço (${lunchSlots.length}):`);
        console.log(lunchSlots.join(", "));
      }
    }
    
    // 9. Calcular slots finais disponíveis (removendo agendados e almoço)
    const availableSlots = slots.filter(slot => !bookedSlots.includes(slot) && !lunchSlots.includes(slot));
    
    console.log(`\nSlots disponíveis finais (${availableSlots.length}):`);
    console.log(availableSlots.join(", "));
    
    // 10. Verificar se há algum problema com os dados
    if (availableSlots.length === 0) {
      console.warn("\n⚠️ ALERTA: Nenhum slot disponível encontrado!");
      console.log("Possíveis causas:");
      console.log("1. Todos os horários já estão agendados");
      console.log("2. Problema na configuração de disponibilidade do profissional");
      console.log("3. Problema no cálculo de slots");
    }
    
    console.log("\nTESTE CONCLUÍDO");
  } catch (error) {
    console.error("ERRO AO TESTAR:", error);
  }
}

function getDayName(dayIndex: number): string {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return days[dayIndex] || "Desconhecido";
}

// Executar teste
testSpecificAvailability()
  .then(() => console.log("Script finalizado"))
  .catch(err => console.error("Erro ao executar script:", err));