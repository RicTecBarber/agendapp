import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertServiceSchema, 
  insertProfessionalSchema, 
  insertAvailabilitySchema,
  insertAppointmentSchema,
  appointmentLookupSchema,
  loyaltyLookupSchema,
  insertBarbershopSettingsSchema,
  InsertAppointment
} from "@shared/schema";
import { parseISO, format, addMinutes, isAfter } from "date-fns";
import { setupAuth } from "./auth";
import { z } from "zod";

// Função para obter o offset do fuso horário configurado em horas
function getTimezoneOffset(timezone: string): number {
  // Mapa de offsets para fusos horários brasileiros
  const timezoneOffsets: Record<string, number> = {
    'America/Sao_Paulo': -3,  // UTC-3
    'America/Recife': -3,     // UTC-3
    'America/Maceio': -3,     // UTC-3
    'America/Fortaleza': -3,  // UTC-3
    'America/Bahia': -3,      // UTC-3
    'America/Belem': -3,      // UTC-3
    'America/Cuiaba': -4,     // UTC-4
    'America/Manaus': -4,     // UTC-4
    'America/Boa_Vista': -4,  // UTC-4
    'America/Porto_Velho': -4, // UTC-4
    'America/Rio_Branco': -5   // UTC-5
  };
  
  // Retorna o offset configurado ou o padrão de Brasília (-3) se não estiver no mapa
  return timezoneOffsets[timezone] || -3;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // GET /api/users - Get all users (admin only)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      const users = await storage.getAllUsers();
      
      // Não retornar as senhas para o frontend
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar usuários" });
    }
  });
  
  // DELETE /api/users/:id - Delete a user (admin only)
  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      const userId = parseInt(req.params.id);
      
      // Não permitir excluir o próprio usuário logado
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Não é possível excluir o próprio usuário logado" });
      }
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Não permitir excluir o usuário admin padrão
      if (user.username === "admin") {
        return res.status(400).json({ message: "Não é possível excluir o usuário admin padrão" });
      }
      
      const deleted = await storage.deleteUser(userId);
      
      if (deleted) {
        res.status(200).json({ message: "Usuário excluído com sucesso" });
      } else {
        res.status(500).json({ message: "Falha ao excluir usuário" });
      }
    } catch (error) {
      res.status(500).json({ message: "Falha ao excluir usuário" });
    }
  });

  // GET /api/services - Get all services
  app.get("/api/services", async (req: Request, res: Response) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // GET /api/services/:id - Get a single service
  app.get("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  // POST /api/services - Create a new service (admin only)
  app.post("/api/services", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create service" });
      }
    }
  });

  // PUT /api/services/:id - Update a service (admin only)
  app.put("/api/services/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const serviceId = parseInt(req.params.id);
      const serviceData = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(serviceId, serviceData);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update service" });
      }
    }
  });

  // DELETE /api/services/:id - Delete a service (admin only)
  app.delete("/api/services/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const serviceId = parseInt(req.params.id);
      const success = await storage.deleteService(serviceId);
      
      if (!success) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // GET /api/professionals - Get all professionals
  app.get("/api/professionals", async (req: Request, res: Response) => {
    try {
      const professionals = await storage.getAllProfessionals();
      res.json(professionals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch professionals" });
    }
  });

  // GET /api/professionals/:id - Get a single professional
  app.get("/api/professionals/:id", async (req: Request, res: Response) => {
    try {
      const professionalId = parseInt(req.params.id);
      const professional = await storage.getProfessional(professionalId);
      
      if (!professional) {
        return res.status(404).json({ message: "Professional not found" });
      }
      
      res.json(professional);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch professional" });
    }
  });

  // GET /api/professionals/service/:serviceId - Get professionals by service
  app.get("/api/professionals/service/:serviceId", async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const professionals = await storage.getProfessionalsByServiceId(serviceId);
      res.json(professionals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch professionals" });
    }
  });

  // POST /api/professionals - Create a new professional (admin only)
  app.post("/api/professionals", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const professionalData = insertProfessionalSchema.parse(req.body);
      const professional = await storage.createProfessional(professionalData);
      res.status(201).json(professional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid professional data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create professional" });
      }
    }
  });

  // PUT /api/professionals/:id - Update a professional (admin only)
  app.put("/api/professionals/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const professionalId = parseInt(req.params.id);
      const professionalData = insertProfessionalSchema.partial().parse(req.body);
      const professional = await storage.updateProfessional(professionalId, professionalData);
      
      if (!professional) {
        return res.status(404).json({ message: "Professional not found" });
      }
      
      res.json(professional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid professional data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update professional" });
      }
    }
  });

  // GET /api/availability/professional/:professionalId - Get all availability for a professional
  app.get("/api/availability/professional/:professionalId", async (req: Request, res: Response) => {
    try {
      const professionalId = parseInt(req.params.professionalId);
      const availabilityList = await storage.getAvailabilityByProfessionalId(professionalId);
      res.json(availabilityList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // POST /api/availability - Create new availability (admin only)
  app.post("/api/availability", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const availabilityData = insertAvailabilitySchema.parse(req.body);
      const availability = await storage.createAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid availability data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create availability" });
      }
    }
  });

  // PUT /api/availability/:id - Update availability (admin only)
  app.put("/api/availability/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const availabilityId = parseInt(req.params.id);
      const availabilityData = req.body;
      const updated = await storage.updateAvailability(availabilityId, availabilityData);
      
      if (!updated) {
        return res.status(404).json({ message: "Availability not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  // DELETE /api/availability/:id - Delete availability (admin only)
  app.delete("/api/availability/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const availabilityId = parseInt(req.params.id);
      const deleted = await storage.deleteAvailability(availabilityId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Availability not found" });
      }
      
      res.status(200).json({ message: "Availability deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  // GET /api/availability/:professionalId/:date - Get available time slots for a professional on a date
  app.get("/api/availability/:professionalId/:date", async (req: Request, res: Response) => {
    // Adicionar cabeçalhos para prevenir cache no navegador
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    try {
      const professionalId = parseInt(req.params.professionalId);
      const dateParam = req.params.date; // Format: YYYY-MM-DD
      
      console.log(`[ABORDAGEM SIMPLIFICADA] Buscando disponibilidade para ${dateParam}`);
      
      // Criar objeto Date apenas para obter o dia da semana
      const date = new Date(dateParam);
      const dayOfWeek = date.getDay();
      
      // Get barbershop settings
      const barbershopSettings = await storage.getBarbershopSettings();
      
      // Verificar se a barbearia está aberta nesse dia da semana
      if (!barbershopSettings.open_days.includes(dayOfWeek)) {
        return res.json({ 
          available_slots: [],
          message: "A barbearia está fechada neste dia" 
        });
      }
      
      // Obter disponibilidade do profissional para esse dia da semana
      const availabilityList = await storage.getAvailabilityByProfessionalId(professionalId);
      const dayAvailability = availabilityList.find(a => a.day_of_week === dayOfWeek && a.is_available);
      
      if (!dayAvailability) {
        return res.json({ 
          available_slots: [],
          message: "O profissional não está disponível neste dia" 
        });
      }
      
      // Get all appointments for this professional on this date
      // Para garantir que estamos filtrando a data corretamente, precisamos adicionar logs e verificar o formato
      console.log(`Buscando agendamentos para a data: ${date.toISOString()}`);
      
      // CORREÇÃO DE FUSO HORÁRIO: Garantir que a data seja tratada corretamente
      console.log(`Data de busca original: ${date}`);
      
      // Extrair os componentes da data diretamente
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth retorna 0-11
      const day = date.getDate();
      
      // Recriar a data preservando a hora local sem conversão para UTC
      // Corrigindo o problema onde 09:00 aparecia como 12:00
      const searchDate = new Date(year, month-1, day, 0, 0, 0);
      console.log(`Data ajustada para busca: ${searchDate.toISOString()}`);
      
      // Obter apenas os agendamentos para a data específica
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      console.log(`Buscando agendamentos entre ${startOfDay.toISOString()} e ${endOfDay.toISOString()}`);
      
      const appointments = await storage.getAppointmentsByDate(date);
      console.log(`Agendamentos encontrados: ${appointments.length}`);
      
      // Fazendo log dos agendamentos para depuração
      appointments.forEach(a => {
        console.log(`Agendamento #${a.id} em ${new Date(a.appointment_date).toISOString()}`);
      });
      
      // Vamos logar os agendamentos encontrados para diagnóstico
      console.log(`Agendamentos encontrados (${appointments.length}):`, 
        appointments.map(a => ({
          id: a.id,
          date: new Date(a.appointment_date).toISOString(),
          professional: a.professional_id,
          status: a.status
        }))
      );
      
      // Logs explícitos para cada agendamento
      appointments.forEach(a => {
        console.log(`DETALHES DE AGENDAMENTO: ID=${a.id}, Data=${new Date(a.appointment_date).toISOString()}, Profissional=${a.professional_id}, Status=${a.status}`);
      });
      
      const professionalAppointments = appointments.filter(
        a => {
          const isForProfessional = a.professional_id === professionalId;
          const isActive = a.status !== "cancelled";
          const appointmentDate = new Date(a.appointment_date);
          
          // Logar todos os agendamentos do profissional para diagnóstico
          if (isForProfessional) {
            console.log(`Agendamento #${a.id} para o profissional ${a.professional_id}:`, {
              data: appointmentDate.toISOString(),
              status: a.status,
              será_incluído: isForProfessional && isActive
            });
          }
          
          return isForProfessional && isActive;
        }
      );
      
      // Generate time slots
      const timeSlots: string[] = [];
      // Array para detalhes dos slots com tipagem explícita
      interface SlotDetail {
        time: string;
        available: boolean;
        is_past: boolean;
        conflicts: number[] | null;
      }
      const slotDetails: SlotDetail[] = [];
      
      // Get professional's availability time
      let startTime = parseTime(dayAvailability.start_time);
      let endTime = parseTime(dayAvailability.end_time);
      
      // Log de agendamentos do profissional para debug
      console.log(`Agendamentos do profissional ${professionalId} para o dia ${date.toISOString().split('T')[0]}:`, 
        professionalAppointments.map(a => ({
          id: a.id,
          horario: new Date(a.appointment_date).toISOString()
        }))
      );
      
      // Adjust the availability to be within the barbershop's hours
      const barbershopOpenTime = parseTime(barbershopSettings.open_time);
      const barbershopCloseTime = parseTime(barbershopSettings.close_time);
      
      // Log dos horários para debug
      console.log(`Comparando horários - Disponibilidade profissional: ${startTime.hours}:${startTime.minutes} até ${endTime.hours}:${endTime.minutes}`);
      console.log(`Horário barbearia: ${barbershopOpenTime.hours}:${barbershopOpenTime.minutes} até ${barbershopCloseTime.hours}:${barbershopCloseTime.minutes}`);
      
      // Ensure start time is not earlier than barbershop opening time
      if (startTime.hours < barbershopOpenTime.hours || 
          (startTime.hours === barbershopOpenTime.hours && startTime.minutes < barbershopOpenTime.minutes)) {
        console.log(`Ajustando horário inicial: ${startTime.hours}:${startTime.minutes} -> ${barbershopOpenTime.hours}:${barbershopOpenTime.minutes}`);
        startTime = barbershopOpenTime;
      }
      
      // O horário de fim do profissional pode ser qualquer um, incluindo após o fechamento da barbearia.
      // Não vamos mais limitar isso aqui, pois queremos que o profissional possa definir até que horas ele trabalha,
      // mesmo que isso vá além do horário regular da barbearia
      console.log(`Horário final do profissional: ${endTime.hours}:${endTime.minutes}`);
      console.log(`Horário de fechamento da barbearia: ${barbershopCloseTime.hours}:${barbershopCloseTime.minutes}`);
      
      // Prepare a map of occupied time slots
      const occupiedSlots = new Map<string, number[]>();
      
      // Get service details
      const services = await storage.getAllServices();
      
      // Pre-process todos os agendamentos para saber quais horários estão ocupados
      professionalAppointments.forEach(appointment => {
        // MUITO IMPORTANTE: Os dados estão em UTC no banco, mas exibimos no fuso horário do servidor
        // Isso é crucial para garantir que o front-end possa converter para o fuso horário do cliente
        const appointmentDate = new Date(appointment.appointment_date);
        
        // Como os dados no banco estão em UTC, usamos UTC para extrair horas
        // e depois convertemos para o fuso horário da barbearia
        
        // Horário em UTC
        const utcHour = appointmentDate.getUTCHours();
        const utcMinute = appointmentDate.getUTCMinutes();
        
        // Obtendo configurações da barbearia para o offset correto
        // NOVA ABORDAGEM: Não usamos mais timezoneOffset aqui pois estamos trabalhando em horário local
        
        // NOVA ABORDAGEM: Usar horário local diretamente em vez de conversões UTC
        let appointmentHour = appointmentDate.getHours();
        const appointmentMinute = appointmentDate.getMinutes();
        
        console.log(`Agendamento #${appointment.id}:`, {
          hora_original_ISO: appointmentDate.toISOString(),
          hora_UTC_extraida: `${appointmentHour}:${appointmentMinute}`,
          hora_local_server: `${appointmentDate.getHours()}:${appointmentDate.getMinutes()}`
        });
        
        // Find the related service
        const service = services.find((s) => s.id === appointment.service_id);
        const serviceDuration = service?.duration || 30;
        
        // Format the time as HH:MM string to match exactly what we display to users
        const timeString = `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinute.toString().padStart(2, '0')}`;
        
        // Calculate end time for this service
        let endHour = appointmentHour;
        let endMinute = appointmentMinute + serviceDuration;
        
        // Adjust if we cross hour boundaries
        while (endMinute >= 60) {
          endHour++;
          endMinute -= 60;
        }
        
        const endTimeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // Log detailed info about the appointment
        console.log(`Processando agendamento #${appointment.id}:`, {
          hora_inicio: timeString,
          hora_fim: endTimeString,
          duracao: serviceDuration,
          data_original: appointmentDate.toISOString()
        });
        
        // Marcar o horário como ocupado
        if (!occupiedSlots.has(timeString)) {
          occupiedSlots.set(timeString, []);
        }
        occupiedSlots.get(timeString)?.push(appointment.id);
        
        // Se o serviço durar mais que 30 minutos, marcar slots adicionais
        if (serviceDuration > 30) {
          // Começar no horário inicial e adicionar 30 minutos
          let currentHour = appointmentHour;
          let currentMinute = appointmentMinute;
          
          // Percorrer slots de 30 em 30 minutos até chegar ao fim do serviço
          while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
            // Avançar 30 minutos
            currentMinute += 30;
            if (currentMinute >= 60) {
              currentHour++;
              currentMinute -= 60;
            }
            
            // Verificar se já chegamos ao fim do serviço
            if (currentHour > endHour || (currentHour === endHour && currentMinute > endMinute)) {
              break;
            }
            
            // Marcar este slot como ocupado
            const slotString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
            if (!occupiedSlots.has(slotString)) {
              occupiedSlots.set(slotString, []);
            }
            occupiedSlots.get(slotString)?.push(appointment.id);
          }
        }
      });
      
      console.log("Mapa de horários ocupados:", Object.fromEntries(occupiedSlots));
      
      // Agora vamos criar os slots disponíveis
      let currentSlot = new Date(date);
      currentSlot.setHours(startTime.hours, startTime.minutes, 0, 0);
      
      const endDateTime = new Date(date);
      endDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
      
      while (currentSlot < endDateTime) {
        const slotTime = format(currentSlot, "HH:mm");
        const slotEnd = addMinutes(currentSlot, 30);
        
        // Verificar se é horário passado
        const isPastTime = isAfter(new Date(), currentSlot);
        
        // Verificar se está ocupado
        const conflictingAppointments = occupiedSlots.get(slotTime) || [];
        const isOccupied = conflictingAppointments.length > 0;
        
        // Log sempre que houver conflitos
        if (isOccupied) {
          console.log(`CONFLITO ENCONTRADO para horário ${slotTime}:`, conflictingAppointments);
        }
        
        // Um slot disponível deve: 
        // 1. Não ser um horário passado
        // 2. Não estar ocupado por nenhum agendamento
        const isAvailable = !isPastTime && !isOccupied;
        
        // Log detalhado para horários específicos
        if (slotTime === "09:00" || slotTime === "15:00") {
          console.log(`Análise detalhada do horário ${slotTime}:`);
          console.log(`  É horário passado? ${isPastTime}`);
          console.log(`  Tem conflitos? ${isOccupied}`);
          console.log(`  Conflitos com agendamentos: ${conflictingAppointments.join(', ') || 'Nenhum'}`);
          console.log(`  Disponível? ${isAvailable}`);
        }
        
        // Adiciona ao array de slots disponíveis
        if (isAvailable) {
          timeSlots.push(slotTime);
        }
        
        // Informações detalhadas sobre este horário (para debug)
        slotDetails.push({
          time: slotTime,
          available: isAvailable,
          is_past: isPastTime,
          conflicts: conflictingAppointments.length > 0 ? conflictingAppointments : null
        });
        
        // Move to next 30-minute slot
        currentSlot = slotEnd;
      }
      
      // Verificação final: remover quaisquer slots na lista de disponíveis que não estejam marcados como disponíveis nos detalhes
      const trulyAvailableSlots = timeSlots.filter(slot => 
        slotDetails.find(detail => detail.time === slot && detail.available)
      );
      
      console.log("Slots finais após verificação adicional:", trulyAvailableSlots);
      
      // Retorna tanto os slots disponíveis quanto informações detalhadas para debug
      res.json({ 
        available_slots: trulyAvailableSlots,
        debug_info: {
          date: date.toISOString().split('T')[0],
          professional_id: professionalId,
          slot_details: slotDetails
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // POST /api/appointments - Create a new appointment
  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      // Verificar se a data possui a marca LOCAL (nossa solução personalizada)
      // SOLUÇÃO FINAL: O front-end agora envia uma string com formato especial que preserva o horário exato
      let appointmentDate: Date;
      let appointmentData: InsertAppointment;
      
      if (typeof req.body.appointment_date === 'string' && req.body.appointment_date.includes('LOCAL')) {
        // O front-end está usando nosso formato personalizado
        // Vamos extrair o horário diretamente da string no formato '2025-04-07T18:30:00.000LOCAL'
        const dateString = req.body.appointment_date.replace('LOCAL', '');
        
        // Extrair os componentes da data
        const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):/);
        
        if (match) {
          const [_, year, month, day, hours, minutes] = match;
          console.log(`[SOLUÇÃO FINAL] Data extraída manualmente: ano=${year}, mês=${month}, dia=${day}, hora=${hours}, minutos=${minutes}`);
          
          // CORREÇÃO: Criar a data como UTC diretamente para preservar o horário exato
          // Ao criar a data como UTC, o horário se mantém igual, independente do fuso horário
          appointmentDate = new Date(Date.UTC(
            parseInt(year),
            parseInt(month) - 1, // mês em JS começa em 0
            parseInt(day),
            parseInt(hours),
            parseInt(minutes),
            0, 0
          ));
          
          console.log(`[CORREÇÃO] Data UTC criada para: ${appointmentDate.toISOString()}`);
          console.log(`[CORREÇÃO] Horário extraído original: ${hours}:${minutes}`);
          console.log(`[CORREÇÃO] Horário na data criada: ${appointmentDate.getUTCHours()}:${appointmentDate.getUTCMinutes()}`);
          
          // Criar um novo objeto com os dados validados
          appointmentData = {
            client_name: req.body.client_name,
            client_phone: req.body.client_phone,
            service_id: req.body.service_id,
            professional_id: req.body.professional_id,
            appointment_date: appointmentDate,
            notify_whatsapp: req.body.notify_whatsapp,
            is_loyalty_reward: req.body.is_loyalty_reward,
            status: "scheduled"
          };
        } else {
          // Fallback se o parsing falhar
          return res.status(400).json({ message: "Formato de data inválido" });
        }
      } else {
        // Usar o esquema normal de validação (isso não deve mais acontecer)
        appointmentData = insertAppointmentSchema.parse(req.body);
        appointmentDate = new Date(appointmentData.appointment_date);
      }
      
      console.log(`[SOLUÇÃO FINAL] Data recebida (tipo): ${typeof req.body.appointment_date}`);
      console.log(`[SOLUÇÃO FINAL] Data recebida (valor): ${req.body.appointment_date}`);
      
      // Extrair horas e minutos para verificações
      const appointmentHour = appointmentDate.getHours();
      const appointmentMinute = appointmentDate.getMinutes();
      const timeStr = `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinute.toString().padStart(2, '0')}`;
      
      console.log(`[SOLUÇÃO FINAL] Horário extraído: ${timeStr}`);
      console.log(`[SOLUÇÃO FINAL] Data processada: ${appointmentDate}`);
      console.log(`[SOLUÇÃO FINAL] Hora extraída: ${appointmentDate.getHours()}:${appointmentDate.getMinutes()}`);
      
      console.log(`[SOLUÇÃO DEFINITIVA] Horário extraído diretamente: ${timeStr}`);
      console.log(`[SOLUÇÃO DEFINITIVA] Nova data criada: ${appointmentDate.toISOString()}`);
      
      // Obter configurações da barbearia para verificar horário de funcionamento
      const barbershopSettings = await storage.getBarbershopSettings();
      const openTime = parseTime(barbershopSettings.open_time);
      const closeTime = parseTime(barbershopSettings.close_time);
      
      console.log(`[ABORDAGEM SIMPLIFICADA] Verificando horários - Agendamento: ${appointmentHour}:${appointmentMinute}, Barbearia abre: ${openTime.hours}:${openTime.minutes}, fecha: ${closeTime.hours}:${closeTime.minutes}`);
      
      // Verificar se o horário está dentro do período de funcionamento da barbearia
      const isBeforeOpen = 
        appointmentHour < openTime.hours || 
        (appointmentHour === openTime.hours && appointmentMinute < openTime.minutes);
        
      // Verificar duração do serviço
      const service = await storage.getService(appointmentData.service_id);
      if (!service) {
        return res.status(400).json({ message: "Serviço não encontrado" });
      }
      
      // Calcular horário de término do serviço
      let endHour = appointmentHour;
      let endMinute = appointmentMinute + service.duration;
      
      // Ajustar se cruzar hora
      while (endMinute >= 60) {
        endHour++;
        endMinute -= 60;
      }
      
      console.log(`[ABORDAGEM SIMPLIFICADA] Verificando horário de término - Serviço: ${service.duration} min`);
      console.log(`[ABORDAGEM SIMPLIFICADA] Horário início: ${appointmentHour}:${appointmentMinute}`);
      console.log(`[ABORDAGEM SIMPLIFICADA] Horário término calculado: ${endHour}:${endMinute}`);
      console.log(`[ABORDAGEM SIMPLIFICADA] Horário fechamento da barbearia: ${closeTime.hours}:${closeTime.minutes}`);
      
      // Verificar se o horário de término está após o fechamento
      const isAfterClose = 
        endHour > closeTime.hours || 
        (endHour === closeTime.hours && endMinute > closeTime.minutes);
      
      if (isBeforeOpen) {
        return res.status(400).json({ 
          message: `Não é possível agendar para antes do horário de abertura da barbearia (${barbershopSettings.open_time})`
        });
      }
      
      if (isAfterClose) {
        return res.status(400).json({ 
          message: `O serviço de ${service.duration} minutos agendado para ${timeStr} terminaria após o horário de fechamento da barbearia (${barbershopSettings.close_time})`
        });
      }
      
      // Buscar apenas os agendamentos para o mesmo dia
      const sameDate = new Date(
        appointmentDate.getFullYear(),
        appointmentDate.getMonth(),
        appointmentDate.getDate(),
        0, 0, 0, 0
      );
      
      // Buscar agendamentos do dia e filtrar pelo horário e profissional
      const dayAppointments = await storage.getAppointmentsByDate(sameDate);
      
      // Verificar agendamentos no mesmo horário
      const conflictingAppointments = dayAppointments.filter(a => {
        const existingDate = new Date(a.appointment_date);
        // Comparar usando horários locais
        const isSameTime = 
          existingDate.getHours() === appointmentDate.getHours() &&
          existingDate.getMinutes() === appointmentDate.getMinutes();
          
        const isSameProfessional = a.professional_id === appointmentData.professional_id;
        const isActive = a.status !== "cancelled";
        
        if (isSameTime && isSameProfessional && isActive) {
          console.log(`[NOVA ABORDAGEM] CONFLITO ENCONTRADO: Agendamento #${a.id} às ${existingDate.toISOString()}`);
        }
        
        return isSameTime && isSameProfessional && isActive;
      });
      
      if (conflictingAppointments.length > 0) {
        return res.status(400).json({ 
          message: "Este horário já está reservado para outro cliente. Escolha um horário diferente.",
          debug: {
            conflicting_appointments: conflictingAppointments.map(a => ({
              id: a.id,
              date: new Date(a.appointment_date).toISOString()
            }))
          }
        });
      }
      
      // Já validamos o serviço no início da função
      
      // LOGS ADICIONAIS para debug do problema de timezone
      console.log(`[DEBUG TIMEZONE] Hora na data ISO: ${appointmentDate.toISOString()}`);
      console.log(`[DEBUG TIMEZONE] Hora local: ${appointmentDate.getHours()}:${appointmentDate.getMinutes()}`);
      console.log(`[DEBUG TIMEZONE] Hora UTC: ${appointmentDate.getUTCHours()}:${appointmentDate.getUTCMinutes()}`);
      
      // Validate professional exists
      const professional = await storage.getProfessional(appointmentData.professional_id);
      if (!professional) {
        return res.status(400).json({ message: "Profissional inválido" });
      }
      
      // Check if professional offers this service
      if (!(professional.services_offered as number[]).includes(appointmentData.service_id)) {
        return res.status(400).json({ message: "Este profissional não oferece o serviço selecionado" });
      }
      
      // Get day of week for the appointment
      const dayOfWeek = appointmentDate.getDay();
      
      // Check if the barbershop is open on this day
      if (!barbershopSettings.open_days.includes(dayOfWeek)) {
        return res.status(400).json({ message: "A barbearia está fechada neste dia" });
      }
      
      // NOVA ABORDAGEM: Usar horários locais diretamente
      const appointmentTime = {
        hours: appointmentDate.getHours(),
        minutes: appointmentDate.getMinutes()
      };
      
      console.log(`[NOVA ABORDAGEM] Verificando horários - Agendamento: ${appointmentTime.hours}:${appointmentTime.minutes}, Barbearia abre: ${openTime.hours}:${openTime.minutes}, fecha: ${closeTime.hours}:${closeTime.minutes}`);
      
      // Check if appointment time is before opening time
      if (appointmentTime.hours < openTime.hours || 
          (appointmentTime.hours === openTime.hours && appointmentTime.minutes < openTime.minutes)) {
        return res.status(400).json({ 
          message: `O horário de agendamento (${appointmentTime.hours}:${String(appointmentTime.minutes).padStart(2, '0')}) é anterior ao horário de abertura da barbearia (${openTime.hours}:${String(openTime.minutes).padStart(2, '0')}).`,
          debug: {
            appointment_time: `${appointmentTime.hours}:${appointmentTime.minutes}`,
            barbershop_open_time: `${openTime.hours}:${openTime.minutes}`
          }
        });
      }
      
      // NOVA ABORDAGEM: Calculando fim do serviço usando horários locais
      // Verificar se o horário de término (hora início + duração) está após o fechamento
      const shopEndCheckDate = new Date(appointmentDate);
      shopEndCheckDate.setMinutes(shopEndCheckDate.getMinutes() + service.duration);
      
      const shopEndTimeObj = {
        hours: shopEndCheckDate.getHours(),
        minutes: shopEndCheckDate.getMinutes()
      };
      
      console.log(`[NOVA ABORDAGEM] Verificando horário de término - Serviço: ${service.duration} min`);
      console.log(`[NOVA ABORDAGEM] Horário início: ${appointmentTime.hours}:${appointmentTime.minutes}`);
      console.log(`[NOVA ABORDAGEM] Horário término calculado: ${shopEndTimeObj.hours}:${shopEndTimeObj.minutes}`);
      console.log(`[NOVA ABORDAGEM] Horário fechamento da barbearia: ${closeTime.hours}:${closeTime.minutes}`);
      
      if (shopEndTimeObj.hours > closeTime.hours || 
          (shopEndTimeObj.hours === closeTime.hours && shopEndTimeObj.minutes > closeTime.minutes)) {
        return res.status(400).json({ 
          message: `O serviço de ${service.duration} minutos agendado para ${appointmentTime.hours}:${String(appointmentTime.minutes).padStart(2, '0')} terminaria às ${shopEndTimeObj.hours}:${String(shopEndTimeObj.minutes).padStart(2, '0')}, após o horário de fechamento da barbearia (${closeTime.hours}:${String(closeTime.minutes).padStart(2, '0')}).`,
          debug: {
            appointment_time: `${appointmentTime.hours}:${appointmentTime.minutes}`,
            service_duration: service.duration,
            calculated_end_time: `${shopEndTimeObj.hours}:${shopEndTimeObj.minutes}`,
            barbershop_close_time: `${closeTime.hours}:${closeTime.minutes}`
          }
        });
      }
      
      // Check if the professional is available on this day
      const availabilityList = await storage.getAvailabilityByProfessionalId(appointmentData.professional_id);
      const dayAvailability = availabilityList.find(a => a.day_of_week === dayOfWeek);
      
      if (!dayAvailability || !dayAvailability.is_available) {
        const diasSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
        const diaSemana = diasSemana[dayOfWeek];
        
        return res.status(400).json({ 
          message: `O profissional não está disponível às ${diaSemana}s. Por favor escolha outro dia ou outro profissional.`,
          debug: {
            professional_id: appointmentData.professional_id,
            day_of_week: dayOfWeek,
            day_name: diaSemana
          }
        });
      }
      
      // Check if the appointment is within the professional's availability hours
      const profStartTime = parseTime(dayAvailability.start_time);
      const profEndTime = parseTime(dayAvailability.end_time);
      
      // Check if appointment time is before professional's start time
      if (appointmentTime.hours < profStartTime.hours || 
          (appointmentTime.hours === profStartTime.hours && appointmentTime.minutes < profStartTime.minutes)) {
        return res.status(400).json({ 
          message: "O horário de agendamento é anterior ao horário de disponibilidade do profissional."
        });
      }
      
      // NOVA ABORDAGEM: Verificar se o fim do serviço excede o horário do profissional
      // usando cálculos com horário local
      const profEndCheckDate = new Date(appointmentDate);
      profEndCheckDate.setMinutes(profEndCheckDate.getMinutes() + service.duration);
      
      const profAvailEndTimeObj = {
        hours: profEndCheckDate.getHours(),
        minutes: profEndCheckDate.getMinutes()
      };
      
      console.log(`[NOVA ABORDAGEM] Verificando disponibilidade do profissional:`);
      console.log(`[NOVA ABORDAGEM] Horário fim calculado: ${profAvailEndTimeObj.hours}:${profAvailEndTimeObj.minutes}`);
      console.log(`[NOVA ABORDAGEM] Horário fim disponibilidade prof: ${profEndTime.hours}:${profEndTime.minutes}`);
      
      if (profAvailEndTimeObj.hours > profEndTime.hours || 
          (profAvailEndTimeObj.hours === profEndTime.hours && profAvailEndTimeObj.minutes > profEndTime.minutes)) {
        return res.status(400).json({ 
          message: "O serviço agendado terminaria após o horário de disponibilidade do profissional."
        });
      }
      
      // NOVA ABORDAGEM: Verifique conflitos usando horários locais
      const appointments = await storage.getAppointmentsByDate(sameDate);
      const conflictingAppointment = appointments.find(a => {
        if (a.professional_id !== appointmentData.professional_id || a.status === "cancelled") {
          return false;
        }
        
        // Trabalhar com datas em horário local
        const existingStartTime = new Date(a.appointment_date);
        const existingService = service; // Simplificado, o ideal seria buscar o serviço real
        const existingEndTime = new Date(existingStartTime);
        existingEndTime.setMinutes(existingEndTime.getMinutes() + (existingService?.duration || 30));
        
        // O horário do novo agendamento
        const newStartTime = new Date(appointmentDate);
        const newEndTime = new Date(newStartTime);
        newEndTime.setMinutes(newEndTime.getMinutes() + service.duration);
        
        console.log(`[NOVA ABORDAGEM] Verificando conflito com agendamento #${a.id}:`);
        console.log(`[NOVA ABORDAGEM] Existente: ${existingStartTime.toLocaleTimeString()} até ${existingEndTime.toLocaleTimeString()}`);
        console.log(`[NOVA ABORDAGEM] Novo: ${newStartTime.toLocaleTimeString()} até ${newEndTime.toLocaleTimeString()}`);
        
        // Verificar sobreposição de horários
        return (
          (newStartTime >= existingStartTime && newStartTime < existingEndTime) ||
          (newEndTime > existingStartTime && newEndTime <= existingEndTime) ||
          (newStartTime <= existingStartTime && newEndTime >= existingEndTime)
        );
      });
      
      if (conflictingAppointment) {
        return res.status(400).json({ 
          message: "Este horário já está reservado para outro cliente. Escolha um horário diferente."
        });
      }
      
      // Criar um objeto com a data corrigida para horário local
      const fixedAppointmentData = {
        ...appointmentData,
        // Usar a data ajustada que criamos acima
        appointment_date: appointmentDate
      };
      
      // Log para diagnóstico
      console.log(`Data original recebida: ${req.body.appointment_date}`);
      console.log(`Data ajustada para salvamento: ${fixedAppointmentData.appointment_date.toISOString()}`);
      
      // Create the appointment
      const appointment = await storage.createAppointment(fixedAppointmentData);
      
      // If this is a loyalty reward redemption, update the client's loyalty record
      if (appointmentData.is_loyalty_reward) {
        await storage.useReward(appointmentData.client_phone);
      }
      
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create appointment" });
      }
    }
  });

  // GET /api/appointments/lookup - Lookup appointments by client phone (name is optional)
  app.post("/api/appointments/lookup", async (req: Request, res: Response) => {
    try {
      const lookupData = appointmentLookupSchema.parse(req.body);
      const appointments = await storage.getAppointmentsByClientPhone(lookupData.client_phone);
      
      // Filter by client name (case insensitive) only if name is provided
      let clientAppointments = appointments;
      if (lookupData.client_name && lookupData.client_name.trim() !== '') {
        clientAppointments = appointments.filter(
          a => a.client_name.toLowerCase() === lookupData.client_name!.toLowerCase()
        );
      }
      
      // Enrich with service and professional details
      const services = await storage.getAllServices();
      const professionals = await storage.getAllProfessionals();
      
      const enrichedAppointments = await Promise.all(clientAppointments.map(async appointment => {
        const service = services.find(s => s.id === appointment.service_id);
        const professional = professionals.find(p => p.id === appointment.professional_id);
        
        return {
          ...appointment,
          service_name: service?.name || "Unknown Service",
          service_price: service?.price || 0,
          professional_name: professional?.name || "Unknown Professional"
        };
      }));
      
      res.json(enrichedAppointments);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid lookup data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to lookup appointments" });
      }
    }
  });

  // PUT /api/appointments/:id/status - Update appointment status (auth required)
  app.put("/api/appointments/:id/status", async (req: Request, res: Response) => {
    try {
      // Only authenticated users can update appointment status
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const appointmentId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["scheduled", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedAppointment = await storage.updateAppointmentStatus(appointmentId, status);
      
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update appointment status" });
    }
  });

  // GET /api/appointments - Get all appointments (auth required)
  app.get("/api/appointments", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Optional date filter
      const dateFilter = req.query.date as string;
      let appointments: any[] = [];
      
      if (dateFilter) {
        const date = parseISO(dateFilter);
        appointments = await storage.getAppointmentsByDate(date);
      } else {
        appointments = await storage.getAllAppointments();
      }
      
      // Professional filter (barber can only see their own appointments)
      if (req.user?.role === "barber") {
        const user = await storage.getUserByUsername(req.user.username);
        const professional = (await storage.getAllProfessionals()).find(
          p => p.name === user?.name
        );
        
        if (professional) {
          appointments = appointments.filter(a => a.professional_id === professional.id);
        } else {
          appointments = [];
        }
      }
      
      // Enrich with service and professional details
      const services = await storage.getAllServices();
      const professionals = await storage.getAllProfessionals();
      
      const enrichedAppointments = appointments.map(appointment => {
        const service = services.find(s => s.id === appointment.service_id);
        const professional = professionals.find(p => p.id === appointment.professional_id);
        
        return {
          ...appointment,
          service_name: service?.name || "Unknown Service",
          service_price: service?.price || 0,
          professional_name: professional?.name || "Unknown Professional"
        };
      });
      
      res.json(enrichedAppointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // GET /api/loyalty/:phone - Get loyalty status for a client
  app.get("/api/loyalty/:phone", async (req: Request, res: Response) => {
    try {
      const clientPhone = req.params.phone;
      const clientReward = await storage.getClientRewardByPhone(clientPhone);
      
      if (!clientReward) {
        return res.status(404).json({ message: "Loyalty record not found" });
      }
      
      // Calculate reward stats
      const totalAttendances = clientReward.total_attendances;
      const usedRewards = clientReward.free_services_used;
      const eligibleRewards = Math.floor(totalAttendances / 10) - usedRewards;
      const attendancesUntilNextReward = totalAttendances % 10 === 0 ? 0 : 10 - (totalAttendances % 10);
      
      res.json({
        client_name: clientReward.client_name,
        client_phone: clientReward.client_phone,
        total_attendances: totalAttendances,
        free_services_used: usedRewards,
        eligible_rewards: eligibleRewards,
        attendances_until_next_reward: attendancesUntilNextReward,
        last_reward_at: clientReward.last_reward_at
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch loyalty status" });
    }
  });

  // POST /api/loyalty/lookup - Lookup loyalty status by phone
  app.post("/api/loyalty/lookup", async (req: Request, res: Response) => {
    try {
      const lookupData = loyaltyLookupSchema.parse(req.body);
      const clientReward = await storage.getClientRewardByPhone(lookupData.client_phone);
      
      if (!clientReward) {
        return res.status(404).json({ message: "No loyalty record found for this phone number" });
      }
      
      // Calculate reward stats
      const totalAttendances = clientReward.total_attendances;
      const usedRewards = clientReward.free_services_used;
      const eligibleRewards = Math.floor(totalAttendances / 10) - usedRewards;
      const attendancesUntilNextReward = totalAttendances % 10 === 0 ? 0 : 10 - (totalAttendances % 10);
      
      res.json({
        client_name: clientReward.client_name,
        client_phone: clientReward.client_phone,
        total_attendances: totalAttendances,
        free_services_used: usedRewards,
        eligible_rewards: eligibleRewards,
        attendances_until_next_reward: attendancesUntilNextReward,
        last_reward_at: clientReward.last_reward_at
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid lookup data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to lookup loyalty status" });
      }
    }
  });

  // POST /api/loyalty/reward (admin only) - Manually give a reward
  app.post("/api/loyalty/reward", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { client_phone } = req.body;
      
      if (!client_phone) {
        return res.status(400).json({ message: "Client phone is required" });
      }
      
      const clientReward = await storage.getClientRewardByPhone(client_phone);
      
      if (!clientReward) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Increment attendances to make them eligible for a reward
      const attendancesNeeded = 10 - (clientReward.total_attendances % 10);
      if (attendancesNeeded > 0) {
        // Update client_reward to make them eligible
        for (let i = 0; i < attendancesNeeded; i++) {
          await storage.incrementAttendanceCount(client_phone);
        }
      }
      
      res.json({ message: "Reward added successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to add reward" });
    }
  });

  // GET /api/dashboard/stats - Get dashboard statistics (auth required)
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const period = req.query.period as string || "month"; // "week", "month", or "year"
      const appointments = await storage.getAllAppointments();
      const services = await storage.getAllServices();
      
      // Filter by date range
      const now = new Date();
      const filteredAppointments = appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.appointment_date);
        
        if (period === "week") {
          const lastWeek = new Date(now);
          lastWeek.setDate(lastWeek.getDate() - 7);
          return appointmentDate >= lastWeek && appointmentDate <= now;
        } else if (period === "month") {
          const lastMonth = new Date(now);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return appointmentDate >= lastMonth && appointmentDate <= now;
        } else if (period === "year") {
          const lastYear = new Date(now);
          lastYear.setFullYear(lastYear.getFullYear() - 1);
          return appointmentDate >= lastYear && appointmentDate <= now;
        }
        
        return true;
      });
      
      // Calculate stats
      const completedAppointments = filteredAppointments.filter(
        a => a.status === "completed"
      );
      
      const totalRevenue = completedAppointments.reduce((sum, appointment) => {
        const service = services.find(s => s.id === appointment.service_id);
        return sum + (service?.price || 0);
      }, 0);
      
      const totalAppointments = completedAppointments.length;
      
      // Calculate conversion rate (completed / (scheduled + completed + cancelled))
      const totalCreated = filteredAppointments.length;
      const conversionRate = totalCreated > 0 
        ? Math.round((totalAppointments / totalCreated) * 100) 
        : 0;
      
      res.json({
        total_revenue: totalRevenue,
        total_appointments: totalAppointments,
        conversion_rate: conversionRate
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // GET /api/dashboard/chart - Get chart data for dashboard (auth required)
  app.get("/api/dashboard/chart", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const chartType = req.query.type as string || "daily"; // "daily" or "professional"
      const appointments = await storage.getAllAppointments();
      const services = await storage.getAllServices();
      const professionals = await storage.getAllProfessionals();
      
      // Only consider completed appointments
      const completedAppointments = appointments.filter(a => a.status === "completed");
      
      if (chartType === "daily") {
        // Group by day and sum revenue
        const dailyData = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const dateStr = format(date, "yyyy-MM-dd");
          const dayAppointments = completedAppointments.filter(appointment => {
            const appointmentDate = new Date(appointment.appointment_date);
            return format(appointmentDate, "yyyy-MM-dd") === dateStr;
          });
          
          const dayRevenue = dayAppointments.reduce((sum, appointment) => {
            const service = services.find(s => s.id === appointment.service_id);
            return sum + (service?.price || 0);
          }, 0);
          
          dailyData.push({
            date: format(date, "dd/MM"),
            revenue: dayRevenue,
            appointments: dayAppointments.length
          });
        }
        
        res.json(dailyData);
      } else if (chartType === "professional") {
        // Group by professional and sum revenue
        const professionalData = professionals.map(professional => {
          const proAppointments = completedAppointments.filter(
            a => a.professional_id === professional.id
          );
          
          const proRevenue = proAppointments.reduce((sum, appointment) => {
            const service = services.find(s => s.id === appointment.service_id);
            return sum + (service?.price || 0);
          }, 0);
          
          return {
            professional_name: professional.name,
            revenue: proRevenue,
            appointments: proAppointments.length
          };
        });
        
        res.json(professionalData);
      } else {
        res.status(400).json({ message: "Invalid chart type" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });
  
  // GET /api/barbershop-settings - Get barbershop settings
  app.get("/api/barbershop-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getBarbershopSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch barbershop settings" });
    }
  });
  
  // POST /api/barbershop-settings - Create barbershop settings
  app.post("/api/barbershop-settings", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = insertBarbershopSettingsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid barbershop settings data", 
          errors: validationResult.error.errors 
        });
      }
      
      const settings = await storage.createBarbershopSettings(validationResult.data);
      res.status(201).json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to create barbershop settings" });
    }
  });
  
  // PUT /api/barbershop-settings - Update barbershop settings
  app.put("/api/barbershop-settings", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validationResult = insertBarbershopSettingsSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid barbershop settings data", 
          errors: validationResult.error.errors 
        });
      }
      
      const updatedSettings = await storage.updateBarbershopSettings(validationResult.data);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update barbershop settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to parse time string (HH:MM) to hours and minutes
function parseTime(timeStr: string): { hours: number, minutes: number } {
  const [hoursStr, minutesStr] = timeStr.split(":");
  return {
    hours: parseInt(hoursStr, 10),
    minutes: parseInt(minutesStr, 10)
  };
}
