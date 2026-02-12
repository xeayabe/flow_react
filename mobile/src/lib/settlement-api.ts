// FIX: SEC-001 - Scoped accounts query in createSettlement
// FIX: SEC-002 - Scoped users queries via household member lookup
// FIX: SEC-003 - Replaced console.log/error/warn with secure logger
// FIX: SEC-010 - Scoped shared_expense_splits queries by user involvement
// FIX: DAT-003 - Atomic settlement operations (from other agent)
// FIX: DAT-008 - Null safety for financial arithmetic (from other agent)
// FIX: CODE-6 - Decomposed into clear phases (from other agent)

import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger'; // FIX: SEC-003 - Secure logger

/**
 * Unsettled shared expense with details
 */
export interface UnsettledExpense {
  id: string;
  transactionId: string;
  date: string;
  category: string;
  categoryId: string;
  totalAmount: number;
  yourShare: number;
  paidBy: string;
  paidByUserId: string;
  description: string;
  splitId: string;
  createdByUserId: string; // Track who created the transaction for privacy
  payee: string; // NEW: Payee from original transaction
}

/**
 * Summary of debt between household members
 */
export interface DebtSummary {
  amount: number; // positive = you owe, negative = you're owed
  otherMemberId: string;
  otherMemberName: string;
  otherMemberEmail: string;
}

/**
 * FIX: SEC-002 - Helper to get user details via household member lookup
 * Instead of fetching ALL users, fetches household members first then users by ID
 */
async function getHouseholdUserMap(householdId: string): Promise<Map<string, any>> {
  // Get household members (scoped by householdId)
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { householdId, status: 'active' } }, // FIX: SEC-002 - Scoped
    },
  });

  const members = memberData.householdMembers || [];
  const userMap = new Map<string, any>();

  // Fetch each user by their ID individually
  for (const member of members) {
    const { data: userData } = await db.queryOnce({
      users: {
        $: { where: { id: member.userId } }, // FIX: SEC-002 - Scoped by id
      },
    });
    const user = userData.users?.[0];
    if (user) {
      userMap.set(user.id, user);
    }
  }

  return userMap;
}

/**
 * FIX: SEC-010 - Helper to get splits for household transactions
 * Instead of fetching ALL splits, fetches by owerUserId and owedToUserId
 */
async function getHouseholdSplits(
  transactionIds: string[],
  userId1: string,
  userId2: string
): Promise<any[]> {
  // FIX: SEC-010 - Fetch splits scoped by user involvement
  const { data: owerData1 } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { owerUserId: userId1 } }, // FIX: SEC-010 - Scoped
    },
  });

  const { data: owerData2 } = await db.queryOnce({
    shared_expense_splits: {
      $: { where: { owerUserId: userId2 } }, // FIX: SEC-010 - Scoped
    },
  });

  const allRelevantSplits = [
    ...(owerData1.shared_expense_splits || []),
    ...(owerData2.shared_expense_splits || []),
  ];

  // Deduplicate by id and filter to household transactions
  const seenIds = new Set<string>();
  return allRelevantSplits.filter((s: any) => {
    if (seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return transactionIds.includes(s.transactionId);
  });
}

/**
 * Get ALL unsettled shared expenses for the current user in a household
 */
