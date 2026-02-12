/**
 * Tests for split-math.ts (to be created by Agent 2)
 *
 * Tests the pure math functions for splitting shared expenses between
 * household members. These functions handle rounding with the "remainder
 * to first" strategy to ensure splits always sum exactly to the total.
 *
 * Expected API (based on CLAUDE.md and architecture docs):
 *   - calculateSplitAmounts(amount: number, ratios: number[]): number[]
 *   - validateSplitRatios(ratios: number[]): boolean
 *
 * Swiss-specific scenarios:
 *   - CHF amounts always rounded to 2 decimal places (Rappen)
 *   - Remainder assigned to first split holder
 */

// NOTE: Agent 2 creates src/utils/split-math.ts.
// This test file defines the expected behavior based on the CLAUDE.md spec.
// Adjust the import path once the file is created.

// Placeholder import -- update once Agent 2's file exists:
// import { calculateSplitAmounts, validateSplitRatios } from '../../utils/split-math';

// ---------------------------------------------------------------------------
// Temporary inline implementation for test development
// Remove this block once the real module exists
// ---------------------------------------------------------------------------
function calculateSplitAmounts(amount: number, ratios: number[]): number[] {
  if (amount < 0) {
    throw new Error('Amount must be non-negative');
  }
  if (ratios.length === 0) {
    return [];
  }

  const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
  if (totalRatio === 0) {
    throw new Error('Ratios must sum to a positive number');
  }

  // Calculate raw splits
  const rawSplits = ratios.map((r) => (amount * r) / totalRatio);

  // Round each to 2 decimal places
  const roundedSplits = rawSplits.map((s) => Math.floor(s * 100) / 100);

  // Calculate remainder (in Rappen)
  const roundedTotal = roundedSplits.reduce((sum, s) => sum + s, 0);
  const remainder = Math.round((amount - roundedTotal) * 100) / 100;

  // Assign remainder to the first split holder
  if (remainder > 0) {
    roundedSplits[0] = Math.round((roundedSplits[0] + remainder) * 100) / 100;
  }

  return roundedSplits;
}
// ---------------------------------------------------------------------------

