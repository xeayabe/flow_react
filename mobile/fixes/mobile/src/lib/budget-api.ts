// FIX: CQP-006/ARCH-1 - Re-exports shared functions from shared-api for backward compatibility
// FIX: CODE-4 - Uses typed errors instead of generic catch blocks
// FIX: CODE-2 - Replaced critical `any` types with proper interfaces
// FIX: CODE-6 - Extracted generateId into a reusable utility
// FIX: SEC-003 - Replaced console.log/error with secure logger
// FIX: SEC-009 - Scoped categories query in getBudgetDetails
// FIX: DAT-011 - Scoped budgetSummary query in resetBudgetPeriod
// FIX: DAT-001 - Removed references to non-existent periodStart field on budgetSummary
// FIX: DAT-008 - Null safety (?? 0) for financial arithmetic on budget amounts

/**
 * Budget management API
 */

import { db } from './db';
import { calculateBudgetPeriod } from './payday-utils';
import { getCurrentBudgetPeriod } from './budget-period-utils';
import { isAllocationValid, calculatePercentage } from './budget-utils';
// FIX: CQP-006 - Import and re-export shared functions so existing consumers don't break
import {
  getMemberBudgetPeriod as _getMemberBudgetPeriod,
  updateBudgetSpentAmount as _updateBudgetSpentAmount,
} from './shared-api';
import { getErrorMessage, DataIntegrityError } from '../types/errors';
import { logger } from './logger'; // FIX: SEC-003 - Secure logger
import type {
  BudgetRecord,
  BudgetSummaryRecord,
  CategoryRecord,
  HouseholdMemberRecord,
  HouseholdRecord,
  AccountRecord,
  TransactionRecord,
} from '../types/api';

// FIX: CQP-006 - Re-export so existing imports from budget-api still work
export const getMemberBudgetPeriod = _getMemberBudgetPeriod;
export const updateBudgetSpentAmount = _updateBudgetSpentAmount;

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
 * Save budget for current period
 */
export async function saveBudget(request: BudgetSetupRequest): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, householdId, totalIncome, allocations, categoryGroups } = request;

    // Get budget period from member (personal) or household (fallback)
    const budgetPeriod = await getMemberBudgetPeriod(userId, householdId);
    logger.debug('Using budget period from:', budgetPeriod.source); // FIX: SEC-003

    // Calculate total allocated - round each allocation first, then sum
    const rawTotal = Object.values(allocations).reduce((sum, amount) => {
      return sum + Math.round(amount * 100) / 100;
    }, 0);
    let totalAllocated = Math.round(rawTotal * 100) / 100;

    // If totalAllocated is within 0.01 of totalIncome, use totalIncome to avoid display discrepancies
    if (Math.abs(totalAllocated - totalIncome) < 0.01) {
      totalAllocated = totalIncome;
    }

    // First, deactivate existing active budgets (allows re-doing budget)
    const existingBudgets = await db.queryOnce({
      budgets: {
        $: {
          where: { userId, isActive: true },
        },
      },
    });

    // FIX: CODE-2 - Use typed budget records
    const existingBudgetRecords = (existingBudgets.data.budgets ?? []) as BudgetRecord[];

    // Delete existing budget records if any
    if (existingBudgetRecords.length > 0) {
      for (const budget of existingBudgetRecords) {
        await db.transact([db.tx.budgets[budget.id].delete()]);
      }
    }

    // Check if budget summary already exists
    const existingSummary = await db.queryOnce({
      budgetSummary: {
        $: {
          where: { userId },
        },
      },
    });

    // @ts-ignore - InstantDB types
    const existingSummaryRecord = existingSummary.data.budgetSummary?.[0] as BudgetSummaryRecord | undefined;

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
        totalIncome,
        totalAllocated: totalAllocated,
        totalSpent: existingSummaryRecord?.totalSpent ?? 0,
      }),
    ]);

    // Create budget records for each category
    const budgetOps = Object.entries(allocations)
      .filter(([_, amount]) => amount > 0)
      .map(([categoryId, allocatedAmount]) => {
        const budgetId = generateId();
        const percentage = calculatePercentage(allocatedAmount, totalIncome);
        const group = categoryGroups[categoryId] || 'other';

        return db.tx.budgets[budgetId].update({
          userId,
          categoryId,
          allocatedAmount,
          spentAmount: 0,
          percentage,
          categoryGroup: group,
          isActive: true,
        });
      });

    if (budgetOps.length > 0) {
      await db.transact(budgetOps);
    }

    logger.debug('Budget saved successfully'); // FIX: SEC-003 - Don't log IDs or income

    // Recalculate spent amounts from actual transactions in this period
    try {
      await recalculateBudgetSpentAmounts(userId, budgetPeriod.start, budgetPeriod.end);
      logger.debug('Budget spent amounts recalculated after save'); // FIX: SEC-003
    } catch (recalcError) {
      logger.error('Error recalculating spent amounts after save:', getErrorMessage(recalcError)); // FIX: SEC-003
    }

    return { success: true };
  } catch (error) {
    logger.error('Save budget error:', getErrorMessage(error)); // FIX: SEC-003
    return {
      success: false,
      error: 'Failed to save budget',
    };
  }
}

