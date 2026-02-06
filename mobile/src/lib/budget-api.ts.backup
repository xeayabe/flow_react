/**
 * Budget management API
 */

import { db } from './db';
import { calculateBudgetPeriod } from './payday-utils';
import { getCurrentBudgetPeriod } from './budget-period-utils';
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
 *
 * IMPORTANT: This now ALWAYS calculates the period dynamically from paydayDay.
 * The period is NOT retrieved from stored values - it's computed based on:
 * - Today's date
 * - User's paydayDay setting
 *
 * This ensures:
 * 1. Period dates are always correct
 * 2. Changing payday doesn't cause weird resets
 * 3. On payday, period automatically shifts forward
 */
export async function getMemberBudgetPeriod(userId: string, householdId: string): Promise<{
  start: string;
  end: string;
  paydayDay: number;
  source: 'member' | 'household';
  daysRemaining: number;
}> {
  // First try to get member's payday setting
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

  // If member has payday set, use dynamic calculation
  if (member?.paydayDay) {
    const paydayDay = member.paydayDay;
    const dynamicPeriod = getCurrentBudgetPeriod(paydayDay);

    console.log('📊 getMemberBudgetPeriod - Dynamic calculation:', {
      paydayDay,
      periodStart: dynamicPeriod.periodStartISO,
      periodEnd: dynamicPeriod.periodEndISO,
      daysRemaining: dynamicPeriod.daysRemaining,
    });

    return {
      start: dynamicPeriod.periodStartISO,
      end: dynamicPeriod.periodEndISO,
      paydayDay,
      source: 'member',
      daysRemaining: dynamicPeriod.daysRemaining,
    };
  }

  // Fall back to household payday for backward compatibility
  const householdResult = await db.queryOnce({
    households: {
      $: {
        where: { id: householdId },
      },
    },
  });

  const household = householdResult.data.households?.[0];
  const paydayDay = household?.paydayDay ?? 25;
  const dynamicPeriod = getCurrentBudgetPeriod(paydayDay);

  console.log('📊 getMemberBudgetPeriod - Fallback to household:', {
    paydayDay,
    periodStart: dynamicPeriod.periodStartISO,
    periodEnd: dynamicPeriod.periodEndISO,
    daysRemaining: dynamicPeriod.daysRemaining,
  });

  return {
    start: dynamicPeriod.periodStartISO,
    end: dynamicPeriod.periodEndISO,
    paydayDay,
    source: 'household',
    daysRemaining: dynamicPeriod.daysRemaining,
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

    // First, deactivate existing active budgets (allows re-doing budget)
    const existingBudgets = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            isActive: true,
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

    // Check if budget summary already exists for this period
    const existingSummary = await db.queryOnce({
      budgetSummary: {
        $: {
          where: {
            userId,
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
    // NOTE: We no longer store periodStart/periodEnd here - they come from householdMembers
    const summaryId = generateId();
    await db.transact([
      db.tx.budgetSummary[summaryId].update({
        userId,
        householdId,
        totalIncome,
        totalAllocated: totalAllocated,
        totalSpent: existingSummaryRecord?.totalSpent ?? 0, // Preserve spent amount if updating
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

    // Recalculate spent amounts from actual transactions in this period
    // This ensures that when reallocating a budget, existing expenses are still counted
    try {
      await recalculateBudgetSpentAmounts(userId, budgetPeriod.start, budgetPeriod.end);
      console.log('Budget spent amounts recalculated after save');
    } catch (recalcError) {
      console.error('Error recalculating spent amounts after save:', recalcError);
      // Don't fail the whole save if recalculation fails
    }

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
 * NOTE: Period dates come from householdMembers, not budgetSummary
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
    };
  } catch (error) {
    console.error('Get budget summary error:', error);
    return null;
  }
}

/**
 * Get all budget records for a period with category details
 *
 * IMPORTANT: Now retrieves ALL active budgets for the user, not filtered by periodStart.
 * This is because period is calculated dynamically - the stored periodStart in budgets
 * may be outdated if user changed their payday.
 */
export async function getBudgetDetails(userId: string, periodStart: string): Promise<BudgetWithDetails[]> {
  try {
    const result = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            isActive: true,
          },
        },
      },
      categories: {},
    });

    const budgets = result.data.budgets || [];
    const categories = result.data.categories || [];

    console.log('📋 getBudgetDetails - Found budgets:', {
      userId,
      requestedPeriodStart: periodStart,
      budgetsFound: budgets.length,
      budgetPeriods: budgets.map((b: any) => ({ categoryId: b.categoryId, periodStart: b.periodStart })),
    });

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
    // Single query to get budget, summary, all budgets, and accounts for exclusion check
    // IMPORTANT: Query budgets and summary by userId only, not by periodStart
    // because stored periodStart may be outdated if user changed payday
    const result = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            isActive: true,
          },
        },
      },
      budgetSummary: {
        $: {
          where: {
            userId,
          },
        },
      },
      accounts: {
        $: {
          where: {
            userId,
          },
        },
      },
    });

    const budgets = result.data.budgets || [];
    const budget = budgets.find((b: any) => b.categoryId === categoryId);
    const summary = result.data.budgetSummary?.[0];
    const accounts = result.data.accounts || [];

    // Create a set of excluded account IDs for quick lookup
    const excludedAccountIds = new Set(
      accounts.filter((acc: any) => acc.isExcludedFromBudget === true).map((acc: any) => acc.id)
    );

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
      ops.push(
        db.tx.budgetSummary[summary.id].update({
          totalSpent,
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
 * Excludes transactions from wallets marked as excluded from budget
 *
 * IMPORTANT: This function filters transactions by the passed-in period dates.
 * The caller is responsible for passing the correct (dynamically calculated) period.
 */
export async function recalculateBudgetSpentAmounts(
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  try {
    console.log('💰 recalculateBudgetSpentAmounts - START', {
      userId,
      periodStart,
      periodEnd,
    });

    // Get all accounts to check which ones are excluded from budget
    const accountsResult = await db.queryOnce({
      accounts: {
        $: {
          where: {
            userId,
          },
        },
      },
    });

    const accounts = accountsResult.data.accounts || [];
    const excludedAccountIds = new Set(
      accounts.filter((acc: any) => acc.isExcludedFromBudget === true).map((acc: any) => acc.id)
    );

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

    const allTransactions = transactionsResult.data.transactions ?? [];
    // Filter by date AND exclude transactions from excluded accounts AND exclude transactions marked as excluded
    const transactions = allTransactions.filter(
      (tx: any) => tx.date >= periodStart && tx.date <= periodEnd && !excludedAccountIds.has(tx.accountId) && !tx.isExcludedFromBudget
    );

    console.log('💰 recalculateBudgetSpentAmounts - Transactions found:', {
      total: allTransactions.length,
      inPeriod: transactions.length,
      periodStart,
      periodEnd,
    });

    // Log a few sample transactions for debugging
    if (transactions.length > 0) {
      console.log('💰 Sample transactions in period:');
      transactions.slice(0, 5).forEach((tx: any) => {
        console.log(`  - ${tx.date}: ${tx.amount} CHF (category: ${tx.categoryId})`);
      });
    }

    // Group transactions by category
    const spentByCategory: Record<string, number> = {};
    transactions.forEach((tx: any) => {
      if (!spentByCategory[tx.categoryId]) {
        spentByCategory[tx.categoryId] = 0;
      }
      spentByCategory[tx.categoryId] += tx.amount;
    });

    // Update all budgets with recalculated spent amounts
    // IMPORTANT: Query ALL active budgets, not filtered by periodStart
    // because the stored periodStart may be outdated if user changed payday
    const budgetsResult = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            isActive: true,
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
    // IMPORTANT: Query by userId only, not by periodStart
    // because budgetSummary may have outdated periodStart if user changed payday
    const summaryResult = await db.queryOnce({
      budgetSummary: {
        $: {
          where: {
            userId,
          },
        },
      },
    });

    const summary = summaryResult.data.budgetSummary?.[0];
    if (summary) {
      // Calculate total spent from actual transactions (will be 0 if no transactions)
      const totalSpent = Object.values(spentByCategory).reduce((sum: number, amount: number) => sum + amount, 0);

      console.log('💰 recalculateBudgetSpentAmounts - Updating summary:', {
        totalSpent,
        spentByCategory,
        transactionCount: transactions.length,
        periodStart,
        periodEnd,
      });

      await db.transact([
        db.tx.budgetSummary[summary.id].update({
          totalSpent,
          updatedAt: now,
        }),
      ]);
    } else {
      console.log('💰 recalculateBudgetSpentAmounts - No summary found for user');
    }

    console.log('💰 recalculateBudgetSpentAmounts - END');
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

    // Step 3: Get all active budgets
    const oldBudgetsResult = await db.queryOnce({
      budgets: {
        $: {
          where: {
            householdId,
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
          },
        },
      },
    });

    const oldSummary = summaryResult.data.budgetSummary?.[0];
    const summaryId = oldSummary?.id || generateId();

    const summaryTransaction = db.tx.budgetSummary[summaryId].update({
      householdId,
      totalIncome: oldSummary?.totalIncome || 0,
      totalAllocated: oldSummary?.totalAllocated || 0,
      totalSpent: 0, // Reset!
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
 * NOTE: This now checks ALL members in the household and resets any that need it
 */
export async function checkAndResetBudgetIfNeeded(householdId: string, userId?: string): Promise<boolean> {
  try {
    let anyResetHappened = false;

    // Get ALL active members of the household
    const membersResult = await db.queryOnce({
      householdMembers: {
        $: {
          where: { householdId, status: 'active' },
        },
      },
    });

    if (!membersResult || !membersResult.data) {
      console.error('Query failed - membersResult is undefined in checkAndResetBudgetIfNeeded');
      return false;
    }

    const allMembers = membersResult.data.householdMembers || [];
    console.log(`Checking budget reset for ${allMembers.length} household members`);

    // Use local date string to avoid timezone issues
    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    // Check EACH member's budget period
    for (const member of allMembers) {
      if (member.budgetPeriodEnd && member.paydayDay) {
        // Compare strings directly (YYYY-MM-DD format)
        if (todayStr > member.budgetPeriodEnd) {
          console.log(`Member ${member.userId} budget period has ended (${member.budgetPeriodEnd}), today is ${todayStr}, triggering reset...`);
          const resetSuccess = await resetMemberBudgetPeriod(member.userId, householdId);
          if (resetSuccess) {
            anyResetHappened = true;
          }
        }
      }
    }

    // Fall back to household-level check for backward compatibility (if no member has personal periods set)
    if (allMembers.length === 0 || !allMembers.some(m => m.budgetPeriodEnd)) {
      const householdResult = await db.queryOnce({
        households: { $: { where: { id: householdId } } },
      });

      if (!householdResult || !householdResult.data) {
        console.error('Query failed - householdResult is undefined');
        return false;
      }

      const household = householdResult.data.households?.[0];
      if (!household) return false;

      if (household.budgetPeriodEnd) {
        // Compare strings directly (YYYY-MM-DD format)
        if (todayStr > household.budgetPeriodEnd) {
          console.log('Household budget period has ended, triggering reset...');
          return resetBudgetPeriod(householdId);
        }
      }
    }

    return anyResetHappened;
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
    console.log('=== resetMemberBudgetPeriod START ===');
    console.log('User ID:', userId);
    console.log('Household ID:', householdId);

    // Get member's payday
    let memberResult;
    try {
      memberResult = await db.queryOnce({
        householdMembers: {
          $: {
            where: { userId, householdId, status: 'active' },
          },
        },
      });
      console.log('memberResult received:', memberResult);
    } catch (queryError) {
      console.error('Error in queryOnce for member:', queryError);
      return false;
    }

    if (!memberResult || !memberResult.data) {
      console.error('Query failed - memberResult is undefined or has no data:', memberResult);
      return false;
    }

    const member = memberResult.data.householdMembers?.[0];
    if (!member || !member.paydayDay) {
      console.error('Member not found or payday not set');
      return false;
    }

    console.log('Member found:', {
      id: member.id,
      paydayDay: member.paydayDay,
      currentBudgetPeriodStart: member.budgetPeriodStart,
      currentBudgetPeriodEnd: member.budgetPeriodEnd,
    });

    // IMPORTANT: Save the OLD period end before we update the member record
    const oldPeriodEnd = member.budgetPeriodEnd;
    console.log('Saved old period end:', oldPeriodEnd);

    // Calculate new period based on member's payday
    const newPeriod = calculateBudgetPeriod(member.paydayDay);
    console.log('New period calculated:', newPeriod);

    // Update member's budget period
    await db.transact([
      db.tx.householdMembers[member.id].update({
        budgetPeriodStart: newPeriod.start,
        budgetPeriodEnd: newPeriod.end,
        lastBudgetReset: Date.now(),
      }),
    ]);

    console.log('Member budget period updated to:', { start: newPeriod.start, end: newPeriod.end });

    // Get and reset member's budgets
    let budgetsResult;
    try {
      budgetsResult = await db.queryOnce({
        budgets: {
          $: {
            where: {
              userId,
              isActive: true,
            },
          },
        },
      });
    } catch (queryError) {
      console.error('Error in queryOnce for budgets:', queryError);
      return false;
    }

    if (!budgetsResult || !budgetsResult.data) {
      console.error('Query failed - budgetsResult is undefined');
      return false;
    }

    const oldBudgets = budgetsResult.data.budgets || [];
    console.log('Old budgets found:', oldBudgets.length);

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
        allocatedAmount: oldBudget.allocatedAmount,
        spentAmount: 0,
        percentage: oldBudget.percentage,
        categoryGroup: oldBudget.categoryGroup,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    console.log('New budgets to create:', newBudgetOps.length);

    // Reset budget summary for the member
    let summaryResult;
    try {
      summaryResult = await db.queryOnce({
        budgetSummary: {
          $: {
            where: {
              userId,
            },
          },
        },
      });
    } catch (queryError) {
      console.error('Error in queryOnce for summary:', queryError);
      return false;
    }

    if (!summaryResult || !summaryResult.data) {
      console.error('Query failed - summaryResult is undefined');
      return false;
    }

    const oldSummary = summaryResult.data.budgetSummary?.[0];
    if (!oldSummary) {
      console.log('No budget summary found for member, creating new one');
    } else {
      console.log('Old budget summary found:', {
        id: oldSummary.id,
        totalIncome: oldSummary.totalIncome,
        totalSpent: oldSummary.totalSpent,
      });
    }
    const summaryId = oldSummary?.id || generateId();

    const summaryTransaction = db.tx.budgetSummary[summaryId].update({
      userId,
      householdId,
      totalIncome: oldSummary?.totalIncome || 0,
      totalAllocated: oldSummary?.totalAllocated || 0,
      totalSpent: 0, // Reset spent to 0!
      createdAt: oldSummary?.createdAt || Date.now(),
      updatedAt: Date.now(),
    });

    const allTransactions = [...archiveOps, ...newBudgetOps, summaryTransaction];
    if (allTransactions.length > 0) {
      console.log('Total transactions to execute:', allTransactions.length);
      await db.transact(allTransactions);
    }

    console.log('Member budget reset successful for user:', userId);
    console.log('=== resetMemberBudgetPeriod END ===');
    return true;
  } catch (error) {
    console.error('Member budget reset error:', error);
    console.log('=== resetMemberBudgetPeriod END (ERROR) ===');
    return false;
  }
}
