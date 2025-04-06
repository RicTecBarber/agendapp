import { pgTable, text, serial, integer, timestamp, doublePrecision, json, boolean } from "drizzle-orm/pg-core";
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
});

// Create base schema
const baseAppointmentSchema = createInsertSchema(appointments).omit({ 
  id: true, 
  created_at: true,
  status: true 
});

// Modify to allow string for appointment_date and transform it to Date
export const insertAppointmentSchema = baseAppointmentSchema.extend({
  appointment_date: z.union([
    z.string().transform(str => new Date(str)),
    z.date()
  ]),
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
  client_name: z.string().min(1, "Nome é obrigatório"),
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
  open_time: text("open_time").notNull().default("08:00"),
  close_time: text("close_time").notNull().default("20:00"),
  open_days: integer("open_days").array().notNull().default([1, 2, 3, 4, 5, 6]), // Days of the week: 0 = Sunday, 1 = Monday, etc.
  description: text("description"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBarbershopSettingsSchema = createInsertSchema(barbershopSettings).omit({ 
  id: true, created_at: true, updated_at: true
});
export type InsertBarbershopSettings = z.infer<typeof insertBarbershopSettingsSchema>;
export type BarbershopSettings = typeof barbershopSettings.$inferSelect;