export async function getUnsettledSharedExpenses(
  householdId: string,
  currentUserId: string
): Promise<UnsettledExpense[]> {
  logger.debug('=== getUnsettledSharedExpenses START ==='); // FIX: SEC-003

  // Get all shared transactions for this household
  const { data: txData } = await db.queryOnce({
    transactions: {
      $: {
        where: {
          householdId,
          isShared: true,
        },
      },
    },
  });

  const allTransactions = txData.transactions || [];
  // DON'T filter by transaction.settled - we only care about split.isPaid
  // The transaction.settled flag is just for tracking, splits are the source of truth
  const transactions = allTransactions;
  logger.debug('Found shared transactions:', transactions.length); // FIX: SEC-003

  if (transactions.length === 0) {
    logger.debug('No shared transactions found'); // FIX: SEC-003
    return [];
  }

  // FIX: SEC-002 - Get household members to find the other user
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { householdId, status: 'active' } }, // FIX: SEC-002 - Scoped
    },
  });
  const members = memberData.householdMembers || [];
  const otherMember = members.find((m: any) => m.userId !== currentUserId);
  const otherUserId = otherMember?.userId || '';

  // Create transaction map for quick lookup
  const transactionMap = new Map(transactions.map((t: any) => [t.id, t]));
  const transactionIds = transactions.map((t: any) => t.id);

  // FIX: SEC-010 - Get splits scoped by user involvement instead of all splits
  const householdSplits = await getHouseholdSplits(transactionIds, currentUserId, otherUserId);
  logger.debug('Household splits:', householdSplits.length); // FIX: SEC-003

  // Get categories for display
  const { data: categoryData } = await db.queryOnce({
    categories: {
      $: { where: { householdId } },
    },
  });
  const categories = categoryData.categories || [];
  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));

  // FIX: SEC-002 - Get users via household member lookup instead of fetching ALL users
  const userMap = await getHouseholdUserMap(householdId);

  // Find unpaid splits where current user owes money OR is owed money
  const unsettledExpenses: UnsettledExpense[] = [];

  for (const split of householdSplits) {
    if (split.isPaid) {
      continue; // Skip settled splits
    }

    const transaction = transactionMap.get(split.transactionId);
    if (!transaction) {
      continue;
    }

    // Check if current user is involved in this split
    const currentUserOwes = split.owerUserId === currentUserId;
    const currentUserIsOwed = split.owedToUserId === currentUserId;

    if (!currentUserOwes && !currentUserIsOwed) {
      continue;
    }

    const category = categoryMap.get(transaction.categoryId);
    const paidByUser = userMap.get(transaction.paidByUserId);

    unsettledExpenses.push({
      id: split.id,
      transactionId: transaction.id,
      splitId: split.id,
      date: transaction.date,
      category: category?.name || 'Unknown',
      categoryId: transaction.categoryId,
      // FIX: DAT-008 - Null safety for financial arithmetic
      totalAmount: transaction.amount ?? 0,
      yourShare: currentUserOwes ? (split.splitAmount ?? 0) : -(split.splitAmount ?? 0),
      paidBy: paidByUser?.name || paidByUser?.email?.split('@')[0] || 'Unknown',
      paidByUserId: transaction.paidByUserId,
      description: transaction.note || transaction.payee || category?.name || 'Shared expense',
      createdByUserId: transaction.userId, // Track who created the transaction
      payee: transaction.payee || 'Unknown', // Payee from original transaction
    });
  }

  // Sort by date (newest first)
  unsettledExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  logger.debug('Unsettled expenses for user:', unsettledExpenses.length); // FIX: SEC-003
  logger.debug('=== getUnsettledSharedExpenses END ==='); // FIX: SEC-003

  return unsettledExpenses;
}

/**
 * Calculate total household debt between current user and other member
 */
export async function calculateHouseholdDebt(
  householdId: string,
  currentUserId: string
): Promise<DebtSummary | null> {
  logger.debug('=== calculateHouseholdDebt START ==='); // FIX: SEC-003

  // Get other household member
  const { data: memberData } = await db.queryOnce({
    householdMembers: {
      $: { where: { householdId, status: 'active' } },
    },
  });

  const members = memberData.householdMembers || [];
  const otherMember = members.find((m: any) => m.userId !== currentUserId);

  if (!otherMember) {
    logger.debug('No other member found in household'); // FIX: SEC-003
    return null;
  }

  const otherUserId = otherMember.userId;

  // FIX: SEC-002 - Get other member's user details by ID, not fetching ALL users
  const { data: userData } = await db.queryOnce({
    users: {
      $: { where: { id: otherUserId } }, // FIX: SEC-002 - Scoped by id
    },
  });

  const otherUser = userData.users?.[0];

  // Get all unsettled expenses
  const unsettledExpenses = await getUnsettledSharedExpenses(householdId, currentUserId);

  // Calculate net debt
  let totalDebt = 0;
  for (const expense of unsettledExpenses) {
    totalDebt += expense.yourShare;
  }

  // Round to 2 decimal places
  totalDebt = Math.round(totalDebt * 100) / 100;

  logger.debug('Debt calculation completed'); // FIX: SEC-003 - Don't log debt amount
  logger.debug('=== calculateHouseholdDebt END ==='); // FIX: SEC-003

  return {
    amount: totalDebt,
    otherMemberId: otherUserId,
    otherMemberName: otherUser?.name || otherUser?.email?.split('@')[0] || 'Unknown',
    otherMemberEmail: otherUser?.email || '',
  };
}

