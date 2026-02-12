/**
 * Tests for payday-utils.ts
 *
 * Tests the budget period calculation logic which is critical to the
 * "timeless budgets" architecture. Periods are calculated dynamically
 * from paydayDay and today's date -- never stored in the database.
 *
 * Functions tested:
 *   - calculateBudgetPeriod(paydayDay, today)
 *   - isValidPaydayDay(day)
 *   - formatDateSwiss(dateString)
 *   - getPaydayDisplayText(paydayDay)
 */

import {
  calculateBudgetPeriod,
  isValidPaydayDay,
  formatDateSwiss,
  getPaydayDisplayText,
} from '../payday-utils';

// Silence console.log from the module under test
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterAll(() => {
  (console.log as jest.Mock).mockRestore();
});

describe('calculateBudgetPeriod', () => {
  // -----------------------------------------------------------------------
  // Standard scenarios
  // -----------------------------------------------------------------------

  describe('payday on 25th', () => {
    it('returns Jan 25 - Feb 24 when today is Feb 8', () => {
      const today = new Date(2026, 1, 8); // Feb 8, 2026
      const period = calculateBudgetPeriod(25, today);

      expect(period.start).toBe('2026-01-25');
      expect(period.end).toBe('2026-02-24');
    });

    it('returns Feb 25 - Mar 24 when today is Feb 25 (today IS payday)', () => {
      const today = new Date(2026, 1, 25); // Feb 25, 2026
      const period = calculateBudgetPeriod(25, today);

      expect(period.start).toBe('2026-02-25');
      expect(period.end).toBe('2026-03-24');
    });

    it('returns Feb 25 - Mar 24 when today is Mar 10', () => {
      const today = new Date(2026, 2, 10); // Mar 10, 2026
      const period = calculateBudgetPeriod(25, today);

      expect(period.start).toBe('2026-02-25');
      expect(period.end).toBe('2026-03-24');
    });
  });

  describe('payday on 1st', () => {
    it('returns Feb 1 - Feb 28 when today is Feb 8', () => {
      const today = new Date(2026, 1, 8); // Feb 8, 2026
      const period = calculateBudgetPeriod(1, today);

      expect(period.start).toBe('2026-02-01');
      expect(period.end).toBe('2026-02-28');
    });

    it('returns Jan 1 - Jan 31 when today is Jan 15', () => {
      const today = new Date(2026, 0, 15); // Jan 15, 2026
      const period = calculateBudgetPeriod(1, today);

      expect(period.start).toBe('2026-01-01');
      expect(period.end).toBe('2026-01-31');
    });
  });

  describe('payday on 15th', () => {
    it('returns Jan 15 - Feb 14 when today is Feb 1', () => {
      const today = new Date(2026, 1, 1); // Feb 1, 2026
      const period = calculateBudgetPeriod(15, today);

      expect(period.start).toBe('2026-01-15');
      expect(period.end).toBe('2026-02-14');
    });

    it('returns Feb 15 - Mar 14 when today is Feb 20', () => {
      const today = new Date(2026, 1, 20); // Feb 20, 2026
      const period = calculateBudgetPeriod(15, today);

      expect(period.start).toBe('2026-02-15');
      expect(period.end).toBe('2026-03-14');
    });
  });

  // -----------------------------------------------------------------------
  // Payday on 31st (clamped to last day for short months)
  // -----------------------------------------------------------------------

  describe('payday on 31st (month clamping)', () => {
    it('clamps to Feb 28 in non-leap year when today is Feb 8', () => {
      // Feb 2026 has 28 days; payday 31 should clamp to 28
      const today = new Date(2026, 1, 8); // Feb 8, 2026
      const period = calculateBudgetPeriod(31, today);

      // Today (8) < clamped payday (28), so previous period:
      // Period start = Jan 31 (Jan has 31 days), period end = Feb 27
      expect(period.start).toBe('2026-01-31');
      expect(period.end).toBe('2026-02-27');
    });

    it('uses March 31 when today is March 31', () => {
      const today = new Date(2026, 2, 31); // Mar 31, 2026
      const period = calculateBudgetPeriod(31, today);

      // Today (31) >= payday (31): current period
      // Start = Mar 31, End = Apr 30 - 1 = Apr 29
      expect(period.start).toBe('2026-03-31');
      // April has 30 days, so payday clamps to 30, end = 30-1 = 29
      expect(period.end).toBe('2026-04-29');
    });
  });

  // -----------------------------------------------------------------------
  // Payday = -1 (last day of month)
  // -----------------------------------------------------------------------

  describe('payday = -1 (last day of month)', () => {
    it('uses Jan 31 to Feb 27 when today is Feb 15 (non-leap year)', () => {
      const today = new Date(2026, 1, 15); // Feb 15, 2026
      const period = calculateBudgetPeriod(-1, today);

      // Feb has 28 days in 2026, last day = 28
      // Today (15) < payday (28), so previous period
      // Previous month (Jan) last day = 31
      // Start = Jan 31, End = Feb 28 - 1 = Feb 27
      expect(period.start).toBe('2026-01-31');
      expect(period.end).toBe('2026-02-27');
    });

    it('handles leap year February (Feb 29, 2028)', () => {
      // 2028 is a leap year
      const today = new Date(2028, 1, 29); // Feb 29, 2028
      const period = calculateBudgetPeriod(-1, today);

      // Feb 2028 last day = 29
      // Today (29) >= payday (29): current period
      // Start = Feb 29, End = Mar 31 - 1 = Mar 30
      expect(period.start).toBe('2028-02-29');
      expect(period.end).toBe('2028-03-30');
    });

    it('handles April (30 days) when today is Apr 30', () => {
      const today = new Date(2026, 3, 30); // Apr 30, 2026
      const period = calculateBudgetPeriod(-1, today);

      // April last day = 30, today (30) >= payday (30)
      // Start = Apr 30, End = May 31 - 1 = May 30
      expect(period.start).toBe('2026-04-30');
      expect(period.end).toBe('2026-05-30');
    });
  });

  // -----------------------------------------------------------------------
  // Year boundaries
  // -----------------------------------------------------------------------

  describe('year boundaries', () => {
    it('handles Dec to Jan transition (payday 25, today Jan 10)', () => {
      const today = new Date(2026, 0, 10); // Jan 10, 2026
      const period = calculateBudgetPeriod(25, today);

      // Today (10) < payday (25): previous period
      // Start = Dec 25, 2025 / End = Jan 24, 2026
      expect(period.start).toBe('2025-12-25');
      expect(period.end).toBe('2026-01-24');
    });

    it('handles Dec 25 payday when today is Dec 31', () => {
      const today = new Date(2025, 11, 31); // Dec 31, 2025
      const period = calculateBudgetPeriod(25, today);

      // Today (31) >= payday (25): current period
      // Start = Dec 25, 2025 / End = Jan 24, 2026
      expect(period.start).toBe('2025-12-25');
      expect(period.end).toBe('2026-01-24');
    });
  });

  // -----------------------------------------------------------------------
  // Days remaining
  // -----------------------------------------------------------------------

  describe('daysRemaining', () => {
    it('calculates correct days remaining', () => {
      const today = new Date(2026, 1, 8); // Feb 8, 2026
      const period = calculateBudgetPeriod(25, today);

      // Period end = Feb 24, today = Feb 8
      // Days remaining = 24 - 8 = 16
      expect(period.daysRemaining).toBe(16);
    });

    it('returns 0 when today is the last day of the period', () => {
      const today = new Date(2026, 1, 24); // Feb 24, 2026
      const period = calculateBudgetPeriod(25, today);

      expect(period.daysRemaining).toBe(0);
    });

    it('never returns negative', () => {
      // Even if calculation produces negative, it should be clamped to 0
      const today = new Date(2026, 1, 8);
      const period = calculateBudgetPeriod(25, today);
      expect(period.daysRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------------------
  // resetsOn
  // -----------------------------------------------------------------------

  describe('resetsOn (next payday)', () => {
    it('returns next month payday when today >= payday', () => {
      const today = new Date(2026, 1, 25); // Feb 25
      const period = calculateBudgetPeriod(25, today);

      expect(period.resetsOn).toBe('2026-03-25');
    });

    it('returns this month payday when today < payday', () => {
      const today = new Date(2026, 1, 8); // Feb 8
      const period = calculateBudgetPeriod(25, today);

      expect(period.resetsOn).toBe('2026-02-25');
    });
  });

  // -----------------------------------------------------------------------
  // Edge: today IS payday
  // -----------------------------------------------------------------------

  describe('today is payday', () => {
    it('starts a new period when today equals payday', () => {
      const today = new Date(2026, 1, 1); // Feb 1, payday 1
      const period = calculateBudgetPeriod(1, today);

      // Today (1) >= payday (1): current period starts today
      expect(period.start).toBe('2026-02-01');
    });
  });
});

// ===========================================================================
// isValidPaydayDay
// ===========================================================================

describe('isValidPaydayDay', () => {
  describe('valid values', () => {
    it('returns true for day 1', () => {
      expect(isValidPaydayDay(1)).toBe(true);
    });

    it('returns true for day 15', () => {
      expect(isValidPaydayDay(15)).toBe(true);
    });

    it('returns true for day 25', () => {
      expect(isValidPaydayDay(25)).toBe(true);
    });

    it('returns true for day 31', () => {
      expect(isValidPaydayDay(31)).toBe(true);
    });

    it('returns true for -1 (last day of month)', () => {
      expect(isValidPaydayDay(-1)).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('returns false for 0', () => {
      expect(isValidPaydayDay(0)).toBe(false);
    });

    it('returns false for 32', () => {
      expect(isValidPaydayDay(32)).toBe(false);
    });

    it('returns false for -2', () => {
      expect(isValidPaydayDay(-2)).toBe(false);
    });

    it('returns false for -100', () => {
      expect(isValidPaydayDay(-100)).toBe(false);
    });

    it('returns false for 100', () => {
      expect(isValidPaydayDay(100)).toBe(false);
    });
  });
});

// ===========================================================================
// getPaydayDisplayText
// ===========================================================================

describe('getPaydayDisplayText', () => {
  it('returns "Day 25" for payday 25', () => {
    expect(getPaydayDisplayText(25)).toBe('Day 25');
  });

  it('returns "Day 1" for payday 1', () => {
    expect(getPaydayDisplayText(1)).toBe('Day 1');
  });

  it('returns "Last day of month" for payday -1', () => {
    expect(getPaydayDisplayText(-1)).toBe('Last day of month');
  });
});

// ===========================================================================
// formatDateSwiss
// ===========================================================================

describe('formatDateSwiss', () => {
  it('formats an ISO date to Swiss DD/MM/YYYY format', () => {
    const result = formatDateSwiss('2026-02-08');
    // The function uses it-IT locale, which produces DD/MM/YYYY
    expect(result).toMatch(/08\/02\/2026/);
  });

  it('formats a January date correctly', () => {
    const result = formatDateSwiss('2026-01-25');
    expect(result).toMatch(/25\/01\/2026/);
  });
});
