/**
 * Tests for budget-utils.ts
 *
 * Tests budget calculation utilities:
 *   - isAllocationValid(totalAllocated, totalIncome)
 *   - calculateRemaining(totalAllocated, totalIncome)
 *   - calculatePercentage(amount, totalIncome)
 *   - calculateAmountFromPercentage(percentage, totalIncome)
 *   - getSpendingStatus(spentAmount, allocatedAmount)
 *   - getStatusColor(status)
 *   - autoBalanceRemaining(allocations, remaining, totalIncome)
 *   - applyEqualSplit(categories, totalIncome, groupKeys)
 *   - apply503020Split(categories, totalIncome)
 */

import {
  isAllocationValid,
  calculateRemaining,
  calculatePercentage,
  calculateAmountFromPercentage,
  getSpendingStatus,
  getStatusColor,
  autoBalanceRemaining,
  applyEqualSplit,
  apply503020Split,
} from '../budget-utils';

// ===========================================================================
// isAllocationValid
// ===========================================================================

describe('isAllocationValid', () => {
  it('returns true when allocated equals income exactly', () => {
    expect(isAllocationValid(7892, 7892)).toBe(true);
  });

  it('returns true at 99.99% allocation (rounding tolerance)', () => {
    // 99.99% of 7892 = 7891.2108, use 7891.22 to be safely within tolerance
    // 7891.22 / 7892 * 100 = 99.9911% (within 99.99% - 100.01%)
    expect(isAllocationValid(7891.22, 7892)).toBe(true);
  });

  it('returns true at 100.01% allocation (rounding tolerance)', () => {
    // 100.01% of 7892 = 7892.7892, use 7892.78 to be safely within tolerance
    // 7892.78 / 7892 * 100 = 100.0099% (within 99.99% - 100.01%)
    expect(isAllocationValid(7892.78, 7892)).toBe(true);
  });

  it('returns false when significantly under-allocated (50%)', () => {
    expect(isAllocationValid(3946, 7892)).toBe(false);
  });

  it('returns false when significantly over-allocated (150%)', () => {
    expect(isAllocationValid(11838, 7892)).toBe(false);
  });

  it('returns false when nothing allocated', () => {
    expect(isAllocationValid(0, 7892)).toBe(false);
  });
});

// ===========================================================================
// calculateRemaining
// ===========================================================================

describe('calculateRemaining', () => {
  it('calculates remaining CHF when partially allocated', () => {
    expect(calculateRemaining(5000, 7892)).toBe(2892);
  });

  it('returns 0 when fully allocated', () => {
    expect(calculateRemaining(7892, 7892)).toBe(0);
  });

  it('returns 0 when over-allocated (never negative)', () => {
    expect(calculateRemaining(8000, 7892)).toBe(0);
  });

  it('returns full income when nothing allocated', () => {
    expect(calculateRemaining(0, 7892)).toBe(7892);
  });
});

// ===========================================================================
// calculatePercentage
// ===========================================================================

describe('calculatePercentage', () => {
  it('calculates percentage for a typical category', () => {
    // Rent CHF 2100 of CHF 7892 income
    expect(calculatePercentage(2100, 7892)).toBeCloseTo(26.6, 1);
  });

  it('returns 0 when income is 0 (division by zero)', () => {
    expect(calculatePercentage(500, 0)).toBe(0);
  });

  it('returns 100 when amount equals income', () => {
    expect(calculatePercentage(7892, 7892)).toBe(100);
  });

  it('returns 50 for half the income', () => {
    expect(calculatePercentage(3946, 7892)).toBe(50);
  });

  it('rounds to 1 decimal place', () => {
    // 600 / 7892 = 7.6019... should round to 7.6
    const result = calculatePercentage(600, 7892);
    expect(result).toBe(7.6);
  });
});

// ===========================================================================
// calculateAmountFromPercentage
// ===========================================================================

