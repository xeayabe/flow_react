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
 * Get user's personal budget period from their household membership
 * Falls back to household period for backward compatibility
 */
export async function getMemberBudgetPeriod(userId: string, householdId: string): Promise<{
  start: string;
  end: string;
  paydayDay: number;
  source: 'member' | 'household';
}> {
  // First try to get member's personal budget period
  const memberResult = await db.queryOnce({
    householdMembers: {
      $: {
        where: {
          userId,
          householdId,
          status: 'active',
        },
      },
    },
  });

  const member = memberResult.data.householdMembers?.[0];

  // If member has personal budget period set, use it
  if (member?.budgetPeriodStart && member?.budgetPeriodEnd && member?.paydayDay) {
    return {
      start: member.budgetPeriodStart,
      end: member.budgetPeriodEnd,
      paydayDay: member.paydayDay,
      source: 'member',
    };
  }

  // Fall back to household period for backward compatibility
  const householdResult = await db.queryOnce({
    households: {
      $: {
        where: { id: householdId },
      },
    },
  });

  const household = householdResult.data.households?.[0];
  const paydayDay = household?.paydayDay ?? 25;
  const period = household?.budgetPeriodStart && household?.budgetPeriodEnd
    ? { start: household.budgetPeriodStart, end: household.budgetPeriodEnd }
    : calculateBudgetPeriod(paydayDay);

  return {
    start: period.start,
    end: period.end,
    paydayDay,
    source: 'household',
  };
}

/**
 * Save budget for current period
 */
