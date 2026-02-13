/**
 * Spending Pace Calculation Library
 *
 * Calculates whether user is spending faster or slower than
 * the passage of time in their budget period.
 */

export interface SpendingPaceInput {
  budgetAmount: number;
  spentSoFar: number;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  currentDate?: Date;
}

export interface SpendingPaceResult {
  // Time metrics
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  timeProgress: number;

  // Budget metrics
  budgetAmount: number;
  spentSoFar: number;
  budgetRemaining: number;
  budgetProgress: number;

  // Pace analysis
  paceRatio: number | null;
  status: 'too-fast' | 'on-track' | 'under-pace' | 'insufficient-data';
  dailySpendRate: number | null;

  // Projections
  projectedTotal: number | null;
  projectedVariance: number | null;

  // Recommendations
  safeDailySpend: number | null;
  recommendationMessage: string;
}

/**
 * Calculate days between two dates
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / msPerDay);
}

/**
 * Main spending pace calculation function
 */
export function calculateSpendingPace(
  input: SpendingPaceInput
): SpendingPaceResult {
  const {
    budgetAmount,
    spentSoFar,
    periodStart,
    periodEnd,
    currentDate = new Date(),
  } = input;

  // Validate inputs
  if (budgetAmount <= 0) {
    throw new Error('Budget amount must be greater than 0');
  }

  if (spentSoFar < 0) {
    throw new Error('Spent amount cannot be negative');
  }

  // Time calculations
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  const totalDays = daysBetween(startDate, endDate);
  const daysElapsed = Math.max(0, daysBetween(startDate, currentDate));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const timeProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

  // Budget calculations
  const budgetProgress = budgetAmount > 0 ? (spentSoFar / budgetAmount) * 100 : 0;
  const budgetRemaining = budgetAmount - spentSoFar;

  // Need at least 1 day of data
  if (daysElapsed === 0 || timeProgress === 0) {
    return {
      totalDays,
      daysElapsed,
      daysRemaining,
      timeProgress,
      budgetAmount,
      spentSoFar,
      budgetRemaining,
      budgetProgress,
      paceRatio: null,
      status: 'insufficient-data',
      dailySpendRate: null,
      projectedTotal: null,
      projectedVariance: null,
      safeDailySpend: null,
      recommendationMessage: 'Need at least 1 day of data to calculate pace',
    };
  }

  // Pace calculations
  const paceRatio = budgetProgress / timeProgress;
  const dailySpendRate = spentSoFar / daysElapsed;

  // Determine status (15% tolerance for natural spending variability)
  let status: 'too-fast' | 'on-track' | 'under-pace';
  if (paceRatio > 1.15) {
    status = 'too-fast';
  } else if (paceRatio < 0.85) {
    status = 'under-pace';
  } else {
    status = 'on-track';
  }

  // Projections
  const projectedTotal = dailySpendRate * totalDays;
  const projectedVariance = projectedTotal - budgetAmount;

  // Recommendations
  const safeDailySpend = daysRemaining > 0
    ? budgetRemaining / daysRemaining
    : 0;

  let recommendationMessage: string;
  if (daysRemaining <= 0) {
    recommendationMessage = 'Budget period ended';
  } else if (budgetRemaining < 0) {
    recommendationMessage = `You're CHF ${Math.abs(budgetRemaining).toFixed(0)} over budget — avoid new spending`;
  } else if (status === 'too-fast') {
    recommendationMessage = `Spend max CHF ${safeDailySpend.toFixed(0)}/day to stay on budget`;
  } else if (status === 'under-pace') {
    recommendationMessage = `Great pace! You could save CHF ${budgetRemaining.toFixed(0)} this period`;
  } else {
    recommendationMessage = `Stay on track with CHF ${safeDailySpend.toFixed(0)}/day`;
  }

  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    timeProgress,
    budgetAmount,
    spentSoFar,
    budgetRemaining,
    budgetProgress,
    paceRatio,
    status,
    dailySpendRate,
    projectedTotal,
    projectedVariance,
    safeDailySpend,
    recommendationMessage,
  };
}

/**
 * Get color for pace status
 */
export function getPaceColor(status: SpendingPaceResult['status']): string {
  const statusColors = {
    'too-fast': '#E5C399',      // budgetProgressing (amber)
    'on-track': '#2C5F5D',      // contextTeal
    'under-pace': '#A8B5A1',    // sageGreen
    'insufficient-data': '#B8A8C8', // softLavender
  };

  return statusColors[status];
}

/**
 * Get icon for pace status
 */
export function getPaceIcon(status: SpendingPaceResult['status']): string {
  const icons = {
    'too-fast': '⚠️',
    'on-track': '✓',
    'under-pace': '✅',
    'insufficient-data': 'ℹ️',
  };

  return icons[status];
}

/**
 * Get human-readable status label
 */
export function getPaceLabel(status: SpendingPaceResult['status']): string {
  const labels = {
    'too-fast': 'Spending too fast',
    'on-track': 'On track',
    'under-pace': 'Under budget pace',
    'insufficient-data': 'Not enough data',
  };

  return labels[status];
}
