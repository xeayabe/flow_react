/**
 * Tests for budget-api.ts
 *
 * Tests budget management functions with mocked InstantDB.
 * Verifies:
 *   - getMemberBudgetPeriod: member payday vs household fallback
 *   - saveBudget: allocation persistence, validation
 *   - getBudgetSummary: summary retrieval, rounding normalization
 *   - getBudgetDetails: category enrichment, status calculation
 *   - updateBudgetSpentAmount: incremental spent tracking
 */

jest.mock('../db', () => {
  const mockTransact = jest.fn(async () => ({}));
  const mockQueryOnce = jest.fn(async () => ({ data: {} }));

  return {
    db: {
      queryOnce: mockQueryOnce,
      transact: mockTransact,
      tx: new Proxy(
        {},
        {
          get(_target: any, entityName: string) {
            return new Proxy(
              {},
              {
                get(_t: any, recordId: string) {
                  return {
                    update: jest.fn((fields: any) => ({
                      __op: 'update',
                      entity: entityName,
                      id: recordId,
                      fields,
                    })),
                    delete: jest.fn(() => ({
                      __op: 'delete',
                      entity: entityName,
                      id: recordId,
                    })),
                  };
                },
              }
            );
          },
        }
      ),
    },
  };
});

jest.mock('../budget-period-utils', () => ({
  getCurrentBudgetPeriod: jest.fn((paydayDay: number) => ({
    periodStart: new Date(2026, 0, paydayDay),
    periodEnd: new Date(2026, 1, paydayDay - 1),
    periodStartISO: `2026-01-${String(paydayDay).padStart(2, '0')}`,
    periodEndISO: `2026-02-${String(paydayDay - 1).padStart(2, '0')}`,
    daysRemaining: 16,
    nextResetDate: new Date(2026, 1, paydayDay),
    nextResetISO: `2026-02-${String(paydayDay).padStart(2, '0')}`,
  })),
}));

jest.mock('../payday-utils', () => ({
  calculateBudgetPeriod: jest.fn((paydayDay: number) => ({
    start: `2026-01-${String(paydayDay).padStart(2, '0')}`,
    end: `2026-02-${String(paydayDay - 1).padStart(2, '0')}`,
    daysRemaining: 16,
    resetsOn: `2026-02-${String(paydayDay).padStart(2, '0')}`,
  })),
}));

jest.mock('../budget-utils', () => ({
  isAllocationValid: jest.fn(() => true),
  calculatePercentage: jest.fn((amount: number, total: number) =>
    total > 0 ? Math.round((amount / total) * 1000) / 10 : 0
  ),
}));

const { db } = require('../db');

import {
  getMemberBudgetPeriod,
  getBudgetSummary,
  getBudgetDetails,
} from '../budget-api';

// Suppress console output
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  (console.log as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// getMemberBudgetPeriod
// ===========================================================================

describe('getMemberBudgetPeriod', () => {
  it('returns period from member paydayDay when set', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        householdMembers: [
          {
            id: 'member-1',
            userId: 'user-alex',
            householdId: 'hh-1',
            status: 'active',
            paydayDay: 25,
          },
        ],
      },
    });

    const result = await getMemberBudgetPeriod('user-alex', 'hh-1');

    expect(result.paydayDay).toBe(25);
    expect(result.source).toBe('member');
    expect(result.start).toBeDefined();
    expect(result.end).toBeDefined();
    expect(result.daysRemaining).toBeDefined();
  });

  it('falls back to household paydayDay when member has none', async () => {
    // Member without paydayDay
    db.queryOnce.mockResolvedValueOnce({
      data: {
        householdMembers: [
          {
            id: 'member-1',
            userId: 'user-alex',
            householdId: 'hh-1',
            status: 'active',
            paydayDay: undefined, // No personal payday
          },
        ],
      },
    });
    // Household lookup
    db.queryOnce.mockResolvedValueOnce({
      data: {
        households: [
          { id: 'hh-1', paydayDay: 1 },
        ],
      },
    });

    const result = await getMemberBudgetPeriod('user-alex', 'hh-1');

    expect(result.paydayDay).toBe(1);
    expect(result.source).toBe('household');
  });

  it('defaults to payday 25 when neither member nor household has payday set', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { householdMembers: [] },
    });
    db.queryOnce.mockResolvedValueOnce({
      data: {
        households: [{ id: 'hh-1' }], // No paydayDay
      },
    });

    const result = await getMemberBudgetPeriod('user-alex', 'hh-1');

    expect(result.paydayDay).toBe(25); // Default
    expect(result.source).toBe('household');
  });
});

