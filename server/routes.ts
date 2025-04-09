import { format, addDays, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import type { Express, Request, Response, NextFunction } from 'express';
import { z } from "zod";
import { createServer, type Server } from 'http';
import { parseTime } from './utils';
import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import { storage } from './storage';
import { setupAuth } from './auth';
import {
  insertServiceSchema,
  insertProfessionalSchema,
  insertAvailabilitySchema,
  insertAppointmentSchema,
  insertClientRewardSchema,
  insertBarbershopSettingsSchema,
  insertProductSchema,
  insertOrderSchema,
  type InsertAppointment
} from '@shared/schema';

// Função auxiliar para calcular o offset de fuso horário
function getTimezoneOffset(timezone: string): number {
  // Função simplificada que retorna o offset em minutos para determinadas regiões
  const timezoneOffsets: Record<string, number> = {
    'America/Sao_Paulo': -180, // UTC-3
    'America/New_York': -240,  // UTC-4
    'Europe/London': 0,        // UTC
    'Asia/Tokyo': 540,         // UTC+9
    'Australia/Sydney': 600    // UTC+10
  };
  
  return timezoneOffsets[timezone] || 0;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar autenticação
  setupAuth(app);
  
  // Configurar CORS para aceitar requisições do domínio da ferramenta
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
  });
  
  // Middleware para logging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // USERS ENDPOINTS
  
  // GET /api/users - Get all users (admin only)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // DELETE /api/users/:id - Delete user (admin only)
  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.id);
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  // SERVICES ENDPOINTS

  // GET /api/services - Get all services
  app.get("/api/services", async (req: Request, res: Response) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to get services" });
    }
  });

  // GET /api/services/:id - Get service by id
  app.get("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to get service" });
    }
  });

  // POST /api/services - Create service (admin only)
  app.post("/api/services", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
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

  // PUT /api/services/:id - Update service (admin only)
  app.put("/api/services/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const serviceId = parseInt(req.params.id);
      const serviceData = req.body;
      const updated = await storage.updateService(serviceId, serviceData);
      
      if (!updated) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  // DELETE /api/services/:id - Delete service (admin only)
  app.delete("/api/services/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const serviceId = parseInt(req.params.id);
      const deleted = await storage.deleteService(serviceId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });
  
  // PROFESSIONALS ENDPOINTS

  // GET /api/professionals - Get all professionals
  app.get("/api/professionals", async (req: Request, res: Response) => {
    try {
      const professionals = await storage.getAllProfessionals();
      res.json(professionals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get professionals" });
    }
  });

  // GET /api/professionals/:id - Get professional by id
  app.get("/api/professionals/:id", async (req: Request, res: Response) => {
    try {
      const professionalId = parseInt(req.params.id);
      const professional = await storage.getProfessional(professionalId);
      
      if (!professional) {
        return res.status(404).json({ message: "Professional not found" });
      }
      
      res.json(professional);
    } catch (error) {
      res.status(500).json({ message: "Failed to get professional" });
    }
  });

  // GET /api/professionals/service/:serviceId - Get professionals by service
  app.get("/api/professionals/service/:serviceId", async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const professionals = await storage.getProfessionalsByServiceId(serviceId);
      res.json(professionals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get professionals by service" });
    }
  });

  // POST /api/professionals - Create professional (admin only)
  app.post("/api/professionals", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
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

  // PUT /api/professionals/:id - Update professional (admin only)
  app.put("/api/professionals/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const professionalId = parseInt(req.params.id);
      const professionalData = req.body;
      const updated = await storage.updateProfessional(professionalId, professionalData);
      
      if (!updated) {
        return res.status(404).json({ message: "Professional not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update professional" });
    }
  });
  
  // AVAILABILITY ENDPOINTS

  // GET /api/availability/professional/:professionalId - Get availability by professional
  app.get("/api/availability/professional/:professionalId", async (req: Request, res: Response) => {
    try {
      const professionalId = parseInt(req.params.professionalId);
      const availability = await storage.getAvailabilityByProfessionalId(professionalId);
      res.json(availability);
    } catch (error) {
      res.status(500).json({ message: "Failed to get availability" });
    }
  });

  // POST /api/availability - Create availability (admin only)
  app.post("/api/availability", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
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
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
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
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
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

  // GET /api/availability/:professionalId/:date - Get time slots for date
  app.get("/api/availability/:professionalId/:date", async (req: Request, res: Response) => {
    try {
      const professionalId = parseInt(req.params.professionalId);
      const dateStr = req.params.date;
      const timezone = req.query.timezone as string || 'America/Sao_Paulo';
      
      // Extrair horário de início e fim da jornada das configurações
      const settings = await storage.getBarbershopSettings();
      const startTime = settings.open_time || '09:00';
      const endTime = settings.close_time || '18:00';
      const slotDuration = settings.slot_duration || 30;
      
      // Parse da data da requisição
      const dateObj = parseISO(dateStr);
      
      // Verificar se a data é válida
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      console.log(`Buscando disponibilidade para ${dateStr} no fuso ${timezone}`);
      
      // Buscar disponibilidade configurada para o profissional
      const availabilitySettings = await storage.getAvailabilityByProfessionalId(professionalId);
      console.log(`Configurações de disponibilidade encontradas: ${availabilitySettings.length}`);
      
      // Verificar se há configuração para o dia da semana 
      const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, ...
      const dayConfig = availabilitySettings.find(a => a.day_of_week === dayOfWeek);
      
      if (!dayConfig) {
        return res.json({ 
          available_slots: [],
          message: "Professional is not available on this day",
          debug_info: {
            day_of_week: dayOfWeek,
            professional_id: professionalId,
            date: dateStr
          }
        });
      }
      
      // Se tiver configuração específica, usar as horas dela
      const dayStartTime = dayConfig.start_time || startTime;
      const dayEndTime = dayConfig.end_time || endTime;
      
      console.log(`Horário configurado: ${dayStartTime} - ${dayEndTime}`);
      
      // Parse dos horários
      const startHourMin = parseTime(dayStartTime);
      const endHourMin = parseTime(dayEndTime);
      
      console.log(`Início: ${startHourMin.hours}:${startHourMin.minutes}, Fim: ${endHourMin.hours}:${endHourMin.minutes}`);
      
      // Criar slots de tempo possíveis para o dia
      const slots: string[] = [];
      const slotCount = Math.floor(
        ((endHourMin.hours * 60 + endHourMin.minutes) - 
        (startHourMin.hours * 60 + startHourMin.minutes)) / slotDuration
      );
      
      for (let i = 0; i <= slotCount; i++) {
        const minutes = (startHourMin.hours * 60 + startHourMin.minutes) + (i * slotDuration);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours <= endHourMin.hours) {
          // Se horas forem iguais, verificar minutos
          if (hours < endHourMin.hours || (hours === endHourMin.hours && mins <= endHourMin.minutes)) {
            slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
          }
        }
      }
      
      console.log(`Total de slots possíveis: ${slots.length}`);
      
      // Buscar agendamentos do profissional para a data
      const appointments = await storage.getAppointmentsByProfessionalId(professionalId);
      
      // Filtrar apenas agendamentos da data específica e que não estejam cancelados
      const dateAppointments = appointments.filter(app => {
        const appDate = new Date(app.appointment_date);
        return (
          appDate.getFullYear() === dateObj.getFullYear() &&
          appDate.getMonth() === dateObj.getMonth() &&
          appDate.getDate() === dateObj.getDate() &&
          app.status !== 'cancelled'
        );
      });
      
      console.log(`Agendamentos para a data: ${dateAppointments.length}`);
      
      // Extrair horários já agendados
      const bookedSlots = dateAppointments.map(app => {
        const appDate = new Date(app.appointment_date);
        return `${appDate.getHours().toString().padStart(2, '0')}:${appDate.getMinutes().toString().padStart(2, '0')}`;
      });
      
      console.log(`Slots já agendados: ${bookedSlots.join(', ')}`);
      
      // Remover slots já agendados e no passado
      const now = new Date();
      const isToday = (
        now.getFullYear() === dateObj.getFullYear() &&
        now.getMonth() === dateObj.getMonth() &&
        now.getDate() === dateObj.getDate()
      );
      
      // Fazer um mapeamento de diagnóstico com detalhes sobre cada slot
      interface SlotDetail {
        time: string;
        available: boolean;
        is_past: boolean;
        conflicts: number[] | null;
      }
      
      const slotDetails: SlotDetail[] = slots.map(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = new Date(dateObj);
        slotTime.setHours(hours, minutes, 0, 0);
        
        // Verificar se o horário já passou (apenas hoje)
        const isPast = isToday && slotTime < now;
        
        // Verificar se há conflito com agendamento existente
        const conflicts = dateAppointments
          .filter(app => {
            const appDate = new Date(app.appointment_date);
            return appDate.getHours() === hours && appDate.getMinutes() === minutes;
          })
          .map(app => app.id);
        
        return {
          time: slot,
          available: !isPast && conflicts.length === 0,
          is_past: isPast,
          conflicts: conflicts.length > 0 ? conflicts : null
        };
      });

      // Filtrar apenas os slots disponíveis para a resposta principal
      const availableSlots = slotDetails
        .filter(slot => slot.available)
        .map(slot => slot.time);
      
      console.log(`Slots disponíveis: ${availableSlots.length}`);
      
      // Retornar os slots disponíveis
      res.json({
        available_slots: availableSlots,
        professional_id: professionalId,
        date: dateStr,
        debug_info: {
          settings: {
            start_time: dayStartTime,
            end_time: dayEndTime,
            slot_duration: slotDuration
          },
          slot_details: slotDetails,
          day_of_week: dayOfWeek
        }
      });
    } catch (error) {
      console.error("Erro ao buscar disponibilidade:", error);
      res.status(500).json({ 
        message: "Failed to get availability slots",
        error: (error as Error).message 
      });
    }
  });
  
  // APPOINTMENTS ENDPOINTS
  
  // POST /api/appointments - Create appointment
  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      // Parâmetros opcionais
      const timezone = req.query.timezone as string || 'America/Sao_Paulo';
      const tzOffset = getTimezoneOffset(timezone);
      
      console.log(`Criando agendamento no fuso horário: ${timezone}, offset: ${tzOffset} minutos`);
      
      // Obtém os dados do corpo da requisição
      const appointmentData = req.body;
      
      try {
        console.log("Dados do agendamento recebidos:", appointmentData);
        
        // Verificar se há timestamp especial LOCAL para processar
        let appointmentDate: Date;
        let processedAppointmentData: InsertAppointment;
        
        if (typeof appointmentData.appointment_date === 'string' && 
            appointmentData.appointment_date.endsWith('LOCAL')) {
          // String com formato especial para manter fuso horário local
          console.log("Detectado formato LOCAL para data:", appointmentData.appointment_date);
          
          // Remover o sufixo LOCAL
          const dateStr = appointmentData.appointment_date.replace('LOCAL', '');
          const originalDate = new Date(dateStr);
          
          // Não ajustar o fuso horário, manter como está
          appointmentDate = originalDate;
          
          console.log(`Data do agendamento interpretada como: ${appointmentDate.toISOString()}`);
          
          // Criar novo objeto com a data processada
          processedAppointmentData = {
            ...req.body,
            appointment_date: appointmentDate
          };
        } else {
          // Usar processamento padrão
          processedAppointmentData = insertAppointmentSchema.parse(req.body);
          appointmentDate = new Date(processedAppointmentData.appointment_date);
        }
        
        // Verificar se a data é válida
        if (isNaN(appointmentDate.getTime())) {
          return res.status(400).json({ 
            message: "Invalid appointment date", 
            received: processedAppointmentData.appointment_date 
          });
        }
        
        console.log(`Data final do agendamento: ${appointmentDate.toISOString()}`);
        
        // Verificar se o horário já está agendado
        const professionalId = processedAppointmentData.professional_id;
        const appointments = await storage.getAppointmentsByProfessionalId(professionalId);
        
        // Filtrar agendamentos na mesma data e hora
        const conflictingAppointments = appointments.filter(app => {
          const appDate = new Date(app.appointment_date);
          const isSameDate = (
            appDate.getFullYear() === appointmentDate.getFullYear() &&
            appDate.getMonth() === appointmentDate.getMonth() &&
            appDate.getDate() === appointmentDate.getDate() &&
            appDate.getHours() === appointmentDate.getHours() &&
            appDate.getMinutes() === appointmentDate.getMinutes()
          );
          
          return isSameDate && app.status !== 'cancelled';
        });
        
        if (conflictingAppointments.length > 0) {
          console.log("Conflito de horário detectado:", conflictingAppointments);
          return res.status(400).json({ 
            message: "This time slot is already booked",
            conflicts: conflictingAppointments
          });
        }
        
        // Criar o agendamento
        const appointment = await storage.createAppointment(processedAppointmentData);
        
        // Se marcado como resgate de fidelidade, registrar o uso da recompensa
        if (processedAppointmentData.is_loyalty_reward) {
          try {
            await storage.useReward(processedAppointmentData.client_phone);
            console.log(`Recompensa de fidelidade utilizada para ${processedAppointmentData.client_phone}`);
          } catch (err) {
            // Não impedir o agendamento se o registro de recompensa falhar
            console.error("Erro ao registrar uso de recompensa:", err);
          }
        }
        
        res.status(201).json(appointment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid appointment data", 
            errors: error.errors,
            received: processedAppointmentData
          });
        }
        throw error;
      }
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      res.status(500).json({ 
        message: "Failed to create appointment",
        error: (error as Error).message 
      });
    }
  });

  // POST /api/appointments/lookup - Lookup appointment by client phone
  app.post("/api/appointments/lookup", async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const appointments = await storage.getAppointmentsByClientPhone(phone);
      
      // Ordenar por data, mais recente primeiro
      appointments.sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Verificar pontos de fidelidade
      const clientReward = await storage.getClientRewardByPhone(phone);
      
      res.json({
        appointments,
        rewardPoints: clientReward ? clientReward.attendance_count : 0,
        hasReward: clientReward ? clientReward.attendance_count >= 10 : false
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to lookup appointments" });
    }
  });

  // GET /api/appointments/:id - Get appointment by id
  app.get("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointmentById(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get appointment" });
    }
  });

  // PUT /api/appointments/:id/status - Update appointment status
  app.put("/api/appointments/:id/status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const appointmentId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['scheduled', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const appointment = await storage.getAppointmentById(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Se o agendamento estiver sendo marcado como concluído, registrar ponto de fidelidade
      if (status === 'completed' && appointment.status !== 'completed') {
        try {
          // Verificar se já existe recompensa para o cliente
          let clientReward = await storage.getClientRewardByPhone(appointment.client_phone);
          
          if (clientReward) {
            // Incrementar contagem de atendimentos
            clientReward = await storage.incrementAttendanceCount(appointment.client_phone);
            console.log(`Atendimento registrado para ${appointment.client_phone}, pontos atuais: ${clientReward.attendance_count}`);
          } else {
            // Criar novo registro com 1 atendimento
            clientReward = await storage.createClientReward({
              client_phone: appointment.client_phone,
              client_name: appointment.client_name,
              attendance_count: 1
            });
            console.log(`Novo cliente registrado: ${appointment.client_phone}, pontos: 1`);
          }
        } catch (err) {
          // Não impedir a atualização se o registro de fidelidade falhar
          console.error("Erro ao registrar pontos de fidelidade:", err);
        }
      }
      
      const updatedAppointment = await storage.updateAppointmentStatus(appointmentId, status);
      
      if (!updatedAppointment) {
        return res.status(500).json({ message: "Failed to update appointment status" });
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
      
      // Optional date filters
      const dateFilter = req.query.date as string;
      const startDateFilter = req.query.startDate as string;
      const endDateFilter = req.query.endDate as string;
      
      // Verificar parâmetros de profissionais 
      // Pode ser um único valor ou um array (professionalId[] quando múltiplos)
      const professionalIdParam = req.query.professionalId;
      
      // Log detalhado dos filtros recebidos
      console.log("Filtros recebidos:", { 
        dateFilter, 
        startDateFilter, 
        endDateFilter, 
        professionalIdFilter: professionalIdParam,
        professionalIdType: Array.isArray(professionalIdParam) ? "array" : typeof professionalIdParam
      });
      
      let appointments: any[] = [];
      
      // Sempre buscar todos os agendamentos primeiro
      console.log("Buscando todos os agendamentos");
      appointments = await storage.getAllAppointments();
      console.log(`Total de agendamentos encontrados: ${appointments.length}`);
      
      // Processar os IDs de profissionais
      // Caso 1: "all" - não filtrar, mostrar todos
      if (professionalIdParam === "all") {
        console.log("Parâmetro all explicitamente enviado - mostrando TODOS os profissionais");
        // Não aplicar filtro de profissional
      } 
      // Caso 2: array de IDs - filtrar por qualquer um deles (OR)
      else if (Array.isArray(professionalIdParam)) {
        console.log(`Recebido array de IDs de profissionais: ${professionalIdParam}`);
        
        // Converter cada ID para número e remover valores inválidos
        const professionalIds = professionalIdParam
          .map(id => parseInt(id as string))
          .filter(id => !isNaN(id));
          
        console.log(`IDs de profissionais válidos para filtro: ${professionalIds.join(", ")}`);
        
        if (professionalIds.length > 0) {
          // Filtrar agendamentos por qualquer um dos IDs fornecidos (OR)
          const originalCount = appointments.length;
          appointments = appointments.filter(a => 
            professionalIds.includes(Number(a.professional_id))
          );
          
          // Log dos IDs nos agendamentos para diagnóstico  
          console.log("Total de agendamentos antes do filtro:", originalCount);
          console.log("IDs de profissionais nos agendamentos:", 
            appointments.map(a => a.professional_id).join(", "));
          
          // Logar cada agendamento encontrado com seu ID de profissional
          appointments.forEach(a => {
            console.log(`Agendamento compatível: ${a.id} - Prof ID: ${a.professional_id}`);
          });
          
          console.log(`Total de agendamentos após filtro: ${appointments.length}`);
        }
      }
      // Caso 3: ID único - filtrar apenas por esse profissional  
      else if (professionalIdParam && 
          professionalIdParam !== "" && 
          professionalIdParam !== "undefined") {
          
        const professionalIdFilter = parseInt(professionalIdParam as string);
        
        if (!isNaN(professionalIdFilter)) {
          console.log(`Filtrando para o profissional ID: ${professionalIdFilter}`);
          
          // Filtrar pelo ID específico
          const originalCount = appointments.length;
          appointments = appointments.filter(a => Number(a.professional_id) === professionalIdFilter);
          
          console.log(`Agendamentos após filtro: ${appointments.length} de ${originalCount}`);
        }
      }
      
      console.log(`Total de agendamentos antes de filtrar por data: ${appointments.length}`);
      
      // Aplicar filtro de data única se fornecido
      if (dateFilter) {
        const date = parseISO(dateFilter);
        const dateString = format(date, "yyyy-MM-dd");
        console.log(`Filtrando por data única: ${dateString}`);
        
        appointments = appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.appointment_date);
          const appointmentDateStr = format(appointmentDate, "yyyy-MM-dd");
          const isMatch = appointmentDateStr === dateString;
          return isMatch;
        });
      }
      // Aplicar filtro de intervalo de datas se fornecido
      else if (startDateFilter && endDateFilter) {
        const startDate = parseISO(startDateFilter);
        const endDate = parseISO(endDateFilter);
        console.log(`Filtrando por intervalo de datas: ${format(startDate, "yyyy-MM-dd")} até ${format(endDate, "yyyy-MM-dd")}`);
        
        // Ajustar endDate para incluir o final do dia
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);
        
        appointments = appointments.filter(appointment => {
          const appointmentDate = new Date(appointment.appointment_date);
          return appointmentDate >= startDate && appointmentDate <= adjustedEndDate;
        });
      }
      
      console.log(`Total de agendamentos após todos os filtros: ${appointments.length}`);
      res.json(appointments);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      res.status(500).json({ message: "Falha ao buscar agendamentos" });
    }
  });
  
  // LOYALTY ENDPOINTS

  // GET /api/loyalty/:phone - Get client loyalty by phone
  app.get("/api/loyalty/:phone", async (req: Request, res: Response) => {
    try {
      const phone = req.params.phone;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const clientReward = await storage.getClientRewardByPhone(phone);
      
      if (!clientReward) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(clientReward);
    } catch (error) {
      res.status(500).json({ message: "Failed to get client loyalty" });
    }
  });

  // POST /api/loyalty/lookup - Lookup client loyalty by phone
  app.post("/api/loyalty/lookup", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const clientReward = await storage.getClientRewardByPhone(phone);
      
      if (!clientReward) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json({
        points: clientReward.attendance_count,
        hasReward: clientReward.attendance_count >= 10,
        client: {
          name: clientReward.client_name,
          phone: clientReward.client_phone
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to lookup client loyalty" });
    }
  });

  // POST /api/loyalty/reward - Use reward (admin only)
  app.post("/api/loyalty/reward", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const clientReward = await storage.useReward(phone);
      
      if (!clientReward) {
        return res.status(404).json({ message: "Client not found or not enough points" });
      }
      
      res.json({
        message: "Reward redeemed successfully",
        points: clientReward.attendance_count
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to redeem reward" });
    }
  });
  
  // DASHBOARD ENDPOINTS
  
  // GET /api/dashboard/stats - Get dashboard statistics
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Lógica para gerar estatísticas do dashboard
      const appointments = await storage.getAllAppointments();
      const professionals = await storage.getAllProfessionals();
      const services = await storage.getAllServices();
      const orders = await storage.getAllOrders();
      
      // Estatísticas gerais
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(a => a.status === 'completed').length;
      const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
      
      // Total vendido em produtos
      const totalProductsSold = orders.reduce((total, order) => {
        const orderTotal = order.total_amount || 0;
        return total + orderTotal;
      }, 0);
      
      // Total de clientes atendidos (únicos por telefone)
      const uniqueClients = new Set();
      appointments.forEach(a => {
        if (a.status === 'completed') {
          uniqueClients.add(a.client_phone);
        }
      });
      
      // Calcular data de hoje e datas para filtros
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Agendamentos para hoje
      const todayAppointments = appointments.filter(a => {
        const appDate = new Date(a.appointment_date);
        appDate.setHours(0, 0, 0, 0);
        return appDate.getTime() === today.getTime() && a.status !== 'cancelled';
      });
      
      // Agendamentos para amanhã
      const tomorrowAppointments = appointments.filter(a => {
        const appDate = new Date(a.appointment_date);
        appDate.setHours(0, 0, 0, 0);
        return appDate.getTime() === tomorrow.getTime() && a.status !== 'cancelled';
      });
      
      res.json({
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalProductsSold,
        uniqueClients: uniqueClients.size,
        professionals: professionals.length,
        services: services.length,
        todayAppointments: todayAppointments.length,
        tomorrowAppointments: tomorrowAppointments.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard statistics" });
    }
  });

  // GET /api/dashboard/chart - Get chart data
  app.get("/api/dashboard/chart", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Data type param: 'day', 'week', 'month'
      const dataType = req.query.type as string || 'week';
      
      // Get appointments
      const appointments = await storage.getAllAppointments();
      
      // Get orders
      const orders = await storage.getAllOrders();
      
      // Current date
      const now = new Date();
      
      // Start date based on data type
      let startDate: Date;
      let labels: string[] = [];
      let dateFormat = '';
      
      if (dataType === 'day') {
        // Last 7 days
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        dateFormat = 'dd/MM';
        
        // Generate labels for last 7 days
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          labels.push(format(date, dateFormat));
        }
      } else if (dataType === 'month') {
        // Last 6 months
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 5);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        dateFormat = 'MMM';
        
        // Generate labels for last 6 months
        for (let i = 0; i < 6; i++) {
          const date = new Date(startDate);
          date.setMonth(startDate.getMonth() + i);
          labels.push(format(date, dateFormat));
        }
      } else {
        // Last 4 weeks (default)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 28);
        startDate.setHours(0, 0, 0, 0);
        dateFormat = 'dd/MM';
        
        // Generate labels for last 4 weeks by 7 days
        for (let i = 0; i < 4; i++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(startDate.getDate() + (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          labels.push(`${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`);
        }
      }
      
      // Calculate data for each label
      const appointmentsData: number[] = [];
      const revenueData: number[] = [];
      
      labels.forEach((label, index) => {
        let periodStart: Date;
        let periodEnd: Date;
        
        if (dataType === 'day') {
          // Daily data
          periodStart = new Date(startDate);
          periodStart.setDate(startDate.getDate() + index);
          periodStart.setHours(0, 0, 0, 0);
          
          periodEnd = new Date(periodStart);
          periodEnd.setHours(23, 59, 59, 999);
        } else if (dataType === 'month') {
          // Monthly data
          periodStart = new Date(startDate);
          periodStart.setMonth(startDate.getMonth() + index);
          periodStart.setDate(1);
          periodStart.setHours(0, 0, 0, 0);
          
          periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodStart.getMonth() + 1);
          periodEnd.setDate(0); // Last day of month
          periodEnd.setHours(23, 59, 59, 999);
        } else {
          // Weekly data
          periodStart = new Date(startDate);
          periodStart.setDate(startDate.getDate() + (index * 7));
          periodStart.setHours(0, 0, 0, 0);
          
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodStart.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
        }
        
        // Count appointments in period
        const periodAppointments = appointments.filter(app => {
          const appDate = new Date(app.appointment_date);
          return appDate >= periodStart && appDate <= periodEnd && app.status === 'completed';
        });
        
        appointmentsData.push(periodAppointments.length);
        
        // Calculate revenue in period
        const periodOrders = orders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= periodStart && orderDate <= periodEnd && order.status === 'paid';
        });
        
        const periodRevenue = periodOrders.reduce((total, order) => {
          return total + (order.total_amount || 0);
        }, 0);
        
        revenueData.push(periodRevenue);
      });
      
      res.json({
        labels,
        datasets: [
          {
            label: 'Agendamentos',
            data: appointmentsData,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
          },
          {
            label: 'Faturamento (R$)',
            data: revenueData,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
          }
        ]
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get chart data" });
    }
  });
  
  // BARBERSHOP SETTINGS ENDPOINTS

  // GET /api/barbershop-settings - Get barbershop settings
  app.get("/api/barbershop-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getBarbershopSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get barbershop settings" });
    }
  });

  // POST /api/barbershop-settings - Create barbershop settings (admin only)
  app.post("/api/barbershop-settings", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const settingsData = insertBarbershopSettingsSchema.parse(req.body);
      const settings = await storage.createBarbershopSettings(settingsData);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create barbershop settings" });
      }
    }
  });

  // PUT /api/barbershop-settings - Update barbershop settings (admin only)
  app.put("/api/barbershop-settings", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const settingsData = req.body;
      const updated = await storage.updateBarbershopSettings(settingsData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update barbershop settings" });
    }
  });
  
  // PRODUCT ENDPOINTS
  
  // GET /api/products - Get all products
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to get products" });
    }
  });
  
  // GET /api/products/categories - Get all distinct product categories
  app.get("/api/products/categories", async (req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      
      // Extract unique categories
      const categories = [...new Set(products.map(p => p.category))];
      
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to get product categories" });
    }
  });

  // GET /api/products/:id - Get product by id
  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to get product" });
    }
  });

  // GET /api/products/category/:category - Get products by category
  app.get("/api/products/category/:category", async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      const products = await storage.getProductsByCategory(category);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to get products by category" });
    }
  });

  // POST /api/products - Create product (admin only)
  app.post("/api/products", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid product data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  // PUT /api/products/:id - Update product (admin only)
  app.put("/api/products/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const productId = parseInt(req.params.id);
      const productData = req.body;
      const updated = await storage.updateProduct(productId, productData);
      
      if (!updated) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // DELETE /api/products/:id - Delete product (admin only)
  app.delete("/api/products/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const productId = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(productId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // PUT /api/products/:id/stock - Update product stock (admin only)
  app.put("/api/products/:id/stock", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const productId = parseInt(req.params.id);
      const { quantity } = req.body;
      
      if (typeof quantity !== 'number') {
        return res.status(400).json({ message: "Quantity must be a number" });
      }
      
      const updated = await storage.updateProductStock(productId, quantity);
      
      if (!updated) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product stock" });
    }
  });
  
  // ORDER ENDPOINTS

  // GET /api/orders - Get all orders (auth required)
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  // GET /api/orders/:id - Get order by id (auth required)
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to get order" });
    }
  });

  // GET /api/orders/appointment/:appointmentId - Get orders by appointment id (auth required)
  app.get("/api/orders/appointment/:appointmentId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const appointmentId = parseInt(req.params.appointmentId);
      const orders = await storage.getOrdersByAppointmentId(appointmentId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get orders by appointment" });
    }
  });

  // GET /api/orders/client/:phone - Get orders by client phone (auth required)
  app.get("/api/orders/client/:phone", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const phone = req.params.phone;
      const orders = await storage.getOrdersByClientPhone(phone);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get orders by client" });
    }
  });

  // GET /api/payment-methods - Get payment methods
  app.get("/api/payment-methods", async (req, res) => {
    res.json([
      { id: "cash", name: "Dinheiro" },
      { id: "credit_card", name: "Cartão de Crédito" },
      { id: "debit_card", name: "Cartão de Débito" },
      { id: "pix", name: "PIX" },
      { id: "transfer", name: "Transferência Bancária" }
    ]);
  });

  // POST /api/orders - Create order (auth required)
  app.post("/api/orders", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const orderData = insertOrderSchema.parse(req.body);
      
      // Calcular valor total com base nos itens
      let totalAmount = 0;
      
      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach(item => {
          const subtotal = (item.price || 0) * (item.quantity || 1);
          totalAmount += subtotal;
        });
      }
      
      // Adicionar total ao orderData
      const orderWithTotal = {
        ...orderData,
        total_amount: totalAmount
      };
      
      const order = await storage.createOrder(orderWithTotal);
      
      // Decrementar estoque se houver produtos
      if (orderData.items && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          // Só atualizar estoque de produtos (não serviços)
          if (item.type === 'product' && item.product_id) {
            try {
              const product = await storage.getProduct(item.product_id);
              if (product && typeof product.stock_quantity === 'number') {
                const newQuantity = Math.max(0, product.stock_quantity - (item.quantity || 1));
                await storage.updateProductStock(item.product_id, newQuantity);
              }
            } catch (err) {
              // Logar erro mas não interromper o fluxo
              console.error(`Failed to update stock for product ${item.product_id}:`, err);
            }
          }
        }
      }
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid order data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  // PUT /api/orders/:id/status - Update order status (auth required)
  app.put("/api/orders/:id/status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['pending', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // PUT /api/orders/:id/items - Update order items (auth required)
  app.put("/api/orders/:id/items", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const orderId = parseInt(req.params.id);
      const { items } = req.body;
      
      // Verificar se a comanda existe
      const existingOrder = await storage.getOrderById(orderId);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Validar a estrutura dos itens
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }
      
      // Calcular o novo total com base nos itens
      let totalAmount = 0;
      items.forEach(item => {
        const subtotal = (item.price || 0) * (item.quantity || 1);
        totalAmount += subtotal;
      });
      
      // Atualizar a comanda com os novos itens e total
      const updatedOrderData = {
        items: items,
        total_amount: totalAmount
      };
      
      const updatedOrder = await storage.updateOrder(orderId, updatedOrderData);
      
      if (!updatedOrder) {
        return res.status(500).json({ message: "Failed to update order items" });
      }
      
      // Decrementar estoque para novos produtos
      for (const item of items) {
        // Só atualizar estoque de produtos (não serviços)
        if (item.type === 'product' && item.product_id) {
          try {
            // Verificar se o item já existia previamente
            const existingItem = existingOrder.items?.find(
              (i: any) => i.product_id === item.product_id && i.type === 'product'
            );
            
            // Se o item é novo ou a quantidade aumentou, decrementar estoque
            if (!existingItem || item.quantity > existingItem.quantity) {
              const product = await storage.getProduct(item.product_id);
              
              if (product && typeof product.stock_quantity === 'number') {
                // Calcular a diferença de quantidade
                const quantityDiff = existingItem 
                  ? item.quantity - existingItem.quantity 
                  : item.quantity;
                
                // Só atualizar se houver diferença positiva
                if (quantityDiff > 0) {
                  const newQuantity = Math.max(0, product.stock_quantity - quantityDiff);
                  await storage.updateProductStock(item.product_id, newQuantity);
                }
              }
            }
          } catch (err) {
            // Logar erro mas não interromper o fluxo
            console.error(`Failed to update stock for product ${item.product_id}:`, err);
          }
        }
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order items:", error);
      res.status(500).json({ message: "Failed to update order items" });
    }
  });
  
  // Criar servidor HTTP e WebSocket
  const httpServer = createServer(app);
  
  // Configurar WebSocket para atualizações em tempo real
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Listener para conexões WebSocket
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Enviar mensagem inicial
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to BarberSync WebSocket' }));
    
    // Listener para mensagens do cliente
    ws.on('message', (data) => {
      console.log('WebSocket message received:', data.toString());
      
      try {
        const message = JSON.parse(data.toString());
        
        // Aqui você pode reagir às mensagens recebidas
        // Por exemplo, implementar um sistema de chat ou notificações
        
        // Exemplo: enviar uma resposta de eco
        ws.send(JSON.stringify({ 
          type: 'echo', 
          message: 'Echo: ' + message.text,
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });
    
    // Listener para desconexão
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Função para broadcast de mensagem para todos os clientes conectados
  function broadcastMessage(message: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Broadcast periódico para manter conexões ativas
  setInterval(() => {
    const connectedClients = [...wss.clients].filter(
      client => client.readyState === WebSocket.OPEN
    ).length;
    
    if (connectedClients > 0) {
      broadcastMessage({ 
        type: 'heartbeat', 
        timestamp: new Date().toISOString(),
        connectedClients
      });
    }
  }, 30000);

  return httpServer;
}