export async function saveBudget(request: BudgetSetupRequest): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, householdId, totalIncome, allocations, categoryGroups } = request;

    // Get budget period from member (personal) or household (fallback)
    const budgetPeriod = await getMemberBudgetPeriod(userId, householdId);
    console.log('Using budget period from:', budgetPeriod.source, budgetPeriod.start, '-', budgetPeriod.end);

    const now = Date.now();

    // Calculate total allocated - round each allocation first, then sum
    const rawTotal = Object.values(allocations).reduce((sum, amount) => {
      return sum + Math.round(amount * 100) / 100;
    }, 0);
    // Round the final total to avoid floating-point errors
    let totalAllocated = Math.round(rawTotal * 100) / 100;

    // If totalAllocated is within 0.01 of totalIncome, use totalIncome to avoid display discrepancies
    if (Math.abs(totalAllocated - totalIncome) < 0.01) {
      totalAllocated = totalIncome;
    }

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

    // Calculate group totals - round to avoid floating point errors
    const needsAllocated = Math.round(
      Object.entries(allocations).reduce((sum, [catId, amount]) => {
        return categoryGroups[catId] === 'needs' ? sum + amount : sum;
      }, 0) * 100
    ) / 100;

    const wantsAllocated = Math.round(
      Object.entries(allocations).reduce((sum, [catId, amount]) => {
        return categoryGroups[catId] === 'wants' ? sum + amount : sum;
      }, 0) * 100
    ) / 100;

    const savingsAllocated = Math.round(
      Object.entries(allocations).reduce((sum, [catId, amount]) => {
        return categoryGroups[catId] === 'savings' ? sum + amount : sum;
      }, 0) * 100
    ) / 100;

    // Check if budget summary already exists for this period
    const existingSummary = await db.queryOnce({
      budgetSummary: {
        $: {
          where: {
            userId,
            periodStart: budgetPeriod.start,
          },
        },
      },
    });

    const existingSummaryRecord = existingSummary.data.budgetSummary?.[0];

    // Delete existing summary if it exists (to handle income updates)
    if (existingSummaryRecord) {
      await db.transact([db.tx.budgetSummary[existingSummaryRecord.id].delete()]);
    }

    // Create new budget summary with updated values
    const summaryId = generateId();
    await db.transact([
      db.tx.budgetSummary[summaryId].update({
        userId,
        householdId,
        periodStart: budgetPeriod.start,
        periodEnd: budgetPeriod.end,
        totalIncome,
        totalAllocated: totalAllocated,
        totalSpent: existingSummaryRecord?.totalSpent ?? 0, // Preserve spent amount if updating
        needsAllocated,
        wantsAllocated,
        savingsAllocated,
        needsSpent: existingSummaryRecord?.needsSpent ?? 0, // Preserve spent amounts
        wantsSpent: existingSummaryRecord?.wantsSpent ?? 0,
        savingsSpent: existingSummaryRecord?.savingsSpent ?? 0,
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

    const summary = result.data.budgetSummary?.[0];
    if (!summary) return null;

    // Apply rounding to all allocated values to fix floating-point precision issues
    let totalAllocated = Math.round((summary.totalAllocated ?? 0) * 100) / 100;
    const totalIncome = summary.totalIncome ?? 0;

    // If totalAllocated is within 0.05 of totalIncome, normalize to totalIncome
    // This fixes cases like 7891.96 vs 7892 caused by floating-point errors
    if (totalIncome > 0 && Math.abs(totalAllocated - totalIncome) < 0.05) {
      totalAllocated = totalIncome;
    }

    return {
      ...summary,
      totalAllocated,
      needsAllocated: Math.round((summary.needsAllocated ?? 0) * 100) / 100,
      wantsAllocated: Math.round((summary.wantsAllocated ?? 0) * 100) / 100,
      savingsAllocated: Math.round((summary.savingsAllocated ?? 0) * 100) / 100,
    };
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
 * This runs in the background and doesn't block the transaction
 */
export async function updateBudgetSpentAmount(
  userId: string,
  categoryId: string,
  periodStart: string,
  spentAmount: number
): Promise<void> {
  // Run in background - don't await
  updateBudgetSpentAmountAsync(userId, categoryId, periodStart, spentAmount);
}

async function updateBudgetSpentAmountAsync(
  userId: string,
  categoryId: string,
  periodStart: string,
  spentAmount: number
): Promise<void> {
  try {
    // Single query to get budget, summary, and all budgets for recalculation
    const result = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            periodStart,
          },
        },
      },
      budgetSummary: {
        $: {
          where: {
            userId,
            periodStart,
          },
        },
      },
    });

    const budgets = result.data.budgets || [];
    const budget = budgets.find((b: any) => b.categoryId === categoryId);
    const summary = result.data.budgetSummary?.[0];

    if (!budget) {
      console.warn(`Budget not found for user ${userId}, category ${categoryId}, period ${periodStart}`);
      return;
    }

    const now = Date.now();

    // Calculate totals including the new spent amount
    let totalSpent = 0;
    const spentByGroup: Record<string, number> = {};

    budgets.forEach((b: any) => {
      // Use the new spentAmount for the updated category
      const spent = b.categoryId === categoryId ? Math.max(0, spentAmount) : (b.spentAmount || 0);
      totalSpent += spent;

      const groupKey = b.categoryGroup || 'other';
      if (!spentByGroup[groupKey]) {
        spentByGroup[groupKey] = 0;
      }
      spentByGroup[groupKey] += spent;
    });

    // Single transaction to update both budget and summary
    const ops: any[] = [
      db.tx.budgets[budget.id].update({
        spentAmount: Math.max(0, spentAmount),
        updatedAt: now,
      }),
    ];

    if (summary) {
      // For backward compatibility, also include needs/wants/savings
      ops.push(
        db.tx.budgetSummary[summary.id].update({
          totalSpent,
          needsSpent: spentByGroup['needs'] || 0,
          wantsSpent: spentByGroup['wants'] || 0,
          savingsSpent: spentByGroup['savings'] || 0,
          updatedAt: now,
        })
      );
    }

    await db.transact(ops);
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

    // Calculate spent amounts per category group (using actual group keys from budgets)
    const spentByGroup: Record<string, number> = {};

    const updateOps = budgets.map((budget: any) => {
      const newSpentAmount = spentByCategory[budget.categoryId] || 0;
      const groupKey = budget.categoryGroup || 'other';

      // Accumulate spent by group (using actual group key from budget)
      if (!spentByGroup[groupKey]) {
        spentByGroup[groupKey] = 0;
      }
      spentByGroup[groupKey] += newSpentAmount;

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
      // Calculate total spent from actual transactions (will be 0 if no transactions)
      const totalSpent = Object.values(spentByCategory).reduce((sum: number, amount: number) => sum + amount, 0);

      // For backward compatibility, also calculate needs/wants/savings if those groups exist
      const needsSpent = spentByGroup['needs'] || 0;
      const wantsSpent = spentByGroup['wants'] || 0;
      const savingsSpent = spentByGroup['savings'] || 0;

      console.log('Recalculating budget summary:', {
        totalSpent,
        spentByGroup,
        transactionCount: transactions.length,
      });

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
 * NOTE: This now checks the member's personal budget period
 */
export async function checkAndResetBudgetIfNeeded(householdId: string, userId?: string): Promise<boolean> {
  try {
    // If userId provided, check member's personal period
    if (userId) {
      const memberResult = await db.queryOnce({
        householdMembers: {
          $: {
            where: { userId, householdId, status: 'active' },
          },
        },
      });

      const member = memberResult.data.householdMembers?.[0];
      if (member?.budgetPeriodEnd) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const periodEnd = new Date(member.budgetPeriodEnd + 'T00:00:00');
        periodEnd.setHours(0, 0, 0, 0);

        if (today > periodEnd) {
          console.log('Member budget period has ended, triggering reset...');
          return resetMemberBudgetPeriod(userId, householdId);
        }
        return false;
      }
    }

    // Fall back to household-level check for backward compatibility
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

/**
 * Reset budget period for a specific member
 */
export async function resetMemberBudgetPeriod(userId: string, householdId: string): Promise<boolean> {
  try {
    // Get member's payday
    const memberResult = await db.queryOnce({
      householdMembers: {
        $: {
          where: { userId, householdId, status: 'active' },
        },
      },
    });

    const member = memberResult.data.householdMembers?.[0];
    if (!member || !member.paydayDay) {
      console.error('Member not found or payday not set');
      return false;
    }

    // Calculate new period based on member's payday
    const newPeriod = calculateBudgetPeriod(member.paydayDay);

    // Update member's budget period
    await db.transact([
      db.tx.householdMembers[member.id].update({
        budgetPeriodStart: newPeriod.start,
        budgetPeriodEnd: newPeriod.end,
        lastBudgetReset: Date.now(),
      }),
    ]);

    // Get and reset member's budgets
    const budgetsResult = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            periodEnd: member.budgetPeriodEnd,
            isActive: true,
          },
        },
      },
    });

    const oldBudgets = budgetsResult.data.budgets || [];

    // Archive old budgets
    const archiveOps = oldBudgets.map((budget: any) =>
      db.tx.budgets[budget.id].update({
        isActive: false,
        updatedAt: Date.now(),
      })
    );

    // Create new budgets with reset spent amounts
    const newBudgetOps = oldBudgets.map((oldBudget: any) =>
      db.tx.budgets[generateId()].update({
        userId: oldBudget.userId,
        householdId,
        categoryId: oldBudget.categoryId,
        periodStart: newPeriod.start,
        periodEnd: newPeriod.end,
        allocatedAmount: oldBudget.allocatedAmount,
        spentAmount: 0,
        percentage: oldBudget.percentage,
        categoryGroup: oldBudget.categoryGroup,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    // Reset budget summary for the member
    // Query using the OLD period end to find the current summary that needs resetting
    const summaryResult = await db.queryOnce({
      budgetSummary: {
        $: {
          where: {
            userId,
            periodEnd: member.budgetPeriodEnd, // Use OLD period end to find current summary
          },
        },
      },
    });

    const oldSummary = summaryResult.data.budgetSummary?.[0];
    if (!oldSummary) {
      console.log('No budget summary found for member, creating new one');
    }
    const summaryId = oldSummary?.id || generateId();

    const summaryTransaction = db.tx.budgetSummary[summaryId].update({
      userId,
      householdId,
      periodStart: newPeriod.start,
      periodEnd: newPeriod.end,
      totalIncome: oldSummary?.totalIncome || 0,
      totalAllocated: oldSummary?.totalAllocated || 0,
      totalSpent: 0, // Reset spent to 0!
      needsAllocated: oldSummary?.needsAllocated || 0,
      wantsAllocated: oldSummary?.wantsAllocated || 0,
      savingsAllocated: oldSummary?.savingsAllocated || 0,
      needsSpent: 0, // Reset!
      wantsSpent: 0, // Reset!
      savingsSpent: 0, // Reset!
      createdAt: oldSummary?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });

    const allTransactions = [...archiveOps, ...newBudgetOps, summaryTransaction];
    if (allTransactions.length > 0) {
      await db.transact(allTransactions);
    }

    console.log('Member budget reset successful for user:', userId);
    return true;
  } catch (error) {
    console.error('Member budget reset error:', error);
    return false;
  }
}