describe('calculateAmountFromPercentage', () => {
  it('calculates 50% of income', () => {
    expect(calculateAmountFromPercentage(50, 7892)).toBe(3946);
  });

  it('calculates 30% of income', () => {
    expect(calculateAmountFromPercentage(30, 7892)).toBe(2367.6);
  });

  it('calculates 20% of income', () => {
    expect(calculateAmountFromPercentage(20, 7892)).toBe(1578.4);
  });

  it('returns 0 for 0%', () => {
    expect(calculateAmountFromPercentage(0, 7892)).toBe(0);
  });

  it('returns full income for 100%', () => {
    expect(calculateAmountFromPercentage(100, 7892)).toBe(7892);
  });

  it('rounds to 2 decimal places (CHF cents)', () => {
    // 33.33% of 100 = 33.33
    expect(calculateAmountFromPercentage(33.33, 100)).toBe(33.33);
  });
});

// ===========================================================================
// getSpendingStatus
// ===========================================================================

describe('getSpendingStatus', () => {
  it('returns on-track when under 95%', () => {
    // CHF 140 spent of CHF 600 allocated (23.3%)
    expect(getSpendingStatus(140, 600)).toBe('on-track');
  });

  it('returns warning at exactly 95%', () => {
    // 95% of 600 = 570
    expect(getSpendingStatus(570, 600)).toBe('warning');
  });

  it('returns warning between 95% and 100%', () => {
    expect(getSpendingStatus(580, 600)).toBe('warning');
  });

  it('returns over-budget when spent exceeds allocated', () => {
    expect(getSpendingStatus(650, 600)).toBe('over-budget');
  });

  it('returns on-track when allocated is 0 (no allocation set)', () => {
    expect(getSpendingStatus(0, 0)).toBe('on-track');
  });

  it('returns on-track when nothing spent', () => {
    expect(getSpendingStatus(0, 600)).toBe('on-track');
  });

  it('returns over-budget when spent is exactly 100.01%', () => {
    expect(getSpendingStatus(600.01, 600)).toBe('over-budget');
  });
});

// ===========================================================================
// getStatusColor
// ===========================================================================

describe('getStatusColor', () => {
  it('returns green for on-track', () => {
    expect(getStatusColor('on-track')).toBe('#10B981');
  });

  it('returns amber for warning', () => {
    expect(getStatusColor('warning')).toBe('#F59E0B');
  });

  it('returns red for over-budget', () => {
    expect(getStatusColor('over-budget')).toBe('#EF4444');
  });
});

// ===========================================================================
// autoBalanceRemaining
// ===========================================================================

describe('autoBalanceRemaining', () => {
  it('distributes remaining proportionally to existing allocations', () => {
    const allocations = {
      'cat-rent': 2100,
      'cat-groceries': 600,
      'cat-transport': 300,
    };
    const remaining = 300;
    const totalIncome = 7892;

    const result = autoBalanceRemaining(allocations, remaining, totalIncome);

    // Total should equal original allocations + remaining
    const total = Object.values(result).reduce((sum, v) => sum + v, 0);
    expect(total).toBeCloseTo(3300, 1);
  });

  it('returns unchanged allocations when remaining is 0', () => {
    const allocations = { 'cat-rent': 2100, 'cat-groceries': 600 };
    const result = autoBalanceRemaining(allocations, 0, 7892);
    expect(result).toEqual(allocations);
  });

  it('returns unchanged allocations when remaining is negative', () => {
    const allocations = { 'cat-rent': 2100 };
    const result = autoBalanceRemaining(allocations, -100, 7892);
    expect(result).toEqual(allocations);
  });

  it('assigns remaining to first category when all are zero', () => {
    const allocations = { 'cat-rent': 0, 'cat-groceries': 0 };
    const result = autoBalanceRemaining(allocations, 500, 7892);

    // First key should receive the full remaining amount
    const firstKey = Object.keys(allocations)[0];
    expect(result[firstKey]).toBe(500);
  });
});

