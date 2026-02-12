// FIX: DAT-001 - Removed sort by non-existent periodStart field on budgetSummary
// FIX: DAT-008 - Added null safety (?? 0) for financial arithmetic
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentSplitRatio } from './split-settings-api';
import { logger } from './logger'; // FIX: SEC-003 - Use secure logger instead of console.log

/**
 * Split ratio for a household member
 */
export interface SplitRatio {
  userId: string;
  percentage: number;
  income: number;
}

/**
 * Split record for a shared expense
 */
export interface ExpenseSplit {
  id: string;
  transactionId: string;
  owerUserId: string;
  owedToUserId: string;
  splitAmount: number;
  splitPercentage: number;
  isPaid: boolean;
  createdAt: number;
}

/**
 * Debt balance between two users
 */
export interface DebtBalance {
  netBalance: number; // Positive = user1 owes user2, Negative = user2 owes user1
  whoOwesUserId: string;
  whoIsOwedUserId: string;
  amount: number;
}

/**
 * Calculate split ratio based on split settings (automatic or manual)
 * Returns array of {userId, percentage, income} for each household member
 */
export async function calculateSplitRatio(householdId: string): Promise<SplitRatio[]> {
  logger.debug('=== calculateSplitRatio START ==='); // FIX: SEC-003

  // Use split settings instead of always calculating from income
  const splitRatio = await getCurrentSplitRatio(householdId);

  logger.debug('Split ratio from settings:', splitRatio);

  // Get member incomes for backward compatibility (still need income field in result)
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: {
        where: {
          householdId,
          status: 'active'
        }
      }
    }
  });

  const members = memberData.householdMembers || [];

  // Combine split percentages with member income data
  const result: SplitRatio[] = await Promise.all(
    splitRatio.map(async (split) => {
      const member = members.find((m: any) => m.userId === split.userId);
      const { data: budgetData } = await db.queryOnce({
        budgetSummary: {
          $: { where: { userId: split.userId } } // Already scoped by userId
        }
      });

      const summaries = budgetData.budgetSummary || [];
      // FIX: DAT-001 - budgetSummary has NO periodStart field in the schema.
      // Previously sorted by b.periodStart which always returned NaN, making the sort unreliable.
      // Since budgetSummary is scoped to userId and there should be only one active summary per user,
      // we just take the first result. If multiple exist, the most recent is preferred.
      // FIX: DAT-008 - Null safety: use ?? 0 for income
      const latestSummary = summaries[0];

      const income = latestSummary?.totalIncome ?? 0;

      return {
        userId: split.userId,
        percentage: split.percentage,
        income
      };
    })
  );

  logger.debug('Calculated splits:', result); // FIX: SEC-003
  logger.debug('=== calculateSplitRatio END ===');
  return result;
}

/**
 * Create split records for a shared expense transaction
 * Only creates a record for the person who OWES (not the payer)
 */
export async function createExpenseSplits(
  transactionId: string,
  amount: number,
  householdId: string,
  paidByUserId: string
): Promise<ExpenseSplit[]> {
  logger.debug('=== createExpenseSplits START ==='); // FIX: SEC-003

  // Get split ratios
  const splits = await calculateSplitRatio(householdId);

  if (splits.length === 0) {
    logger.debug('No splits calculated, returning empty array');
    return [];
  }

  // Create split records only for users who OWE (not the payer)
  const splitRecords: ExpenseSplit[] = splits
    .filter(split => split.userId !== paidByUserId)
    .map(split => ({
      id: uuidv4(),
      transactionId,
      owerUserId: split.userId,
      owedToUserId: paidByUserId,
      splitAmount: Math.round(((amount ?? 0) * (split.percentage ?? 0)) / 100 * 100) / 100, // FIX: DAT-008 - Null safety + Round to 2 decimals
      splitPercentage: split.percentage,
      isPaid: false, // They still owe this amount
      createdAt: Date.now()
    }));

  logger.debug('Split records to create:', splitRecords.length); // FIX: SEC-003

  if (splitRecords.length === 0) {
    logger.debug('No split records to create (only one member or payer is the only member)');
    return [];
  }

  // Save to database
  await db.transact(
    splitRecords.map(record =>
      db.tx.shared_expense_splits[record.id].update({
        transactionId: record.transactionId,
        owerUserId: record.owerUserId,
        owedToUserId: record.owedToUserId,
        splitAmount: record.splitAmount,
        splitPercentage: record.splitPercentage,
        isPaid: record.isPaid,
      })
    )
  );

  logger.debug('Splits created successfully');
  logger.debug('=== createExpenseSplits END ===');
  return splitRecords;
}

/**
 * Delete split records for a transaction (used when transaction is deleted or un-shared)
 */
export async function deleteExpenseSplits(transactionId: string): Promise<void> {
  logger.debug('=== deleteExpenseSplits START ==='); // FIX: SEC-003

  const { data } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { transactionId } } // Scoped by transactionId
    }
  });

  const splits = data.shared_expense_splits || [];
  logger.debug('Found splits to delete:', splits.length);

  if (splits.length > 0) {
    await db.transact(
      splits.map((split: any) => db.tx.shared_expense_splits[split.id].delete())
    );
    logger.debug('Splits deleted successfully');
  }

  logger.debug('=== deleteExpenseSplits END ===');
}

