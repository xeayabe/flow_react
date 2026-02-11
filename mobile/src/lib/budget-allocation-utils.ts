// mobile/src/lib/budget-allocation-utils.ts

export interface CategoryGroupState {
  [key: string]: number;
}

export function calculateTotalAllocated(allocations: CategoryGroupState): number {
  return Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
}

export function calculateRemaining(income: number, totalAllocated: number): number {
  return Math.max(0, income - totalAllocated);
}

export function calculateAllocatedPercentage(totalAllocated: number, income: number): number {
  return income > 0 ? (totalAllocated / income) * 100 : 0;
}

export function validateBudgetAllocation(
  income: number,
  totalAllocated: number,
  allocatedPercentage: number
): { isValid: boolean; error: string } {
  if (income === 0) {
    return { isValid: false, error: 'Please enter your monthly income' };
  }

  if (totalAllocated === 0) {
    return { isValid: false, error: 'Please allocate at least one category group' };
  }

  if (allocatedPercentage < 99.99 || allocatedPercentage > 100.01) {
    return {
      isValid: false,
      error: `Category group allocation must total 100%. Currently: ${Math.round(allocatedPercentage * 10) / 10}%`,
    };
  }

  return { isValid: true, error: '' };
}

export function applyEqualSplit(income: number, groupCount: number): number {
  return income / groupCount;
}

export function sanitizeDecimalInput(text: string): string {
  const filtered = text.replace(/[^0-9.,]/g, '').replace(',', '.');
  const parts = filtered.split('.');
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : filtered;
}
