import { describe, it, expect } from 'vitest';
import { gymSettingsSchema, type GymSettingsFormData } from '@/lib/validators/settings';

/**
 * Unit Tests for Gym Settings Validator
 *
 * Testing comprehensive gym settings validation including:
 * - Business information
 * - Regional settings
 * - Notification preferences
 * - Attendance configuration
 * - Membership settings
 * - Display preferences
 * - Backup settings
 * - Billing configuration
 */
describe('Gym Settings Validator', () => {
  const validSettings: GymSettingsFormData = {
    // Business Information
    gymName: 'V3 Fitness Center',
    ownerName: 'John Doe',
    email: 'owner@v3fitness.com',
    phone: '+1234567890',
    address: '123 Main St, City, State 12345',

    // Regional Settings
    currency: 'USD',
    locale: 'en-US',
    timezone: 'America/New_York',

    // Notification Settings
    notifications: {
      playSound: true,
      playVoice: false,
      volume: 0.8,
    },

    // Attendance Settings
    attendance: {
      enableBiometric: true,
      autoMarkPresent: false,
      expiringThresholdDays: 7,
    },

    // Membership Settings
    membership: {
      defaultPlanDuration: 30,
      autoRenewalReminder: true,
      reminderDaysBefore: 7,
    },

    // Display Settings
    display: {
      defaultViewMode: 'grid',
      itemsPerPage: 20,
      showAvatars: true,
      compactMode: false,
    },

    // Backup Settings
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      lastBackupDate: '2024-01-15',
    },

    // Billing Settings
    billing: {
      taxRate: 18,
      enableTax: true,
      invoicePrefix: 'V3F',
      paymentMethods: ['cash', 'card', 'upi'],
    },
  };

  describe('Complete Valid Settings', () => {
    it('should validate complete valid settings', () => {
      const result = gymSettingsSchema.safeParse(validSettings);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSettings);
      }
    });

    it('should validate minimal required settings', () => {
      const minimalSettings = {
        gymName: 'Gym',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        currency: 'USD',
        locale: 'en-US',
        timezone: 'UTC',
        notifications: {
          playSound: false,
          playVoice: false,
          volume: 0.5,
        },
        attendance: {
          enableBiometric: false,
          autoMarkPresent: false,
          expiringThresholdDays: 1,
        },
        membership: {
          defaultPlanDuration: 1,
          autoRenewalReminder: false,
          reminderDaysBefore: 1,
        },
        display: {
          defaultViewMode: 'list',
          itemsPerPage: 10,
          showAvatars: false,
          compactMode: false,
        },
        backup: {
          autoBackup: false,
          backupFrequency: 'monthly',
        },
        billing: {
          taxRate: 0,
          enableTax: false,
          invoicePrefix: 'G',
          paymentMethods: ['cash'],
        },
      };

      const result = gymSettingsSchema.safeParse(minimalSettings);
      expect(result.success).toBe(true);
    });
  });

  describe('Business Information Validation', () => {
    it('should reject gym name less than 2 characters', () => {
      const invalid = { ...validSettings, gymName: 'A' };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          'Gym name must be at least 2 characters'
        );
      }
    });

    it('should accept gym name with exactly 2 characters', () => {
      const valid = { ...validSettings, gymName: 'AB' };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty optional fields', () => {
      const valid = {
        ...validSettings,
        ownerName: '',
        email: '',
        phone: '',
        address: '',
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept long business information', () => {
      const valid = {
        ...validSettings,
        gymName: 'A'.repeat(200),
        address: 'A'.repeat(500),
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Regional Settings Validation', () => {
    it('should accept INR currency', () => {
      const valid = { ...validSettings, currency: 'INR' };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept all valid currencies', () => {
      const currencies: Array<'INR' | 'USD' | 'EUR' | 'GBP'> = ['INR', 'USD', 'EUR', 'GBP'];
      currencies.forEach((currency) => {
        const valid = { ...validSettings, currency };
        const result = gymSettingsSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid currency', () => {
      const invalid = { ...validSettings, currency: 'JPY' };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept any locale string', () => {
      const locales = ['en-US', 'en-GB', 'hi-IN', 'fr-FR', 'de-DE'];
      locales.forEach((locale) => {
        const valid = { ...validSettings, locale };
        const result = gymSettingsSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });

    it('should accept any timezone string', () => {
      const timezones = ['UTC', 'Asia/Kolkata', 'Europe/London', 'America/Los_Angeles'];
      timezones.forEach((timezone) => {
        const valid = { ...validSettings, timezone };
        const result = gymSettingsSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Notification Settings Validation', () => {
    it('should accept valid notification settings', () => {
      const valid = {
        ...validSettings,
        notifications: {
          playSound: true,
          playVoice: true,
          volume: 0.75,
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept volume at minimum (0)', () => {
      const valid = {
        ...validSettings,
        notifications: { ...validSettings.notifications, volume: 0 },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept volume at maximum (1)', () => {
      const valid = {
        ...validSettings,
        notifications: { ...validSettings.notifications, volume: 1 },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject volume less than 0', () => {
      const invalid = {
        ...validSettings,
        notifications: { ...validSettings.notifications, volume: -0.1 },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject volume greater than 1', () => {
      const invalid = {
        ...validSettings,
        notifications: { ...validSettings.notifications, volume: 1.1 },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Attendance Settings Validation', () => {
    it('should accept minimum expiring threshold (1 day)', () => {
      const valid = {
        ...validSettings,
        attendance: {
          ...validSettings.attendance,
          expiringThresholdDays: 1,
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept maximum expiring threshold (30 days)', () => {
      const valid = {
        ...validSettings,
        attendance: {
          ...validSettings.attendance,
          expiringThresholdDays: 30,
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject expiring threshold less than 1', () => {
      const invalid = {
        ...validSettings,
        attendance: {
          ...validSettings.attendance,
          expiringThresholdDays: 0,
        },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject expiring threshold greater than 30', () => {
      const invalid = {
        ...validSettings,
        attendance: {
          ...validSettings.attendance,
          expiringThresholdDays: 31,
        },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Membership Settings Validation', () => {
    it('should accept minimum default plan duration (1 day)', () => {
      const valid = {
        ...validSettings,
        membership: {
          ...validSettings.membership,
          defaultPlanDuration: 1,
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject default plan duration less than 1', () => {
      const invalid = {
        ...validSettings,
        membership: {
          ...validSettings.membership,
          defaultPlanDuration: 0,
        },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept reminder days at minimum (1 day)', () => {
      const valid = {
        ...validSettings,
        membership: {
          ...validSettings.membership,
          reminderDaysBefore: 1,
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept reminder days at maximum (60 days)', () => {
      const valid = {
        ...validSettings,
        membership: {
          ...validSettings.membership,
          reminderDaysBefore: 60,
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject reminder days greater than 60', () => {
      const invalid = {
        ...validSettings,
        membership: {
          ...validSettings.membership,
          reminderDaysBefore: 61,
        },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Display Settings Validation', () => {
    it('should accept all valid view modes', () => {
      const viewModes: Array<'grid' | 'list' | 'compact'> = ['grid', 'list', 'compact'];
      viewModes.forEach((mode) => {
        const valid = {
          ...validSettings,
          display: { ...validSettings.display, defaultViewMode: mode },
        };
        const result = gymSettingsSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid view mode', () => {
      const invalid = {
        ...validSettings,
        display: { ...validSettings.display, defaultViewMode: 'table' },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept items per page at minimum (5)', () => {
      const valid = {
        ...validSettings,
        display: { ...validSettings.display, itemsPerPage: 5 },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept items per page at maximum (100)', () => {
      const valid = {
        ...validSettings,
        display: { ...validSettings.display, itemsPerPage: 100 },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject items per page less than 5', () => {
      const invalid = {
        ...validSettings,
        display: { ...validSettings.display, itemsPerPage: 4 },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject items per page greater than 100', () => {
      const invalid = {
        ...validSettings,
        display: { ...validSettings.display, itemsPerPage: 101 },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Backup Settings Validation', () => {
    it('should accept all valid backup frequencies', () => {
      const frequencies: Array<'daily' | 'weekly' | 'monthly'> = [
        'daily',
        'weekly',
        'monthly',
      ];
      frequencies.forEach((freq) => {
        const valid = {
          ...validSettings,
          backup: { ...validSettings.backup, backupFrequency: freq },
        };
        const result = gymSettingsSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid backup frequency', () => {
      const invalid = {
        ...validSettings,
        backup: { ...validSettings.backup, backupFrequency: 'hourly' },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept backup without lastBackupDate', () => {
      const valid = {
        ...validSettings,
        backup: {
          autoBackup: true,
          backupFrequency: 'daily' as const,
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept backup with lastBackupDate', () => {
      const valid = {
        ...validSettings,
        backup: {
          ...validSettings.backup,
          lastBackupDate: '2024-01-15T10:30:00Z',
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Billing Settings Validation', () => {
    it('should accept tax rate at minimum (0%)', () => {
      const valid = {
        ...validSettings,
        billing: { ...validSettings.billing, taxRate: 0 },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept tax rate at maximum (100%)', () => {
      const valid = {
        ...validSettings,
        billing: { ...validSettings.billing, taxRate: 100 },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject tax rate less than 0', () => {
      const invalid = {
        ...validSettings,
        billing: { ...validSettings.billing, taxRate: -1 },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject tax rate greater than 100', () => {
      const invalid = {
        ...validSettings,
        billing: { ...validSettings.billing, taxRate: 101 },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept invoice prefix with 1 character', () => {
      const valid = {
        ...validSettings,
        billing: { ...validSettings.billing, invoicePrefix: 'A' },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept invoice prefix with 10 characters', () => {
      const valid = {
        ...validSettings,
        billing: { ...validSettings.billing, invoicePrefix: 'A'.repeat(10) },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invoice prefix with more than 10 characters', () => {
      const invalid = {
        ...validSettings,
        billing: { ...validSettings.billing, invoicePrefix: 'A'.repeat(11) },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty invoice prefix', () => {
      const invalid = {
        ...validSettings,
        billing: { ...validSettings.billing, invoicePrefix: '' },
      };
      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept multiple payment methods', () => {
      const valid = {
        ...validSettings,
        billing: {
          ...validSettings.billing,
          paymentMethods: ['cash', 'card', 'upi', 'net-banking', 'cheque'],
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept single payment method', () => {
      const valid = {
        ...validSettings,
        billing: {
          ...validSettings.billing,
          paymentMethods: ['cash'],
        },
      };
      const result = gymSettingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should reject settings with missing required fields', () => {
      const incomplete = {
        gymName: 'Test Gym',
        // Missing other required fields
      };
      const result = gymSettingsSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('should handle multiple validation errors', () => {
      const invalid = {
        gymName: 'A',  // Too short
        currency: 'INVALID',  // Invalid currency
        notifications: {
          playSound: true,
          playVoice: false,
          volume: 2,  // Out of range
        },
        attendance: {
          enableBiometric: false,
          autoMarkPresent: false,
          expiringThresholdDays: 31,  // Out of range
        },
        membership: {
          defaultPlanDuration: 0,  // Invalid
          autoRenewalReminder: false,
          reminderDaysBefore: 1,
        },
        display: {
          defaultViewMode: 'invalid',  // Invalid
          itemsPerPage: 200,  // Out of range
          showAvatars: false,
          compactMode: false,
        },
        backup: {
          autoBackup: false,
          backupFrequency: 'invalid',  // Invalid
        },
        billing: {
          taxRate: 150,  // Out of range
          enableTax: false,
          invoicePrefix: '',  // Empty
          paymentMethods: [],
        },
      };

      const result = gymSettingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(5);
      }
    });
  });
});