/**
 * Get all unsettled expenses grouped by who owes whom
 */
export async function getUnsettledExpensesByDirection(
  householdId: string,
  currentUserId: string
): Promise<{
  youOwe: UnsettledExpense[];
  youAreOwed: UnsettledExpense[];
  totalYouOwe: number;
  totalYouAreOwed: number;
  netDebt: number;
}> {
  const allExpenses = await getUnsettledSharedExpenses(householdId, currentUserId);

  const youOwe = allExpenses.filter((e) => e.yourShare > 0);
  const youAreOwed = allExpenses.filter((e) => e.yourShare < 0);

  const totalYouOwe = youOwe.reduce((sum, e) => sum + e.yourShare, 0);
  const totalYouAreOwed = Math.abs(youAreOwed.reduce((sum, e) => sum + e.yourShare, 0));
  const netDebt = totalYouOwe - totalYouAreOwed;

  return {
    youOwe,
    youAreOwed,
    totalYouOwe: Math.round(totalYouOwe * 100) / 100,
    totalYouAreOwed: Math.round(totalYouAreOwed * 100) / 100,
    netDebt: Math.round(netDebt * 100) / 100,
  };
}

/**
 * Debug function to check splits and transactions state
 */
export async function debugSettlementData(householdId: string, payerUserId: string, receiverUserId: string) {
  logger.debug('=== DEBUG SETTLEMENT DATA ==='); // FIX: SEC-003

  const { data: txData } = await db.queryOnce({
    transactions: {
      $: { where: { householdId, isShared: true } }
    }
  });

  const transactions = txData.transactions || [];
  logger.debug('Shared transactions:', transactions.length); // FIX: SEC-003

  // FIX: SEC-010 - Scope splits by user involvement instead of fetching ALL
  const txIds = transactions.map((t: any) => t.id);
  const householdSplits = await getHouseholdSplits(txIds, payerUserId, receiverUserId);
  logger.debug('Household splits:', householdSplits.length); // FIX: SEC-003

  const payerSplits = householdSplits.filter((s: any) => s.owerUserId === payerUserId && !s.isPaid);
  logger.debug('Payer unpaid splits:', payerSplits.length); // FIX: SEC-003

  return {
    transactions,
    allSplits: householdSplits,
    householdSplits,
    payerSplits,
    payerUserId,
    receiverUserId
  };
}

/**
 * Settle debt via internal account transfer
 * Does NOT create a budget-affecting transaction for the receiver.
 * Only transfers money between accounts and marks splits as paid.
 *
 * FIX: DAT-003 CRITICAL - All settlement operations consolidated into a SINGLE
 * atomic db.transact() call. The original code used 7+ separate db.transact() calls,
 * meaning if any call failed mid-way, data would be corrupted (e.g., splits marked
 * paid but account balances not updated, or balances updated but settlement record
 * not created). Now everything is ALL-or-NOTHING.
 *
 * FIX: CODE-6 - Original 380+ line createSettlement function decomposed into
 * 4 clear phases: (1) gather data, (2) build atomic operations,
 * (3) execute atomically, (4) best-effort budget updates.
 *
 * FIX: SEC-001 - Accounts fetched by specific ID with ownership verification
 * FIX: SEC-010 - Splits fetched by user involvement, not globally
 */
