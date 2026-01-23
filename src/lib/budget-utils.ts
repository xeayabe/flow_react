/**
 * Budget calculation and allocation utilities
 */

export interface BudgetAllocation {
  categoryId: string;
  allocatedAmount: number;
  percentage: number;
}

export interface BudgetGroup {
  group: 'needs' | 'wants' | 'savings';
  targetPercentage: number;
  allocatedAmount: number;
  allocatedPercentage: number;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    allocatedAmount: number;
    spentAmount: number;
    percentage: number;
  }>;
}

/**
 * Calculate if allocation is valid (equals 100%)
 * Tolerance: 99.99% - 100.01% to account for rounding
 */
export function isAllocationValid(totalAllocated: number, totalIncome: number): boolean {
  const percentage = (totalAllocated / totalIncome) * 100;
  return percentage >= 99.99 && percentage <= 100.01;
}

/**
 * Calculate remaining unallocated amount
 */
export function calculateRemaining(totalAllocated: number, totalIncome: number): number {
  return Math.max(0, totalIncome - totalAllocated);
}

/**
 * Calculate percentage from amount and total income
 */
export function calculatePercentage(amount: number, totalIncome: number): number {
  if (totalIncome === 0) return 0;
  return Math.round((amount / totalIncome) * 1000) / 10; // Round to 1 decimal place
}

/**
 * Calculate amount from percentage and total income
 */
export function calculateAmountFromPercentage(percentage: number, totalIncome: number): number {
  return Math.round((percentage / 100) * totalIncome * 100) / 100; // Round to 2 decimal places
}

/**
 * Get spending status with color coding
 */
export function getSpendingStatus(spentAmount: number, allocatedAmount: number): 'on-track' | 'warning' | 'over-budget' {
  if (allocatedAmount === 0) return 'on-track';
  const percentage = (spentAmount / allocatedAmount) * 100;
  if (percentage > 100) return 'over-budget';
  if (percentage >= 95) return 'warning';
  return 'on-track';
}

/**
 * Get color for spending status
 */
export function getStatusColor(status: 'on-track' | 'warning' | 'over-budget'): string {
  switch (status) {
    case 'on-track':
      return '#10B981'; // Green
    case 'warning':
      return '#F59E0B'; // Amber/Yellow
    case 'over-budget':
      return '#EF4444'; // Red
  }
}

/**
 * Auto-balance remaining amount proportionally to categories with allocation
 */
export function autoBalanceRemaining(
  allocations: Record<string, number>,
  remaining: number,
  totalIncome: number
): Record<string, number> {
  const result = { ...allocations };

  if (remaining <= 0) return result;

  // Get total allocated (excluding 0 amounts)
  const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + amount, 0);

  if (totalAllocated === 0) {
    // If nothing is allocated, add all to first category (or savings)
    const firstKey = Object.keys(allocations)[0];
    if (firstKey) {
      result[firstKey] = remaining;
    }
    return result;
  }

  // Distribute proportionally with last category absorbing rounding error
  const keys = Object.keys(allocations).filter((k) => allocations[k] > 0);
  let totalDistributed = 0;

  keys.forEach((categoryId, index) => {
    if (index === keys.length - 1) {
      // Last category gets whatever is left to ensure exact total
      result[categoryId] += Math.round((remaining - totalDistributed) * 100) / 100;
    } else {
      const proportion = allocations[categoryId] / totalAllocated;
      const amount = Math.round((remaining * proportion) * 100) / 100;
      result[categoryId] += amount;
      totalDistributed += amount;
    }
  });

  return result;
}

/**
 * Apply 50/30/20 split to categories
 */
export function apply503020Split(
  categories: Array<{ id: string; group: string }>,
  totalIncome: number
): Record<string, number> {
  const allocations: Record<string, number> = {};

  // Group categories by type
  const needsCategories = categories.filter((c) => c.group === 'needs');
  const wantsCategories = categories.filter((c) => c.group === 'wants');
  const savingsCategories = categories.filter((c) => c.group === 'savings');

  // Calculate group amounts with proper rounding
  const needsAmount = Math.round((totalIncome * 0.5) * 100) / 100;
  const wantsAmount = Math.round((totalIncome * 0.3) * 100) / 100;
  const savingsAmount = Math.round((totalIncome * 0.2) * 100) / 100;

  // Distribute proportionally within each group
  const distributeProportionally = (
    group: typeof needsCategories,
    groupAmount: number
  ) => {
    if (group.length === 0) return;
    const amountPerCategory = groupAmount / group.length;

    // Distribute with the last category absorbing rounding error
    let totalDistributed = 0;
    group.forEach((cat, index) => {
      if (index === group.length - 1) {
        // Last category gets whatever is left to ensure exact total
        allocations[cat.id] = Math.round((groupAmount - totalDistributed) * 100) / 100;
      } else {
        const amount = Math.round(amountPerCategory * 100) / 100;
        allocations[cat.id] = amount;
        totalDistributed += amount;
      }
    });
  };

  distributeProportionally(needsCategories, needsAmount);
  distributeProportionally(wantsCategories, wantsAmount);
  distributeProportionally(savingsCategories, savingsAmount);

  return allocations;
}
