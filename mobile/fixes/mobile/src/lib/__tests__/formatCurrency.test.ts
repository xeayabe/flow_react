/**
 * Tests for formatCurrency (src/lib/formatCurrency.ts)
 *
 * Swiss CHF formatting rules:
 *   - Apostrophe thousand separator: 1'234.56
 *   - Period decimal separator
 *   - "CHF" suffix with space: "1'234.56 CHF"
 *   - Always 2 decimal places
 *   - Negative sign as prefix: "-1'234.56 CHF"
 *   - Optional showSign: "+1'234.56 CHF"
 *   - Optional showCurrency=false: "1'234.56"
 */

import { formatCurrency } from '../formatCurrency';

describe('formatCurrency', () => {
  // -----------------------------------------------------------------------
  // Basic positive amounts
  // -----------------------------------------------------------------------

  describe('positive amounts', () => {
    it('formats a simple integer amount', () => {
      expect(formatCurrency(100)).toBe('100.00 CHF');
    });

    it('formats an amount with cents', () => {
      expect(formatCurrency(1234.56)).toBe("1'234.56 CHF");
    });

    it('formats a large amount with multiple separators', () => {
      expect(formatCurrency(1234567.89)).toBe("1'234'567.89 CHF");
    });

    it('formats a small amount under 1 CHF', () => {
      expect(formatCurrency(0.5)).toBe('0.50 CHF');
    });

    it('formats a very small amount', () => {
      expect(formatCurrency(0.01)).toBe('0.01 CHF');
    });

    it('formats a typical Swiss salary', () => {
      expect(formatCurrency(7892)).toBe("7'892.00 CHF");
    });

    it('formats a typical Swiss rent', () => {
      expect(formatCurrency(2100)).toBe("2'100.00 CHF");
    });

    it('formats a Migros grocery bill', () => {
      expect(formatCurrency(87.35)).toBe('87.35 CHF');
    });

    it('formats an amount just below 1000', () => {
      expect(formatCurrency(999.99)).toBe('999.99 CHF');
    });

    it('formats exactly 1000', () => {
      expect(formatCurrency(1000)).toBe("1'000.00 CHF");
    });
  });

  // -----------------------------------------------------------------------
  // Zero
  // -----------------------------------------------------------------------

  describe('zero amount', () => {
    it('formats zero correctly with 2 decimal places', () => {
      expect(formatCurrency(0)).toBe('0.00 CHF');
    });
  });

  // -----------------------------------------------------------------------
  // Negative amounts
  // -----------------------------------------------------------------------

  describe('negative amounts', () => {
    it('formats a negative amount with sign prefix', () => {
      expect(formatCurrency(-123.45)).toBe('-123.45 CHF');
    });

    it('formats a large negative amount', () => {
      expect(formatCurrency(-1234.56)).toBe("-1'234.56 CHF");
    });

    it('formats a small negative amount', () => {
      expect(formatCurrency(-0.5)).toBe('-0.50 CHF');
    });

    it('formats a negative integer', () => {
      expect(formatCurrency(-100)).toBe('-100.00 CHF');
    });
  });

  // -----------------------------------------------------------------------
  // showSign option
  // -----------------------------------------------------------------------

  describe('showSign option', () => {
    it('adds + prefix for positive amounts when showSign is true', () => {
      expect(formatCurrency(100, { showSign: true })).toBe('+100.00 CHF');
    });

    it('still shows - prefix for negative amounts when showSign is true', () => {
      expect(formatCurrency(-100, { showSign: true })).toBe('-100.00 CHF');
    });

    it('does not add + for zero when showSign is true', () => {
      expect(formatCurrency(0, { showSign: true })).toBe('0.00 CHF');
    });

    it('does not add + prefix when showSign is false (default)', () => {
      expect(formatCurrency(100)).toBe('100.00 CHF');
      expect(formatCurrency(100, { showSign: false })).toBe('100.00 CHF');
    });
  });

  // -----------------------------------------------------------------------
  // showCurrency option
  // -----------------------------------------------------------------------

  describe('showCurrency option', () => {
    it('omits CHF suffix when showCurrency is false', () => {
      expect(formatCurrency(1234.56, { showCurrency: false })).toBe("1'234.56");
    });

    it('includes CHF suffix by default', () => {
      expect(formatCurrency(1234.56)).toBe("1'234.56 CHF");
    });

    it('includes CHF suffix when showCurrency is true', () => {
      expect(formatCurrency(1234.56, { showCurrency: true })).toBe("1'234.56 CHF");
    });

    it('handles negative without currency', () => {
      expect(formatCurrency(-500, { showCurrency: false })).toBe('-500.00');
    });

    it('combines showSign and showCurrency=false', () => {
      expect(formatCurrency(500, { showSign: true, showCurrency: false })).toBe('+500.00');
    });
  });

  // -----------------------------------------------------------------------
  // Rounding edge cases
  // -----------------------------------------------------------------------

  describe('rounding edge cases', () => {
    it('rounds 0.005 to 0.01 (banker rounding may apply)', () => {
      const result = formatCurrency(0.005);
      // JavaScript toFixed(2) rounds 0.005 to "0.01" (in most engines)
      expect(result).toMatch(/^0\.0[01] CHF$/);
    });

    it('rounds 0.999 to 1.00', () => {
      expect(formatCurrency(0.999)).toBe('1.00 CHF');
    });

    it('rounds 99.999 to 100.00', () => {
      expect(formatCurrency(99.999)).toBe('100.00 CHF');
    });

    it('rounds 999.995 to 1000.00 with separator', () => {
      expect(formatCurrency(999.995)).toBe("1'000.00 CHF");
    });

    it('handles floating point precision (0.1 + 0.2)', () => {
      const result = formatCurrency(0.1 + 0.2);
      expect(result).toBe('0.30 CHF');
    });
  });

  // -----------------------------------------------------------------------
  // Very large amounts
  // -----------------------------------------------------------------------

  describe('large amounts', () => {
    it('formats CHF 999,999.99', () => {
      expect(formatCurrency(999999.99)).toBe("999'999.99 CHF");
    });

    it('formats one million', () => {
      expect(formatCurrency(1000000)).toBe("1'000'000.00 CHF");
    });

    it('formats ten million', () => {
      expect(formatCurrency(10000000)).toBe("10'000'000.00 CHF");
    });
  });
});