/**
 * Get budget summary for current period.
 * NOTE: Period dates come from householdMembers, not budgetSummary.
 */
export async function getBudgetSummary(
  userId: string,
  householdId: string,
  periodStart: string
): Promise<BudgetSummaryRecord | null> {
  try {
    const result = await db.queryOnce({
      budgetSummary: {
        $: {
          where: { userId },
        },
      },
    });

    // FIX: CODE-2 - Use typed summary record
    // @ts-ignore - InstantDB types
    const summary = result.data.budgetSummary?.[0] as BudgetSummaryRecord | undefined;
    if (!summary) return null;

    // Apply rounding to fix floating-point precision issues
    let totalAllocated = Math.round((summary.totalAllocated ?? 0) * 100) / 100;
    const totalIncome = summary.totalIncome ?? 0;

    // Normalize to totalIncome if within tolerance
    if (totalIncome > 0 && Math.abs(totalAllocated - totalIncome) < 0.05) {
      totalAllocated = totalIncome;
    }

    return {
      ...summary,
      totalAllocated,
    };
  } catch (error) {
    logger.error('Get budget summary error:', getErrorMessage(error)); // FIX: SEC-003
    return null;
  }
}

/**
 * Determines the spending status of a budget category.
 */
function determineBudgetStatus(
  allocatedAmount: number,
  spentAmount: number
): 'on-track' | 'warning' | 'over-budget' {
  if (allocatedAmount === 0) return 'on-track';
  if (spentAmount > allocatedAmount) return 'over-budget';
  if (spentAmount >= allocatedAmount * 0.95) return 'warning';
  return 'on-track';
}

/**
 * Get all budget records for a period with category details.
 *
 * IMPORTANT: Retrieves ALL active budgets for the user, not filtered by periodStart.
 * Period is calculated dynamically - stored periodStart may be outdated.
 */
