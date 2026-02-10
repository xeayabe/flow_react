/**
 * Budget Period Utilities
 *
 * IMPORTANT: This file provides dynamic budget period calculation based on payday.
 * The period should ALWAYS be calculated dynamically, not stored and retrieved.
 *
 * This ensures:
 * 1. Period dates are always correct based on current date
 * 2. Changing payday doesn't cause immediate resets
 * 3. On payday, period automatically shifts forward
 * 4. Transactions are filtered correctly
 */

/**
 * Get the last day of a given month
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the actual payday for a given month
 * Handles special case where payday > days in month or payday = -1 (last day)
 */
function getPaydayForMonth(paydayDay: number, year: number, month: number): number {
  if (paydayDay === -1) {
    // Last day of month
    return getLastDayOfMonth(year, month);
  }

  // Clamp to last day of month if payday exceeds days in month
  const lastDay = getLastDayOfMonth(year, month);
  return Math.min(paydayDay, lastDay);
}

/**
 * Format date to ISO format (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface DynamicBudgetPeriod {
  periodStart: Date;
  periodEnd: Date;
  periodStartISO: string;
  periodEndISO: string;
  daysRemaining: number;
  nextResetDate: Date;
  nextResetISO: string;
}

/**
 * Calculate current budget period from payday day - ALWAYS DYNAMIC
 *
 * Logic:
 * - If today >= payday → current month period (payday → next month payday-1)
 * - If today < payday → previous month period (prev payday → current payday-1)
 */
export function getCurrentBudgetPeriod(paydayDay: number, today: Date = new Date()): DynamicBudgetPeriod {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed (0 = Jan)
  const currentDay = today.getDate();

  // Get actual payday for this month (handles months with fewer days)
  const actualPaydayThisMonth = getPaydayForMonth(paydayDay, currentYear, currentMonth);

  let periodStartYear = currentYear;
  let periodStartMonth = currentMonth;

  console.log('📅 getCurrentBudgetPeriod:', {
    today: formatDateISO(today),
    paydayDay,
    actualPaydayThisMonth,
    currentDay,
  });

  // Determine which period we're in
  if (currentDay >= actualPaydayThisMonth) {
    // We're in current month's period
    // Period: payday of THIS month → (payday-1) of NEXT month
    periodStartYear = currentYear;
    periodStartMonth = currentMonth;
  } else {
    // We're before payday, so we're in previous month's period
    // Period: payday of PREVIOUS month → (payday-1) of THIS month
    periodStartMonth = currentMonth - 1;
    if (periodStartMonth < 0) {
      periodStartMonth = 11; // December
      periodStartYear = currentYear - 1;
    }
  }

  // Get actual payday for the period start month
  const actualPeriodStartPayday = getPaydayForMonth(paydayDay, periodStartYear, periodStartMonth);

  // Period starts at midnight on payday
  const periodStart = new Date(periodStartYear, periodStartMonth, actualPeriodStartPayday, 0, 0, 0, 0);

  // Calculate period end month
  let periodEndMonth = periodStartMonth + 1;
  let periodEndYear = periodStartYear;
  if (periodEndMonth > 11) {
    periodEndMonth = 0; // January
    periodEndYear = periodStartYear + 1;
  }

  // Get actual payday for the period end month, then subtract 1
  const actualPeriodEndPayday = getPaydayForMonth(paydayDay, periodEndYear, periodEndMonth);

  // Period ends at 23:59:59 on day before next payday
  const periodEnd = new Date(periodEndYear, periodEndMonth, actualPeriodEndPayday - 1, 23, 59, 59, 999);

  // Calculate days remaining
  const todayMidnight = new Date(currentYear, currentMonth, currentDay, 0, 0, 0, 0);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - todayMidnight.getTime()) / msPerDay));

  // Calculate next reset date (next payday)
  let nextResetDate: Date;
  if (currentDay >= actualPaydayThisMonth) {
    // Next payday is next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextPayday = getPaydayForMonth(paydayDay, nextYear, nextMonth);
    nextResetDate = new Date(nextYear, nextMonth, nextPayday, 0, 0, 0, 0);
  } else {
    // Next payday is this month
    nextResetDate = new Date(currentYear, currentMonth, actualPaydayThisMonth, 0, 0, 0, 0);
  }

  const result = {
    periodStart,
    periodEnd,
    periodStartISO: formatDateISO(periodStart),
    periodEndISO: formatDateISO(periodEnd),
    daysRemaining,
    nextResetDate,
    nextResetISO: formatDateISO(nextResetDate),
  };

  console.log('✅ Calculated period:', {
    start: result.periodStartISO,
    end: result.periodEndISO,
    daysRemaining: result.daysRemaining,
    nextReset: result.nextResetISO,
  });

  return result;
}

/**
 * Get display string for period (e.g., "6 Jan – 5 Feb")
 */
export function getPeriodDisplayString(paydayDay: number): string {
  const { periodStart, periodEnd } = getCurrentBudgetPeriod(paydayDay);

  const startStr = periodStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endStr = periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return `${startStr} – ${endStr}`;
}

/**
 * Check if a date is in the current budget period
 */
export function isInCurrentPeriod(date: string | Date, paydayDay: number): boolean {
  const checkDate = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const { periodStart, periodEnd } = getCurrentBudgetPeriod(paydayDay);

  return checkDate >= periodStart && checkDate <= periodEnd;
}

/**
 * Get the period that contains a specific date
 */
export function getPeriodForDate(date: string | Date, paydayDay: number): DynamicBudgetPeriod {
  const targetDate = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return getCurrentBudgetPeriod(paydayDay, targetDate);
}