describe('calculateSplitAmounts', () => {
  // -----------------------------------------------------------------------
  // 50/50 splits
  // -----------------------------------------------------------------------

  describe('50/50 splits', () => {
    it('splits CHF 100.00 evenly', () => {
      const result = calculateSplitAmounts(100.0, [50, 50]);
      expect(result).toEqual([50.0, 50.0]);
      expect(result[0] + result[1]).toBe(100.0);
    });

    it('splits CHF 100.01 with remainder to first', () => {
      const result = calculateSplitAmounts(100.01, [50, 50]);
      // 100.01 / 2 = 50.005 each
      // Floor: 50.00 each = 100.00 total, remainder = 0.01
      // First gets remainder: 50.01 + 50.00 = 100.01
      expect(result[0]).toBe(50.01);
      expect(result[1]).toBe(50.0);
      expect(result[0] + result[1]).toBe(100.01);
    });

    it('splits CHF 1.00 evenly', () => {
      const result = calculateSplitAmounts(1.0, [50, 50]);
      expect(result).toEqual([0.5, 0.5]);
    });

    it('splits CHF 0.01 (minimum meaningful amount)', () => {
      const result = calculateSplitAmounts(0.01, [50, 50]);
      // 0.01 / 2 = 0.005 each -> floors to 0.00 each
      // remainder = 0.01, goes to first
      expect(result[0]).toBe(0.01);
      expect(result[1]).toBe(0.0);
      expect(result[0] + result[1]).toBe(0.01);
    });
  });

  // -----------------------------------------------------------------------
  // 60/40 splits (typical Flow household scenario)
  // -----------------------------------------------------------------------

  describe('60/40 splits', () => {
    it('splits CHF 100.00 at 60/40', () => {
      const result = calculateSplitAmounts(100.0, [60, 40]);
      expect(result[0]).toBe(60.0);
      expect(result[1]).toBe(40.0);
      expect(result[0] + result[1]).toBe(100.0);
    });

    it('splits typical Zurich rent CHF 2100.00 at 60/40', () => {
      const result = calculateSplitAmounts(2100.0, [60, 40]);
      expect(result[0]).toBe(1260.0);
      expect(result[1]).toBe(840.0);
      expect(result[0] + result[1]).toBe(2100.0);
    });

    it('splits Migros bill CHF 87.35 at 60/40', () => {
      const result = calculateSplitAmounts(87.35, [60, 40]);
      // 87.35 * 0.6 = 52.41, 87.35 * 0.4 = 34.94
      expect(result[0] + result[1]).toBe(87.35);
    });
  });

  // -----------------------------------------------------------------------
  // 70/30 splits
  // -----------------------------------------------------------------------

  describe('70/30 splits', () => {
    it('splits CHF 99.99 at 70/30', () => {
      const result = calculateSplitAmounts(99.99, [70, 30]);
      // 99.99 * 0.7 = 69.993 -> floor = 69.99
      // 99.99 * 0.3 = 29.997 -> floor = 29.99
      // total = 99.98, remainder = 0.01
      expect(result[0]).toBeCloseTo(70.0, 2);
      expect(result[1]).toBeCloseTo(29.99, 2);
      expect(result[0] + result[1]).toBe(99.99);
    });
  });

  // -----------------------------------------------------------------------
  // Sum invariant: splits ALWAYS sum to total
  // -----------------------------------------------------------------------

  describe('sum invariant', () => {
    const testCases = [
      { amount: 100.0, ratios: [50, 50] },
      { amount: 100.01, ratios: [50, 50] },
      { amount: 100.01, ratios: [60, 40] },
      { amount: 87.35, ratios: [60, 40] },
      { amount: 2100.0, ratios: [60, 40] },
      { amount: 99.99, ratios: [70, 30] },
      { amount: 0.01, ratios: [50, 50] },
      { amount: 999999.99, ratios: [60, 40] },
      { amount: 100.0, ratios: [33, 33, 34] },
      { amount: 1.0, ratios: [33, 33, 34] },
    ];

    testCases.forEach(({ amount, ratios }) => {
      it(`splits ${amount} by ${ratios.join('/')} and sums to total`, () => {
        const result = calculateSplitAmounts(amount, ratios);
        const total = result.reduce((sum, v) => sum + v, 0);
        expect(Math.round(total * 100) / 100).toBe(amount);
      });
    });
  });

  // -----------------------------------------------------------------------
  // Zero amount
  // -----------------------------------------------------------------------

  describe('zero amount', () => {
    it('returns all zeros for zero amount', () => {
      const result = calculateSplitAmounts(0, [50, 50]);
      expect(result).toEqual([0, 0]);
    });
  });

  // -----------------------------------------------------------------------
  // Very large amounts
  // -----------------------------------------------------------------------

  describe('very large amounts', () => {
    it('handles CHF 999,999.99 correctly', () => {
      const result = calculateSplitAmounts(999999.99, [60, 40]);
      const total = result.reduce((sum, v) => sum + v, 0);
      expect(Math.round(total * 100) / 100).toBe(999999.99);
    });
  });

  // -----------------------------------------------------------------------
  // Negative amount should throw
  // -----------------------------------------------------------------------

  describe('negative amounts', () => {
    it('throws an error for negative amounts', () => {
      expect(() => calculateSplitAmounts(-100, [50, 50])).toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Three-way splits
  // -----------------------------------------------------------------------

  describe('three-way splits', () => {
    it('splits CHF 100.00 at 33/33/34', () => {
      const result = calculateSplitAmounts(100.0, [33, 33, 34]);
      const total = result.reduce((sum, v) => sum + v, 0);
      expect(Math.round(total * 100) / 100).toBe(100.0);
      expect(result.length).toBe(3);
    });

    it('splits CHF 1.00 three ways', () => {
      const result = calculateSplitAmounts(1.0, [33, 33, 34]);
      const total = result.reduce((sum, v) => sum + v, 0);
      expect(Math.round(total * 100) / 100).toBe(1.0);
    });
  });

  // -----------------------------------------------------------------------
  // Rounding precision
  // -----------------------------------------------------------------------

  describe('rounding precision', () => {
    it('all splits have at most 2 decimal places', () => {
      const result = calculateSplitAmounts(100.01, [33, 33, 34]);
      result.forEach((split) => {
        const decimalPlaces = (split.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });
    });
  });
});