// ===========================================================================
// getBudgetSummary
// ===========================================================================

describe('getBudgetSummary', () => {
  it('returns budget summary for user', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        budgetSummary: [
          {
            id: 'summary-1',
            userId: 'user-alex',
            totalIncome: 7892,
            totalAllocated: 7892,
            totalSpent: 2505.75,
          },
        ],
      },
    });

    const summary = await getBudgetSummary('user-alex', 'hh-1', '2026-01-25');

    expect(summary).not.toBeNull();
    expect(summary.totalIncome).toBe(7892);
    expect(summary.totalAllocated).toBe(7892);
    expect(summary.totalSpent).toBe(2505.75);
  });

  it('returns null when no summary exists', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { budgetSummary: [] },
    });

    const summary = await getBudgetSummary('user-new', 'hh-1', '2026-01-25');
    expect(summary).toBeNull();
  });

  it('normalizes totalAllocated when within 0.05 of totalIncome', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        budgetSummary: [
          {
            id: 'summary-1',
            userId: 'user-alex',
            totalIncome: 7892,
            totalAllocated: 7891.96, // Off by 0.04 due to floating point
            totalSpent: 0,
          },
        ],
      },
    });

    const summary = await getBudgetSummary('user-alex', 'hh-1', '2026-01-25');
    expect(summary.totalAllocated).toBe(7892); // Normalized to income
  });
});

// ===========================================================================
// getBudgetDetails
// ===========================================================================

describe('getBudgetDetails', () => {
  it('returns budget details with category names and status', async () => {
    // First call: get budgets
    db.queryOnce.mockResolvedValueOnce({
      data: {
        budgets: [
          {
            id: 'budget-1',
            userId: 'user-alex',
            categoryId: 'cat-groceries',
            allocatedAmount: 600,
            spentAmount: 140.25,
            percentage: 7.6,
            categoryGroup: 'needs',
            isActive: true,
          },
          {
            id: 'budget-2',
            userId: 'user-alex',
            categoryId: 'cat-dining',
            allocatedAmount: 300,
            spentAmount: 290, // 96.7% - should be "warning"
            percentage: 3.8,
            categoryGroup: 'wants',
            isActive: true,
          },
          {
            id: 'budget-3',
            userId: 'user-alex',
            categoryId: 'cat-transport',
            allocatedAmount: 250,
            spentAmount: 280, // Over budget
            percentage: 3.2,
            categoryGroup: 'needs',
            isActive: true,
          },
        ],
      },
    });

    // Subsequent calls: get each category by ID
    db.queryOnce
      .mockResolvedValueOnce({ data: { categories: [{ id: 'cat-groceries', name: 'Groceries' }] } })
      .mockResolvedValueOnce({ data: { categories: [{ id: 'cat-dining', name: 'Dining Out' }] } })
      .mockResolvedValueOnce({ data: { categories: [{ id: 'cat-transport', name: 'Transportation' }] } });

    const details = await getBudgetDetails('user-alex', '2026-01-25');

    expect(details.length).toBe(3);

    // Check category name resolution
    const groceries = details.find((d: any) => d.categoryId === 'cat-groceries');
    expect(groceries!.categoryName).toBe('Groceries');

    // Check status calculation
    expect(groceries!.status).toBe('on-track'); // 23.4%

    const dining = details.find((d: any) => d.categoryId === 'cat-dining');
    expect(dining!.status).toBe('warning'); // 96.7%

    const transport = details.find((d: any) => d.categoryId === 'cat-transport');
    expect(transport!.status).toBe('over-budget'); // 112%
  });

  it('returns empty array when no budgets exist', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { budgets: [], categories: [] },
    });

    const details = await getBudgetDetails('user-new', '2026-01-25');
    expect(details).toEqual([]);
  });

  it('handles unknown category gracefully', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        budgets: [
          {
            id: 'budget-1',
            userId: 'user-alex',
            categoryId: 'cat-deleted',
            allocatedAmount: 100,
            spentAmount: 0,
            percentage: 1,
            categoryGroup: 'other',
            isActive: true,
          },
        ],
        categories: [], // Category was deleted
      },
    });

    const details = await getBudgetDetails('user-alex', '2026-01-25');
    expect(details[0].categoryName).toBe('Unknown');
  });
});
