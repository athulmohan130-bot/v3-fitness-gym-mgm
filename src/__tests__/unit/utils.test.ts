import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

/**
 * Unit Tests for Utility Functions
 *
 * Testing Philosophy:
 * - Test edge cases and boundary conditions
 * - Verify expected behavior with valid inputs
 * - Ensure proper handling of invalid/unexpected inputs
 * - Test class name merging and conflict resolution
 */
describe('cn() - className utility function', () => {
  describe('Basic Functionality', () => {
    it('should merge single class name', () => {
      expect(cn('px-4')).toBe('px-4');
    });

    it('should merge multiple class names', () => {
      const result = cn('px-4', 'py-2', 'bg-blue-500');
      expect(result).toContain('px-4');
      expect(result).toContain('py-2');
      expect(result).toContain('bg-blue-500');
    });

    it('should handle empty strings', () => {
      expect(cn('', 'px-4', '')).toBe('px-4');
    });

    it('should handle undefined values', () => {
      expect(cn(undefined, 'px-4', undefined)).toBe('px-4');
    });

    it('should handle null values', () => {
      expect(cn(null, 'px-4', null)).toBe('px-4');
    });

    it('should return empty string when no valid classes provided', () => {
      expect(cn()).toBe('');
      expect(cn('', null, undefined)).toBe('');
    });
  });

  describe('Conditional Class Names', () => {
    it('should handle conditional classes with boolean true', () => {
      const isActive = true;
      expect(cn(isActive && 'active')).toBe('active');
    });

    it('should handle conditional classes with boolean false', () => {
      const isActive = false;
      expect(cn(isActive && 'active')).toBe('');
    });

    it('should handle object-based conditional classes', () => {
      const result = cn({
        'bg-blue-500': true,
        'text-white': true,
        'hidden': false,
      });
      expect(result).toContain('bg-blue-500');
      expect(result).toContain('text-white');
      expect(result).not.toContain('hidden');
    });
  });

  describe('Tailwind Merge Functionality', () => {
    it('should resolve conflicting padding classes (last wins)', () => {
      const result = cn('px-4', 'px-8');
      expect(result).toBe('px-8');
      expect(result).not.toContain('px-4');
    });

    it('should resolve conflicting margin classes', () => {
      const result = cn('mx-2', 'mx-4', 'mx-6');
      expect(result).toBe('mx-6');
    });

    it('should resolve conflicting background colors', () => {
      const result = cn('bg-red-500', 'bg-blue-500', 'bg-green-500');
      expect(result).toBe('bg-green-500');
    });

    it('should preserve non-conflicting classes', () => {
      const result = cn('px-4', 'py-2', 'bg-blue-500', 'px-8');
      expect(result).toContain('px-8');
      expect(result).toContain('py-2');
      expect(result).toContain('bg-blue-500');
      expect(result).not.toContain('px-4');
    });

    it('should handle responsive class conflicts', () => {
      const result = cn('px-4', 'md:px-8', 'px-2');
      expect(result).toBe('md:px-8 px-2');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle array of class names', () => {
      const classes = ['px-4', 'py-2', 'bg-blue-500'];
      expect(cn(classes)).toContain('px-4');
    });

    it('should handle mixed types', () => {
      const result = cn(
        'base-class',
        true && 'conditional-class',
        false && 'hidden-class',
        { 'object-class': true },
        ['array-class']
      );
      expect(result).toContain('base-class');
      expect(result).toContain('conditional-class');
      expect(result).toContain('object-class');
      expect(result).toContain('array-class');
      expect(result).not.toContain('hidden-class');
    });

    it('should handle button variant pattern', () => {
      const variant = 'primary';
      const size = 'lg';
      const result = cn(
        'btn',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary',
        size === 'lg' && 'btn-lg'
      );
      expect(result).toContain('btn');
      expect(result).toContain('btn-primary');
      expect(result).toContain('btn-lg');
      expect(result).not.toContain('btn-secondary');
    });

    it('should handle disabled state pattern', () => {
      const isDisabled = true;
      const result = cn(
        'btn bg-blue-500 hover:bg-blue-600',
        isDisabled && 'opacity-50 cursor-not-allowed'
      );
      expect(result).toContain('btn');
      expect(result).toContain('opacity-50');
      expect(result).toContain('cursor-not-allowed');
    });
  });

  describe('Real-world Use Cases', () => {
    it('should handle card component classes', () => {
      const isHovered = true;
      const isSelected = false;
      const result = cn(
        'rounded-lg border p-4',
        'transition-all duration-200',
        isHovered && 'shadow-lg scale-105',
        isSelected && 'border-blue-500 bg-blue-50'
      );
      expect(result).toContain('rounded-lg');
      expect(result).toContain('shadow-lg');
      expect(result).not.toContain('border-blue-500');
    });

    it('should handle form input classes', () => {
      const hasError = true;
      const isDisabled = false;
      const result = cn(
        'w-full px-3 py-2 border rounded-md',
        hasError && 'border-red-500 focus:ring-red-500',
        isDisabled && 'bg-gray-100 cursor-not-allowed'
      );
      expect(result).toContain('border-red-500');
      expect(result).not.toContain('bg-gray-100');
    });

    it('should handle responsive navigation classes', () => {
      const isMobile = true;
      const result = cn(
        'flex items-center justify-between',
        'px-4 py-2',
        isMobile ? 'flex-col space-y-2' : 'flex-row space-x-4'
      );
      expect(result).toContain('flex');
      expect(result).toContain('flex-col');
      expect(result).not.toContain('flex-row');
    });
  });

  describe('Performance & Edge Cases', () => {
    it('should handle large number of classes', () => {
      const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      const result = cn(...manyClasses);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters in class names', () => {
      const result = cn('hover:bg-blue-500', 'focus:ring-2', 'dark:bg-gray-800');
      expect(result).toContain('hover:bg-blue-500');
      expect(result).toContain('focus:ring-2');
      expect(result).toContain('dark:bg-gray-800');
    });

    it('should handle numeric class names', () => {
      const result = cn('w-1/2', 'h-1/3', 'opacity-50');
      expect(result).toContain('w-1/2');
      expect(result).toContain('h-1/3');
      expect(result).toContain('opacity-50');
    });
  });
});
