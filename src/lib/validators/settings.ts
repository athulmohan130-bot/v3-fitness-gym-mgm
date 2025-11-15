import * as z from "zod";

export const gymSettingsSchema = z.object({
  // Business Information
  gymName: z.string().min(2, "Gym name must be at least 2 characters"),
  ownerName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  address: z.string().default(""),
  
  // Regional Settings
  currency: z.enum(["INR", "USD", "EUR", "GBP"]),
  locale: z.string(),
  timezone: z.string(),
  
  // Notification Settings
  notifications: z.object({
    playSound: z.boolean(),
    volume: z.number().min(0).max(1),
  }),
  
  // Attendance Settings
  attendance: z.object({
    enableBiometric: z.boolean(),
    autoMarkPresent: z.boolean(),
    expiringThresholdDays: z.number().min(1).max(30),
  }),
  
  // Membership Settings
  membership: z.object({
    defaultPlanDuration: z.number().min(1),
    autoRenewalReminder: z.boolean(),
    reminderDaysBefore: z.number().min(1).max(60),
  }),
  
  // Display Settings
  display: z.object({
    defaultViewMode: z.enum(["grid", "list", "compact"]),
    itemsPerPage: z.number().min(5).max(100),
    showAvatars: z.boolean(),
    compactMode: z.boolean(),
  }),
  
  // Backup Settings
  backup: z.object({
    autoBackup: z.boolean(),
    backupFrequency: z.enum(["daily", "weekly", "monthly"]),
    lastBackupDate: z.string().optional(),
  }),
  
  // Billing Settings
  billing: z.object({
    taxRate: z.number().min(0).max(100),
    enableTax: z.boolean(),
    invoicePrefix: z.string().min(1).max(10),
    paymentMethods: z.array(z.string()),
  }),
});

export type GymSettingsFormData = z.infer<typeof gymSettingsSchema>;
