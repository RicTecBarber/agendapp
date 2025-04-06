import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertServiceSchema, 
  insertProfessionalSchema, 
  insertAvailabilitySchema,
  insertAppointmentSchema,
  appointmentLookupSchema,
  loyaltyLookupSchema
} from "@shared/schema";
import { parseISO, format, addMinutes, isAfter } from "date-fns";
import { setupAuth } from "./auth";
import { z } from "zod";

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
    try {
      const professionalId = parseInt(req.params.professionalId);
      const dateParam = req.params.date; // Format: YYYY-MM-DD
      const date = parseISO(dateParam);
      
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = date.getDay();
      
      // Get professional's availability for this day
      const availabilityList = await storage.getAvailabilityByProfessionalId(professionalId);
      const dayAvailability = availabilityList.find(a => a.day_of_week === dayOfWeek && a.is_available);
      
      if (!dayAvailability) {
        return res.json({ available_slots: [] });
      }
      
      // Get all appointments for this professional on this date
      const appointments = await storage.getAppointmentsByDate(date);
      const professionalAppointments = appointments.filter(
        a => a.professional_id === professionalId && a.status !== "cancelled"
      );
      
      // Generate time slots
      const timeSlots = [];
      const startTime = parseTime(dayAvailability.start_time);
      const endTime = parseTime(dayAvailability.end_time);
      
      let currentSlot = new Date(date);
      currentSlot.setHours(startTime.hours, startTime.minutes, 0, 0);
      
      const endDateTime = new Date(date);
      endDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
      
      // Get service details for duration calculation
      const professionalData = await storage.getProfessional(professionalId);
      const services = await storage.getAllServices();
      
      while (currentSlot < endDateTime) {
        const slotEnd = new Date(currentSlot);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30); // Default slot duration
        
        // Check if this slot conflicts with any appointment
        const isAvailable = !professionalAppointments.some(appointment => {
          const appointmentStart = new Date(appointment.appointment_date);
          const service = services.find(s => s.id === appointment.service_id);
          const appointmentEnd = addMinutes(appointmentStart, service?.duration || 30);
          
          return (
            (currentSlot >= appointmentStart && currentSlot < appointmentEnd) ||
            (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
            (currentSlot <= appointmentStart && slotEnd >= appointmentEnd)
          );
        });
        
        // Only add if the slot is still in the future
        if (isAvailable && isAfter(currentSlot, new Date())) {
          timeSlots.push(format(currentSlot, "HH:mm"));
        }
        
        // Move to next 30-minute slot
        currentSlot.setMinutes(currentSlot.getMinutes() + 30);
      }
      
      res.json({ available_slots: timeSlots });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // POST /api/appointments - Create a new appointment
  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      
      // Validate service exists
      const service = await storage.getService(appointmentData.service_id);
      if (!service) {
        return res.status(400).json({ message: "Invalid service" });
      }
      
      // Validate professional exists
      const professional = await storage.getProfessional(appointmentData.professional_id);
      if (!professional) {
        return res.status(400).json({ message: "Invalid professional" });
      }
      
      // Check if professional offers this service
      if (!(professional.services_offered as number[]).includes(appointmentData.service_id)) {
        return res.status(400).json({ message: "This professional does not offer the selected service" });
      }
      
      // Check if the appointment slot is available
      const dayOfWeek = appointmentData.appointment_date.getDay();
      
      const availabilityList = await storage.getAvailabilityByProfessionalId(appointmentData.professional_id);
      const dayAvailability = availabilityList.find(a => a.day_of_week === dayOfWeek);
      
      if (!dayAvailability || !dayAvailability.is_available) {
        return res.status(400).json({ message: "The professional is not available on this day" });
      }
      
      // Create the appointment
      const appointment = await storage.createAppointment(appointmentData);
      
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

  // GET /api/appointments/lookup - Lookup appointments by client name and phone
  app.post("/api/appointments/lookup", async (req: Request, res: Response) => {
    try {
      const lookupData = appointmentLookupSchema.parse(req.body);
      const appointments = await storage.getAppointmentsByClientPhone(lookupData.client_phone);
      
      // Filter by client name (case insensitive)
      const clientAppointments = appointments.filter(
        a => a.client_name.toLowerCase() === lookupData.client_name.toLowerCase()
      );
      
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
      let appointments;
      
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
