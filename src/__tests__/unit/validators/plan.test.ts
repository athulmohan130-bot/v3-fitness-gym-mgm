import { describe, it, expect } from 'vitest';
import { planSchema, defaultPlanValues, type PlanFormData } from '@/lib/validators/plan';
import { ZodError } from 'zod';

/**
 * Unit Tests for Plan Validator
 *
 * Testing Strategy:
 * - Validate all required fields
 * - Test boundary conditions for numeric values
 * - Verify min/max constraints
 * - Test array validation for features
 * - Ensure proper error messages
 * - Test default values
 *
 * Business Rules:
 * - Plan name must be at least 3 characters
 * - Price must be non-negative
 * - Duration must be at least 1 day
 * - At least one feature is required
 * - Features cannot be empty strings
 * - Status must be 'active' or 'inactive'
 */
describe('Plan Validator', () => {
  describe('Valid Plan Data', () => {
    it('should validate a complete valid plan', () => {
      const validPlan: PlanFormData = {
        name: 'Gold Membership',
        price: 1200,
        durationInDays: 365,
        features: [
          { value: '24/7 Gym Access' },
          { value: 'Personal Training' },
          { value: 'Group Classes' },
        ],
        status: 'active',
      };

      const result = planSchema.safeParse(validPlan);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPlan);
      }
    });

    it('should validate plan with minimum valid values', () => {
      const minPlan: PlanFormData = {
        name: 'Min',  // 3 characters (minimum)
        price: 0,     // 0 is valid (free plan)
        durationInDays: 1,  // 1 day minimum
        features: [{ value: 'F' }],  // Single character is valid
        status: 'active',
      };

      const result = planSchema.safeParse(minPlan);
      expect(result.success).toBe(true);
    });

    it('should validate plan with inactive status', () => {
      const inactivePlan: PlanFormData = {
        name: 'Inactive Plan',
        price: 500,
        durationInDays: 30,
        features: [{ value: 'Basic Access' }],
        status: 'inactive',
      };

      const result = planSchema.safeParse(inactivePlan);
      expect(result.success).toBe(true);
    });

    it('should validate plan with multiple features', () => {
      const plan: PlanFormData = {
        name: 'Premium Plan',
        price: 2500,
        durationInDays: 365,
        features: [
          { value: 'Feature 1' },
          { value: 'Feature 2' },
          { value: 'Feature 3' },
          { value: 'Feature 4' },
          { value: 'Feature 5' },
        ],
        status: 'active',
      };

      const result = planSchema.safeParse(plan);
      expect(result.success).toBe(true);
    });

    it('should use default status when not provided', () => {
      const planWithoutStatus = {
        name: 'Test Plan',
        price: 1000,
        durationInDays: 30,
        features: [{ value: 'Access' }],
      };

      const result = planSchema.safeParse(planWithoutStatus);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('active');
      }
    });
  });

  describe('Name Validation', () => {
    it('should reject plan name with less than 3 characters', () => {
      const invalidPlan = {
        name: 'AB',  // Only 2 characters
        price: 1000,
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name must be at least 3 characters');
        expect(result.error.errors[0].path).toEqual(['name']);
      }
    });

    it('should reject empty plan name', () => {
      const invalidPlan = {
        name: '',
        price: 1000,
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['name']);
      }
    });

    it('should accept long plan names', () => {
      const planWithLongName = {
        name: 'A'.repeat(100),  // Very long name
        price: 1000,
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(planWithLongName);
      expect(result.success).toBe(true);
    });
  });

  describe('Price Validation', () => {
    it('should accept zero price (free plan)', () => {
      const freePlan = {
        name: 'Free Plan',
        price: 0,
        durationInDays: 30,
        features: [{ value: 'Basic Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(freePlan);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const invalidPlan = {
        name: 'Invalid Plan',
        price: -100,
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Price must be a positive number');
        expect(result.error.errors[0].path).toEqual(['price']);
      }
    });

    it('should accept large price values', () => {
      const expensivePlan = {
        name: 'VIP Plan',
        price: 999999.99,
        durationInDays: 365,
        features: [{ value: 'All Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(expensivePlan);
      expect(result.success).toBe(true);
    });

    it('should reject non-numeric price', () => {
      const invalidPlan = {
        name: 'Test Plan',
        price: 'not a number',
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });
  });

  describe('Duration Validation', () => {
    it('should accept 1 day duration', () => {
      const oneDayPlan = {
        name: 'Daily Pass',
        price: 20,
        durationInDays: 1,
        features: [{ value: 'Single Day Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(oneDayPlan);
      expect(result.success).toBe(true);
    });

    it('should reject 0 day duration', () => {
      const invalidPlan = {
        name: 'Invalid Plan',
        price: 1000,
        durationInDays: 0,
        features: [{ value: 'Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Duration must be at least 1 day');
        expect(result.error.errors[0].path).toEqual(['durationInDays']);
      }
    });

    it('should reject negative duration', () => {
      const invalidPlan = {
        name: 'Invalid Plan',
        price: 1000,
        durationInDays: -30,
        features: [{ value: 'Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });

    it('should accept long duration values', () => {
      const lifetimePlan = {
        name: 'Lifetime Plan',
        price: 50000,
        durationInDays: 36500,  // 100 years
        features: [{ value: 'Lifetime Access' }],
        status: 'active',
      };

      const result = planSchema.safeParse(lifetimePlan);
      expect(result.success).toBe(true);
    });
  });

  describe('Features Validation', () => {
    it('should reject empty features array', () => {
      const invalidPlan = {
        name: 'No Features Plan',
        price: 1000,
        durationInDays: 30,
        features: [],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('At least one feature is required.');
        expect(result.error.errors[0].path).toEqual(['features']);
      }
    });

    it('should reject feature with empty string value', () => {
      const invalidPlan = {
        name: 'Invalid Feature Plan',
        price: 1000,
        durationInDays: 30,
        features: [{ value: '' }],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        const featureError = result.error.errors.find((e) =>
          e.path.includes('features')
        );
        expect(featureError).toBeDefined();
      }
    });

    it('should reject features array with some empty values', () => {
      const invalidPlan = {
        name: 'Mixed Features Plan',
        price: 1000,
        durationInDays: 30,
        features: [
          { value: 'Valid Feature' },
          { value: '' },  // Invalid empty feature
          { value: 'Another Valid Feature' },
        ],
        status: 'active',
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });

    it('should accept features with special characters', () => {
      const planWithSpecialChars = {
        name: 'Special Plan',
        price: 1000,
        durationInDays: 30,
        features: [
          { value: '24/7 Access!' },
          { value: 'Free Wi-Fi (High Speed)' },
          { value: 'Nutrition & Diet Planning' },
        ],
        status: 'active',
      };

      const result = planSchema.safeParse(planWithSpecialChars);
      expect(result.success).toBe(true);
    });

    it('should accept features with unicode characters', () => {
      const planWithUnicode = {
        name: 'International Plan',
        price: 1000,
        durationInDays: 30,
        features: [
          { value: 'Accès 24/7' },
          { value: 'Räume für Yoga' },
          { value: '瑜伽课程' },
        ],
        status: 'active',
      };

      const result = planSchema.safeParse(planWithUnicode);
      expect(result.success).toBe(true);
    });
  });

  describe('Status Validation', () => {
    it('should accept "active" status', () => {
      const activePlan = {
        name: 'Active Plan',
        price: 1000,
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'active' as const,
      };

      const result = planSchema.safeParse(activePlan);
      expect(result.success).toBe(true);
    });

    it('should accept "inactive" status', () => {
      const inactivePlan = {
        name: 'Inactive Plan',
        price: 1000,
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'inactive' as const,
      };

      const result = planSchema.safeParse(inactivePlan);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const invalidPlan = {
        name: 'Test Plan',
        price: 1000,
        durationInDays: 30,
        features: [{ value: 'Access' }],
        status: 'pending',  // Invalid status
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });
  });

  describe('Default Values', () => {
    it('should have correct default values', () => {
      expect(defaultPlanValues).toEqual({
        name: '',
        price: 0,
        durationInDays: 30,
        features: [{ value: '' }],
        status: 'active',
      });
    });

    it('should apply default status when omitted', () => {
      const planWithoutStatus = {
        name: 'Test Plan',
        price: 1000,
        durationInDays: 30,
        features: [{ value: 'Access' }],
      };

      const result = planSchema.parse(planWithoutStatus);
      expect(result.status).toBe('active');
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should return all validation errors for invalid plan', () => {
      const invalidPlan = {
        name: 'AB',  // Too short
        price: -100,  // Negative
        durationInDays: 0,  // Zero days
        features: [],  // Empty array
        status: 'invalid',  // Invalid status
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have multiple errors
        expect(result.error.errors.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined values', () => {
      const invalidPlan = {
        name: undefined,
        price: undefined,
        durationInDays: undefined,
        features: undefined,
        status: undefined,
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });

    it('should handle null values', () => {
      const invalidPlan = {
        name: null,
        price: null,
        durationInDays: null,
        features: null,
        status: null,
      };

      const result = planSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });

    it('should handle missing required fields', () => {
      const incompletePlan = {
        name: 'Test Plan',
        // Missing other required fields
      };

      const result = planSchema.safeParse(incompletePlan);
      expect(result.success).toBe(false);
    });
  });
});