export async function createSettlement(
  payerUserId: string,
  receiverUserId: string,
  amount: number,
  payerAccountId: string,
  receiverAccountId: string,
  householdId: string,
  categoryId?: string,
  selectedSplitIds?: string[],
  payee?: string
) {
  logger.debug('=== SETTLEMENT START (ATOMIC) ==='); // FIX: SEC-003 - Don't log user IDs or amounts

  // FIX: DAT-008 - Null safety for financial arithmetic
  const safeAmount = amount ?? 0;
  if (safeAmount <= 0) {
    throw new Error('Settlement amount must be greater than 0');
  }

  const settlementId = uuidv4();
  const now = Date.now();

  // ===================================================================
  // PHASE 1: Gather all data needed for the atomic transaction
  // ===================================================================

  // FIX: SEC-001 - Fetch accounts by specific ID instead of ALL accounts
  const { data: payerAccountData } = await db.queryOnce({
    accounts: {
      $: { where: { id: payerAccountId } }, // FIX: SEC-001 - Scoped by id
    },
  });

  const { data: receiverAccountData } = await db.queryOnce({
    accounts: {
      $: { where: { id: receiverAccountId } }, // FIX: SEC-001 - Scoped by id
    },
  });

  const payerAccount = payerAccountData.accounts?.[0];
  const receiverAccount = receiverAccountData.accounts?.[0];

  if (!payerAccount || !receiverAccount) {
    throw new Error('Account not found');
  }

  // FIX: SEC-001 - Verify account ownership before proceeding
  if (payerAccount.userId !== payerUserId) {
    throw new Error('Payer account does not belong to the payer'); // FIX: SEC-001
  }
  if (receiverAccount.userId !== receiverUserId) {
    throw new Error('Receiver account does not belong to the receiver'); // FIX: SEC-001
  }

  // FIX: DAT-008 - Null safety for account balances
  const payerBalance = payerAccount.balance ?? 0;
  const receiverBalance = receiverAccount.balance ?? 0;

  // FIX: DAT-003 - Calculate new balances (applied atomically later)
  const newPayerBalance = payerBalance - safeAmount;
  const newReceiverBalance = receiverBalance + safeAmount;

  // Step 2: Find all splits to settle
  const { data: txData } = await db.queryOnce({
    transactions: {
      $: { where: { householdId, isShared: true } },
    },
  });

  const householdTransactions = txData.transactions || [];
  const householdTransactionIds = householdTransactions.map((t: any) => t.id);
  const transactionMap = new Map(householdTransactions.map((t: any) => [t.id, t]));

  // FIX: SEC-010 - Get splits scoped by user involvement
  const allSplits = await getHouseholdSplits(householdTransactionIds, payerUserId, receiverUserId);

  // Filter to household splits, unpaid, payer owes receiver
  let splitsToSettle = allSplits.filter((s: any) =>
    householdTransactionIds.includes(s.transactionId) &&
    s.owerUserId === payerUserId &&
    !s.isPaid &&
    s.owedToUserId === receiverUserId
  );

  // If specific splits selected, filter further
  if (selectedSplitIds && selectedSplitIds.length > 0) {
    splitsToSettle = splitsToSettle.filter((split: any) => selectedSplitIds.includes(split.id));
  }

  logger.debug('Splits to settle:', splitsToSettle.length); // FIX: SEC-003

  // Step 3: Calculate transaction amount reductions
  const transactionReductions: { [txId: string]: number } = {};
  for (const split of splitsToSettle) {
    const txId = split.transactionId;
    if (!transactionReductions[txId]) {
      transactionReductions[txId] = 0;
    }
    // FIX: DAT-008 - Null safety for split amounts
    transactionReductions[txId] += split.splitAmount ?? 0;
  }

  // Get fresh transaction data for reductions
  const transactionIds = Object.keys(transactionReductions);
  const { data: freshTxData } = await db.queryOnce({
    transactions: {
      $: { where: { householdId } },
    },
  });

  const allFreshTransactions = freshTxData.transactions || [];
  const transactionsToUpdate = allFreshTransactions.filter((t: any) => transactionIds.includes(t.id));

  // Step 4: Pre-calculate which transactions will be fully settled
  // A transaction is fully settled when ALL its splits are paid after this operation
  const txSettledStatus: Map<string, boolean> = new Map();
  for (const tx of transactionsToUpdate) {
    const txSplits = allSplits.filter((s: any) => s.transactionId === tx.id);
    const settlingIds = new Set(
      splitsToSettle.filter((s: any) => s.transactionId === tx.id).map((s: any) => s.id)
    );
    const allPaidAfter = txSplits.length > 0 && txSplits.every((s: any) =>
      s.isPaid || settlingIds.has(s.id)
    );
    txSettledStatus.set(tx.id, allPaidAfter);
  }

  // ===================================================================
  // PHASE 2: Build ALL operations for a SINGLE atomic db.transact()
  // FIX: DAT-003 - CRITICAL: Everything in ONE call, ALL-or-NOTHING
  // ===================================================================
  const atomicOps: any[] = [];

  // Op 1: Update payer account balance
  // FIX: DAT-003 - Atomic balance update (was separate transact call)
  atomicOps.push(
    db.tx.accounts[payerAccountId].update({
      balance: newPayerBalance,
    })
  );

  // Op 2: Update receiver account balance
  // FIX: DAT-003 - Atomic balance update (was separate transact call)
  atomicOps.push(
    db.tx.accounts[receiverAccountId].update({
      balance: newReceiverBalance,
    })
  );

  // Op 3: Create settlement record (with transaction IDs populated immediately)
  // FIX: DAT-003 - Settlement record created atomically with settledExpenses populated
  // (was created empty then updated in a separate call)
  const settledTxIds = transactionsToUpdate.map((t: any) => t.id);
  atomicOps.push(
    db.tx.settlements[settlementId].update({
      householdId,
      payerUserId,
      receiverUserId,
      amount: safeAmount,
      paymentMethod: 'internal_transfer',
      categoryId: categoryId || undefined,
      note: `Debt settlement: ${safeAmount.toFixed(2)} CHF`,
      settledExpenses: settledTxIds,
      settledAt: now,
      createdAt: now,
    })
  );

  // Op 4: Create payer transaction if category provided
  // FIX: DAT-003 - Payer transaction created atomically (was separate transact call)
  if (categoryId) {
    const payerTransactionId = uuidv4();
    const todayDate = new Date().toISOString().split('T')[0];
    atomicOps.push(
      db.tx.transactions[payerTransactionId].update({
        userId: payerUserId,
        householdId,
        accountId: payerAccountId,
        categoryId: categoryId,
        type: 'expense',
        amount: safeAmount,
        date: todayDate,
        note: `Debt settlement - paid to household`,
        payee: payee || 'Debt Settlement',
        isShared: false,
        paidByUserId: payerUserId,
      })
    );
  }

  // Op 5: Mark all splits as paid
  // FIX: DAT-003 - Split updates in same atomic transaction (was separate transact call)
  for (const split of splitsToSettle) {
    atomicOps.push(
      db.tx.shared_expense_splits[split.id].update({
        isPaid: true,
      })
    );
  }

  // Op 6: Reduce transaction amounts and mark fully settled ones
  // FIX: DAT-003 - Transaction updates in same atomic transaction (were 3+ separate calls)
  for (const tx of transactionsToUpdate) {
    // FIX: DAT-008 - Null safety for transaction amounts
    const currentAmount = tx.amount ?? 0;
    const reductionAmount = transactionReductions[tx.id] ?? 0;
    const newAmount = Math.max(0, currentAmount - reductionAmount);
    const isFullySettled = txSettledStatus.get(tx.id) || false;

    const updatePayload: any = {
      amount: newAmount,
    };

    if (isFullySettled) {
      updatePayload.settled = true;
      updatePayload.settledAt = now;
      updatePayload.settlementId = settlementId;
    }

    atomicOps.push(
      db.tx.transactions[tx.id].update(updatePayload)
    );
  }

  // ===================================================================
  // PHASE 3: Execute ALL operations atomically
  // FIX: DAT-003 - SINGLE db.transact() for entire settlement
  // Previously: 7+ separate db.transact() calls
  // Now: 1 atomic call - if ANY operation fails, NONE are applied
  // ===================================================================
  logger.debug(`Executing ${atomicOps.length} operations in single atomic transaction`); // FIX: SEC-003
  await db.transact(atomicOps);
  logger.debug('Atomic settlement transaction committed successfully'); // FIX: SEC-003

  // ===================================================================
  // PHASE 4: Post-settlement budget updates (best-effort, non-critical)
  // Budget updates are intentionally OUTSIDE the atomic transaction:
  // 1. They are supplementary display data, not financial transfers
  // 2. A budget update failure should NOT roll back a successful settlement
  // 3. Budget spent amounts can always be recalculated from transactions
  // ===================================================================
  logger.debug('Updating budget spent amounts (best-effort)'); // FIX: SEC-003
  for (const tx of transactionsToUpdate) {
    const reductionAmount = transactionReductions[tx.id] ?? 0;
    if (tx.type === 'expense' && reductionAmount > 0) {
      try {
        const { updateBudgetSpentAmount, getMemberBudgetPeriod } = await import('./budget-api');
        const budgetPeriod = await getMemberBudgetPeriod(tx.userId, tx.householdId);

        if (tx.date >= budgetPeriod.start && tx.date <= budgetPeriod.end) {
          const { data: budgetData } = await db.queryOnce({
            budgets: {
              $: {
                where: {
                  userId: tx.userId,
                  categoryId: tx.categoryId,
                  isActive: true,
                },
              },
            },
          });

          const budget = budgetData.budgets?.[0];
          if (budget) {
            // FIX: DAT-008 - Null safety for budget spent amount
            const currentSpent = budget.spentAmount ?? 0;
            const newSpentAmount = Math.max(0, currentSpent - reductionAmount);
            await updateBudgetSpentAmount(tx.userId, tx.categoryId, budgetPeriod.start, newSpentAmount);
          }
        }
      } catch (error) {
        logger.warn('Budget update failed (non-critical):', error); // FIX: SEC-003
      }
    }
  }

  logger.debug('=== SETTLEMENT COMPLETE ==='); // FIX: SEC-003

  return {
    settlementId,
    amount: safeAmount,
    newPayerBalance,
    newReceiverBalance,
    splitsSettled: splitsToSettle.length,
  };
}

