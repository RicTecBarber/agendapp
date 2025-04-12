import { format, addDays, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import express, { type Express, Request, Response, NextFunction } from 'express';
import { z } from "zod";
import { createServer, type Server } from 'http';
import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import { storage } from './storage';
import { setupAuth, hashPassword } from './auth';
import passport from 'passport';
import path from 'path';
import fs from 'fs';
import { uploadProduct, uploadProfessional, uploadService } from "./upload";
import { 
  isSystemAdmin, isAdmin, applyTenantId, requireTenant 
} from './middleware';
import {
  insertServiceSchema,
  insertProfessionalSchema,
  insertAvailabilitySchema,
  insertAppointmentSchema,
  insertClientRewardSchema,
  insertBarbershopSettingsSchema,
  insertProductSchema,
  insertOrderSchema,
  insertTenantSchema,
  insertSystemAdminSchema,
  type InsertAppointment,
  type InsertTenant,
  type InsertSystemAdmin
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

// Função auxiliar para extrair o horário de uma string no formato HH:MM
function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
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
  
  // Servir arquivos de uploads estáticos
  app.use('/uploads', (req, res, next) => {
    // Verificar se está acessando um arquivo no diretório uploads
    if (req.path && req.path.includes('..')) {
      return res.status(403).send('Acesso proibido');
    }
    next();
  }, express.static(path.join(process.cwd(), 'uploads')));
  
  // Middleware para logging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} ${req.tenantSlug ? `[Tenant: ${req.tenantSlug}]` : ''}`);
    next();
  });

  // USERS ENDPOINTS
  
  // Verificar se o usuário tem permissão para gerenciar usuários
  const canManageUsers = (req: Request): boolean => {
    if (!req.isAuthenticated()) return false;
    
    const user = req.user;
    
    // Super admins e admins podem gerenciar usuários
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    
    // Verificar permissões específicas
    if (Array.isArray(user.permissions) && user.permissions.includes('manage_users')) {
      return true;
    }
    
    return false;
  };
  
  // GET /api/users - Get all users (admin/super_admin only)
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      if (!canManageUsers(req)) {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      // Se for super_admin, pode ver todos os usuários (incluindo admins)
      // Se for admin, só vê usuários do seu tenant
      let users;
      if (req.user.role === 'super_admin') {
        users = await storage.getAllUsers();
      } else {
        users = await storage.getAllUsers(req.tenantId);
      }
      
      res.json(users);
    } catch (error) {
      console.error("Erro ao obter usuários:", error);
      res.status(500).json({ message: "Falha ao obter usuários" });
    }
  });
  
  // GET /api/users/:id - Get specific user
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!canManageUsers(req)) {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Super admin pode ver qualquer usuário
      // Admin só pode ver usuários do seu tenant
      if (req.user.role !== 'super_admin' && user.tenant_id !== req.tenantId) {
        return res.status(403).json({ message: "Acesso não autorizado a este usuário" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Erro ao obter usuário:", error);
      res.status(500).json({ message: "Falha ao obter usuário" });
    }
  });
  
  // POST /api/users - Create new user
  app.post("/api/users", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      if (!canManageUsers(req)) {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      const userData = req.body;
      
      // Validar entrada
      if (!userData.username || !userData.password || !userData.name || !userData.email) {
        return res.status(400).json({ message: "Dados incompletos" });
      }
      
      // Super admin pode criar qualquer tipo de usuário
      // Admin só pode criar staff e receptionist (não outros admins)
      if (req.user.role !== 'super_admin' && userData.role === 'admin') {
        return res.status(403).json({ message: "Você não tem permissão para criar usuários administradores" });
      }
      
      // Adicionar tenant_id automaticamente para usuários criados por admins de tenant
      if (req.user.role !== 'super_admin') {
        userData.tenant_id = req.tenantId;
      }
      
      // Verificar se usuário já existe
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
      
      // Criptografar senha antes de salvar
      userData.password = await hashPassword(userData.password);
      
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: "Falha ao criar usuário" });
    }
  });
  
  // PUT /api/users/:id - Update user
  app.put("/api/users/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      if (!canManageUsers(req)) {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Super admin pode atualizar qualquer usuário
      // Admin só pode atualizar usuários do seu tenant
      if (req.user.role !== 'super_admin' && existingUser.tenant_id !== req.tenantId) {
        return res.status(403).json({ message: "Acesso não autorizado a este usuário" });
      }
      
      // Admin não pode promover usuários para admin
      if (req.user.role !== 'super_admin' && userData.role === 'admin' && existingUser.role !== 'admin') {
        return res.status(403).json({ message: "Você não tem permissão para promover usuários a administradores" });
      }
      
      // Se senha for fornecida, criptografar
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      } else {
        // Se não for fornecida, manter a senha antiga
        delete userData.password;
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Falha ao atualizar usuário" });
    }
  });

  // DELETE /api/users/:id - Delete user (admin/super_admin only)
  app.delete("/api/users/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      if (!canManageUsers(req)) {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }
      
      const userId = parseInt(req.params.id);
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Super admin pode excluir qualquer usuário
      // Admin só pode excluir usuários do seu tenant
      if (req.user.role !== 'super_admin' && existingUser.tenant_id !== req.tenantId) {
        return res.status(403).json({ message: "Acesso não autorizado a este usuário" });
      }
      
      // Admin não pode excluir outros admins
      if (req.user.role !== 'super_admin' && existingUser.role === 'admin') {
        return res.status(403).json({ message: "Você não tem permissão para excluir usuários administradores" });
      }
      
      // Não permitir auto-exclusão
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }
      
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.status(200).json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Falha ao excluir usuário" });
    }
  });
  
  // SERVICES ENDPOINTS

  // GET /api/services - Get all services (filtered by tenant)
  app.get("/api/services", requireTenant, async (req: Request, res: Response) => {
    try {
      // Log para depuração
      console.log(`GET /api/services - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      // Obter serviços do tenant específico
      const services = await storage.getAllServices(req.tenantId);
      
      // Verificação adicional para garantir isolamento completo
      const filteredServices = services.filter(s => s.tenant_id === req.tenantId);
      
      console.log(`Retornando ${filteredServices.length} serviços para o tenant ${req.tenantId}`);
      res.json(filteredServices);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
      res.status(500).json({ message: "Failed to get services" });
    }
  });

  // GET /api/services/:id - Get service by id
  app.get("/api/services/:id", async (req: Request, res: Response) => {
    try {
      console.log(`GET /api/services/${req.params.id} - req.tenantId: ${req.tenantId}`, "query params:", req.query);
      
      if (req.tenantId === null || req.tenantId === undefined) {
        console.warn(`Requisição para /api/services/${req.params.id} sem tenant_id definido.`);
        
        // Se não houver tenant_id, retornar um erro para evitar vazamento de dados
        return res.status(400).json({ 
          message: "Tenant não especificado na requisição", 
          details: "É necessário especificar um tenant para acessar serviços"
        });
      }
      
      const serviceId = parseInt(req.params.id);
      // Passar explicitamente o tenant_id para filtrar serviços apenas desse tenant
      const service = await storage.getService(serviceId, req.tenantId);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found or doesn't belong to this tenant" });
      }
      
      console.log(`Retornando serviço ${serviceId} do tenant ${req.tenantId}:`, service.name);
      res.json(service);
    } catch (error) {
      console.error(`Erro ao buscar serviço:`, error);
      res.status(500).json({ message: "Failed to get service" });
    }
  });

  // POST /api/services - Create service (admin only)
  app.post("/api/services", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      
      // Aplicar tenant_id ao serviço
      const dataWithTenant = applyTenantId(serviceData, req.tenantId);
      
      const service = await storage.createService(dataWithTenant);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid service data", errors: error.errors });
      } else {
        console.error("Erro ao criar serviço:", error);
        res.status(500).json({ message: "Failed to create service" });
      }
    }
  });

  // PUT /api/services/:id - Update service (admin only)
  app.put("/api/services/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      // Verificar se o serviço existe e pertence ao tenant atual
      // Passar explicitamente o tenant_id para filtrar serviços apenas desse tenant
      const existingService = await storage.getService(serviceId, req.tenantId);
      if (!existingService) {
        return res.status(404).json({ message: "Service not found or doesn't belong to this tenant" });
      }
      
      const serviceData = {
        ...req.body,
        tenant_id: req.tenantId // Manter o tenant_id
      };
      
      const updated = await storage.updateService(serviceId, serviceData);
      
      if (!updated) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar serviço:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  // DELETE /api/services/:id - Delete service (admin only)
  app.delete("/api/services/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      // Verificar se o serviço existe e pertence ao tenant atual
      // Passar explicitamente o tenant_id para filtrar serviços apenas desse tenant
      const existingService = await storage.getService(serviceId, req.tenantId);
      if (!existingService) {
        return res.status(404).json({ message: "Service not found or doesn't belong to this tenant" });
      }
      
      const deleted = await storage.deleteService(serviceId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });
  
  // API de Upload de Arquivos
  
  // Endpoint de teste para facilitar a depuração de problemas de upload
  app.post("/api/test-upload", requireTenant, isAdmin, uploadProduct.single('image'), (req: Request, res: Response) => {
    try {
      console.log("Teste de upload - Headers:", req.headers);
      console.log("Teste de upload - Body:", req.body);
      console.log("Teste de upload - File:", req.file);
      
      // Verificar se diretórios existem
      const uploadDir = path.join(process.cwd(), "uploads", "products");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`Diretório criado: ${uploadDir}`);
      } else {
        console.log(`Diretório já existe: ${uploadDir}`);
      }
      
      if (!req.file) {
        console.error("Nenhum arquivo encontrado na requisição de teste");
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      console.log("Teste de upload - Arquivo recebido:", {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });
      
      // Verificar se o arquivo foi salvo corretamente
      try {
        const stats = fs.statSync(req.file.path);
        console.log("Arquivo salvo com sucesso, tamanho:", stats.size);
      } catch (e) {
        console.error("Erro ao verificar o arquivo:", e);
      }
      
      // Cria a URL do arquivo
      const fileUrl = `/uploads/products/${req.file.filename}`;
      
      res.status(200).json({
        success: true,
        message: "Upload de teste concluído com sucesso",
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("Erro no teste de upload:", error);
      res.status(500).json({ message: "Erro no teste de upload", error: String(error) });
    }
  });

  // POST /api/upload/product - Upload de imagem de produto
  app.post("/api/upload/product", requireTenant, isAdmin, uploadProduct.single('image'), (req: Request, res: Response) => {
    try {
      console.log("Upload de produto iniciado para tenant:", req.tenantId);
      console.log("Headers da requisição:", req.headers);
      
      if (!req.file) {
        console.error("Nenhum arquivo encontrado na requisição");
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      console.log("Arquivo recebido:", {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });
      
      // Cria a URL do arquivo
      const fileUrl = `/uploads/products/${req.file.filename}`;
      console.log("URL do arquivo criada:", fileUrl);
      
      res.status(200).json({
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("Erro ao fazer upload de imagem do produto:", error);
      res.status(500).json({ message: "Falha ao fazer upload do arquivo" });
    }
  });
  
  // POST /api/upload/service - Upload de imagem de serviço
  app.post("/api/upload/service", requireTenant, isAdmin, uploadService.single('image'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      // Cria a URL do arquivo
      const fileUrl = `/uploads/services/${req.file.filename}`;
      
      res.status(200).json({
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("Erro ao fazer upload de imagem do serviço:", error);
      res.status(500).json({ message: "Falha ao fazer upload do arquivo" });
    }
  });
  
  // POST /api/upload/professional - Upload de imagem de profissional
  app.post("/api/upload/professional", requireTenant, isAdmin, uploadProfessional.single('image'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      // Cria a URL do arquivo
      const fileUrl = `/uploads/professionals/${req.file.filename}`;
      
      res.status(200).json({
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("Erro ao fazer upload de imagem do profissional:", error);
      res.status(500).json({ message: "Falha ao fazer upload do arquivo" });
    }
  });
  
  // PROFESSIONALS ENDPOINTS

  // GET /api/professionals - Get all professionals (filtered by tenant)
  app.get("/api/professionals", requireTenant, async (req: Request, res: Response) => {
    try {
      // Log para depuração
      console.log(`GET /api/professionals - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      // Buscar profissionais do tenant específico
      const professionals = await storage.getAllProfessionals(req.tenantId);
      
      // Verificação adicional para garantir isolamento completo
      const filteredProfessionals = professionals.filter(p => p.tenant_id === req.tenantId);
      
      console.log(`Retornando ${filteredProfessionals.length} profissionais para o tenant ${req.tenantId}`);
      res.json(filteredProfessionals);
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
      res.status(500).json({ message: "Failed to get professionals" });
    }
  });

  // GET /api/professionals/:id - Get professional by id (filtering by tenant)
  app.get("/api/professionals/:id", requireTenant, async (req: Request, res: Response) => {
    try {
      console.log(`GET /api/professionals/${req.params.id} - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      const professionalId = parseInt(req.params.id);
      // Filtrar pelo tenant_id também
      const professional = await storage.getProfessional(professionalId, req.tenantId);
      
      if (!professional) {
        return res.status(404).json({ message: "Professional not found or doesn't belong to this tenant" });
      }
      
      // Verificação adicional para garantir isolamento completo
      if (professional.tenant_id !== req.tenantId) {
        console.warn(`Tentativa de acesso a profissional de outro tenant. ID: ${professionalId}, Tenant solicitado: ${req.tenantId}, Tenant do profissional: ${professional.tenant_id}`);
        return res.status(404).json({ message: "Professional not found or doesn't belong to this tenant" });
      }
      
      console.log(`Retornando profissional ${professionalId} do tenant ${req.tenantId}`);
      res.json(professional);
    } catch (error) {
      console.error(`Erro ao buscar profissional:`, error);
      res.status(500).json({ message: "Failed to get professional" });
    }
  });

  // GET /api/professionals/service/:serviceId - Get professionals by service (filtered by tenant)
  app.get("/api/professionals/service/:serviceId", requireTenant, async (req: Request, res: Response) => {
    console.log(`Buscando profissionais para o serviço ${req.params.serviceId} - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
    try {
      const serviceId = parseInt(req.params.serviceId);
      // Passar o tenant_id para filtrar profissionais apenas desse tenant
      const professionals = await storage.getProfessionalsByServiceId(serviceId, req.tenantId);
      res.json(professionals);
    } catch (error) {
      res.status(500).json({ message: "Failed to get professionals by service" });
    }
  });

  // POST /api/professionals - Create professional (admin only)
  app.post("/api/professionals", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      const professionalData = insertProfessionalSchema.parse(req.body);
      
      // Aplicar tenant_id ao profissional
      const dataWithTenant = applyTenantId(professionalData, req.tenantId);
      
      const professional = await storage.createProfessional(dataWithTenant);
      res.status(201).json(professional);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid professional data", errors: error.errors });
      } else {
        console.error("Erro ao criar profissional:", error);
        res.status(500).json({ message: "Failed to create professional" });
      }
    }
  });

  // PUT /api/professionals/:id - Update professional (admin only)
  app.put("/api/professionals/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      const professionalId = parseInt(req.params.id);
      
      // Verificar se o profissional existe e pertence ao tenant atual
      const existingProfessional = await storage.getProfessional(professionalId, req.tenantId);
      if (!existingProfessional) {
        return res.status(404).json({ message: "Professional not found or doesn't belong to this tenant" });
      }
      
      // Manter o mesmo tenant_id do profissional original
      const professionalData = {
        ...req.body,
        tenant_id: req.tenantId
      };
      const updated = await storage.updateProfessional(professionalId, professionalData);
      
      if (!updated) {
        return res.status(404).json({ message: "Professional not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar profissional:", error);
      res.status(500).json({ message: "Failed to update professional" });
    }
  });
  
  // AVAILABILITY ENDPOINTS

  // GET /api/availability/professional/:professionalId - Get availability by professional
  app.get("/api/availability/professional/:professionalId", requireTenant, async (req: Request, res: Response) => {
    try {
      console.log(`GET /api/availability/professional/${req.params.professionalId} - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      const professionalId = parseInt(req.params.professionalId);
      
      // Verificar se o profissional pertence ao tenant atual
      const professional = await storage.getProfessional(professionalId, req.tenantId);
      if (!professional) {
        return res.status(404).json({ message: "Profissional não encontrado ou não pertence a este tenant" });
      }
      
      // Verificação adicional para garantir isolamento completo
      if (professional.tenant_id !== req.tenantId) {
        console.warn(`Tentativa de acesso a profissional de outro tenant. ID: ${professionalId}, Tenant solicitado: ${req.tenantId}, Tenant do profissional: ${professional.tenant_id}`);
        return res.status(404).json({ message: "Profissional não encontrado ou não pertence a este tenant" });
      }
      
      // Obter disponibilidade e filtrar explicitamente por tenant_id
      const allAvailability = await storage.getAvailabilityByProfessionalId(professionalId);
      const filteredAvailability = allAvailability.filter(a => a.tenant_id === req.tenantId);
      
      console.log(`Retornando ${filteredAvailability.length} configurações de disponibilidade para o profissional ${professionalId} do tenant ${req.tenantId}`);
      res.json(filteredAvailability);
    } catch (error) {
      console.error("Erro ao buscar disponibilidade:", error);
      res.status(500).json({ message: "Failed to get availability" });
    }
  });

  // POST /api/availability - Create availability (admin only)
  app.post("/api/availability", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      // Validar os dados e adicionar o tenant_id
      const availabilityData = insertAvailabilitySchema.parse(req.body);
      
      // Verificar se o profissional pertence ao tenant atual
      const professional = await storage.getProfessional(availabilityData.professional_id, req.tenantId);
      if (!professional) {
        return res.status(404).json({ message: "Professional not found or doesn't belong to this tenant" });
      }
      
      // Adicionar o tenant_id do contexto atual
      const availabilityWithTenant = {
        ...availabilityData,
        tenant_id: req.tenantId
      };
      
      const availability = await storage.createAvailability(availabilityWithTenant);
      res.status(201).json(availability);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid availability data", errors: error.errors });
      } else {
        console.error("Erro ao criar disponibilidade:", error);
        res.status(500).json({ message: "Failed to create availability" });
      }
    }
  });

  // PUT /api/availability/:id - Update availability (admin only)
  app.put("/api/availability/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      const availabilityId = parseInt(req.params.id);
      
      // Verificar se a disponibilidade existe e pertence ao tenant atual
      const existingAvailability = await storage.getAvailabilityById(availabilityId);
      if (!existingAvailability || existingAvailability.tenant_id !== req.tenantId) {
        return res.status(404).json({ message: "Availability not found or doesn't belong to this tenant" });
      }
      
      // Preservar o tenant_id existente
      const availabilityData = {
        ...req.body,
        tenant_id: req.tenantId
      };
      
      const updated = await storage.updateAvailability(availabilityId, availabilityData);
      
      if (!updated) {
        return res.status(404).json({ message: "Availability not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar disponibilidade:", error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  // DELETE /api/availability/:id - Delete availability (admin only)
  app.delete("/api/availability/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      const availabilityId = parseInt(req.params.id);
      
      // Verificar se a disponibilidade existe e pertence ao tenant atual
      const existingAvailability = await storage.getAvailabilityById(availabilityId);
      if (!existingAvailability || existingAvailability.tenant_id !== req.tenantId) {
        return res.status(404).json({ message: "Availability not found or doesn't belong to this tenant" });
      }
      
      const deleted = await storage.deleteAvailability(availabilityId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Availability not found" });
      }
      
      res.status(200).json({ message: "Availability deleted successfully" });
    } catch (error) {
      console.error("Erro ao excluir disponibilidade:", error);
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  // GET /api/availability/:professionalId/:date - Get time slots for date
  app.get("/api/availability/:professionalId/:date", requireTenant, async (req: Request, res: Response) => {
    console.log(`Buscando slots disponíveis para o profissional ${req.params.professionalId} na data ${req.params.date} - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
    try {
      if (!req.tenantId) {
        return res.status(400).json({ message: "Tenant não identificado. Use o parâmetro ?tenant=SLUG" });
      }
      
      const professionalId = parseInt(req.params.professionalId);
      const dateStr = req.params.date;
      const timezone = req.query.timezone as string || 'America/Sao_Paulo';
      
      // Verificar se o profissional pertence ao tenant atual
      const professional = await storage.getProfessional(professionalId, req.tenantId);
      if (!professional) {
        return res.status(404).json({ 
          message: "Profissional não encontrado ou não pertence a este tenant",
          available_slots: []
        });
      }
      
      // Extrair horário de início e fim da jornada das configurações
      const settings = await storage.getBarbershopSettings(req.tenantId);
      const startTime = settings?.open_time || '09:00';
      const endTime = settings?.close_time || '18:00';
      const slotDuration = 30; // Usar valor padrão para slot_duration
      
      // Parse da data da requisição
      const dateObj = parseISO(dateStr);
      
      // Verificar se a data é válida
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      console.log(`Buscando disponibilidade para ${dateStr} no fuso ${timezone}, tenant: ${req.tenantSlug}`);
      
      // Buscar disponibilidade configurada para o profissional
      const allAvailabilitySettings = await storage.getAvailabilityByProfessionalId(professionalId);
      // Filtrar apenas a disponibilidade deste tenant
      const availabilitySettings = allAvailabilitySettings.filter(a => a.tenant_id === req.tenantId);
      console.log(`Configurações de disponibilidade encontradas: ${availabilitySettings.length} para o tenant ${req.tenantId}`);
      
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
      const allAppointments = await storage.getAppointmentsByProfessionalId(professionalId);
      // Filtrar apenas agendamentos deste tenant
      const appointments = allAppointments.filter(a => a.tenant_id === req.tenantId);
      
      // Filtrar apenas agendamentos da data específica e que não estejam cancelados
      const dateAppointments = appointments.filter(app => {
        const appDate = new Date(app.appointment_date);
        const isSameDate = (
          appDate.getFullYear() === dateObj.getFullYear() &&
          appDate.getMonth() === dateObj.getMonth() &&
          appDate.getDate() === dateObj.getDate()
        );
        const isActiveStatus = app.status !== 'cancelled';
        
        // Log detalhado para debug
        if (isSameDate) {
          console.log(`Agendamento #${app.id} na data ${dateStr}: status=${app.status}, hora=${appDate.getHours()}:${appDate.getMinutes()}, cliente=${app.client_name}`);
        }
        
        return isSameDate && isActiveStatus;
      });
      
      console.log(`Agendamentos ativos para a data ${dateStr}: ${dateAppointments.length}`);
      
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
        lunch_break: boolean;
      }
      
      // Verificar se há horário de almoço configurado
      const hasLunchBreak = dayConfig.lunch_start && dayConfig.lunch_end;
      let lunchStartMinutes = -1;
      let lunchEndMinutes = -1;
      
      if (hasLunchBreak) {
        console.log(`Horário de almoço configurado: ${dayConfig.lunch_start} - ${dayConfig.lunch_end}`);
        const lunchStart = parseTime(dayConfig.lunch_start!);
        const lunchEnd = parseTime(dayConfig.lunch_end!);
        lunchStartMinutes = lunchStart.hours * 60 + lunchStart.minutes;
        lunchEndMinutes = lunchEnd.hours * 60 + lunchEnd.minutes;
      }
      
      const slotDetails: SlotDetail[] = slots.map(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = new Date(dateObj);
        slotTime.setHours(hours, minutes, 0, 0);
        
        const slotMinutes = hours * 60 + minutes;
        
        // Verificar se o horário já passou (apenas hoje)
        const isPast = isToday && slotTime < now;
        
        // Verificar se o slot está no horário de almoço
        const isLunchBreak = hasLunchBreak && 
          slotMinutes >= lunchStartMinutes && 
          slotMinutes < lunchEndMinutes;
        
        // Verificar se há conflito com agendamento existente
        const conflicts = dateAppointments
          .filter(app => {
            const appDate = new Date(app.appointment_date);
            return appDate.getHours() === hours && appDate.getMinutes() === minutes;
          })
          .map(app => app.id);
        
        return {
          time: slot,
          available: !isPast && !isLunchBreak && conflicts.length === 0,
          is_past: isPast,
          conflicts: conflicts.length > 0 ? conflicts : null,
          lunch_break: isLunchBreak
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
  app.post("/api/appointments", requireTenant, async (req: Request, res: Response) => {
    try {
      // Parâmetros opcionais
      const timezone = req.query.timezone as string || 'America/Sao_Paulo';
      const tzOffset = getTimezoneOffset(timezone);
      
      console.log(`Criando agendamento no fuso horário: ${timezone}, offset: ${tzOffset} minutos, Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      // Obtém os dados do corpo da requisição
      const appointmentData = req.body;
      
      try {
        console.log("Dados do agendamento recebidos:", appointmentData);
        
        // Verificar se o profissional pertence ao tenant atual
        const professional = await storage.getProfessional(appointmentData.professional_id, req.tenantId);
        if (!professional) {
          return res.status(404).json({ 
            message: "Profissional não encontrado ou não pertence a este tenant",
            error: "tenant_validation_failed"
          });
        }
        
        // Verificar se o serviço pertence ao tenant atual
        const service = await storage.getService(appointmentData.service_id, req.tenantId);
        if (!service) {
          return res.status(404).json({ 
            message: "Serviço não encontrado ou não pertence a este tenant",
            error: "tenant_validation_failed"
          });
        }
        
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
          
          // Criar novo objeto com a data processada e garantir que o tenant_id esteja definido
          processedAppointmentData = {
            ...req.body,
            appointment_date: appointmentDate,
            tenant_id: req.tenantId // Garantir que o tenant_id seja sempre o do contexto atual
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
        const allAppointments = await storage.getAppointmentsByProfessionalId(professionalId);
        // Filtrar apenas agendamentos deste tenant
        const appointments = allAppointments.filter(a => a.tenant_id === req.tenantId);
        
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
        
        // Verificar se não está no horário de almoço do profissional
        const dayOfWeek = appointmentDate.getDay(); // 0-6 (Domingo-Sábado)
        const allAvailabilitySettings = await storage.getAvailabilityByProfessionalId(professionalId);
        const availabilitySettings = allAvailabilitySettings.filter(a => a.tenant_id === req.tenantId);
        const dayConfig = availabilitySettings.find(a => a.day_of_week === dayOfWeek);
        
        if (dayConfig && dayConfig.lunch_start && dayConfig.lunch_end) {
          const lunchStart = parseTime(dayConfig.lunch_start);
          const lunchEnd = parseTime(dayConfig.lunch_end);
          
          const lunchStartMinutes = lunchStart.hours * 60 + lunchStart.minutes;
          const lunchEndMinutes = lunchEnd.hours * 60 + lunchEnd.minutes;
          
          const appointmentMinutes = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
          
          // Verificar se o horário está dentro do período de almoço
          if (appointmentMinutes >= lunchStartMinutes && appointmentMinutes < lunchEndMinutes) {
            console.log("Tentativa de agendamento durante o intervalo de almoço:", {
              horarioAgendamento: `${appointmentDate.getHours()}:${appointmentDate.getMinutes()}`,
              horarioAlmoco: `${dayConfig.lunch_start} - ${dayConfig.lunch_end}`
            });
            
            return res.status(400).json({
              message: "Cannot schedule appointment during lunch break",
              lunch_time: `${dayConfig.lunch_start} - ${dayConfig.lunch_end}`
            });
          }
        }
        
        // Verificar se o profissional pertence ao tenant atual
        const professionalDetails = await storage.getProfessional(processedAppointmentData.professional_id, req.tenantId);
        if (!professionalDetails) {
          return res.status(404).json({ message: "Professional not found or doesn't belong to this tenant" });
        }
        
        // Adicionar o tenant_id nos dados do agendamento
        const appointmentWithTenant = {
          ...processedAppointmentData,
          tenant_id: req.tenantId
        };
        
        // Criar o agendamento
        const appointment = await storage.createAppointment(appointmentWithTenant);
        
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
            received: req.body
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

  // POST /api/appointments/lookup - Lookup appointment by client phone or name
  app.post("/api/appointments/lookup", requireTenant, async (req: Request, res: Response) => {
    try {
      console.log(`POST /api/appointments/lookup - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      const { client_name, client_phone } = req.body;
      
      // Verificar se pelo menos um dos campos foi fornecido
      if (!client_phone && !client_name) {
        return res.status(400).json({ 
          message: "É necessário informar pelo menos o telefone ou o nome do cliente" 
        });
      }
      
      // Obter todos os agendamentos do cliente
      let appointments = [];
      
      if (client_phone) {
        // Buscar por telefone (prioridade, mais preciso)
        appointments = await storage.getAppointmentsByClientPhone(client_phone);
      } else if (client_name) {
        // Buscar por nome
        appointments = await storage.getAppointmentsByClientName(client_name);
      }
      
      // Garantir que estamos filtrando apenas os agendamentos do tenant atual
      appointments = appointments.filter(a => a.tenant_id === req.tenantId);
      
      console.log(`Encontrados ${appointments.length} agendamentos para tenant_id=${req.tenantId}`);
      
      // Ordenar por data, mais recente primeiro
      appointments.sort((a, b) => {
        const dateA = new Date(a.appointment_date);
        const dateB = new Date(b.appointment_date);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Verificar pontos de fidelidade (apenas se tiver telefone)
      let rewardPoints = 0;
      let hasReward = false;
      
      if (client_phone) {
        const clientReward = await storage.getClientRewardByPhone(client_phone);
        // Verificar se o clientReward pertence ao tenant atual
        if (clientReward && clientReward.tenant_id === req.tenantId) {
          rewardPoints = clientReward.total_attendances || 0;
          hasReward = (clientReward.total_attendances || 0) >= 10;
        }
      }
      
      res.json(appointments);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      res.status(500).json({ 
        message: "Erro ao buscar agendamentos", 
        error: (error as Error).message 
      });
    }
  });

  // GET /api/appointments/:id - Get appointment by id
  app.get("/api/appointments/:id", requireTenant, async (req: Request, res: Response) => {
    try {
      console.log(`GET /api/appointments/${req.params.id} - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointmentById(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Verificar se o agendamento pertence ao tenant atual
      if (appointment.tenant_id !== req.tenantId) {
        console.warn(`Tentativa de acesso a agendamento de outro tenant. ID: ${appointmentId}, Tenant solicitado: ${req.tenantId}, Tenant do agendamento: ${appointment.tenant_id}`);
        return res.status(404).json({ message: "Appointment not found or doesn't belong to this tenant" });
      }
      
      console.log(`Retornando agendamento ${appointmentId} do tenant ${req.tenantId}`);
      res.json(appointment);
    } catch (error) {
      console.error(`Erro ao buscar agendamento:`, error);
      res.status(500).json({ message: "Failed to get appointment" });
    }
  });

  // PUT /api/appointments/:id/status - Update appointment status
  app.put("/api/appointments/:id/status", requireTenant, async (req: Request, res: Response) => {
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
      
      // Verificar se o agendamento pertence ao tenant atual
      if (appointment.tenant_id !== req.tenantId) {
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
  app.get("/api/appointments", requireTenant, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log(`GET /api/appointments - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
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
      
      // Buscar agendamentos e filtrar por tenant_id
      console.log("Buscando todos os agendamentos");
      appointments = await storage.getAllAppointments();
      
      // Filtrar apenas agendamentos do tenant atual
      appointments = appointments.filter(a => a.tenant_id === req.tenantId);
      
      console.log(`Total de agendamentos encontrados para o tenant ${req.tenantId}: ${appointments.length}`);
      
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
  app.get("/api/loyalty/:phone", requireTenant, async (req: Request, res: Response) => {
    try {
      console.log(`GET /api/loyalty/${req.params.phone} - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      const phone = req.params.phone;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const clientReward = await storage.getClientRewardByPhone(phone);
      
      if (!clientReward) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Verificar se o cliente pertence ao tenant atual
      if (clientReward.tenant_id !== req.tenantId) {
        console.warn(`Tentativa de acesso a dados de fidelidade de outro tenant. Phone: ${phone}, Tenant solicitado: ${req.tenantId}, Tenant do cliente: ${clientReward.tenant_id}`);
        return res.status(404).json({ message: "Client not found or doesn't belong to this tenant" });
      }
      
      console.log(`Retornando dados de fidelidade para o cliente ${phone} do tenant ${req.tenantId}`);
      res.json(clientReward);
    } catch (error) {
      console.error(`Erro ao buscar dados de fidelidade:`, error);
      res.status(500).json({ message: "Failed to get client loyalty" });
    }
  });

  // POST /api/loyalty/lookup - Lookup client loyalty by phone
  app.post("/api/loyalty/lookup", requireTenant, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log(`POST /api/loyalty/lookup - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const clientReward = await storage.getClientRewardByPhone(phone);
      
      if (!clientReward) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Verificar se o cliente pertence ao tenant atual
      if (clientReward.tenant_id !== req.tenantId) {
        console.warn(`Tentativa de acesso a dados de fidelidade de outro tenant. Phone: ${phone}, Tenant solicitado: ${req.tenantId}, Tenant do cliente: ${clientReward.tenant_id}`);
        return res.status(404).json({ message: "Client not found or doesn't belong to this tenant" });
      }
      
      console.log(`Retornando dados de fidelidade para o cliente ${phone} do tenant ${req.tenantId}`);
      
      res.json({
        points: clientReward.attendance_count,
        hasReward: clientReward.attendance_count >= 10,
        client: {
          name: clientReward.client_name,
          phone: clientReward.client_phone
        }
      });
    } catch (error) {
      console.error(`Erro ao buscar dados de fidelidade:`, error);
      res.status(500).json({ message: "Failed to lookup client loyalty" });
    }
  });

  // POST /api/loyalty/reward - Use reward (admin only)
  app.post("/api/loyalty/reward", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      
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
  app.get("/api/dashboard/stats", requireTenant, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log(`GET /api/dashboard/stats - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      // Lógica para gerar estatísticas do dashboard
      let appointments = await storage.getAllAppointments();
      let professionals = await storage.getAllProfessionals();
      let services = await storage.getAllServices();
      let orders = await storage.getAllOrders(req.tenantId);
      
      // Filtrar dados pelo tenant atual
      appointments = appointments.filter(a => a.tenant_id === req.tenantId);
      professionals = professionals.filter(p => p.tenant_id === req.tenantId);
      services = services.filter(s => s.tenant_id === req.tenantId);
      
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
  app.get("/api/dashboard/chart", requireTenant, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log(`GET /api/dashboard/chart - Tenant ID: ${req.tenantId}, Tenant Slug: ${req.tenantSlug}`);
      
      // Data type param: 'day', 'week', 'month'
      const dataType = req.query.type as string || 'week';
      
      // Get appointments
      let appointments = await storage.getAllAppointments();
      
      // Get orders
      let orders = await storage.getAllOrders(req.tenantId);
      
      // Filtrar dados pelo tenant atual
      appointments = appointments.filter(a => a.tenant_id === req.tenantId);
      
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
      // Verificar se um tenant está identificado
      if (!req.tenantId && !req.isAuthenticated()) {
        console.log("Erro: Tenant não identificado e usuário não autenticado");
        return res.status(400).json({
          error: "Tenant não identificado",
          message: "Para acessar esta API, você precisa especificar um tenant válido e ativo usando o parâmetro ?tenant=SLUG"
        });
      }
      
      // Buscar configurações da barbearia com o tenant_id
      const settings = await storage.getBarbershopSettings(req.tenantId);
      
      // Verificar se há um tenant_id
      if (!req.tenantId) {
        // Se não há tenant_id na requisição mas o usuário é um administrador do sistema,
        // retornar as configurações existentes
        if (req.isAuthenticated() && req.user?.isSystemAdmin) {
          console.log("Administrador do sistema acessando configurações sem tenant específico");
          return res.json(settings);
        } else {
          // Se não é um admin do sistema e não há tenant_id, retornar erro
          return res.status(400).json({ 
            message: "Tenant não identificado",
            error: "Para acessar esta página, você precisa especificar um tenant válido usando o parâmetro ?tenant=SLUG"
          });
        }
      } 
      
      // Se temos settings, retornar diretamente (já foi filtrado pelo tenant_id)
      if (settings) {
        return res.json(settings);
      } else {
        // Se não houver configurações para este tenant, criar uma configuração padrão
        if (req.tenantId) {
          console.log(`Criando configurações padrão para tenant ${req.tenantId}`);
          try {
            const defaultSettings = {
              name: "Barbearia",
              address: "Endereço não configurado",
              phone: "Telefone não configurado",
              email: "email@exemplo.com",
              timezone: "America/Sao_Paulo",
              open_time: "09:00",
              close_time: "18:00",
              open_days: [1, 2, 3, 4, 5, 6],
              description: "Descrição não configurada",
              tenant_id: req.tenantId
            };
            
            const newSettings = await storage.createBarbershopSettings(defaultSettings);
            return res.json(newSettings);
          } catch (err) {
            console.error("Erro ao criar configurações padrão:", err);
            return res.status(500).json({ message: "Erro ao criar configurações padrão" });
          }
        } else {
          return res.json(null);
        }
      }
    } catch (error) {
      console.error("Erro ao obter configurações da barbearia:", error);
      res.status(500).json({ message: "Failed to get barbershop settings" });
    }
  });

  // POST /api/barbershop-settings - Create barbershop settings (admin only)
  app.post("/api/barbershop-settings", async (req: Request, res: Response) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized: Você precisa estar autenticado" });
      }
      
      // Verificar permissão (admin ou admin do sistema)
      if (req.user?.role !== 'admin' && !req.user?.isSystemAdmin) {
        return res.status(403).json({ 
          message: "Acesso negado: Apenas administradores podem alterar configurações" 
        });
      }
      
      // Verificar se um tenant está identificado
      if (!req.tenantId && !req.user?.isSystemAdmin) {
        return res.status(400).json({
          error: "Tenant não identificado",
          message: "Para acessar esta API, você precisa especificar um tenant válido e ativo usando o parâmetro ?tenant=SLUG"
        });
      }
      
      // Parsear e validar dados da requisição
      const settingsData = insertBarbershopSettingsSchema.parse(req.body);
      
      // Se for admin do sistema sem tenant específico, usar o tenant_id do corpo da requisição
      let targetTenantId = req.tenantId;
      if (!targetTenantId && req.user?.isSystemAdmin && settingsData.tenant_id) {
        console.log(`Admin do sistema criando configurações para tenant ${settingsData.tenant_id}`);
        targetTenantId = settingsData.tenant_id;
      }
      
      // Verificar se o tenant_id foi definido
      if (!targetTenantId) {
        return res.status(400).json({
          error: "Tenant não especificado",
          message: "Um identificador de tenant é necessário para criar configurações"
        });
      }
      
      // Adicionar tenant_id aos dados de configuração
      const settingsWithTenant = {
        ...settingsData,
        tenant_id: targetTenantId
      };
      
      const settings = await storage.createBarbershopSettings(settingsWithTenant);
      res.status(201).json(settings);
    } catch (error) {
      console.error("Erro ao criar configurações da barbearia:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar configurações" });
      }
    }
  });

  // PUT /api/barbershop-settings - Update barbershop settings (admin only)
  app.put("/api/barbershop-settings", async (req: Request, res: Response) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(403).json({ message: "Unauthorized: Você precisa estar autenticado" });
      }
      
      // Verificar permissão (admin ou admin do sistema)
      if (req.user?.role !== 'admin' && !req.user?.isSystemAdmin) {
        return res.status(403).json({ 
          message: "Acesso negado: Apenas administradores podem alterar configurações" 
        });
      }
      
      // Se for admin do sistema, verificar se possui tenant_id no body
      let targetTenantId = req.tenantId;
      if (!targetTenantId && req.user?.isSystemAdmin && req.body.tenant_id) {
        console.log(`Admin do sistema atualizando configurações para tenant ${req.body.tenant_id}`);
        targetTenantId = req.body.tenant_id;
      }
      
      // Verificar se um tenant foi identificado
      if (!targetTenantId) {
        return res.status(400).json({
          error: "Tenant não identificado",
          message: "Para acessar esta API, você precisa especificar um tenant válido e ativo usando o parâmetro ?tenant=SLUG"
        });
      }
      
      // Obter as configurações atuais com o tenant_id
      const settings = await storage.getBarbershopSettings(targetTenantId);
      
      // Verificar se as configurações existem
      if (!settings) {
        // Se não houver configurações, criar configurações padrão
        console.log(`Criando configurações padrão para tenant ${targetTenantId} durante atualização`);
        try {
          const defaultSettings = {
            name: req.body.name || "Barbearia",
            address: req.body.address || "Endereço não configurado",
            phone: req.body.phone || "Telefone não configurado",
            email: req.body.email || "email@exemplo.com",
            timezone: req.body.timezone || "America/Sao_Paulo",
            open_time: req.body.open_time || "09:00",
            close_time: req.body.close_time || "18:00",
            open_days: req.body.open_days || [1, 2, 3, 4, 5, 6],
            description: req.body.description || "Descrição não configurada",
            tenant_id: targetTenantId
          };
          
          const newSettings = await storage.createBarbershopSettings(defaultSettings);
          return res.status(201).json(newSettings);
        } catch (err) {
          console.error("Erro ao criar configurações padrão:", err);
          return res.status(500).json({ message: "Erro ao criar configurações padrão" });
        }
      }
      
      // Garantir que o tenant_id não seja alterado
      const settingsData = {
        ...req.body,
        id: settings.id, // Importante incluir o ID para atualização
        tenant_id: targetTenantId
      };
      
      const updated = await storage.updateBarbershopSettings(settingsData);
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar configurações da barbearia:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações" });
    }
  });
  
  // PRODUCT ENDPOINTS
  
  // GET /api/products - Get all products
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      console.log("GET /api/products - Requisição recebida para tenant_id:", req.tenantId);
      
      // Usar a função atualizada que aceita filtro de tenant
      const products = await storage.getAllProducts(req.tenantId);
      
      console.log(`Produtos para tenant ${req.tenantId}: ${products.length}`);
      console.log("Lista de produtos:", products.map(p => ({id: p.id, name: p.name, tenant_id: p.tenant_id})));
      
      res.json(products);
    } catch (error) {
      console.error("Erro ao obter produtos:", error);
      res.status(500).json({ message: "Failed to get products" });
    }
  });
  
  // GET /api/products/categories - Get all distinct product categories
  app.get("/api/products/categories", async (req: Request, res: Response) => {
    try {
      // Usar a função atualizada que aceita filtro de tenant
      const products = await storage.getAllProducts(req.tenantId);
      
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
      // Usar a função atualizada que aceita filtro de tenant
      const products = await storage.getProductsByCategory(category, req.tenantId);
      
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to get products by category" });
    }
  });

  // POST /api/products - Create product (admin only)
  app.post("/api/products", requireTenant, isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("Iniciando criação de produto para tenant_id:", req.tenantId);
      console.log("Dados do produto recebidos:", req.body);
      
      const productData = insertProductSchema.parse(req.body);
      console.log("Dados validados com schema:", productData);
      
      // Aplicar tenant_id ao produto
      const dataWithTenant = applyTenantId(productData, req.tenantId);
      console.log("Dados com tenant_id aplicado:", dataWithTenant);
      
      const product = await storage.createProduct(dataWithTenant);
      console.log("Produto criado com sucesso:", product);
      
      // Verificar se podemos recuperar o produto recém-criado
      const allProducts = await storage.getAllProducts();
      const tenantProducts = await storage.getAllProducts(req.tenantId);
      console.log(`Total de produtos cadastrados: ${allProducts.length}, produtos deste tenant: ${tenantProducts.length}`);
      
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Erro de validação:", error.errors);
        res.status(400).json({ message: "Invalid product data", errors: error.errors });
      } else {
        console.error("Erro ao criar produto:", error);
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  // PUT /api/products/:id - Update product (admin only)
  app.put("/api/products/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
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
  app.delete("/api/products/:id", requireTenant, isAdmin, async (req: Request, res: Response) => {
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
  app.put("/api/products/:id/stock", requireTenant, isAdmin, async (req: Request, res: Response) => {
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
      // Removemos a verificação de auth para facilitar o desenvolvimento
      // if (!req.isAuthenticated()) {
      //   return res.status(403).json({ message: "Unauthorized" });
      // }
      
      // Atualizar a função para usar o filtro de tenant
      const orders = await storage.getAllOrders(req.tenantId);
      
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get orders" });
    }
  });

  // GET /api/orders/:id - Get order by id (auth required)
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      // Removemos a verificação de auth para facilitar o desenvolvimento
      // if (!req.isAuthenticated()) {
      //   return res.status(403).json({ message: "Unauthorized" });
      // }
      
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Verificar se a ordem pertence ao tenant atual
      if (order.tenant_id !== req.tenantId) {
        return res.status(403).json({ message: "Access denied" });
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
      // Usar tenantId diretamente na função storage
      const orders = await storage.getOrdersByAppointmentId(appointmentId, req.tenantId);
      
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
      // Usar tenantId diretamente na função storage
      const orders = await storage.getOrdersByClientPhone(phone, req.tenantId);
      
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
      // Removemos a verificação de auth para facilitar o desenvolvimento
      // if (!req.isAuthenticated()) {
      //   return res.status(403).json({ message: "Unauthorized" });
      // }
      
      const orderData = insertOrderSchema.parse(req.body);
      
      // Calcular valor total com base nos itens
      let totalAmount = 0;
      
      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach(item => {
          const subtotal = (item.price || 0) * (item.quantity || 1);
          totalAmount += subtotal;
        });
      }
      
      // Adicionar total ao orderData e aplicar o tenant_id
      const orderWithTotal = {
        ...orderData,
        total_amount: totalAmount,
        tenant_id: req.tenantId
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
      // Removemos a verificação de auth para desenvolvimento
      // if (!req.isAuthenticated()) {
      //   return res.status(403).json({ message: "Unauthorized" });
      // }
      
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      console.log(`Recebida solicitação para atualizar status da comanda ${orderId} para ${status}`);
      
      // Verificar se a ordem existe
      const existingOrder = await storage.getOrderById(orderId);
      if (!existingOrder) {
        console.error(`Comanda com ID ${orderId} não encontrada`);
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Verificar se a ordem pertence ao tenant atual
      if (existingOrder.tenant_id !== req.tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Corrigido para aceitar os status usados no frontend
      if (!status || !['aberta', 'fechada', 'cancelada'].includes(status)) {
        console.error(`Status inválido recebido: '${status}'`);
        return res.status(400).json({ 
          message: "Invalid status", 
          detail: `Status '${status}' inválido. Use um dos valores: aberta, fechada, cancelada` 
        });
      }
      
      const updatedOrder = await storage.updateOrderStatus(orderId, status);
      
      console.log(`Comanda ${orderId} atualizada com sucesso para status: ${status}`);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Erro ao atualizar status da comanda:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // PUT /api/orders/:id/items - Update order items (auth required)
  app.put("/api/orders/:id/items", async (req: Request, res: Response) => {
    try {
      // Removemos a verificação de req.isAuthenticated() porque ela pode estar causando problemas
      // Podemos implementar um método alternativo de autenticação, se necessário
      
      console.log("Recebido PUT /api/orders/:id/items com:", { params: req.params, body: req.body });
      
      const orderId = parseInt(req.params.id);
      const { items, total_amount } = req.body;
      
      // Verificar se a comanda existe
      const existingOrder = await storage.getOrderById(orderId);
      if (!existingOrder) {
        console.error(`Comanda ${orderId} não encontrada para adicionar itens. Todas as comandas existentes para tenant ${req.tenantId}:`, 
                      await storage.getAllOrders(req.tenantId));
        return res.status(404).json({ 
          message: "Comanda não encontrada", 
          detail: `A comanda com ID ${orderId} não existe. Isto pode ocorrer se o servidor foi reiniciado e os dados em memória foram perdidos.` 
        });
      }
      
      // Verificar se a ordem pertence ao tenant atual
      if (existingOrder.tenant_id !== req.tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validar a estrutura dos itens
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }
      
      // Calcular o novo total com base nos itens se não foi fornecido
      let finalTotalAmount = total_amount;
      if (!finalTotalAmount) {
        finalTotalAmount = 0;
        items.forEach(item => {
          const subtotal = (item.price || 0) * (item.quantity || 1);
          finalTotalAmount += subtotal;
        });
      }
      
      console.log("Atualizando comanda com:", { 
        orderId, 
        items: items.length, 
        total_amount: finalTotalAmount 
      });
      
      // Mesclar os itens existentes com os novos itens
      let mergedItems = [...items];
      
      // Se existem itens antigos, adicionar os que não tem duplicações
      if (existingOrder.items && Array.isArray(existingOrder.items)) {
        console.log("Itens existentes na comanda:", existingOrder.items.length);
        console.log("Novos itens sendo adicionados:", items.length);
        
        // Percorrer itens existentes e adicionar os que não têm duplicações nos novos itens
        existingOrder.items.forEach((existingItem: any) => {
          // Garantir que existingItem tenha a propriedade type
          const itemType = existingItem.type || 
                           (existingItem.product_id ? 'product' : 'service');
          
          // Verificar se já existe um item idêntico nos novos itens (mesmo produto ou serviço)
          const isDuplicate = mergedItems.some(newItem => {
            const newItemType = newItem.type || 
                               (newItem.product_id ? 'product' : 'service');
            
            if (itemType === 'product' && newItemType === 'product') {
              return existingItem.product_id === newItem.product_id;
            }
            if (itemType === 'service' && newItemType === 'service') {
              return existingItem.service_id === newItem.service_id;
            }
            return false;
          });
          
          // Se não for duplicado, adicionar à lista mesclada
          if (!isDuplicate) {
            const itemWithType = {
              ...existingItem,
              type: itemType
            };
            mergedItems.push(itemWithType);
          }
        });
      }
      
      // Calcular o total com base nos itens mesclados
      let mergedTotalAmount = 0;
      mergedItems.forEach((item: any) => {
        const subtotal = (item.price || 0) * (item.quantity || 1);
        mergedTotalAmount += subtotal;
      });
      
      // Atualizar a comanda com os itens mesclados e total recalculado e manter status original
      const updatedOrderData = {
        items: mergedItems,
        total: mergedTotalAmount, // Usa o campo 'total' no backend
        status: existingOrder.status // Preservar o status original da comanda
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
  // SYSTEM ROUTES (para gerenciamento de tenants e admins)
  
  // GET /api/system/check - Verificar se o usuário é um administrador do sistema
  app.get("/api/system/check", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ isSystemAdmin: false, message: "Não autenticado" });
      }
      
      // Verificar se o usuário tem a propriedade isSystemAdmin
      if (req.user && ('isSystemAdmin' in req.user)) {
        return res.json({ 
          isSystemAdmin: true, 
          user: {
            id: req.user.id,
            username: req.user.username,
            name: req.user.name,
            email: req.user.email
          }
        });
      }
      
      return res.json({ isSystemAdmin: false });
    } catch (error) {
      res.status(500).json({ message: "Erro ao verificar status de administrador", error: error.message });
    }
  });
  
  // POST /api/system/login - Login como administrador do sistema (alias para /api/login)
  app.post("/api/system/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Falha na autenticação" });
      }
      
      // Verificar se é um administrador do sistema
      if (!('isSystemAdmin' in user)) {
        return res.status(403).json({ message: "Credenciais não pertencem a um administrador do sistema" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Don't send back the password hash
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });
  
  // GET /api/system/tenants - Obter todos os tenants
  app.get("/api/system/tenants", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar tenants", error: error.message });
    }
  });

  // GET /api/system/tenants/:id - Obter tenant por ID
  app.get("/api/system/tenants/:id", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenant = await storage.getTenant(id);
      
      if (!tenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }
      
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar tenant", error: error.message });
    }
  });

  // POST /api/system/tenants - Criar novo tenant
  app.post("/api/system/tenants", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      // Validar dados
      const tenantData = insertTenantSchema.parse(req.body);
      
      // Verificar se o slug já existe
      const existingTenant = await storage.getTenantBySlug(tenantData.slug);
      if (existingTenant) {
        return res.status(400).json({ message: "Slug já está em uso por outro tenant" });
      }
      
      // Criar tenant
      const tenant = await storage.createTenant(tenantData);
      res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar tenant", error: error.message });
      }
    }
  });

  // PUT /api/system/tenants/:id - Atualizar tenant
  app.put("/api/system/tenants/:id", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantData = req.body;
      
      // Verificar se o tenant existe
      const existingTenant = await storage.getTenant(id);
      if (!existingTenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }
      
      // Verificar se o slug já existe (caso esteja sendo alterado)
      if (tenantData.slug && tenantData.slug !== existingTenant.slug) {
        const tenantWithSlug = await storage.getTenantBySlug(tenantData.slug);
        if (tenantWithSlug && tenantWithSlug.id !== id) {
          return res.status(400).json({ message: "Slug já está em uso por outro tenant" });
        }
      }
      
      // Atualizar tenant
      const updated = await storage.updateTenant(id, tenantData);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar tenant", error: error.message });
    }
  });

  // POST /api/system/tenants/:id/activate - Ativar tenant
  app.post("/api/system/tenants/:id/activate", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o tenant existe
      const existingTenant = await storage.getTenant(id);
      if (!existingTenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }
      
      // Ativar tenant
      const updated = await storage.activateTenant(id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao ativar tenant", error: error.message });
    }
  });

  // POST /api/system/tenants/:id/deactivate - Desativar tenant
  app.post("/api/system/tenants/:id/deactivate", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o tenant existe
      const existingTenant = await storage.getTenant(id);
      if (!existingTenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }
      
      // Desativar tenant
      const updated = await storage.deactivateTenant(id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao desativar tenant", error: error.message });
    }
  });

  // DELETE /api/system/tenants/:id - Excluir tenant
  app.delete("/api/system/tenants/:id", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o tenant existe
      const existingTenant = await storage.getTenant(id);
      if (!existingTenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }
      
      // Excluir tenant
      await storage.deleteTenant(id);
      res.status(200).json({ message: "Tenant excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir tenant", error: error.message });
    }
  });

  // GET /api/system/admins - Obter todos os administradores do sistema
  app.get("/api/system/admins", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const admins = await storage.getAllSystemAdmins();
      res.json(admins);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar administradores", error: error.message });
    }
  });

  // POST /api/system/admins - Criar novo administrador do sistema
  app.post("/api/system/admins", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      // Validar dados
      const adminData = insertSystemAdminSchema.parse(req.body);
      
      // Verificar se o username já existe
      const existingAdmin = await storage.getSystemAdminByUsername(adminData.username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }
      
      // Criar administrador
      const admin = await storage.createSystemAdmin(adminData);
      res.status(201).json(admin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar administrador", error: error.message });
      }
    }
  });

  // DELETE /api/system/admins/:id - Excluir administrador do sistema
  app.delete("/api/system/admins/:id", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Não permitir excluir a si mesmo
      if (req.user && req.user.id === id) {
        return res.status(400).json({ message: "Você não pode excluir seu próprio usuário" });
      }
      
      // Verificar se o administrador existe
      const existingAdmin = await storage.getSystemAdmin(id);
      if (!existingAdmin) {
        return res.status(404).json({ message: "Administrador não encontrado" });
      }
      
      // Excluir administrador
      await storage.deleteSystemAdmin(id);
      res.status(200).json({ message: "Administrador excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir administrador", error: error.message });
    }
  });

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

  // ===== FIM DAS APIS DO SISTEMA ===== 
  
  // PUT /api/system/admins/:id - Atualizar administrador do sistema
  app.put("/api/system/admins/:id", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const adminData = req.body;
      
      // Verificar se o admin existe
      const existingAdmin = await storage.getSystemAdmin(id);
      if (!existingAdmin) {
        return res.status(404).json({ message: "Administrador não encontrado" });
      }
      
      // Se estiver atualizando o username, verificar se já existe outro admin com esse username
      if (adminData.username && adminData.username !== existingAdmin.username) {
        const adminWithUsername = await storage.getSystemAdminByUsername(adminData.username);
        if (adminWithUsername && adminWithUsername.id !== id) {
          return res.status(400).json({ message: "Já existe um administrador com esse username" });
        }
      }
      
      const updatedAdmin = await storage.updateSystemAdmin(id, adminData);
      res.json(updatedAdmin);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar administrador", error: String(error) });
    }
  });
  
  // DELETE /api/system/admins/:id - Excluir administrador do sistema
  app.delete("/api/system/admins/:id", isSystemAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verificar se o admin existe
      const existingAdmin = await storage.getSystemAdmin(id);
      if (!existingAdmin) {
        return res.status(404).json({ message: "Administrador não encontrado" });
      }
      
      await storage.deleteSystemAdmin(id);
      res.status(200).json({ message: "Administrador excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir administrador", error: String(error) });
    }
  });
  
  return httpServer;
}