// ===========================================================================
// applyEqualSplit
// ===========================================================================

describe('applyEqualSplit', () => {
  it('splits CHF 7892 equally across 3 groups', () => {
    const categories = [
      { id: 'cat-1', group: 'needs' },
      { id: 'cat-2', group: 'wants' },
      { id: 'cat-3', group: 'savings' },
    ];

    const result = applyEqualSplit(categories, 7892, ['needs', 'wants', 'savings']);
    const total = Object.values(result).reduce((sum, v) => sum + v, 0);

    // Total must equal income (rounding absorbed by last category)
    expect(total).toBeCloseTo(7892, 1);
  });

  it('handles multiple categories per group', () => {
    const categories = [
      { id: 'cat-rent', group: 'needs' },
      { id: 'cat-groceries', group: 'needs' },
      { id: 'cat-dining', group: 'wants' },
    ];

    const result = applyEqualSplit(categories, 6000, ['needs', 'wants']);

    // Each group gets 3000
    // needs has 2 categories: each gets ~1500
    expect(result['cat-rent']).toBeCloseTo(1500, 0);
    expect(result['cat-groceries']).toBeCloseTo(1500, 0);
    expect(result['cat-dining']).toBeCloseTo(3000, 0);
  });

  it('returns empty object when no groups provided', () => {
    const categories = [{ id: 'cat-1', group: 'needs' }];
    const result = applyEqualSplit(categories, 7892, []);
    expect(result).toEqual({});
  });
});

// ===========================================================================
// apply503020Split
// ===========================================================================

describe('apply503020Split', () => {
  it('applies 50/30/20 split on CHF 7892 income', () => {
    const categories = [
      { id: 'cat-rent', group: 'needs' },
      { id: 'cat-groceries', group: 'needs' },
      { id: 'cat-dining', group: 'wants' },
      { id: 'cat-savings', group: 'savings' },
    ];

    const result = apply503020Split(categories, 7892);

    // Needs total should be 50% = CHF 3946
    const needsTotal = (result['cat-rent'] || 0) + (result['cat-groceries'] || 0);
    expect(needsTotal).toBeCloseTo(3946, 0);

    // Wants total should be 30% = CHF 2367.60
    expect(result['cat-dining']).toBeCloseTo(2367.6, 0);

    // Savings total should be 20% = CHF 1578.40
    expect(result['cat-savings']).toBeCloseTo(1578.4, 0);
  });

  it('ensures total equals income within rounding tolerance', () => {
    const categories = [
      { id: 'cat-1', group: 'needs' },
      { id: 'cat-2', group: 'wants' },
      { id: 'cat-3', group: 'savings' },
    ];

    const result = apply503020Split(categories, 10000);
    const total = Object.values(result).reduce((sum, v) => sum + v, 0);

    expect(total).toBeCloseTo(10000, 0);
    expect(result['cat-1']).toBe(5000);
    expect(result['cat-2']).toBe(3000);
    expect(result['cat-3']).toBe(2000);
  });

  it('handles zero income', () => {
    const categories = [
      { id: 'cat-1', group: 'needs' },
      { id: 'cat-2', group: 'wants' },
      { id: 'cat-3', group: 'savings' },
    ];

    const result = apply503020Split(categories, 0);
    const total = Object.values(result).reduce((sum, v) => sum + v, 0);

    expect(total).toBe(0);
  });

  it('handles empty categories for a group', () => {
    // No savings categories
    const categories = [
      { id: 'cat-1', group: 'needs' },
      { id: 'cat-2', group: 'wants' },
    ];

    const result = apply503020Split(categories, 10000);

    // Needs and wants should still get their share
    expect(result['cat-1']).toBe(5000);
    expect(result['cat-2']).toBe(3000);
    // Savings allocation exists in calculation but has no categories to assign to
  });
});
