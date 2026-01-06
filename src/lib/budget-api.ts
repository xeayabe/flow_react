/**
 * Budget management API
 */

import { db } from './db';
import { calculateBudgetPeriod } from './payday-utils';
import { isAllocationValid, calculatePercentage } from './budget-utils';

export interface BudgetSetupRequest {
  userId: string;
  householdId: string;
  totalIncome: number;
  allocations: Record<string, number>; // categoryId -> allocatedAmount
  categoryGroups: Record<string, string>; // categoryId -> group (needs/wants/savings)
}

export interface BudgetWithDetails {
  id: string;
  categoryId: string;
  categoryName: string;
  allocatedAmount: number;
  spentAmount: number;
  percentage: number;
  categoryGroup: string;
  status: 'on-track' | 'warning' | 'over-budget';
}

/**
 * Save budget for current period
 */
export async function saveBudget(request: BudgetSetupRequest): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, householdId, totalIncome, allocations, categoryGroups } = request;

    // Validate total allocation equals 100%
    const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
    if (!isAllocationValid(totalAllocated, totalIncome)) {
      return {
        success: false,
        error: `Budget must total 100%. Currently: ${Math.round((totalAllocated / totalIncome) * 1000) / 10}%`,
      };
    }

    // Get household to retrieve payday info
    const householdResult = await db.queryOnce({
      households: {
        $: {
          where: { id: householdId },
        },
      },
    });

    const household = householdResult.data.households?.[0];
    if (!household) throw new Error('Household not found');

    // Calculate budget period
    const paydayDay = household.paydayDay ?? 25;
    const budgetPeriod = calculateBudgetPeriod(paydayDay);

    const now = Date.now();

    // First, delete existing budget for this period (allows re-doing budget)
    const existingBudgets = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            periodStart: budgetPeriod.start,
          },
        },
      },
    });

    // Delete existing budget records if any
    if (existingBudgets.data.budgets && existingBudgets.data.budgets.length > 0) {
      const deleteOps = existingBudgets.data.budgets.map((budget: any) => ({
        action: 'delete',
        id: budget.id,
      }));

      for (const op of deleteOps) {
        await db.transact([db.tx.budgets[op.id].delete()]);
      }
    }

    // Calculate group totals
    const needsAllocated = Object.entries(allocations).reduce((sum, [catId, amount]) => {
      return categoryGroups[catId] === 'needs' ? sum + amount : sum;
    }, 0);

    const wantsAllocated = Object.entries(allocations).reduce((sum, [catId, amount]) => {
      return categoryGroups[catId] === 'wants' ? sum + amount : sum;
    }, 0);

    const savingsAllocated = Object.entries(allocations).reduce((sum, [catId, amount]) => {
      return categoryGroups[catId] === 'savings' ? sum + amount : sum;
    }, 0);

    // Create budget summary
    const summaryId = generateId();
    await db.transact([
      db.tx.budgetSummary[summaryId].update({
        userId,
        householdId,
        periodStart: budgetPeriod.start,
        periodEnd: budgetPeriod.end,
        totalIncome,
        totalAllocated: totalAllocated,
        totalSpent: 0,
        needsAllocated,
        wantsAllocated,
        savingsAllocated,
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    // Create budget records for each category
    const budgetOps = Object.entries(allocations)
      .filter(([_, amount]) => amount > 0) // Only create for allocated categories
      .map(([categoryId, allocatedAmount]) => {
        const budgetId = generateId();
        const percentage = calculatePercentage(allocatedAmount, totalIncome);
        const group = categoryGroups[categoryId] || 'other';

        return db.tx.budgets[budgetId].update({
          userId,
          householdId,
          categoryId,
          periodStart: budgetPeriod.start,
          periodEnd: budgetPeriod.end,
          allocatedAmount,
          spentAmount: 0,
          percentage,
          categoryGroup: group,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      });

    if (budgetOps.length > 0) {
      await db.transact(budgetOps);
    }

    console.log('Budget saved:', { userId, householdId, totalIncome, periodStart: budgetPeriod.start });

    return { success: true };
  } catch (error) {
    console.error('Save budget error:', error);
    return {
      success: false,
      error: 'Failed to save budget',
    };
  }
}

/**
 * Get budget summary for current period
 */
export async function getBudgetSummary(
  userId: string,
  householdId: string,
  periodStart: string
): Promise<any | null> {
  try {
    const result = await db.queryOnce({
      budgetSummary: {
        $: {
          where: {
            userId,
            periodStart,
          },
        },
      },
    });

    return result.data.budgetSummary?.[0] || null;
  } catch (error) {
    console.error('Get budget summary error:', error);
    return null;
  }
}

/**
 * Get all budget records for a period with category details
 */
export async function getBudgetDetails(userId: string, periodStart: string): Promise<BudgetWithDetails[]> {
  try {
    const result = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            periodStart,
          },
        },
      },
      categories: {},
    });

    const budgets = result.data.budgets || [];
    const categories = result.data.categories || [];

    return budgets.map((budget: any) => {
      const category = categories.find((c: any) => c.id === budget.categoryId);
      const status =
        budget.allocatedAmount === 0
          ? ('on-track' as const)
          : budget.spentAmount > budget.allocatedAmount
            ? ('over-budget' as const)
            : budget.spentAmount >= budget.allocatedAmount * 0.95
              ? ('warning' as const)
              : ('on-track' as const);

      return {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: category?.name || 'Unknown',
        allocatedAmount: budget.allocatedAmount,
        spentAmount: budget.spentAmount || 0,
        percentage: budget.percentage,
        categoryGroup: budget.categoryGroup,
        status,
      };
    });
  } catch (error) {
    console.error('Get budget details error:', error);
    return [];
  }
}

