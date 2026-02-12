// FIX: CQP-006/ARCH-1 - Shared API functions extracted to break circular dependency
// between transactions-api.ts and budget-api.ts.
//
// Both modules previously imported from each other:
//   transactions-api -> budget-api (updateBudgetSpentAmount, getMemberBudgetPeriod)
//   budget-api -> (no direct import, but settlement-api dynamically imports budget-api)
//
// This module extracts the budget-update functions that transactions-api needs,
// so transactions-api imports from shared-api instead of budget-api.

import { db } from './db';
import { getCurrentBudgetPeriod } from './budget-period-utils';
import { logger } from './logger'; // FIX: SEC-003 - Secure logger
import type {
  BudgetPeriod,
  AccountRecord,
  BudgetRecord,
  BudgetSummaryRecord,
  HouseholdMemberRecord,
  HouseholdRecord,
} from '../types/api';
import { DataIntegrityError, getErrorMessage } from '../types/errors';

/**
 * Get user's personal budget period from their household membership.
 *
 * IMPORTANT: This ALWAYS calculates the period dynamically from paydayDay.
 * The period is NOT retrieved from stored values - it's computed based on:
 * - Today's date
 * - User's paydayDay setting
 *
 * This ensures:
 * 1. Period dates are always correct
 * 2. Changing payday doesn't cause weird resets
 * 3. On payday, period automatically shifts forward
 */
export async function getMemberBudgetPeriod(
  userId: string,
  householdId: string
): Promise<BudgetPeriod> {
  // FIX: CODE-2 - Replaced `any` with proper types in query results
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

  // @ts-ignore - InstantDB types not aligned with our schema
  const members = (memberResult.data.householdMembers ?? []) as HouseholdMemberRecord[];
  const member = members[0];

  // If member has payday set, use dynamic calculation
  if (member?.paydayDay) {
    const paydayDay = member.paydayDay;
    const dynamicPeriod = getCurrentBudgetPeriod(paydayDay);

    logger.debug('getMemberBudgetPeriod - Dynamic calculation'); // FIX: SEC-003 - Don't log payday or period details

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

  // @ts-ignore - InstantDB types not aligned with our schema
  const households = (householdResult.data.households ?? []) as HouseholdRecord[];
  const household = households[0];
  const paydayDay = household?.paydayDay ?? 25;
  const dynamicPeriod = getCurrentBudgetPeriod(paydayDay);

  logger.debug('getMemberBudgetPeriod - Fallback to household'); // FIX: SEC-003 - Don't log payday or period details

  return {
    start: dynamicPeriod.periodStartISO,
    end: dynamicPeriod.periodEndISO,
    paydayDay,
    source: 'household',
    daysRemaining: dynamicPeriod.daysRemaining,
  };
}

/**
 * Update spent amount for a category in budget.
 * Called when a transaction is added, edited, or deleted.
 * Fires asynchronously - does not block the calling operation.
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

/**
 * Internal: performs the actual budget spent amount update.
 * Queries all active budgets for the user, updates the specific category's
 * spent amount, and recalculates the budget summary totals.
 */
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

    // FIX: CODE-2 - Replaced `any` with proper types
    // @ts-ignore - InstantDB types not aligned with our schema
    const budgets = (result.data.budgets || []) as BudgetRecord[];
    const budget = budgets.find((b) => b.categoryId === categoryId);
    // @ts-ignore - InstantDB types not aligned with our schema
    const summaryArr = (result.data.budgetSummary ?? []) as BudgetSummaryRecord[];
    const summary = summaryArr[0];
    // @ts-ignore - InstantDB types not aligned with our schema
    const accounts = (result.data.accounts || []) as AccountRecord[];

    // Create a set of excluded account IDs for quick lookup
    const excludedAccountIds = new Set(
      accounts
        .filter((acc) => acc.isExcludedFromBudget === true)
        .map((acc) => acc.id)
    );

    if (!budget) {
      logger.warn('Budget not found for category in period'); // FIX: SEC-003 - Don't log userId, categoryId, or periodStart
      return;
    }

    // Calculate totals including the new spent amount
    let totalSpent = 0;
    const spentByGroup: Record<string, number> = {};

    budgets.forEach((b) => {
      // Use the new spentAmount for the updated category
      const spent =
        b.categoryId === categoryId
          ? Math.max(0, spentAmount)
          : b.spentAmount || 0;
      totalSpent += spent;

      const groupKey = b.categoryGroup || 'other';
      if (!spentByGroup[groupKey]) {
        spentByGroup[groupKey] = 0;
      }
      spentByGroup[groupKey] += spent;
    });

    // Single transaction to update both budget and summary
    // FIX: CODE-2 - Typed the operations array
    const ops: ReturnType<typeof db.tx.budgets[string]['update']>[] = [
      db.tx.budgets[budget.id].update({
        spentAmount: Math.max(0, spentAmount),
      }),
    ];

    if (summary) {
      ops.push(
        db.tx.budgetSummary[summary.id].update({
          totalSpent,
        })
      );
    }

    await db.transact(ops);
  } catch (error) {
    // FIX: CODE-4 - Use getErrorMessage for consistent error logging
    logger.error('Update budget spent amount error:', getErrorMessage(error)); // FIX: SEC-003
  }
}