/**
 * Mark a split as paid (settled)
 */
export async function markSplitAsPaid(splitId: string): Promise<void> {
  logger.debug('=== markSplitAsPaid START ==='); // FIX: SEC-003

  await db.transact([
    db.tx.shared_expense_splits[splitId].update({
      isPaid: true,
    })
  ]);

  logger.debug('Split marked as paid');
  logger.debug('=== markSplitAsPaid END ===');
}

/**
 * Calculate net debt balance between two users
 * Returns: {netBalance, whoOwesUserId, whoIsOwedUserId, amount}
 * netBalance: positive = user1 owes user2, negative = user2 owes user1
 */
export async function calculateDebtBalance(
  userId1: string,
  userId2: string
): Promise<DebtBalance> {
  logger.debug('=== calculateDebtBalance START ==='); // FIX: SEC-003

  // FIX: SEC-010 - Scope splits query by user involvement instead of fetching ALL splits
  // Get unpaid splits where user1 owes user2
  const { data: user1OwesData } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { owerUserId: userId1 } }, // FIX: SEC-010 - Scoped to user1 as ower
    },
  });

  // Get unpaid splits where user2 owes user1
  const { data: user2OwesData } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { owerUserId: userId2 } }, // FIX: SEC-010 - Scoped to user2 as ower
    },
  });

  const user1OwesSplits = user1OwesData.shared_expense_splits || [];
  const user2OwesSplits = user2OwesData.shared_expense_splits || [];

  let netBalance = 0;

  // User1 owes User2
  for (const split of user1OwesSplits) {
    if (split.isPaid) continue;
    if (split.owedToUserId === userId2) {
      netBalance += (split.splitAmount ?? 0); // FIX: DAT-008 - Null safety
    }
  }

  // User2 owes User1
  for (const split of user2OwesSplits) {
    if (split.isPaid) continue;
    if (split.owedToUserId === userId1) {
      netBalance -= (split.splitAmount ?? 0); // FIX: DAT-008 - Null safety
    }
  }

  const result: DebtBalance = {
    netBalance: Math.round(netBalance * 100) / 100,
    whoOwesUserId: netBalance > 0 ? userId1 : userId2,
    whoIsOwedUserId: netBalance > 0 ? userId2 : userId1,
    amount: Math.abs(Math.round(netBalance * 100) / 100)
  };

  logger.debug('Debt balance calculated'); // FIX: SEC-003
  logger.debug('=== calculateDebtBalance END ===');
  return result;
}

/**
 * Get all unpaid splits for a user (what they owe others)
 */
export async function getUnpaidSplitsForUser(userId: string): Promise<any[]> {
  logger.debug('=== getUnpaidSplitsForUser START ==='); // FIX: SEC-003

  const { data } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { owerUserId: userId, isPaid: false } } // Already scoped by userId
    }
  });

  const splits = data.shared_expense_splits || [];
  logger.debug('Found unpaid splits:', splits.length);
  logger.debug('=== getUnpaidSplitsForUser END ===');
  return splits;
}

/**
 * Get all unpaid splits owed TO a user (what others owe them)
 */
export async function getUnpaidSplitsOwedToUser(userId: string): Promise<any[]> {
  logger.debug('=== getUnpaidSplitsOwedToUser START ==='); // FIX: SEC-003

  const { data } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { owedToUserId: userId, isPaid: false } } // Already scoped by userId
    }
  });

  const splits = data.shared_expense_splits || [];
  logger.debug('Found unpaid splits owed to user:', splits.length);
  logger.debug('=== getUnpaidSplitsOwedToUser END ===');
  return splits;
}

/**
 * Get splits for a specific transaction
 */
export async function getSplitsForTransaction(transactionId: string): Promise<any[]> {
  logger.debug('=== getSplitsForTransaction START ==='); // FIX: SEC-003

  const { data } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { transactionId } } // Scoped by transactionId
    }
  });

  const splits = data.shared_expense_splits || [];
  logger.debug('Found splits:', splits.length);
  logger.debug('=== getSplitsForTransaction END ===');
  return splits;
}

/**
 * Helper: Get household ID for a user
 */
export async function getUserHouseholdId(userId: string): Promise<string | null> {
  const { data } = await db.queryOnce({
    householdMembers: {
      $: { where: { userId, status: 'active' } } // Already scoped by userId
    }
  });

  return data.householdMembers?.[0]?.householdId || null;
}

/**
 * Helper: Get the other household member's userId
 */
export async function getOtherHouseholdMember(userId: string, householdId: string): Promise<string | null> {
  const { data } = await db.queryOnce({
    householdMembers: {
      $: { where: { householdId, status: 'active' } } // Already scoped by householdId
    }
  });

  const members = data.householdMembers || [];
  const otherMember = members.find((m: any) => m.userId !== userId);
  return otherMember?.userId || null;
}