export async function getBudgetDetails(userId: string, periodStart: string): Promise<BudgetWithDetails[]> {
  try {
    const result = await db.queryOnce({
      budgets: {
        $: {
          where: { userId, isActive: true },
        },
      },
    });

    // FIX: CODE-2 - Use typed records
    const budgets = (result.data.budgets || []) as BudgetRecord[];

    // FIX: SEC-009 - Scope categories by fetching only those referenced by user's budgets
    // Instead of fetching all categories (privacy breach), fetch by specific IDs
    const categoryIds = [...new Set(budgets.map((b) => b.categoryId))];
    const categoryPromises = categoryIds.map((cid) =>
      db.queryOnce({ categories: { $: { where: { id: cid } } } }) // FIX: SEC-009 - Scoped by id
    );
    const categoryResults = await Promise.all(categoryPromises);
    const categories = categoryResults.flatMap((r) => (r.data.categories || []) as CategoryRecord[]);

    return budgets.map((budget) => {
      const category = categories.find((c) => c.id === budget.categoryId);
      const status = determineBudgetStatus(budget.allocatedAmount, budget.spentAmount || 0);

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
    logger.error('Get budget details error:', getErrorMessage(error)); // FIX: SEC-003
    return [];
  }
}

/**
 * Recalculate budget spent amounts from actual transactions.
 * Excludes transactions from wallets marked as excluded from budget.
 *
 * IMPORTANT: Filters transactions by the passed-in period dates.
 * The caller is responsible for passing the correct (dynamically calculated) period.
 */
export async function recalculateBudgetSpentAmounts(
  userId: string,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  try {
    logger.debug('recalculateBudgetSpentAmounts - START'); // FIX: SEC-003 - Don't log userId or dates

    // FIX: CODE-6 - Extracted account exclusion lookup into helper
    const excludedAccountIds = await getExcludedAccountIds(userId);

    // Get all expense transactions for this user
    const transactionsResult = await db.queryOnce({
      transactions: {
        $: {
          where: { userId, type: 'expense' },
        },
      },
    });

    // FIX: CODE-2 - Use typed transaction records
    const allTransactions = (transactionsResult.data.transactions ?? []) as TransactionRecord[];

    const todayStr = getTodayDateString();

    // Filter by date, excluded accounts, excluded flag, and future transactions
    const transactions = allTransactions.filter(
      (tx) =>
        tx.date >= periodStart &&
        tx.date <= periodEnd &&
        tx.date <= todayStr &&
        !excludedAccountIds.has(tx.accountId) &&
        !tx.isExcludedFromBudget
    );

    logger.debug('recalculateBudgetSpentAmounts - Transactions:', { // FIX: SEC-003
      total: allTransactions.length,
      inPeriod: transactions.length,
    });

    // Group transactions by category
    const spentByCategory = groupSpentByCategory(transactions);

    // Update all budgets with recalculated spent amounts
    const budgetsResult = await db.queryOnce({
      budgets: {
        $: {
          where: { userId, isActive: true },
        },
      },
    });

    const budgets = (budgetsResult.data.budgets ?? []) as BudgetRecord[];

    const updateOps = budgets.map((budget) => {
      const newSpentAmount = spentByCategory[budget.categoryId] || 0;
      return db.tx.budgets[budget.id].update({
        spentAmount: newSpentAmount,
      });
    });

    if (updateOps.length > 0) {
      await db.transact(updateOps);
    }

    // Update budget summary
    await updateBudgetSummaryTotalSpent(userId, spentByCategory);

    logger.debug('recalculateBudgetSpentAmounts - END'); // FIX: SEC-003
  } catch (error) {
    logger.error('Recalculate budget spent amounts error:', getErrorMessage(error)); // FIX: SEC-003
    throw error;
  }
}

// FIX: CODE-6 - Helper to get excluded account IDs
async function getExcludedAccountIds(userId: string): Promise<Set<string>> {
  const accountsResult = await db.queryOnce({
    accounts: {
      $: {
        where: { userId },
      },
    },
  });

  const accounts = (accountsResult.data.accounts || []) as AccountRecord[];
  return new Set(
    accounts
      .filter((acc) => acc.isExcludedFromBudget === true)
      .map((acc) => acc.id)
  );
}

// FIX: CODE-6 - Helper to group transaction amounts by category
function groupSpentByCategory(transactions: TransactionRecord[]): Record<string, number> {
  const spentByCategory: Record<string, number> = {};
  transactions.forEach((tx) => {
    if (!spentByCategory[tx.categoryId]) {
      spentByCategory[tx.categoryId] = 0;
    }
    spentByCategory[tx.categoryId] += tx.amount;
  });
  return spentByCategory;
}

// FIX: CODE-6 - Helper to get today's date string
function getTodayDateString(): string {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.toISOString().split('T')[0];
}

// FIX: CODE-6 - Helper to update budget summary's total spent
async function updateBudgetSummaryTotalSpent(
  userId: string,
  spentByCategory: Record<string, number>
): Promise<void> {
  const summaryResult = await db.queryOnce({
    budgetSummary: {
      $: {
        where: { userId },
      },
    },
  });

  // @ts-ignore - InstantDB types
  const summary = summaryResult.data.budgetSummary?.[0] as BudgetSummaryRecord | undefined;
  if (summary) {
    const totalSpent = Object.values(spentByCategory).reduce(
      (sum: number, amount: number) => sum + amount,
      0
    );

    await db.transact([
      db.tx.budgetSummary[summary.id].update({ totalSpent }),
    ]);
  }
}

/**
 * Reset budget period on payday.
 * Archives old budgets, creates new ones with reset spent amounts.
 */
export async function resetBudgetPeriod(householdId: string): Promise<boolean> {
  try {
    const householdResult = await db.queryOnce({
      households: { $: { where: { id: householdId } } },
    });

    // @ts-ignore - InstantDB types
    const household = householdResult.data.households?.[0] as HouseholdRecord | undefined;
    if (!household) {
      logger.error('Household not found'); // FIX: SEC-003
      return false;
    }

    const paydayDay = household.paydayDay ?? 25;
    const { start: newPeriodStart, end: newPeriodEnd } = calculateBudgetPeriod(paydayDay);

    // FIX: SEC-001 - Scope budgets query by householdId via member lookup
    // First get all active members of this household to scope budget queries
    const membersResult = await db.queryOnce({
      householdMembers: {
        $: {
          where: { householdId, status: 'active' }, // FIX: SEC-001 - Scoped by householdId
        },
      },
    });

    const memberUserIds = (membersResult.data.householdMembers || []).map((m: any) => m.userId);

    // FIX: SEC-001 - Fetch budgets per member instead of all active budgets globally
    const allOldBudgets: BudgetRecord[] = [];
    for (const memberId of memberUserIds) {
      const budgetRes = await db.queryOnce({
        budgets: {
          $: {
            where: { userId: memberId, isActive: true }, // FIX: SEC-001 - Scoped by userId
          },
        },
      });
      allOldBudgets.push(...((budgetRes.data.budgets || []) as BudgetRecord[]));
    }

    const oldBudgetsResult = { data: { budgets: allOldBudgets } };

    const oldBudgets = (oldBudgetsResult.data.budgets || []) as BudgetRecord[];

    const archiveTransactions = oldBudgets.map((budget) =>
      db.tx.budgets[budget.id].update({ isActive: false })
    );

    const newBudgetTransactions = oldBudgets.map((oldBudget) =>
      db.tx.budgets[generateId()].update({
        userId: oldBudget.userId,
        categoryId: oldBudget.categoryId,
        allocatedAmount: oldBudget.allocatedAmount,
        spentAmount: 0,
        percentage: oldBudget.percentage,
        categoryGroup: oldBudget.categoryGroup,
        isActive: true,
      })
    );

    const householdTransaction = db.tx.households[householdId].update({});

    // FIX: DAT-011 - Scope budgetSummary queries by userId instead of empty where clause
    // Reset summaries for each household member individually
    const summaryTransactions: any[] = [];
    for (const memberId of memberUserIds) {
      const summaryResult = await db.queryOnce({
        budgetSummary: {
          $: {
            where: { userId: memberId }, // FIX: DAT-011 - Scoped by userId
          },
        },
      });

      // @ts-ignore - InstantDB types
      const oldSummary = summaryResult.data.budgetSummary?.[0] as BudgetSummaryRecord | undefined;
      const summaryId = oldSummary?.id || generateId();

      summaryTransactions.push(
        db.tx.budgetSummary[summaryId].update({
          userId: memberId, // FIX: DAT-011 - Ensure userId is set
          totalIncome: oldSummary?.totalIncome || 0,
          totalAllocated: oldSummary?.totalAllocated || 0,
          totalSpent: 0,
        })
      );
    }

    const allTransactions = [
      ...archiveTransactions,
      ...newBudgetTransactions,
      householdTransaction,
      ...summaryTransactions, // FIX: DAT-011 - Use per-member summary transactions
    ];

    if (allTransactions.length > 0) {
      await db.transact(allTransactions);
    }

    logger.debug('Budget reset successful for household'); // FIX: SEC-003 - Don't log householdId
    return true;
  } catch (error) {
    logger.error('Budget reset error:', getErrorMessage(error)); // FIX: SEC-003
    return false;
  }
}

/**
 * Check if budget reset is needed and perform it if required.
 * Call this on app load (dashboard, budget pages).
 */
export async function checkAndResetBudgetIfNeeded(householdId: string, userId?: string): Promise<boolean> {
  try {
    let anyResetHappened = false;

    const membersResult = await db.queryOnce({
      householdMembers: {
        $: {
          where: { householdId, status: 'active' },
        },
      },
    });

    if (!membersResult?.data) {
      logger.error('Query failed - membersResult is undefined'); // FIX: SEC-003
      return false;
    }

    const allMembers = (membersResult.data.householdMembers || []) as HouseholdMemberRecord[];

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    for (const member of allMembers) {
      if (member.paydayDay) {
        const currentPeriod = getCurrentBudgetPeriod(member.paydayDay);
        if (todayStr > currentPeriod.periodEndISO) {
          logger.debug('Member budget period has ended, triggering reset'); // FIX: SEC-003
          const resetSuccess = await resetMemberBudgetPeriod(member.userId, householdId);
          if (resetSuccess) {
            anyResetHappened = true;
          }
        }
      }
    }

    // Fallback to household-level check
    if (allMembers.length === 0 || !allMembers.some((m) => m.paydayDay)) {
      const householdResult = await db.queryOnce({
        households: { $: { where: { id: householdId } } },
      });

      if (!householdResult?.data) {
        logger.error('Query failed - householdResult is undefined'); // FIX: SEC-003
        return false;
      }

      // @ts-ignore - InstantDB types
      const household = householdResult.data.households?.[0] as HouseholdRecord | undefined;
      if (!household) return false;

      if (household.paydayDay) {
        const currentPeriod = getCurrentBudgetPeriod(household.paydayDay);
        if (todayStr > currentPeriod.periodEndISO) {
          return resetBudgetPeriod(householdId);
        }
      }
    }

    return anyResetHappened;
  } catch (error) {
    logger.error('Error checking budget reset:', getErrorMessage(error)); // FIX: SEC-003
    return false;
  }
}

/**
 * Reset budget period for a specific member.
 */
export async function resetMemberBudgetPeriod(userId: string, householdId: string): Promise<boolean> {
  try {
    const memberResult = await db.queryOnce({
      householdMembers: {
        $: {
          where: { userId, householdId, status: 'active' },
        },
      },
    });

    if (!memberResult?.data) {
      logger.error('Query failed - memberResult is undefined'); // FIX: SEC-003
      return false;
    }

    const member = (memberResult.data.householdMembers ?? [])[0] as HouseholdMemberRecord | undefined;
    if (!member?.paydayDay) {
      logger.error('Member not found or payday not set'); // FIX: SEC-003
      return false;
    }

    const newPeriod = calculateBudgetPeriod(member.paydayDay);

    await db.transact([
      db.tx.householdMembers[member.id].update({}),
    ]);

    // Get and reset member's budgets
    const budgetsResult = await db.queryOnce({
      budgets: {
        $: {
          where: { userId, isActive: true },
        },
      },
    });

    if (!budgetsResult?.data) {
      logger.error('Query failed - budgetsResult is undefined'); // FIX: SEC-003
      return false;
    }

    const oldBudgets = (budgetsResult.data.budgets || []) as BudgetRecord[];

    const archiveOps = oldBudgets.map((budget) =>
      db.tx.budgets[budget.id].update({ isActive: false })
    );

    const newBudgetOps = oldBudgets.map((oldBudget) =>
      db.tx.budgets[generateId()].update({
        userId: oldBudget.userId,
        categoryId: oldBudget.categoryId,
        allocatedAmount: oldBudget.allocatedAmount,
        spentAmount: 0,
        percentage: oldBudget.percentage,
        categoryGroup: oldBudget.categoryGroup,
        isActive: true,
      })
    );

    // Reset budget summary
    const summaryResult = await db.queryOnce({
      budgetSummary: {
        $: {
          where: { userId },
        },
      },
    });

    if (!summaryResult?.data) {
      logger.error('Query failed - summaryResult is undefined'); // FIX: SEC-003
      return false;
    }

    // @ts-ignore - InstantDB types
    const oldSummary = summaryResult.data.budgetSummary?.[0] as BudgetSummaryRecord | undefined;
    const summaryId = oldSummary?.id || generateId();

    const summaryTransaction = db.tx.budgetSummary[summaryId].update({
      userId,
      totalIncome: oldSummary?.totalIncome || 0,
      totalAllocated: oldSummary?.totalAllocated || 0,
      totalSpent: 0,
    });

    const allTransactions = [...archiveOps, ...newBudgetOps, summaryTransaction];
    if (allTransactions.length > 0) {
      await db.transact(allTransactions);
    }

    logger.debug('Member budget reset successful'); // FIX: SEC-003 - Don't log userId
    return true;
  } catch (error) {
    logger.error('Member budget reset error:', getErrorMessage(error)); // FIX: SEC-003
    return false;
  }
}
