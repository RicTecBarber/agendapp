import { pgTable, text, serial, integer, timestamp, doublePrecision, json, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (admin, barber)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("barber"), // 'admin' or 'barber'
  tenant_id: integer("tenant_id"), // FK para o tenant (null para usuários do sistema)
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  duration: integer("duration").notNull(), // in minutes
  tenant_id: integer("tenant_id"), // FK para o tenant
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Professionals
export const professionals = pgTable("professionals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  services_offered: json("services_offered").notNull().$type<number[]>(),
  avatar_url: text("avatar_url"),
  tenant_id: integer("tenant_id"), // FK para o tenant
});

export const insertProfessionalSchema = createInsertSchema(professionals).omit({ id: true });
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Professional = typeof professionals.$inferSelect;

// Availability
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  professional_id: integer("professional_id").notNull(),
  day_of_week: integer("day_of_week").notNull(), // 0-6, Sunday-Saturday
  start_time: text("start_time").notNull(), // "HH:MM" format
  end_time: text("end_time").notNull(), // "HH:MM" format
  is_available: boolean("is_available").notNull().default(true),
  tenant_id: integer("tenant_id"), // FK para o tenant
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({ id: true });
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availability.$inferSelect;

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  client_name: text("client_name").notNull(),
  client_phone: text("client_phone").notNull(),
  service_id: integer("service_id").notNull(),
  professional_id: integer("professional_id").notNull(),
  appointment_date: timestamp("appointment_date").notNull(),
  status: text("status").notNull().default("scheduled"), // 'scheduled', 'completed', 'cancelled'
  created_at: timestamp("created_at").notNull().defaultNow(),
  notify_whatsapp: boolean("notify_whatsapp").default(false),
  is_loyalty_reward: boolean("is_loyalty_reward").default(false),
  tenant_id: integer("tenant_id"), // FK para o tenant
});

// Create base schema
const baseAppointmentSchema = createInsertSchema(appointments).omit({ 
  id: true, 
  created_at: true,
  status: true 
});

// SOLUÇÃO PARA O PROBLEMA DE TIMEZONE: Manter o horário como string
export const insertAppointmentSchema = baseAppointmentSchema.extend({
  appointment_date: z.union([
    z.string(), // Manter como string para preservar o horário exato
    z.date().transform(date => date.toISOString()) // Converter Date para string ISO
  ]),
  status: z.string().optional().default("scheduled"),
});
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Client Rewards
export const clientRewards = pgTable("client_rewards", {
  id: serial("id").primaryKey(),
  client_name: text("client_name").notNull(),
  client_phone: text("client_phone").notNull(),
  total_attendances: integer("total_attendances").notNull().default(0),
  free_services_used: integer("free_services_used").notNull().default(0),
  last_reward_at: timestamp("last_reward_at"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  tenant_id: integer("tenant_id"), // FK para o tenant
});

export const insertClientRewardSchema = createInsertSchema(clientRewards).omit({ 
  id: true, 
  updated_at: true, 
  total_attendances: true,
  free_services_used: true,
  last_reward_at: true
});
export type InsertClientReward = z.infer<typeof insertClientRewardSchema>;
export type ClientReward = typeof clientRewards.$inferSelect;

// Form validation schema for appointment lookup
export const appointmentLookupSchema = z.object({
  client_name: z.string().optional(),
  client_phone: z.string().min(1, "Telefone é obrigatório"),
});

export type AppointmentLookup = z.infer<typeof appointmentLookupSchema>;

// Form validation schema for loyalty lookup
export const loyaltyLookupSchema = z.object({
  client_phone: z.string().min(1, "Telefone é obrigatório"),
});

export type LoyaltyLookup = z.infer<typeof loyaltyLookupSchema>;

// Login Schema
export const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginData = z.infer<typeof loginSchema>;

// Barbershop Settings
export const barbershopSettings = pgTable("barbershop_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  logo_url: text("logo_url"),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"), // Fuso horário
  open_time: text("open_time").notNull().default("08:00"),
  close_time: text("close_time").notNull().default("20:00"),
  open_days: integer("open_days").array().notNull().default([1, 2, 3, 4, 5, 6]), // Days of the week: 0 = Sunday, 1 = Monday, etc.
  description: text("description"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  tenant_id: integer("tenant_id"), // FK para o tenant
});

export const insertBarbershopSettingsSchema = createInsertSchema(barbershopSettings).omit({ 
  id: true, created_at: true, updated_at: true
});
export type InsertBarbershopSettings = z.infer<typeof insertBarbershopSettingsSchema>;
export type BarbershopSettings = typeof barbershopSettings.$inferSelect;

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  stock_quantity: integer("stock_quantity").notNull().default(0),
  category: text("category").notNull().default("outros"), // categorias: 'cuidados', 'acessorios', 'outros', etc.
  image_url: text("image_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  tenant_id: integer("tenant_id"), // FK para o tenant
});

export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, created_at: true, updated_at: true 
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Product categories for select dropdown
export const productCategories = [
  { value: "cuidados", label: "Produtos de Cuidado" },
  { value: "acessorios", label: "Acessórios" },
  { value: "cosmeticos", label: "Cosméticos" },
  { value: "roupas", label: "Roupas e Vestuário" },
  { value: "outros", label: "Outros" }
];

// Order Items (comanda)
export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  type?: 'product' | 'service';
}

// Comandas (orders)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  appointment_id: integer("appointment_id"), // opcional - pode ser null para vendas sem agendamento
  client_name: text("client_name").notNull(),
  client_phone: text("client_phone").notNull(),
  items: jsonb("items").notNull().$type<OrderItem[]>(), // array de itens da comanda
  total: doublePrecision("total").notNull(),
  payment_method: text("payment_method").notNull().default("dinheiro"), // 'dinheiro', 'cartao', 'pix'
  status: text("status").notNull().default("aberta"), // 'aberta', 'fechada', 'cancelada'
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  tenant_id: integer("tenant_id"), // FK para o tenant
});

export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, created_at: true, updated_at: true 
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Payment methods for select dropdown
export const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência Bancária" }
];

// Sistema de Tenants/Clientes
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL amigável para o tenant (ex: cliente1, cliente2)
  active: boolean("active").notNull().default(true), // para compatibilidade com banco de dados existente
  is_active: boolean("is_active").notNull().default(true), // usado no código
  production_url: text("production_url"), // URL de produção do tenant
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ 
  id: true, created_at: true, updated_at: true 
});
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Administradores do Sistema (Super usuários)
export const systemAdmins = pgTable("system_admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSystemAdminSchema = createInsertSchema(systemAdmins).omit({ 
  id: true, created_at: true, updated_at: true 
});
export type InsertSystemAdmin = z.infer<typeof insertSystemAdminSchema>;
export type SystemAdmin = typeof systemAdmins.$inferSelect;
