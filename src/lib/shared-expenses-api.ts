import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

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
 * Calculate split ratio based on incomes from budgetSummary
 * Returns array of {userId, percentage, income} for each household member
 */
export async function calculateSplitRatio(householdId: string): Promise<SplitRatio[]> {
  console.log('=== calculateSplitRatio START ===');
  console.log('Household ID:', householdId);

  // Get all active household members
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
  console.log('Found members:', members.length);

  if (members.length === 0) {
    console.log('No members found, returning empty array');
    return [];
  }

  // Get income from budgetSummary for each member
  const memberIncomes: SplitRatio[] = await Promise.all(
    members.map(async (member: any) => {
      const { data: budgetData } = await db.queryOnce({
        budgetSummary: {
          $: { where: { userId: member.userId } }
        }
      });

      // Get the most recent budget summary for this user
      const summaries = budgetData.budgetSummary || [];
      const latestSummary = summaries.sort((a: any, b: any) =>
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      )[0];

      const income = latestSummary?.totalIncome || 0;
      console.log(`Member ${member.userId}: income = ${income}`);

      return {
        userId: member.userId,
        income,
        percentage: 0 // Will be calculated below
      };
    })
  );

  // Calculate total household income
  const totalIncome = memberIncomes.reduce((sum, m) => sum + m.income, 0);
  console.log('Total household income:', totalIncome);

  // If no incomes set, split evenly
  if (totalIncome === 0) {
    const evenSplit = 100 / members.length;
    console.log('No incomes set, splitting evenly:', evenSplit, '%');
    const result = memberIncomes.map(m => ({
      ...m,
      percentage: Math.round(evenSplit * 100) / 100 // Round to 2 decimal places
    }));
    console.log('=== calculateSplitRatio END (even split) ===');
    return result;
  }

  // Calculate proportional splits
  const result = memberIncomes.map(m => ({
    ...m,
    percentage: Math.round((m.income / totalIncome) * 10000) / 100 // Round to 2 decimal places
  }));

  console.log('Calculated splits:', result);
  console.log('=== calculateSplitRatio END ===');
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
  console.log('=== createExpenseSplits START ===');
  console.log('Transaction ID:', transactionId);
  console.log('Amount:', amount);
  console.log('Household ID:', householdId);
  console.log('Paid by:', paidByUserId);

  // Get split ratios
  const splits = await calculateSplitRatio(householdId);

  if (splits.length === 0) {
    console.log('No splits calculated, returning empty array');
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
      splitAmount: Math.round((amount * split.percentage) / 100 * 100) / 100, // Round to 2 decimals
      splitPercentage: split.percentage,
      isPaid: false, // They still owe this amount
      createdAt: Date.now()
    }));

  console.log('Split records to create:', splitRecords);

  if (splitRecords.length === 0) {
    console.log('No split records to create (only one member or payer is the only member)');
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
        createdAt: record.createdAt,
      })
    )
  );

  console.log('Splits created successfully');
  console.log('=== createExpenseSplits END ===');
  return splitRecords;
}

/**
 * Delete split records for a transaction (used when transaction is deleted or un-shared)
 */
export async function deleteExpenseSplits(transactionId: string): Promise<void> {
  console.log('=== deleteExpenseSplits START ===');
  console.log('Transaction ID:', transactionId);

  const { data } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { transactionId } }
    }
  });

  const splits = data.shared_expense_splits || [];
  console.log('Found splits to delete:', splits.length);

  if (splits.length > 0) {
    await db.transact(
      splits.map((split: any) => db.tx.shared_expense_splits[split.id].delete())
    );
    console.log('Splits deleted successfully');
  }

  console.log('=== deleteExpenseSplits END ===');
}

/**
 * Mark a split as paid (settled)
 */
export async function markSplitAsPaid(splitId: string): Promise<void> {
  console.log('=== markSplitAsPaid START ===');
  console.log('Split ID:', splitId);

  await db.transact([
    db.tx.shared_expense_splits[splitId].update({
      isPaid: true,
      updatedAt: Date.now()
    })
  ]);

  console.log('Split marked as paid');
  console.log('=== markSplitAsPaid END ===');
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
  console.log('=== calculateDebtBalance START ===');
  console.log('User 1:', userId1);
  console.log('User 2:', userId2);

  // Get all unpaid splits between these two users
  const { data } = await db.queryOnce({
    shared_expense_splits: {}
  });

  const allSplits = data.shared_expense_splits || [];
  console.log('Total splits in database:', allSplits.length);

  let netBalance = 0;

  for (const split of allSplits) {
    if (split.isPaid) continue; // Skip settled splits

    // User1 owes User2
    if (split.owerUserId === userId1 && split.owedToUserId === userId2) {
      netBalance += split.splitAmount;
      console.log(`User1 owes User2: +${split.splitAmount}`);
    }
    // User2 owes User1
    else if (split.owerUserId === userId2 && split.owedToUserId === userId1) {
      netBalance -= split.splitAmount;
      console.log(`User2 owes User1: -${split.splitAmount}`);
    }
  }

  const result: DebtBalance = {
    netBalance: Math.round(netBalance * 100) / 100,
    whoOwesUserId: netBalance > 0 ? userId1 : userId2,
    whoIsOwedUserId: netBalance > 0 ? userId2 : userId1,
    amount: Math.abs(Math.round(netBalance * 100) / 100)
  };

  console.log('Debt balance result:', result);
  console.log('=== calculateDebtBalance END ===');
  return result;
}

/**
 * Get all unpaid splits for a user (what they owe others)
 */
export async function getUnpaidSplitsForUser(userId: string): Promise<any[]> {
  console.log('=== getUnpaidSplitsForUser START ===');
  console.log('User ID:', userId);

  const { data } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { owerUserId: userId, isPaid: false } }
    }
  });

  const splits = data.shared_expense_splits || [];
  console.log('Found unpaid splits:', splits.length);
  console.log('=== getUnpaidSplitsForUser END ===');
  return splits;
}

/**
 * Get all unpaid splits owed TO a user (what others owe them)
 */
export async function getUnpaidSplitsOwedToUser(userId: string): Promise<any[]> {
  console.log('=== getUnpaidSplitsOwedToUser START ===');
  console.log('User ID:', userId);

  const { data } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { owedToUserId: userId, isPaid: false } }
    }
  });

  const splits = data.shared_expense_splits || [];
  console.log('Found unpaid splits owed to user:', splits.length);
  console.log('=== getUnpaidSplitsOwedToUser END ===');
  return splits;
}

/**
 * Get splits for a specific transaction
 */
export async function getSplitsForTransaction(transactionId: string): Promise<any[]> {
  console.log('=== getSplitsForTransaction START ===');
  console.log('Transaction ID:', transactionId);

  const { data } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { transactionId } }
    }
  });

  const splits = data.shared_expense_splits || [];
  console.log('Found splits:', splits.length);
  console.log('=== getSplitsForTransaction END ===');
  return splits;
}

/**
 * Helper: Get household ID for a user
 */
export async function getUserHouseholdId(userId: string): Promise<string | null> {
  const { data } = await db.queryOnce({
    householdMembers: {
      $: { where: { userId, status: 'active' } }
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
      $: { where: { householdId, status: 'active' } }
    }
  });

  const members = data.householdMembers || [];
  const otherMember = members.find((m: any) => m.userId !== userId);
  return otherMember?.userId || null;
}
