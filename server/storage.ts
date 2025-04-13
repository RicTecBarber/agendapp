import { 
  users, type User, type InsertUser,
  services, type Service, type InsertService,
  professionals, type Professional, type InsertProfessional,
  availability, type Availability, type InsertAvailability,
  appointments, type Appointment, type InsertAppointment,
  clientRewards, type ClientReward, type InsertClientReward,
  barbershopSettings, type BarbershopSettings, type InsertBarbershopSettings,
  products, type Product, type InsertProduct,
  orders, type Order, type InsertOrder, type OrderItem
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
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
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
  getAvailabilityById(id: number): Promise<Availability | undefined>;
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
  getBarbershopSettings(tenantId?: number | null): Promise<BarbershopSettings | undefined>;
  createBarbershopSettings(settings: InsertBarbershopSettings): Promise<BarbershopSettings>;
  updateBarbershopSettings(settings: Partial<InsertBarbershopSettings>): Promise<BarbershopSettings>;
  
  // Aliases com nomes atualizados (mesmo comportamento, nomes diferentes)
  getBusinessSettings(tenantId?: number | null): Promise<BarbershopSettings | undefined>;
  createBusinessSettings(settings: InsertBarbershopSettings): Promise<BarbershopSettings>;
  updateBusinessSettings(settings: Partial<InsertBarbershopSettings>): Promise<BarbershopSettings>;

  
  // Product operations
  getAllProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  updateProductStock(id: number, quantity: number): Promise<Product | undefined>;
  
  // Order (Comanda) operations
  getAllOrders(): Promise<Order[]>;
  getOrdersByAppointmentId(appointmentId: number): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrdersByClientPhone(clientPhone: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined>;
  
  // Tenant (Cliente) operations
  getAllTenants(): Promise<Tenant[]>;
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  activateTenant(id: number): Promise<Tenant | undefined>;
  deactivateTenant(id: number): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<boolean>;
  
  // System Admin operations
  getAllSystemAdmins(): Promise<SystemAdmin[]>;
  getSystemAdmin(id: number): Promise<SystemAdmin | undefined>;
  getSystemAdminByUsername(username: string): Promise<SystemAdmin | undefined>;
  createSystemAdmin(admin: InsertSystemAdmin): Promise<SystemAdmin>;
  updateSystemAdmin(id: number, admin: Partial<InsertSystemAdmin>): Promise<SystemAdmin | undefined>;
  deleteSystemAdmin(id: number): Promise<boolean>;
  
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
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  private tenants: Map<number, Tenant>;
  private systemAdmins: Map<number, SystemAdmin>;
  
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
  private productIdCounter: number;
  private orderIdCounter: number;
  private tenantIdCounter: number;
  private systemAdminIdCounter: number;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.professionals = new Map();
    this.availability = new Map();
    this.appointments = new Map();
    this.clientRewards = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.tenants = new Map();
    this.systemAdmins = new Map();
    
    // Inicializar caches
    this._appointmentsByDateCache = new Map();
    this._professionalAvailabilityCache = new Map();
    
    this.userIdCounter = 1;
    this.serviceIdCounter = 1;
    this.professionalIdCounter = 1;
    this.availabilityIdCounter = 1;
    this.appointmentIdCounter = 1;
    this.clientRewardIdCounter = 1;
    this.productIdCounter = 1;
    this.orderIdCounter = 1;
    this.tenantIdCounter = 1;
    this.systemAdminIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Seed initial data
    this.seedInitialData();
  }

  // User operations
  async getAllUsers(tenantId?: number | null): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (tenantId !== undefined) {
      return users.filter(user => user.tenant_id === tenantId);
    }
    return users;
  }
  
  async getUser(id: number, tenantId?: number | null): Promise<User | undefined> {
    const user = this.users.get(id);
    // Se houver um tenantId especificado, verifique se o usuário pertence a esse tenant
    if (user && tenantId !== undefined && user.tenant_id !== tenantId) {
      return undefined; // Usuário não pertence ao tenant solicitado
    }
    return user;
  }

  async getUserByUsername(username: string, tenantId?: number | null): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    const user = users.find(user => user.username === username);
    
    // Se houver um tenantId especificado, verifique se o usuário pertence a esse tenant
    if (user && tenantId !== undefined && user.tenant_id !== tenantId) {
      return undefined; // Usuário não pertence ao tenant solicitado
    }
    
    return user;
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
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    // Sanitizar os dados
    if (userData.permissions && Array.isArray(userData.permissions)) {
      // Garantir que permissions é do tipo string[]
      userData.permissions = userData.permissions.map(String);
    }
    
    const updatedUser = { 
      ...existingUser, 
      ...userData,
      updated_at: new Date() 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Service operations
  async getAllServices(tenantId?: number | null): Promise<Service[]> {
    const services = Array.from(this.services.values());
    if (tenantId !== undefined) {
      return services.filter(service => service.tenant_id === tenantId);
    }
    return services;
  }
  
  async getService(id: number, tenantId?: number | null): Promise<Service | undefined> {
    const service = this.services.get(id);
    // Se houver um tenantId especificado, verifique se o serviço pertence a esse tenant
    if (service && tenantId !== undefined && service.tenant_id !== tenantId) {
      return undefined; // Serviço não pertence ao tenant solicitado
    }
    return service;
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
  async getAllProfessionals(tenantId?: number | null): Promise<Professional[]> {
    const professionals = Array.from(this.professionals.values());
    if (tenantId !== undefined) {
      return professionals.filter(professional => professional.tenant_id === tenantId);
    }
    return professionals;
  }
  
  async getProfessional(id: number, tenantId?: number | null): Promise<Professional | undefined> {
    const professional = this.professionals.get(id);
    // Se houver um tenantId especificado, verifique se o profissional pertence a esse tenant
    if (professional && tenantId !== undefined && professional.tenant_id !== tenantId) {
      return undefined; // Profissional não pertence ao tenant solicitado
    }
    return professional;
  }
  
  async getProfessionalsByServiceId(serviceId: number, tenantId?: number | null): Promise<Professional[]> {
    let professionals = Array.from(this.professionals.values()).filter(professional => 
      (professional.services_offered as number[]).includes(serviceId)
    );
    
    // Se o tenant_id for fornecido, filtre apenas os profissionais desse tenant
    if (tenantId !== undefined) {
      professionals = professionals.filter(professional => professional.tenant_id === tenantId);
    }
    
    return professionals;
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
  
  async getAvailabilityById(id: number): Promise<Availability | undefined> {
    return this.availability.get(id);
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
    console.log(`Buscando agendamentos para o profissional ID: ${professionalId}`);
    
    // Filtragem com log detalhado para diagnóstico
    const appointments = Array.from(this.appointments.values()).filter(appointment => {
      const isMatch = appointment.professional_id === professionalId;
      
      if (isMatch) {
        // Log detalhado com data e status para verificar se estamos considerando todos os agendamentos
        const appointmentDate = new Date(appointment.appointment_date);
        console.log(`Encontrado agendamento #${appointment.id} para o profissional ${professionalId}: ${appointmentDate.toLocaleString()} | Status: ${appointment.status}`);
      }
      
      return isMatch;
    });
    
    console.log(`Total de agendamentos encontrados para o profissional ${professionalId}: ${appointments.length}`);
    
    return appointments;
  }
  
  async getAppointmentsByClientPhone(clientPhone: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      appointment => appointment.client_phone === clientPhone
    );
  }
  
  async getAppointmentsByClientName(clientName: string): Promise<Appointment[]> {
    // Busca case-insensitive e por nome parcial (contains)
    const searchName = clientName.toLowerCase();
    return Array.from(this.appointments.values()).filter(
      appointment => appointment.client_name.toLowerCase().includes(searchName)
    );
  }
  
  async getAppointmentById(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }
  
  async createAppointment(appointmentData: InsertAppointment): Promise<Appointment> {
    const id = this.appointmentIdCounter++;
    const now = new Date();
    
    // SOLUÇÃO RADICAL: Usar appointment_date como string
    // Verificar se a data é string ou Date
    const dateValue = appointmentData.appointment_date;
    console.log(`[STORAGE] Tipo de appointment_date recebido: ${typeof dateValue}`);
    
    // Criar o objeto de agendamento
    const appointment: Appointment = { 
      ...appointmentData, 
      id, 
      created_at: now,
      status: appointmentData.status || "scheduled",
      notify_whatsapp: appointmentData.notify_whatsapp || false,
      is_loyalty_reward: appointmentData.is_loyalty_reward || false
    };
    
    // Log para debug
    console.log(`[STORAGE] Agendamento criado com data: ${appointment.appointment_date}`);
    
    this.appointments.set(id, appointment);
    
    // Limpar o cache de agendamentos para este dia
    // Vamos usar um objeto Date apenas para extrair a data (ano, mês, dia)
    const appointmentDate = new Date(String(appointment.appointment_date));
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
  async getBarbershopSettings(tenantId?: number | null): Promise<BarbershopSettings | undefined> {
    // Se temos configurações E um tenantId fornecido, verificar se corresponde
    if (this.barbershopSettings && tenantId !== undefined) {
      // Se as configurações não pertencem ao tenant solicitado, retornar undefined
      if (this.barbershopSettings.tenant_id !== tenantId) {
        return undefined;
      }
      return this.barbershopSettings;
    }
    
    // Se não temos configurações OU não foi fornecido um tenantId, retornar as configurações existentes
    if (!this.barbershopSettings) {
      // Inicializar configurações com valores padrão se ainda não existirem
      // Se foi fornecido um tenantId, incluí-lo nas configurações padrão
      return this.createBarbershopSettings({
        name: "AgendApp Serviços",
        address: "Rua Exemplo, 123",
        phone: "(11) 99999-9999",
        email: "contato@agendapp.com",
        timezone: "America/Sao_Paulo",
        open_time: "08:00",
        close_time: "20:00",
        open_days: [1, 2, 3, 4, 5, 6],
        description: "O melhor sistema de agendamentos",
        instagram: "@agendapp",
        facebook: "facebook.com/agendapp",
        tenant_id: tenantId || null
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
      // Se as configurações não existirem, crie-as com o nome fornecido ou um valor padrão
      return this.createBarbershopSettings({
        name: settings.name || "AgendApp Serviços",
        address: settings.address || "Rua Exemplo, 123",
        phone: settings.phone || "(11) 99999-9999",
        email: settings.email || "contato@agendapp.com",
        open_time: settings.open_time || "08:00",
        close_time: settings.close_time || "20:00",
        open_days: settings.open_days || [1, 2, 3, 4, 5, 6],
        description: settings.description || "Configuração inicial",
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
    if (settings.timezone !== undefined) updatedSettings.timezone = settings.timezone;
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
  // Product operations
  async getAllProducts(tenantId?: number | null): Promise<Product[]> {
    const products = Array.from(this.products.values());
    if (tenantId !== undefined) {
      console.log(`Filtrando produtos para o tenant ${tenantId}`);
      return products.filter(product => product.tenant_id === tenantId);
    }
    return products;
  }
  
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getProductsByCategory(category: string, tenantId?: number | null): Promise<Product[]> {
    const products = Array.from(this.products.values());
    
    // Primeiro filtra pela categoria
    let filteredProducts = products.filter(product => product.category === category);
    
    // Se tenantId foi fornecido, filtra também pelo tenant
    if (tenantId !== undefined) {
      filteredProducts = filteredProducts.filter(product => product.tenant_id === tenantId);
    }
    
    return filteredProducts;
  }
  
  async createProduct(productData: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const now = new Date();
    
    const product: Product = { 
      ...productData, 
      id,
      created_at: now,
      updated_at: now,
      stock_quantity: productData.stock_quantity ?? 0,
      category: productData.category ?? "outros",
      image_url: productData.image_url || null
    };
    
    this.products.set(id, product);
    return product;
  }
  
  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      return undefined;
    }
    
    const updatedProduct = { 
      ...existingProduct, 
      ...productData,
      updated_at: new Date()
    };
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }
  
  async updateProductStock(id: number, quantity: number): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      return undefined;
    }
    
    const updatedProduct = { 
      ...existingProduct, 
      stock_quantity: existingProduct.stock_quantity + quantity,
      updated_at: new Date()
    };
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  // Order (Comanda) operations
  async getAllOrders(tenantId?: number | null): Promise<Order[]> {
    const orders = Array.from(this.orders.values());
    
    // Se tenantId foi fornecido, filtra os resultados
    if (tenantId !== undefined) {
      return orders.filter(order => order.tenant_id === tenantId);
    }
    
    return orders;
  }
  
  async getOrdersByAppointmentId(appointmentId: number, tenantId?: number | null): Promise<Order[]> {
    const orders = Array.from(this.orders.values());
    
    // Primeiro filtra pelo appointmentId
    let filteredOrders = orders.filter(order => order.appointment_id === appointmentId);
    
    // Se tenantId foi fornecido, filtra também pelo tenant
    if (tenantId !== undefined) {
      filteredOrders = filteredOrders.filter(order => order.tenant_id === tenantId);
    }
    
    return filteredOrders;
  }
  
  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getOrdersByClientPhone(clientPhone: string, tenantId?: number | null): Promise<Order[]> {
    const orders = Array.from(this.orders.values());
    
    // Primeiro filtra pelo telefone do cliente
    let filteredOrders = orders.filter(order => order.client_phone === clientPhone);
    
    // Se tenantId foi fornecido, filtra também pelo tenant
    if (tenantId !== undefined) {
      filteredOrders = filteredOrders.filter(order => order.tenant_id === tenantId);
    }
    
    return filteredOrders;
  }
  
  async createOrder(orderData: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const now = new Date();
    
    // Garantir que os itens são uma array de OrderItem
    const items = orderData.items as OrderItem[];
    
    // Calcular total automaticamente se não for fornecido
    const calculatedTotal = orderData.total || items.reduce(
      (sum, item) => sum + item.subtotal, 0
    );
    
    const order: Order = { 
      ...orderData, 
      id,
      items: items,
      total: calculatedTotal, 
      payment_method: orderData.payment_method || "dinheiro",
      status: orderData.status || "aberta",
      notes: orderData.notes || null,
      appointment_id: orderData.appointment_id || null,
      created_at: now,
      updated_at: now
    };
    
    this.orders.set(id, order);
    
    // Atualizar o estoque de produtos
    for (const item of items) {
      await this.updateProductStock(item.product_id, -item.quantity);
    }
    
    return order;
  }
  
  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      return undefined;
    }
    
    const updatedOrder = { 
      ...existingOrder, 
      status,
      updated_at: new Date()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      return undefined;
    }
    
    const updatedOrder = { ...existingOrder, ...orderData };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  // Tenant operations
  async getAllTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }
  
  async getTenant(id: number): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }
  
  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(
      tenant => tenant.slug === slug
    );
  }
  
  async createTenant(tenantData: any): Promise<any> {
    const id = this.tenantIdCounter++;
    const now = new Date();
    
    // Extrair somente os campos que existem no schema do Tenant
    const { name, slug, active, is_active, production_url } = tenantData;
    
    const tenant = {
      id,
      name,
      slug,
      active: active ?? true,
      is_active: is_active ?? active ?? true,
      production_url: production_url ?? null,
      created_at: now,
      updated_at: now
    };
    
    this.tenants.set(id, tenant);
    console.log("Tenant criado:", tenant);
    return tenant;
  }
  
  async updateTenant(id: number, tenantData: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const existingTenant = this.tenants.get(id);
    if (!existingTenant) {
      return undefined;
    }
    
    const updatedTenant = { 
      ...existingTenant,
      ...tenantData,
      updated_at: new Date()
    };
    
    this.tenants.set(id, updatedTenant);
    return updatedTenant;
  }
  
  async activateTenant(id: number): Promise<any> {
    const existingTenant = this.tenants.get(id);
    if (!existingTenant) {
      return undefined;
    }
    
    const updatedTenant = {
      ...existingTenant,
      active: true,
      is_active: true,
      updated_at: new Date()
    };
    
    this.tenants.set(id, updatedTenant);
    return updatedTenant;
  }
  
  async deactivateTenant(id: number): Promise<any> {
    const existingTenant = this.tenants.get(id);
    if (!existingTenant) {
      return undefined;
    }
    
    const updatedTenant = {
      ...existingTenant,
      active: false,
      is_active: false,
      updated_at: new Date()
    };
    
    this.tenants.set(id, updatedTenant);
    return updatedTenant;
  }
  
  async deleteTenant(id: number): Promise<boolean> {
    return this.tenants.delete(id);
  }
  
  // System Admin operations
  async getAllSystemAdmins(): Promise<SystemAdmin[]> {
    return Array.from(this.systemAdmins.values());
  }
  
  async getSystemAdmin(id: number): Promise<SystemAdmin | undefined> {
    return this.systemAdmins.get(id);
  }
  
  async getSystemAdminByUsername(username: string): Promise<SystemAdmin | undefined> {
    return Array.from(this.systemAdmins.values()).find(
      admin => admin.username === username
    );
  }
  
  async createSystemAdmin(adminData: InsertSystemAdmin): Promise<SystemAdmin> {
    const id = this.systemAdminIdCounter++;
    const now = new Date();
    
    const admin: SystemAdmin = {
      ...adminData,
      id,
      created_at: now,
      updated_at: now
    };
    
    this.systemAdmins.set(id, admin);
    return admin;
  }
  
  async updateSystemAdmin(id: number, adminData: Partial<InsertSystemAdmin>): Promise<SystemAdmin | undefined> {
    const existingAdmin = this.systemAdmins.get(id);
    if (!existingAdmin) {
      return undefined;
    }
    
    const updatedAdmin = {
      ...existingAdmin,
      ...adminData,
      updated_at: new Date()
    };
    
    this.systemAdmins.set(id, updatedAdmin);
    return updatedAdmin;
  }
  
  async deleteSystemAdmin(id: number): Promise<boolean> {
    return this.systemAdmins.delete(id);
  }
  
  // Métodos alias para compatibilidade
  async getBusinessSettings(tenantId?: number | null): Promise<BarbershopSettings | undefined> {
    console.log("Chamando getBusinessSettings (alias) para tenant_id", tenantId);
    return this.getBarbershopSettings(tenantId);
  }
  
  async createBusinessSettings(settings: InsertBarbershopSettings): Promise<BarbershopSettings> {
    console.log("Chamando createBusinessSettings (alias)");
    return this.createBarbershopSettings(settings);
  }
  
  async updateBusinessSettings(settings: Partial<InsertBarbershopSettings>): Promise<BarbershopSettings> {
    console.log("Chamando updateBusinessSettings (alias)");
    return this.updateBarbershopSettings(settings);
  }
  

  
  private seedInitialData() {
    // Add barbershop settings
    this.barbershopSettings = {
      id: 1,
      name: "AgendApp",
      address: "Avenida Paulista, 1000 - São Paulo, SP",
      phone: "(11) 98765-4321",
      email: "contato@agendapp.com",
      logo_url: "/assets/logo.svg",
      timezone: "America/Sao_Paulo", // Fuso horário de São Paulo (UTC-3)
      open_time: "08:00",
      close_time: "20:00",
      open_days: [1, 2, 3, 4, 5, 6],
      description: "Sistema completo de agendamento para salões, barbearias, spas e outros serviços.",
      instagram: "@agendapp",
      facebook: "facebook.com/agendapp",
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Criar um administrador do sistema
    this.createSystemAdmin({
      username: "superadmin",
      password: "2e8d3873106fcce2073d7e73f48b50fd4f52750b782d6687ca486a38b470a62360efd91e15fb05b2ecf481175f5548c559071baf3cc93cff62198f3688b5760a.4a2f91008ec4cc306d0539e5eaeb250d", // SNKRlcl@2025
      name: "Super Administrador",
      email: "superadmin@agendapp.com",
      role: "super_admin",
      is_active: true
    });
    
    // Criar alguns tenants de exemplo
    this.createTenant({
      name: "Barbearia do João",
      slug: "barbearia-joao",
      domain: "barbeariajoao.agendapp.com",
      contact_name: "João Silva",
      contact_email: "joao@barbeariajoao.com",
      contact_phone: "(11) 98765-4321",
      plan: "basic",
      is_active: true,
      logo_url: "/assets/tenants/joao-logo.png"
    });
    
    this.createTenant({
      name: "Salão da Maria",
      slug: "salao-maria",
      domain: "salaomaria.agendapp.com",
      contact_name: "Maria Oliveira",
      contact_email: "maria@salaomaria.com",
      contact_phone: "(11) 91234-5678",
      plan: "premium",
      is_active: true,
      logo_url: "/assets/tenants/maria-logo.png"
    });
    
    this.createTenant({
      name: "Barbearia Vintage",
      slug: "barbearia-vintage",
      domain: "vintage.agendapp.com",
      contact_name: "Carlos Mendes",
      contact_email: "carlos@vintage.com",
      contact_phone: "(11) 97890-1234",
      plan: "enterprise",
      is_active: false,
      logo_url: "/assets/tenants/vintage-logo.png"
    });
    
    // Add an admin user
    this.createUser({
      username: "admin",
      password: "2e8d3873106fcce2073d7e73f48b50fd4f52750b782d6687ca486a38b470a62360efd91e15fb05b2ecf481175f5548c559071baf3cc93cff62198f3688b5760a.4a2f91008ec4cc306d0539e5eaeb250d", // SNKRlcl@2025
      name: "Administrator",
      email: "admin@agendapp.com",
      role: "admin"
    });
    
    // Add professional users
    this.createUser({
      username: "joao",
      password: "2e8d3873106fcce2073d7e73f48b50fd4f52750b782d6687ca486a38b470a62360efd91e15fb05b2ecf481175f5548c559071baf3cc93cff62198f3688b5760a.4a2f91008ec4cc306d0539e5eaeb250d", // SNKRlcl@2025
      name: "João Costa",
      email: "joao@agendapp.com",
      role: "barber"
    });
    
    this.createUser({
      username: "matheus",
      password: "2e8d3873106fcce2073d7e73f48b50fd4f52750b782d6687ca486a38b470a62360efd91e15fb05b2ecf481175f5548c559071baf3cc93cff62198f3688b5760a.4a2f91008ec4cc306d0539e5eaeb250d", // SNKRlcl@2025
      name: "Matheus Oliveira",
      email: "matheus@agendapp.com",
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
    this.createProfessional({
      name: "João Costa",
      description: "Mestre em todos os serviços",
      services_offered: [1, 2, 3, 4], // All services
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80"
    });
    
    this.createProfessional({
      name: "Matheus Oliveira",
      description: "Especialista em barbas",
      services_offered: [2, 4], // Barba and Sobrancelha
      avatar_url: "https://images.unsplash.com/photo-1541533848490-bc8115cd6522?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80"
    });
    
    this.createProfessional({
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
    
    // ATENÇÃO: Todos os agendamentos foram removidos para resolver o problema de fuso horário.
    // Novos agendamentos serão criados pelos usuários e todas as horas serão mantidas corretamente.
    
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
      last_reward_at: new Date(new Date().setHours(9, 0, 0, 0))
    };
    this.clientRewards.set(reward3.id, reward3);
    
    // Produtos para venda
    this.createProduct({
      name: "Pomada Modeladora",
      description: "Pomada modeladora com fixação forte para cabelos masculinos",
      price: 45.0,
      stock_quantity: 20,
      category: "cuidados",
      image_url: "https://images.unsplash.com/photo-1626808642875-0aa545639932?w=200&h=200&fit=crop"
    });
    
    this.createProduct({
      name: "Shampoo Anti-Queda",
      description: "Shampoo especializado para prevenir queda de cabelo",
      price: 39.90,
      stock_quantity: 15,
      category: "cuidados",
      image_url: "https://images.unsplash.com/photo-1669828850907-1f32d7925405?w=200&h=200&fit=crop"
    });
    
    this.createProduct({
      name: "Creme para Barba",
      description: "Creme hidratante para barba com óleo de argan",
      price: 35.50,
      stock_quantity: 25,
      category: "cuidados",
      image_url: "https://images.unsplash.com/photo-1621607068865-2502db6647c6?w=200&h=200&fit=crop"
    });
    
    this.createProduct({
      name: "Pente Profissional",
      description: "Pente de alta qualidade para cabelo e barba",
      price: 22.00,
      stock_quantity: 30,
      category: "acessorios",
      image_url: "https://images.unsplash.com/photo-1621607068944-18932f3be784?w=200&h=200&fit=crop"
    });
    
    this.createProduct({
      name: "Camiseta AgendApp",
      description: "Camiseta oficial da marca",
      price: 49.90,
      stock_quantity: 10,
      category: "roupas",
      image_url: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=200&h=200&fit=crop"
    });
    
    // Criar algumas comandas de exemplo
    const orderItems: OrderItem[] = [
      {
        id: 1,
        product_id: 1,
        product_name: "Pomada Modeladora",
        quantity: 1,
        price: 45.0,
        subtotal: 45.0
      },
      {
        id: 2,
        product_id: 3,
        product_name: "Creme para Barba",
        quantity: 1,
        price: 35.50,
        subtotal: 35.50
      }
    ];
    
    this.createOrder({
      client_name: "Marcos Ribeiro",
      client_phone: "11987654321",
      items: orderItems,
      total: 80.50,
      payment_method: "cartao_credito",
      status: "fechada",
      notes: "Cliente satisfeito com o serviço"
    });
  }
}

export const storage = new MemStorage();