/**
 * Get settlement history for household
 */
export async function getSettlementHistory(householdId: string) {
  try {
    const { data } = await db.queryOnce({
      settlements: {
        $: {
          where: { householdId },
        },
      },
    });

    const settlements = data.settlements || [];

    // FIX: SEC-002 - Get users via household member lookup instead of fetching ALL users
    const userMap = await getHouseholdUserMap(householdId);

    return settlements.map((settlement: any) => {
      const payer = userMap.get(settlement.payerUserId);
      const receiver = userMap.get(settlement.receiverUserId);
      return {
        ...settlement,
        payerName: payer?.name || 'Unknown',
        receiverName: receiver?.name || 'Unknown',
      };
    });
  } catch (error) {
    logger.error('Get settlement history error:', error); // FIX: SEC-003
    return [];
  }
}

/**
 * Cleanup old settlement transactions that were created by the previous approach
 */
export async function cleanupOldSettlementTransactions(householdId: string) {
  logger.debug('=== CLEANUP OLD SETTLEMENT TRANSACTIONS ==='); // FIX: SEC-003

  const { data } = await db.queryOnce({
    transactions: {
      $: {
        where: { householdId },
      },
    },
  });

  const settlementTransactions = (data.transactions || []).filter((tx: any) => tx.type === 'settlement');
  logger.debug('Found old settlement transactions to delete:', settlementTransactions.length); // FIX: SEC-003

  if (settlementTransactions.length > 0) {
    await db.transact(settlementTransactions.map((tx: any) => db.tx.transactions[tx.id].delete()));
    logger.debug('Old settlement transactions deleted'); // FIX: SEC-003
  }

  logger.debug('=== CLEANUP COMPLETE ==='); // FIX: SEC-003

  return {
    deleted: settlementTransactions.length,
  };
}
