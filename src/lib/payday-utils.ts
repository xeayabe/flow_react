/**
 * Payday and budget period utilities
 */

export interface BudgetPeriod {
  start: string; // ISO format YYYY-MM-DD
  end: string;   // ISO format YYYY-MM-DD
  daysRemaining: number;
  resetsOn: string; // ISO format YYYY-MM-DD
}

/**
 * Get the last day of a given month
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the actual payday for a given month
 * Handles special case where payday > days in month
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
 * Calculate the budget period for a given payday and date
 *
 * Logic:
 * - If today >= payday: Current period is payday of this month to (payday-1) of next month
 * - If today < payday: Current period is payday of last month to (payday-1) of this month
 */
export function calculateBudgetPeriod(paydayDay: number, today: Date = new Date()): BudgetPeriod {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  // Get actual payday for this month (handles months with fewer days)
  const actualPaydayThisMonth = getPaydayForMonth(paydayDay, year, month);

  let periodStart: Date;
  let periodEnd: Date;

  if (day >= actualPaydayThisMonth) {
    // We're in the current payday period
    // Period: payday of this month to (payday-1) of next month
    periodStart = new Date(year, month, actualPaydayThisMonth);

    // Next month's payday
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const nextPayday = getPaydayForMonth(paydayDay, nextYear, nextMonth);

    // Period ends on day before next payday
    periodEnd = new Date(nextYear, nextMonth, nextPayday - 1);
  } else {
    // We're in the previous payday period
    // Period: payday of last month to (payday-1) of this month
    const lastMonth = month === 0 ? 11 : month - 1;
    const lastYear = month === 0 ? year - 1 : year;
    const lastPayday = getPaydayForMonth(paydayDay, lastYear, lastMonth);

    periodStart = new Date(lastYear, lastMonth, lastPayday);

    // This month's payday
    const thisPayday = getPaydayForMonth(paydayDay, year, month);
    periodEnd = new Date(year, month, thisPayday - 1);
  }

  // Calculate days remaining
  const now = new Date(year, month, day);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / msPerDay);

  // Calculate next reset date (payday of next period)
  let nextResetDate: Date;
  if (day >= actualPaydayThisMonth) {
    // Next payday is next month
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    nextResetDate = new Date(nextYear, nextMonth, getPaydayForMonth(paydayDay, nextYear, nextMonth));
  } else {
    // Next payday is this month
    nextResetDate = new Date(year, month, actualPaydayThisMonth);
  }

  return {
    start: formatDateISO(periodStart),
    end: formatDateISO(periodEnd),
    daysRemaining: Math.max(0, daysRemaining),
    resetsOn: formatDateISO(nextResetDate),
  };
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

/**
 * Format date to Swiss format (DD.MM.YYYY)
 */
export function formatDateSwiss(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Validate payday day value
 */
export function isValidPaydayDay(day: number): boolean {
  return (day >= 1 && day <= 31) || day === -1;
}

/**
 * Get display text for payday day
 */
export function getPaydayDisplayText(paydayDay: number): string {
  if (paydayDay === -1) {
    return 'Last day of month';
  }
  return `Day ${paydayDay}`;
}
