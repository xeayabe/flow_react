// mobile/src/lib/__tests__/budget-allocation-utils.test.ts

import {
  calculateTotalAllocated,
  calculateRemaining,
  calculateAllocatedPercentage,
  validateBudgetAllocation,
  applyEqualSplit,
  sanitizeDecimalInput,
} from '../../../lib/budget-allocation-utils';

describe('budget-allocation-utils', () => {
  describe('calculateTotalAllocated', () => {
    it('should sum all allocations', () => {
      const allocations = { needs: 500, wants: 300, savings: 200 };
      expect(calculateTotalAllocated(allocations)).toBe(1000);
    });

    it('should return 0 for empty allocations', () => {
      expect(calculateTotalAllocated({})).toBe(0);
    });
  });

  describe('calculateRemaining', () => {
    it('should calculate remaining amount', () => {
      expect(calculateRemaining(1000, 700)).toBe(300);
    });

    it('should return 0 if allocated exceeds income', () => {
      expect(calculateRemaining(1000, 1200)).toBe(0);
    });
  });

  describe('calculateAllocatedPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateAllocatedPercentage(500, 1000)).toBe(50);
    });

    it('should return 0 if income is 0', () => {
      expect(calculateAllocatedPercentage(100, 0)).toBe(0);
    });
  });

  describe('validateBudgetAllocation', () => {
    it('should pass with valid allocation', () => {
      const result = validateBudgetAllocation(1000, 1000, 100);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });

    it('should fail with no income', () => {
      const result = validateBudgetAllocation(0, 0, 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('monthly income');
    });

    it('should fail with no allocation', () => {
      const result = validateBudgetAllocation(1000, 0, 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least one category');
    });

    it('should fail if not 100%', () => {
      const result = validateBudgetAllocation(1000, 500, 50);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('100%');
    });
  });

  describe('applyEqualSplit', () => {
    it('should split evenly across groups', () => {
      expect(applyEqualSplit(3000, 3)).toBe(1000);
    });

    it('should handle uneven splits', () => {
      expect(applyEqualSplit(1000, 3)).toBeCloseTo(333.33, 2);
    });
  });

  describe('sanitizeDecimalInput', () => {
    it('should remove non-numeric characters', () => {
      expect(sanitizeDecimalInput('abc123.45def')).toBe('123.45');
    });

    it('should convert comma to dot', () => {
      expect(sanitizeDecimalInput('123,45')).toBe('123.45');
    });

    it('should handle multiple decimal points', () => {
      expect(sanitizeDecimalInput('123.45.67')).toBe('123.4567');
    });

    it('should handle clean input', () => {
      expect(sanitizeDecimalInput('123.45')).toBe('123.45');
    });
  });
});