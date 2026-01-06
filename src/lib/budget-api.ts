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

    // Calculate spent amounts per category group
    let needsSpent = 0;
    let wantsSpent = 0;
    let savingsSpent = 0;

    const updateOps = budgets.map((budget: any) => {
      const newSpentAmount = spentByCategory[budget.categoryId] || 0;

      // Accumulate spent by group
      if (budget.categoryGroup === 'needs') {
        needsSpent += newSpentAmount;
      } else if (budget.categoryGroup === 'wants') {
        wantsSpent += newSpentAmount;
      } else if (budget.categoryGroup === 'savings') {
        savingsSpent += newSpentAmount;
      }

      return db.tx.budgets[budget.id].update({
        spentAmount: newSpentAmount,
        updatedAt: now,
      });
    });

    if (updateOps.length > 0) {
      await db.transact(updateOps);
    }

    // Recalculate budget summary total spent and group spent amounts
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
          needsSpent,
          wantsSpent,
          savingsSpent,
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

/**
 * Reset budget period on payday
 * Archives old budgets, creates new ones with reset spent amounts
 */
export async function resetBudgetPeriod(householdId: string): Promise<boolean> {
  try {
    // Step 1: Get household
    const householdResult = await db.queryOnce({
      households: { $: { where: { id: householdId } } },
    });

    const household = householdResult.data.households?.[0];
    if (!household) {
      console.error('Household not found');
      return false;
    }

    // Step 2: Calculate new period using payday
    const paydayDay = household.paydayDay ?? 25; // Default to 25 if not set
    const { start: newPeriodStart, end: newPeriodEnd } = calculateBudgetPeriod(paydayDay);

    // Step 3: Get all active budgets from current period
    const oldBudgetsResult = await db.queryOnce({
      budgets: {
        $: {
          where: {
            householdId,
            periodEnd: household.budgetPeriodEnd,
            isActive: true,
          },
        },
      },
    });

    const oldBudgets = oldBudgetsResult.data.budgets || [];

    // Step 4: Archive old budgets by marking as inactive
    const archiveTransactions = oldBudgets.map((budget: any) =>
      db.tx.budgets[budget.id].update({
        isActive: false,
        updatedAt: Date.now(),
      })
    );

    // Step 5: Create new budgets with reset spent amounts
    const newBudgetTransactions = oldBudgets.map((oldBudget: any) =>
      db.tx.budgets[generateId()].update({
        userId: oldBudget.userId,
        householdId,
        categoryId: oldBudget.categoryId,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        allocatedAmount: oldBudget.allocatedAmount,
        spentAmount: 0, // Reset to 0!
        percentage: oldBudget.percentage,
        categoryGroup: oldBudget.categoryGroup,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    // Step 6: Update household with new period
    const householdTransaction = db.tx.households[householdId].update({
      budgetPeriodStart: newPeriodStart,
      budgetPeriodEnd: newPeriodEnd,
      updatedAt: Date.now(),
    });

    // Step 7: Update budget summary
    const summaryResult = await db.queryOnce({
      budgetSummary: {
        $: {
          where: {
            householdId,
            periodEnd: household.budgetPeriodEnd,
          },
        },
      },
    });

    const oldSummary = summaryResult.data.budgetSummary?.[0];
    const summaryId = oldSummary?.id || generateId();

    const summaryTransaction = db.tx.budgetSummary[summaryId].update({
      householdId,
      periodStart: newPeriodStart,
      periodEnd: newPeriodEnd,
      totalIncome: oldSummary?.totalIncome || 0,
      totalAllocated: oldSummary?.totalAllocated || 0,
      totalSpent: 0, // Reset!
      needsAllocated: oldSummary?.needsAllocated || 0,
      wantsAllocated: oldSummary?.wantsAllocated || 0,
      savingsAllocated: oldSummary?.savingsAllocated || 0,
      updatedAt: Date.now(),
    });

    // Execute all transactions atomically
    const allTransactions = [
      ...archiveTransactions,
      ...newBudgetTransactions,
      householdTransaction,
      summaryTransaction,
    ];

    if (allTransactions.length > 0) {
      await db.transact(allTransactions);
    }

    console.log('Budget reset successful for household:', householdId);
    return true;
  } catch (error) {
    console.error('Budget reset error:', error);
    return false;
  }
}

/**
 * Check if budget reset is needed and perform it if required
 * Call this on app load (dashboard, budget pages)
 */
export async function checkAndResetBudgetIfNeeded(householdId: string): Promise<boolean> {
  try {
    const householdResult = await db.queryOnce({
      households: { $: { where: { id: householdId } } },
    });

    const household = householdResult.data.households?.[0];
    if (!household) return false;

    // Check if current date is past the budget period end date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const periodEnd = new Date(household.budgetPeriodEnd + 'T00:00:00');
    periodEnd.setHours(0, 0, 0, 0);

    // If today > period end date, reset is needed
    if (today > periodEnd) {
      console.log('Budget period has ended, triggering reset...');
      return resetBudgetPeriod(householdId);
    }

    return false;
  } catch (error) {
    console.error('Error checking budget reset:', error);
    return false;
  }
}
