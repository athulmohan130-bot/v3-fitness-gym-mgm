export interface GymSettings {
  // Business Information
  gymName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  
  // Regional Settings
  currency: "INR" | "USD" | "EUR" | "GBP";
  locale: string;
  timezone: string;
  
  // Notification Settings
  notifications: {
    playSound: boolean;
    volume: number; // 0 to 1
  };
  
  // Attendance Settings
  attendance: {
    enableBiometric: boolean;
    autoMarkPresent: boolean;
    expiringThresholdDays: number; // Days before expiry to show warning
  };
  
  // Membership Settings
  membership: {
    defaultPlanDuration: number; // in days
    autoRenewalReminder: boolean;
    reminderDaysBefore: number;
  };
  
  // Display Settings
  display: {
    defaultViewMode: "grid" | "list" | "compact";
    itemsPerPage: number;
    showAvatars: boolean;
    compactMode: boolean;
  };
  
  // Backup Settings
  backup: {
    autoBackup: boolean;
    backupFrequency: "daily" | "weekly" | "monthly";
    lastBackupDate?: string;
  };
  
  // Billing Settings
  billing: {
    taxRate: number; // percentage
    enableTax: boolean;
    invoicePrefix: string;
    paymentMethods: string[];
  };
}

export const defaultGymSettings: GymSettings = {
  gymName: "My Gym",
  ownerName: "",
  email: "",
  phone: "",
  address: "",
  
  currency: "INR",
  locale: "en-IN",
  timezone: "Asia/Kolkata",
  
  notifications: {
    playSound: true,
    volume: 0.7,
  },
  
  attendance: {
    enableBiometric: false,
    autoMarkPresent: true,
    expiringThresholdDays: 3,
  },
  
  membership: {
    defaultPlanDuration: 30,
    autoRenewalReminder: true,
    reminderDaysBefore: 7,
  },
  
  display: {
    defaultViewMode: "grid",
    itemsPerPage: 20,
    showAvatars: true,
    compactMode: false,
  },
  
  backup: {
    autoBackup: false,
    backupFrequency: "weekly",
  },
  
  billing: {
    taxRate: 18, // GST in India
    enableTax: false,
    invoicePrefix: "INV",
    paymentMethods: ["Cash", "Card", "UPI"],
  },
};
