import { 
  users, type User, type InsertUser,
  services, type Service, type InsertService,
  professionals, type Professional, type InsertProfessional,
  availability, type Availability, type InsertAvailability,
  appointments, type Appointment, type InsertAppointment,
  clientRewards, type ClientReward, type InsertClientReward,
  barbershopSettings, type BarbershopSettings, type InsertBarbershopSettings
} from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

// Define the interface for storage operations
export interface IStorage {
  // User operations
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  
  // Service operations
  getAllServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Professional operations
  getAllProfessionals(): Promise<Professional[]>;
  getProfessional(id: number): Promise<Professional | undefined>;
  getProfessionalsByServiceId(serviceId: number): Promise<Professional[]>;
  createProfessional(professional: InsertProfessional): Promise<Professional>;
  updateProfessional(id: number, professional: Partial<InsertProfessional>): Promise<Professional | undefined>;
  deleteProfessional(id: number): Promise<boolean>;
  
  // Availability operations
  getAvailabilityByProfessionalId(professionalId: number): Promise<Availability[]>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: number, availability: Partial<InsertAvailability>): Promise<Availability | undefined>;
  deleteAvailability(id: number): Promise<boolean>;
  
  // Appointment operations
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByDate(date: Date): Promise<Appointment[]>;
  getAppointmentsByProfessionalId(professionalId: number): Promise<Appointment[]>;
  getAppointmentsByClientPhone(clientPhone: string): Promise<Appointment[]>;
  getAppointmentById(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined>;
  
  // Client Rewards operations
  getClientRewardByPhone(clientPhone: string): Promise<ClientReward | undefined>;
  createClientReward(clientReward: InsertClientReward): Promise<ClientReward>;
  incrementAttendanceCount(clientPhone: string): Promise<ClientReward | undefined>;
  useReward(clientPhone: string): Promise<ClientReward | undefined>;
  
  // Barbershop Settings operations
  getBarbershopSettings(): Promise<BarbershopSettings>;
  createBarbershopSettings(settings: InsertBarbershopSettings): Promise<BarbershopSettings>;
  updateBarbershopSettings(settings: Partial<InsertBarbershopSettings>): Promise<BarbershopSettings>;
  
  // SessionStore for auth
  sessionStore: session.Store;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<number, Service>;
  private professionals: Map<number, Professional>;
  private availability: Map<number, Availability>;
  private appointments: Map<number, Appointment>;
  private clientRewards: Map<number, ClientReward>;
  private barbershopSettings: BarbershopSettings | undefined;
  
  // Cache para melhorar desempenho
  private _appointmentsByDateCache: Map<string, Appointment[]>;
  private _professionalAvailabilityCache: Map<number, Availability[]>;
  
  sessionStore: session.Store;
  
  private userIdCounter: number;
  private serviceIdCounter: number;
  private professionalIdCounter: number;
  private availabilityIdCounter: number;
  private appointmentIdCounter: number;
  private clientRewardIdCounter: number;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.professionals = new Map();
    this.availability = new Map();
    this.appointments = new Map();
    this.clientRewards = new Map();
    
    // Inicializar caches
    this._appointmentsByDateCache = new Map();
    this._professionalAvailabilityCache = new Map();
    
    this.userIdCounter = 1;
    this.serviceIdCounter = 1;
    this.professionalIdCounter = 1;
    this.availabilityIdCounter = 1;
    this.appointmentIdCounter = 1;
    this.clientRewardIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Seed initial data
    this.seedInitialData();
  }

  // User operations
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...userData, 
      id,
      role: userData.role || 'user' // Definir 'user' como role padrão se não for especificado
    };
    this.users.set(id, user);
    return user;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Service operations
  async getAllServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }
  
  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }
  
  async createService(serviceData: InsertService): Promise<Service> {
    const id = this.serviceIdCounter++;
    const service: Service = { ...serviceData, id };
    this.services.set(id, service);
    return service;
  }
  
  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    const existingService = this.services.get(id);
    if (!existingService) {
      return undefined;
    }
    
    const updatedService = { ...existingService, ...serviceData };
    this.services.set(id, updatedService);
    return updatedService;
  }
  
  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }
  
  // Professional operations
  async getAllProfessionals(): Promise<Professional[]> {
    return Array.from(this.professionals.values());
  }
  
  async getProfessional(id: number): Promise<Professional | undefined> {
    return this.professionals.get(id);
  }
  
  async getProfessionalsByServiceId(serviceId: number): Promise<Professional[]> {
    return Array.from(this.professionals.values()).filter(professional => 
      (professional.services_offered as number[]).includes(serviceId)
    );
  }
  
  async createProfessional(professionalData: InsertProfessional): Promise<Professional> {
    const id = this.professionalIdCounter++;
    
    // Garantir que services_offered seja um array de números
    let services_offered: number[] = [];
    if (Array.isArray(professionalData.services_offered)) {
      services_offered = professionalData.services_offered.map(Number);
    }
    
    const professional: Professional = { 
      ...professionalData, 
      id, 
      services_offered,
      avatar_url: professionalData.avatar_url || null
    };
    
    this.professionals.set(id, professional);
    return professional;
  }
  
  async updateProfessional(id: number, professionalData: Partial<InsertProfessional>): Promise<Professional | undefined> {
    const existingProfessional = this.professionals.get(id);
    if (!existingProfessional) {
      return undefined;
    }
    
    // Tratar services_offered corretamente se for fornecido
    let updatedData = { ...professionalData };
    
    if (updatedData.services_offered) {
      // Garantir que services_offered seja um array de números
      if (Array.isArray(updatedData.services_offered)) {
        updatedData.services_offered = updatedData.services_offered.map(Number);
      } else {
        // Se não for um array, mantenha o array existente
        updatedData.services_offered = existingProfessional.services_offered;
      }
    }
    
    const updatedProfessional = { 
      ...existingProfessional, 
      ...updatedData 
    };
    
    this.professionals.set(id, updatedProfessional);
    return updatedProfessional;
  }
  
  async deleteProfessional(id: number): Promise<boolean> {
    return this.professionals.delete(id);
  }
  
  // Availability operations
  async getAvailabilityByProfessionalId(professionalId: number): Promise<Availability[]> {
    // Verificar se temos esses dados em cache
    if (this._professionalAvailabilityCache.has(professionalId)) {
      const cachedResults = this._professionalAvailabilityCache.get(professionalId) || [];
      console.log(`CACHE HIT: Disponibilidade do profissional #${professionalId} encontrada em cache`);
      return cachedResults;
    }
    
    console.log(`CACHE MISS: Buscando disponibilidade do profissional #${professionalId}`);
    
    const results = Array.from(this.availability.values()).filter(
      availability => availability.professional_id === professionalId
    );
    
    // Armazenar no cache para futuras consultas
    this._professionalAvailabilityCache.set(professionalId, results);
    
    return results;
  }
  
  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    const id = this.availabilityIdCounter++;
    const availabilityItem: Availability = { 
      ...availabilityData, 
      id,
      is_available: availabilityData.is_available === undefined ? true : availabilityData.is_available
    };
    this.availability.set(id, availabilityItem);
    
    // Invalidar cache para este profissional
    this._professionalAvailabilityCache.delete(availabilityItem.professional_id);
    
    return availabilityItem;
  }
  
  async updateAvailability(id: number, availabilityData: Partial<InsertAvailability>): Promise<Availability | undefined> {
    const existingAvailability = this.availability.get(id);
    if (!existingAvailability) {
      return undefined;
    }
    
    const updatedAvailability = { ...existingAvailability, ...availabilityData };
    this.availability.set(id, updatedAvailability);
    
    // Invalidar cache para este profissional
    this._professionalAvailabilityCache.delete(existingAvailability.professional_id);
    console.log(`Cache de disponibilidade invalidado para profissional #${existingAvailability.professional_id} após atualização`);
    
    return updatedAvailability;
  }
  
  async deleteAvailability(id: number): Promise<boolean> {
    const existingAvailability = this.availability.get(id);
    if (!existingAvailability) {
      return false;
    }
    
    // Invalidar cache para este profissional
    this._professionalAvailabilityCache.delete(existingAvailability.professional_id);
    console.log(`Cache de disponibilidade invalidado para profissional #${existingAvailability.professional_id} após exclusão`);
    
    return this.availability.delete(id);
  }
  
  // Appointment operations
  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }
  
  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Chave para o cache (usar apenas a data sem a hora)
    const dateKey = startOfDay.toISOString().split('T')[0];
    
    console.log(`Buscando agendamentos para a data ${dateKey}`);
    
    // Verificar se temos esses dados em cache
    if (this._appointmentsByDateCache.has(dateKey)) {
      const cachedResults = this._appointmentsByDateCache.get(dateKey) || [];
      console.log(`CACHE HIT: Encontrados ${cachedResults.length} agendamentos em cache para ${dateKey}`);
      return cachedResults;
    }
    
    console.log(`CACHE MISS: Buscando agendamentos para ${dateKey} no banco de dados`);
    
    // Filtragem otimizada - evita iteração completa quando possível
    const filteredAppointments = Array.from(this.appointments.values()).filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      
      // Verificar se a data do agendamento está no mesmo dia
    // Usar getDate/getMonth/getFullYear para trabalhar com a data local (sem UTC)
    // Isto resolve o problema onde agendamentos às 9:00 aparecem como 12:00
      const isSameDay = (
        appointmentDate.getFullYear() === startOfDay.getFullYear() &&
        appointmentDate.getMonth() === startOfDay.getMonth() &&
        appointmentDate.getDate() === startOfDay.getDate()
      );
      
      if (isSameDay) {
        console.log(`Agendamento #${appointment.id} encontrado para ${dateKey}`);
      }
      
      return isSameDay;
    });
    
    // Limpar o cache e recarregar para corrigir problemas de fuso horário
    this._appointmentsByDateCache.delete(dateKey);
    
    // Agora sim armazenar no cache para futuras consultas
    this._appointmentsByDateCache.set(dateKey, filteredAppointments);
    
    console.log(`Encontrados ${filteredAppointments.length} agendamentos para ${dateKey}`);
    
    return filteredAppointments;
  }
  
  async getAppointmentsByProfessionalId(professionalId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      appointment => appointment.professional_id === professionalId
    );
  }
  
  async getAppointmentsByClientPhone(clientPhone: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      appointment => appointment.client_phone === clientPhone
    );
  }
  
  async getAppointmentById(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }
  
  async createAppointment(appointmentData: InsertAppointment): Promise<Appointment> {
    const id = this.appointmentIdCounter++;
    const now = new Date();
    const appointment: Appointment = { 
      ...appointmentData, 
      id, 
      created_at: now,
      status: "scheduled",
      notify_whatsapp: appointmentData.notify_whatsapp || null,
      is_loyalty_reward: appointmentData.is_loyalty_reward || null
    };
    
    this.appointments.set(id, appointment);
    
    // Limpar o cache de agendamentos para este dia
    const appointmentDate = new Date(appointment.appointment_date);
    const dateKey = appointmentDate.toISOString().split('T')[0];
    this._appointmentsByDateCache.delete(dateKey);
    console.log(`Cache invalidado para data ${dateKey} após criação de novo agendamento`);
    
    // Update client loyalty if not a reward redemption
    if (!appointment.is_loyalty_reward) {
      await this.incrementAttendanceCount(appointment.client_phone);
    }
    
    return appointment;
  }
  
  async updateAppointmentStatus(id: number, status: string): Promise<Appointment | undefined> {
    const existingAppointment = this.appointments.get(id);
    if (!existingAppointment) {
      return undefined;
    }
    
    const updatedAppointment = { ...existingAppointment, status };
    this.appointments.set(id, updatedAppointment);
    
    // Invalidar cache para esta data
    const appointmentDate = new Date(existingAppointment.appointment_date);
    const dateKey = appointmentDate.toISOString().split('T')[0];
    this._appointmentsByDateCache.delete(dateKey);
    console.log(`Cache invalidado para data ${dateKey} após atualização de status de agendamento #${id}`);
    
    return updatedAppointment;
  }
  
  // Client Rewards operations
  async getClientRewardByPhone(clientPhone: string): Promise<ClientReward | undefined> {
    return Array.from(this.clientRewards.values()).find(
      reward => reward.client_phone === clientPhone
    );
  }
  
  async createClientReward(clientRewardData: InsertClientReward): Promise<ClientReward> {
    const id = this.clientRewardIdCounter++;
    const now = new Date();
    const clientReward: ClientReward = { 
      ...clientRewardData, 
      id, 
      total_attendances: 0,
      free_services_used: 0,
      updated_at: now,
      last_reward_at: null
    };
    
    this.clientRewards.set(id, clientReward);
    return clientReward;
  }
  
  async incrementAttendanceCount(clientPhone: string): Promise<ClientReward | undefined> {
    let clientReward = await this.getClientRewardByPhone(clientPhone);
    
    if (!clientReward) {
      // Find the client name from an appointment
      const appointment = Array.from(this.appointments.values()).find(
        apt => apt.client_phone === clientPhone
      );
      
      if (!appointment) {
        return undefined;
      }
      
      // Create a new loyalty record
      clientReward = await this.createClientReward({
        client_name: appointment.client_name,
        client_phone: clientPhone
      });
    }
    
    const updatedReward = { 
      ...clientReward, 
      total_attendances: clientReward.total_attendances + 1,
      updated_at: new Date(),
      last_reward_at: clientReward.last_reward_at 
    };
    
    this.clientRewards.set(clientReward.id, updatedReward);
    return updatedReward;
  }
  
  async useReward(clientPhone: string): Promise<ClientReward | undefined> {
    const clientReward = await this.getClientRewardByPhone(clientPhone);
    
    if (!clientReward) {
      return undefined;
    }
    
    // Check if eligible for a reward (10 attendances = 1 free service)
    const eligibleRewards = Math.floor(clientReward.total_attendances / 10) - clientReward.free_services_used;
    
    if (eligibleRewards <= 0) {
      return clientReward; // No eligible rewards
    }
    
    const updatedReward = { 
      ...clientReward, 
      free_services_used: clientReward.free_services_used + 1,
      last_reward_at: new Date(),
      updated_at: new Date() 
    };
    
    this.clientRewards.set(clientReward.id, updatedReward);
    return updatedReward;
  }
  
  // Barbershop Settings operations
  async getBarbershopSettings(): Promise<BarbershopSettings> {
    if (!this.barbershopSettings) {
      // Inicializar configurações com valores padrão se ainda não existirem
      return this.createBarbershopSettings({
        name: "BarberSync",
        address: "Rua Exemplo, 123",
        phone: "(11) 99999-9999",
        email: "contato@barbersync.com",
        open_time: "08:00",
        close_time: "20:00",
        open_days: [1, 2, 3, 4, 5, 6],
        description: "A melhor barbearia da cidade"
      });
    }
    return this.barbershopSettings;
  }
  
  async createBarbershopSettings(settings: InsertBarbershopSettings): Promise<BarbershopSettings> {
    const now = new Date();
    
    // Verificar se todos os campos obrigatórios estão presentes
    if (!settings.name || !settings.address || !settings.phone || !settings.email || 
        !settings.open_time || !settings.close_time || !settings.open_days) {
      throw new Error("Campos obrigatórios estão faltando");
    }
    
    // Garante que valores opcionais sejam null quando não fornecidos
    const barbershopSettings: BarbershopSettings = {
      id: 1,
      name: settings.name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      open_time: settings.open_time,
      close_time: settings.close_time,
      open_days: settings.open_days,
      description: settings.description || null,
      logo_url: settings.logo_url || null,
      instagram: settings.instagram || null,
      facebook: settings.facebook || null,
      created_at: now,
      updated_at: now
    };
    
    this.barbershopSettings = barbershopSettings;
    return barbershopSettings;
  }
  
  async updateBarbershopSettings(settings: Partial<InsertBarbershopSettings>): Promise<BarbershopSettings> {
    if (!this.barbershopSettings) {
      // Se as configurações não existirem, crie-as com valores padrão
      return this.createBarbershopSettings({
        name: "BarberSync",
        address: "Rua Exemplo, 123",
        phone: "(11) 99999-9999",
        email: "contato@barbersync.com",
        open_time: "08:00",
        close_time: "20:00",
        open_days: [1, 2, 3, 4, 5, 6],
        description: "A melhor barbearia da cidade",
        ...settings
      });
    }
    
    // Atualize apenas os campos fornecidos
    const updatedSettings: BarbershopSettings = {
      ...this.barbershopSettings,
      updated_at: new Date()
    };
    
    // Atualize cada campo individualmente para preservar os tipos corretos
    if (settings.name !== undefined) updatedSettings.name = settings.name;
    if (settings.address !== undefined) updatedSettings.address = settings.address;
    if (settings.phone !== undefined) updatedSettings.phone = settings.phone;
    if (settings.email !== undefined) updatedSettings.email = settings.email;
    if (settings.open_time !== undefined) updatedSettings.open_time = settings.open_time;
    if (settings.close_time !== undefined) updatedSettings.close_time = settings.close_time;
    if (settings.open_days !== undefined) updatedSettings.open_days = settings.open_days;
    if (settings.description !== undefined) updatedSettings.description = settings.description || null;
    if (settings.logo_url !== undefined) updatedSettings.logo_url = settings.logo_url || null;
    if (settings.instagram !== undefined) updatedSettings.instagram = settings.instagram || null;
    if (settings.facebook !== undefined) updatedSettings.facebook = settings.facebook || null;
    
    this.barbershopSettings = updatedSettings;
    return updatedSettings;
  }
  
  // Seed initial data for development
  private seedInitialData() {
    // Add barbershop settings
    this.barbershopSettings = {
      id: 1,
      name: "BarberSync",
      address: "Avenida Paulista, 1000 - São Paulo, SP",
      phone: "(11) 98765-4321",
      email: "contato@barbersync.com",
      logo_url: "https://images.unsplash.com/photo-1583334837046-34ede1126010?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=200&q=80",
      open_time: "08:00",
      close_time: "20:00",
      open_days: [1, 2, 3, 4, 5, 6],
      description: "A melhor barbearia da cidade com atendimento de qualidade.",
      instagram: "@barbersync",
      facebook: "facebook.com/barbersync",
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Add an admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$3euPcmQFCiblsZeEu5s7p.9NjT3nWm.TnECVXwxjZ6I.hkQQr1vD.", // "admin123"
      name: "Administrator",
      email: "admin@barbersync.com",
      role: "admin"
    });
    
    // Add barber users
    this.createUser({
      username: "joao",
      password: "$2b$10$3euPcmQFCiblsZeEu5s7p.9NjT3nWm.TnECVXwxjZ6I.hkQQr1vD.", // "admin123"
      name: "João Costa",
      email: "joao@barbersync.com",
      role: "barber"
    });
    
    this.createUser({
      username: "matheus",
      password: "$2b$10$3euPcmQFCiblsZeEu5s7p.9NjT3nWm.TnECVXwxjZ6I.hkQQr1vD.", // "admin123"
      name: "Matheus Oliveira",
      email: "matheus@barbersync.com",
      role: "barber"
    });
    
    // Add services
    const corteMasculino = this.createService({
      name: "Corte Masculino",
      description: "Corte tradicional com tesoura ou máquina, incluindo acabamento.",
      price: 60.0,
      duration: 30
    });
    
    const barbaCompleta = this.createService({
      name: "Barba Completa",
      description: "Aparar, modelar e finalizar com produtos especializados.",
      price: 40.0,
      duration: 30
    });
    
    const combo = this.createService({
      name: "Combo (Corte + Barba)",
      description: "Serviço completo com corte de cabelo e tratamento de barba.",
      price: 90.0,
      duration: 60
    });
    
    const sobrancelha = this.createService({
      name: "Design de Sobrancelha",
      description: "Modelagem e acabamento perfeito para suas sobrancelhas.",
      price: 25.0,
      duration: 15
    });
    
    // Add professionals
    const joaoCosta = this.createProfessional({
      name: "João Costa",
      description: "Mestre em todos os serviços",
      services_offered: [1, 2, 3, 4], // All services
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80"
    });
    
    const matheusOliveira = this.createProfessional({
      name: "Matheus Oliveira",
      description: "Especialista em barbas",
      services_offered: [2, 4], // Barba and Sobrancelha
      avatar_url: "https://images.unsplash.com/photo-1541533848490-bc8115cd6522?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80"
    });
    
    const rafaelSilva = this.createProfessional({
      name: "Rafael Silva",
      description: "Especialista em cortes modernos",
      services_offered: [1, 2], // Corte and Barba
      avatar_url: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80"
    });
    
    // Add availability for professionals (default work hours)
    for (let proId = 1; proId <= 3; proId++) {
      // Monday to Friday (8AM - 8PM)
      for (let day = 1; day <= 5; day++) {
        this.createAvailability({
          professional_id: proId,
          day_of_week: day,
          start_time: "09:00",
          end_time: "20:00",
          is_available: true
        });
      }
      
      // Saturday (8AM - 6PM)
      this.createAvailability({
        professional_id: proId,
        day_of_week: 6,
        start_time: "08:00",
        end_time: "18:00",
        is_available: true
      });
      
      // Sunday (closed)
      this.createAvailability({
        professional_id: proId,
        day_of_week: 0,
        start_time: "00:00",
        end_time: "00:00",
        is_available: false
      });
    }
    
    // Add some sample appointments
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Appointment 1 - Completed yesterday
    const appt1 = {
      client_name: "Marcos Ribeiro",
      client_phone: "11987654321",
      service_id: 1, // Corte
      professional_id: 1, // João
      appointment_date: new Date(yesterday.setHours(10, 30, 0, 0)),
      status: "completed",
      created_at: new Date(yesterday.setHours(9, 0, 0, 0)),
      notify_whatsapp: true,
      is_loyalty_reward: false,
      id: this.appointmentIdCounter++
    };
    this.appointments.set(appt1.id, appt1);
    
    // Appointment 2 - Scheduled for today
    const appt2 = {
      client_name: "Carlos Almeida",
      client_phone: "11976543210",
      service_id: 2, // Barba
      professional_id: 2, // Matheus
      appointment_date: new Date(today.setHours(11, 0, 0, 0)),
      status: "scheduled",
      created_at: new Date(yesterday.setHours(14, 0, 0, 0)),
      notify_whatsapp: false,
      is_loyalty_reward: false,
      id: this.appointmentIdCounter++
    };
    this.appointments.set(appt2.id, appt2);
    
    // Appointment 3 - Scheduled for today
    const appt3 = {
      client_name: "Felipe Santos",
      client_phone: "11965432109",
      service_id: 3, // Combo
      professional_id: 1, // João
      appointment_date: new Date(today.setHours(14, 0, 0, 0)),
      status: "scheduled",
      created_at: new Date(yesterday.setHours(16, 0, 0, 0)),
      notify_whatsapp: true,
      is_loyalty_reward: false,
      id: this.appointmentIdCounter++
    };
    this.appointments.set(appt3.id, appt3);
    
    // Appointment 4 - Cancelled for today
    const appt4 = {
      client_name: "Thiago Martins",
      client_phone: "11954321098",
      service_id: 4, // Sobrancelha
      professional_id: 2, // Matheus
      appointment_date: new Date(today.setHours(15, 30, 0, 0)),
      status: "cancelled",
      created_at: new Date(yesterday.setHours(10, 0, 0, 0)),
      notify_whatsapp: true,
      is_loyalty_reward: false,
      id: this.appointmentIdCounter++
    };
    this.appointments.set(appt4.id, appt4);
    
    // Add some client rewards
    // Client 1 - 3 attendances
    const reward1 = {
      id: this.clientRewardIdCounter++,
      client_name: "Marcos Ribeiro",
      client_phone: "11987654321",
      total_attendances: 3,
      free_services_used: 0,
      updated_at: new Date(),
      last_reward_at: null
    };
    this.clientRewards.set(reward1.id, reward1);
    
    // Client 2 - 9 attendances (almost eligible for reward)
    const reward2 = {
      id: this.clientRewardIdCounter++,
      client_name: "Carlos Almeida",
      client_phone: "11976543210",
      total_attendances: 9,
      free_services_used: 0,
      updated_at: new Date(),
      last_reward_at: null
    };
    this.clientRewards.set(reward2.id, reward2);
    
    // Client 3 - 12 attendances (eligible for reward)
    const reward3 = {
      id: this.clientRewardIdCounter++,
      client_name: "Felipe Santos",
      client_phone: "11965432109",
      total_attendances: 12,
      free_services_used: 1,
      updated_at: new Date(),
      last_reward_at: new Date(yesterday.setHours(9, 0, 0, 0))
    };
    this.clientRewards.set(reward3.id, reward3);
  }
}

export const storage = new MemStorage();