/**
 * Update spent amount for a category in budget
 * Called when transaction is added, edited, or deleted
 */
export async function updateBudgetSpentAmount(
  userId: string,
  categoryId: string,
  periodStart: string,
  spentAmount: number
): Promise<void> {
  try {
    const result = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            categoryId,
            periodStart,
          },
        },
      },
    });

    const budget = result.data.budgets?.[0];
    if (!budget) {
      console.warn(`Budget not found for user ${userId}, category ${categoryId}, period ${periodStart}`);
      return;
    }

    const now = Date.now();
    await db.transact([
      db.tx.budgets[budget.id].update({
        spentAmount: Math.max(0, spentAmount),
        updatedAt: now,
      }),
    ]);

    // Also update the budget summary totalSpent
    const summaryResult = await db.queryOnce({
      budgetSummary: {
        $: {
          where: {
            userId,
            periodStart,
          },
        },
      },
    });

    const summary = summaryResult.data.budgetSummary?.[0];
    if (summary) {
      // Recalculate total spent from all budgets
      const budgetsResult = await db.queryOnce({
        budgets: {
          $: {
            where: {
              userId,
              periodStart,
            },
          },
        },
      });

      const totalSpent = (budgetsResult.data.budgets || []).reduce((sum: number, b: any) => sum + (b.spentAmount || 0), 0);

      await db.transact([
        db.tx.budgetSummary[summary.id].update({
          totalSpent,
          updatedAt: now,
        }),
      ]);
    }
  } catch (error) {
    console.error('Update budget spent amount error:', error);
  }
}

/**
 * Recalculate budget spent amounts from actual transactions
 * Useful for backfilling spent amounts if they weren't properly tracked
 */
export async function recalculateBudgetSpentAmounts(
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  try {
    // Get all expense transactions for this user in this period
    const transactionsResult = await db.queryOnce({
      transactions: {
        $: {
          where: {
            userId,
            type: 'expense',
          },
        },
      },
    });

    const transactions = (transactionsResult.data.transactions ?? []).filter(
      (tx: any) => tx.date >= periodStart && tx.date <= periodEnd
    );

    // Group transactions by category
    const spentByCategory: Record<string, number> = {};
    transactions.forEach((tx: any) => {
      if (!spentByCategory[tx.categoryId]) {
        spentByCategory[tx.categoryId] = 0;
      }
      spentByCategory[tx.categoryId] += tx.amount;
    });

    // Update all budgets with recalculated spent amounts
    const budgetsResult = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            periodStart,
          },
        },
      },
    });

    const budgets = budgetsResult.data.budgets ?? [];
    const now = Date.now();

    const updateOps = budgets.map((budget: any) => {
      const newSpentAmount = spentByCategory[budget.categoryId] || 0;
      return db.tx.budgets[budget.id].update({
        spentAmount: newSpentAmount,
        updatedAt: now,
      });
    });

    if (updateOps.length > 0) {
      await db.transact(updateOps);
    }

    // Recalculate budget summary total spent
    const summaryResult = await db.queryOnce({
      budgetSummary: {
        $: {
          where: {
            userId,
            periodStart,
          },
        },
      },
    });

    const summary = summaryResult.data.budgetSummary?.[0];
    if (summary) {
      const totalSpent = Object.values(spentByCategory).reduce((sum: number, amount: number) => sum + amount, 0);
      await db.transact([
        db.tx.budgetSummary[summary.id].update({
          totalSpent,
          updatedAt: now,
        }),
      ]);
    }

    console.log('Budget spent amounts recalculated successfully');
  } catch (error) {
    console.error('Recalculate budget spent amounts error:', error);
    throw error;
  }
}

/**
 * Simple ID generator (UUID v4)
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
