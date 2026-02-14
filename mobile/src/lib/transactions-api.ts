// FIX: CQP-006/ARCH-1 - Circular dependency broken: now imports from shared-api instead of budget-api
// FIX: CODE-4 - Uses typed errors instead of generic catch blocks
// FIX: CODE-2 - Replaced critical `any` types with proper interfaces
// FIX: SEC-003 - Replaced console.log/error with secure logger
// FIX: SEC-008 - Scoped users query in getHouseholdTransactionsWithCreators
// FIX: DAT-002 - Budget spentAmount update included in atomic transaction where possible
// FIX: DAT-008 - Null/undefined guards (?? 0) before all financial arithmetic

import { db } from './db';
import { logger } from './logger'; // FIX: SEC-003 - Secure logger
import { getUserAccounts } from './accounts-api';
// FIX: CQP-006 - Import from shared-api instead of budget-api to break circular dependency
import { updateBudgetSpentAmount, getMemberBudgetPeriod } from './shared-api';
import { calculateBudgetPeriod } from './payday-utils';
import { ValidationError, DataIntegrityError, getErrorMessage } from '../types/errors';
import type { AccountRecord, BudgetRecord, BudgetSummaryRecord, TransactionRecord, UserRecord } from '../types/api';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Transaction {
  id?: string;
  userId: string;
  householdId: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // ISO format YYYY-MM-DD
  note?: string;
  payee?: string; // Merchant/vendor name
  isShared: boolean;
  paidByUserId?: string;
  isRecurring: boolean;
  recurringDay?: number;
  isExcludedFromBudget?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTransactionRequest {
  userId: string;
  householdId: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  note?: string;
  payee?: string; // Merchant/vendor name
  isRecurring?: boolean;
  recurringDay?: number;
  isShared?: boolean;
  paidByUserId?: string;
  isExcludedFromBudget?: boolean;
}

export interface UpdateTransactionRequest extends CreateTransactionRequest {
  id: string; // transaction ID to update
}

export interface TransactionResponse {
  success: boolean;
  data?: Transaction;
  transactionId?: string;
  error?: string;
}

// FIX: CODE-2 - Extracted helper to get today's date string in YYYY-MM-DD format
function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

/**
 * Validates common transaction input fields.
 * Throws ValidationError if input is invalid.
 */
function validateTransactionInput(request: { amount: number; date: string }): void {
  if (!request.amount || request.amount <= 0) {
    throw new ValidationError('Amount must be greater than 0', { amount: 'Amount must be greater than 0' });
  }
  if (!request.date) {
    throw new ValidationError('Please select a date', { date: 'Please select a date' });
  }
  const transactionDate = new Date(request.date + 'T00:00:00');
  if (isNaN(transactionDate.getTime())) {
    throw new ValidationError('Invalid date format', { date: 'Invalid date format' });
  }
}

/**
 * Fetches an account by ID and throws DataIntegrityError if not found.
 */
async function fetchAccountOrThrow(accountId: string): Promise<AccountRecord> {
  const accountResult = await db.queryOnce({
    accounts: {
      $: {
        where: { id: accountId },
      },
    },
  });
  // @ts-ignore - InstantDB types not aligned with our schema
  const account = accountResult.data.accounts?.[0] as AccountRecord | undefined;
  if (!account) {
    throw new DataIntegrityError('Account not found', { accountId });
  }
  return account;
}

/**
 * FIX: DAT-002 - Pre-fetch budget data so it can be included in the atomic transaction.
 * Returns the budget record and computed new spent amount, or null if no budget update needed.
 *
 * This is called BEFORE the atomic db.transact() so that:
 * 1. We know which budget record to update
 * 2. We pre-compute the new spentAmount
 * 3. We can include the budget update op in the same atomic call
 */
async function prefetchBudgetForAtomicUpdate(
  request: { userId: string; householdId: string; categoryId: string; date: string; isExcludedFromBudget?: boolean },
  account: AccountRecord,
  amountDelta: number,
  operation: 'add' | 'subtract'
): Promise<{ budget: BudgetRecord; newSpentAmount: number } | null> {
  try {
    if (account.isExcludedFromBudget || request.isExcludedFromBudget) {
      logger.debug('Account or transaction is excluded from budget, skipping budget update');
      return null;
    }

    const budgetPeriod = await getMemberBudgetPeriod(request.userId, request.householdId);
    const txDate = request.date;
    if (txDate < budgetPeriod.start || txDate > budgetPeriod.end) {
      return null; // Transaction outside budget period
    }

    const budgetResult = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId: request.userId,
            categoryId: request.categoryId,
            isActive: true,
          },
        },
      },
    });

    // @ts-ignore - InstantDB types not aligned with our schema
    const budget = budgetResult.data.budgets?.[0] as BudgetRecord | undefined;
    if (!budget) return null;

    // FIX: DAT-008 - Null safety: use ?? 0 for spentAmount and amountDelta
    const currentSpent = budget.spentAmount ?? 0;
    const safeDelta = amountDelta ?? 0;
    const newSpentAmount = operation === 'add'
      ? Math.max(0, currentSpent + safeDelta)
      : Math.max(0, currentSpent - safeDelta);

    return { budget, newSpentAmount };
  } catch (error) {
    // FIX: CODE-4 - Use getErrorMessage for consistent error logging
    logger.warn('Failed to prefetch budget for atomic update:', getErrorMessage(error));
    // Return null so the main transaction can still proceed without budget update
    return null;
  }
}

/**
 * FIX: DAT-002 - Best-effort budget summary update after main atomic transaction.
 * This updates the budgetSummary.totalSpent field which is a denormalized aggregate.
 * Not included in the main atomic tx because it requires reading ALL budgets
 * (not just the one being modified), making it impractical to pre-compute.
 */
async function bestEffortUpdateBudgetSummary(userId: string): Promise<void> {
  try {
    const result = await db.queryOnce({
      budgets: {
        $: { where: { userId, isActive: true } },
      },
      budgetSummary: {
        $: { where: { userId } },
      },
    });

    // @ts-ignore - InstantDB types not aligned with our schema
    const budgets = (result.data.budgets || []) as BudgetRecord[];
    // @ts-ignore - InstantDB types not aligned with our schema
    const summary = result.data.budgetSummary?.[0] as BudgetSummaryRecord | undefined;
    if (!summary) return;

    // FIX: DAT-008 - Null safety on spentAmount
    const totalSpent = budgets.reduce((sum, b) => sum + (b.spentAmount ?? 0), 0);

    await db.transact([
      db.tx.budgetSummary[summary.id].update({ totalSpent }),
    ]);
  } catch (error) {
    logger.warn('Failed to update budget summary (best-effort):', getErrorMessage(error));
  }
}

/**
 * Create a new transaction and update account balance + budget atomically
 *
 * FIX: DAT-002 - Transaction creation, account balance update, AND budget spentAmount
 * update are now in a SINGLE db.transact() call to prevent partial state where
 * the transaction exists but the budget isn't updated, or vice versa.
 *
 * The budget summary (totalSpent) is updated as a best-effort follow-up because
 * it requires aggregating all budget categories which can't be pre-computed atomically.
 */
export async function createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse> {
  try {
    logger.debug('Creating transaction:', { type: request.type }); // FIX: SEC-003 - Don't log amount

    // FIX: CODE-4 - Use typed validation
    validateTransactionInput(request);

    const transactionId = uuidv4();

    // FIX: CODE-2 - Use typed account fetch
    const account = await fetchAccountOrThrow(request.accountId);

    logger.debug('Account found for transaction'); // FIX: SEC-003 - Don't log balance/IDs

    const todayStr = getTodayDateString();
    const isFutureTransaction = request.date > todayStr;

    // FIX: DAT-008 - Null safety: use ?? 0 for account balance
    let newBalance = account.balance ?? 0;
    if (!isFutureTransaction) {
      if (request.type === 'income') {
        newBalance += (request.amount ?? 0);
      } else {
        newBalance -= (request.amount ?? 0);
      }
    }

    // FIX: DAT-002 - Pre-fetch budget data BEFORE the atomic transaction
    let budgetUpdate: { budget: BudgetRecord; newSpentAmount: number } | null = null;
    if (request.type === 'expense' && !isFutureTransaction) {
      budgetUpdate = await prefetchBudgetForAtomicUpdate(
        request,
        account,
        request.amount ?? 0,
        'add'
      );
    }

    // FIX: DAT-002 - Build ALL operations for a single atomic db.transact() call
    // This ensures transaction + balance + budget are all-or-nothing
    const atomicOps: any[] = [
      db.tx.transactions[transactionId].update({
        userId: request.userId,
        householdId: request.householdId,
        accountId: request.accountId,
        categoryId: request.categoryId,
        type: request.type,
        amount: request.amount,
        date: request.date,
        note: request.payee && request.payee.trim() ? request.payee.trim() : undefined,
        payee: request.payee && request.payee.trim() ? request.payee.trim() : undefined,
        isShared: request.isShared || false,
        paidByUserId: request.isShared ? request.paidByUserId : request.userId,
        isExcludedFromBudget: request.isExcludedFromBudget || false,
      }),
      // Link transaction to account so relationship traversal (t.account) works in queries
      db.tx.transactions[transactionId].link({ account: request.accountId }),
      db.tx.accounts[request.accountId].update({
        balance: newBalance,
      }),
    ];

    // FIX: DAT-002 - Include budget spentAmount update in the same atomic transaction
    if (budgetUpdate) {
      atomicOps.push(
        db.tx.budgets[budgetUpdate.budget.id].update({
          spentAmount: budgetUpdate.newSpentAmount,
        })
      );
    }

    // Single atomic call: transaction + balance + budget spentAmount
    await db.transact(atomicOps);

    logger.debug('Transaction created successfully (atomic with budget)'); // FIX: SEC-003

    // FIX: DAT-002 - Best-effort: update budget summary totalSpent (non-critical, outside atomic tx)
    if (budgetUpdate) {
      await bestEffortUpdateBudgetSummary(request.userId);
    }

    return {
      success: true,
      transactionId: transactionId,
      data: {
        id: transactionId,
        userId: request.userId,
        householdId: request.householdId,
        accountId: request.accountId,
        categoryId: request.categoryId,
        type: request.type,
        amount: request.amount,
        date: request.date,
        note: request.note,
        isShared: request.isShared || false,
        paidByUserId: request.isShared ? request.paidByUserId : request.userId,
      } as Transaction,
    };
  } catch (error) {
    // FIX: CODE-4 - Typed error handling
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    if (error instanceof DataIntegrityError) {
      return { success: false, error: error.message };
    }
    logger.error('Create transaction error:', getErrorMessage(error)); // FIX: SEC-003
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Get all transactions for a user
 */
export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const result = await db.queryOnce({
      transactions: {
        $: {
          where: { userId },
        },
      },
    });

    // FIX: CODE-2 - Explicit cast with intermediate type
    const transactions = (result.data.transactions ?? []) as Transaction[];

    // Sort by date descending (newest first)
    transactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return transactions;
  } catch (error) {
    logger.error('Get transactions error:', getErrorMessage(error)); // FIX: SEC-003
    return [];
  }
}

/**
 * Get transactions for a household
 */
export async function getHouseholdTransactions(householdId: string): Promise<Transaction[]> {
  try {
    const result = await db.queryOnce({
      transactions: {
        $: {
          where: { householdId },
        },
      },
    });

    const transactions = (result.data.transactions ?? []) as Transaction[];

    transactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return transactions;
  } catch (error) {
    logger.error('Get household transactions error:', getErrorMessage(error)); // FIX: SEC-003
    return [];
  }
}

/**
 * Get household transactions with creator user names
 * Only returns: user's own transactions + shared transactions from the household
 */
export interface TransactionWithCreator extends Transaction {
  creatorName?: string;
}

export async function getHouseholdTransactionsWithCreators(
  householdId: string,
  currentUserId?: string
): Promise<TransactionWithCreator[]> {
  try {
    const result = await db.queryOnce({
      transactions: {
        $: {
          where: { householdId },
        },
      },
    });

    // FIX: SEC-008 - Fetch only household member users instead of ALL users
    const { data: memberData } = await db.queryOnce({
      householdMembers: {
        $: { where: { householdId, status: 'active' } }, // FIX: SEC-008 - Scoped
      },
    });
    const memberUserIds = (memberData.householdMembers || []).map((m: any) => m.userId);
    const userPromises = memberUserIds.map((uid: string) =>
      db.queryOnce({ users: { $: { where: { id: uid } } } }) // FIX: SEC-008 - Scoped by id
    );
    const userResults = await Promise.all(userPromises);
    const users = userResults.flatMap((r) => (r.data.users || []) as UserRecord[]);

    // FIX: CODE-2 - Use TransactionRecord type instead of any
    const transactions = (result.data.transactions ?? []) as TransactionRecord[];

    // Filter transactions: only show user's own transactions
    const filteredTransactions = transactions.filter((tx) => {
      // Always exclude old settlement transactions
      if (tx.type === 'settlement') return false;
      if (!currentUserId) return true;
      if (tx.userId === currentUserId) return true;
      return false;
    });

    // Enrich transactions with creator names
    const enrichedTransactions = filteredTransactions.map((tx) => {
      const creator = users.find((u) => u.id === tx.userId);
      return {
        ...tx,
        creatorName: creator?.name || 'Unknown',
      } as TransactionWithCreator;
    });

    // Sort by date descending (newest first)
    enrichedTransactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return enrichedTransactions;
  } catch (error) {
    logger.error('Get household transactions with creators error:', getErrorMessage(error)); // FIX: SEC-003
    return [];
  }
}

/**
 * Delete a transaction and restore account balance + budget atomically
 *
 * FIX: DAT-002 - Transaction deletion, balance restore, split cleanup, AND budget
 * spentAmount update are now in a SINGLE db.transact() call.
 */
export async function deleteTransaction(transactionId: string): Promise<TransactionResponse> {
  try {
    // Get the transaction
    const transactionResult = await db.queryOnce({
      transactions: {
        $: {
          where: { id: transactionId },
        },
      },
    });

    // FIX: CODE-2 - Use TransactionRecord type
    const transaction = transactionResult.data.transactions?.[0] as TransactionRecord | undefined;
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    // Get current account balance
    const account = await fetchAccountOrThrow(transaction.accountId);

    // Check for associated shared expense splits
    const splitsResult = await db.queryOnce({
      shared_expense_splits: {
        $: {
          where: { transactionId: transactionId },
        },
      },
    });

    // @ts-ignore - InstantDB types not aligned with our schema
    const splits = splitsResult.data?.shared_expense_splits || [];
    logger.debug('Found', splits.length, 'splits to delete'); // FIX: SEC-003

    const todayStr = getTodayDateString();
    const isFutureTransaction = transaction.date > todayStr;

    // FIX: DAT-008 - Null safety: use ?? 0 for account balance and transaction amount
    let restoredBalance = account.balance ?? 0;
    if (!isFutureTransaction) {
      if (transaction.type === 'income') {
        restoredBalance -= (transaction.amount ?? 0);
      } else {
        restoredBalance += (transaction.amount ?? 0);
      }
    }

    // FIX: DAT-002 - Pre-fetch budget for atomic delete
    let budgetUpdate: { budget: BudgetRecord; newSpentAmount: number } | null = null;
    if (transaction.type === 'expense' && !isFutureTransaction) {
      budgetUpdate = await prefetchBudgetForAtomicUpdate(
        {
          userId: transaction.userId,
          householdId: transaction.householdId,
          categoryId: transaction.categoryId,
          date: transaction.date,
          isExcludedFromBudget: transaction.isExcludedFromBudget,
        },
        account,
        transaction.amount ?? 0,
        'subtract'
      );
    }

    // FIX: DAT-002 - Build ALL operations for single atomic db.transact() call
    // FIX: CODE-2 - Type the split record for delete operations
    interface SplitForDelete { id: string }
    const atomicOps: any[] = [
      // Delete all associated splits
      ...(splits as SplitForDelete[]).map((split) => db.tx.shared_expense_splits[split.id].delete()),
      // Delete transaction
      db.tx.transactions[transactionId].delete(),
      // Restore account balance
      db.tx.accounts[transaction.accountId].update({
        balance: restoredBalance,
      }),
    ];

    // FIX: DAT-002 - Include budget spentAmount update in the same atomic transaction
    if (budgetUpdate) {
      atomicOps.push(
        db.tx.budgets[budgetUpdate.budget.id].update({
          spentAmount: budgetUpdate.newSpentAmount,
        })
      );
    }

    // Single atomic call: delete splits + delete tx + restore balance + update budget
    await db.transact(atomicOps);

    logger.debug('Transaction deleted successfully (atomic with budget)'); // FIX: SEC-003

    // FIX: DAT-002 - Best-effort: update budget summary totalSpent
    if (budgetUpdate) {
      await bestEffortUpdateBudgetSummary(transaction.userId);
    }

    return { success: true };
  } catch (error) {
    logger.error('Delete transaction error:', getErrorMessage(error)); // FIX: SEC-003
    return {
      success: false,
      error: 'Failed to delete transaction',
    };
  }
}

/**
 * Get a single transaction by ID
 */
export async function getTransaction(transactionId: string, userId: string): Promise<Transaction | null> {
  try {
    const result = await db.queryOnce({
      transactions: {
        $: {
          where: { id: transactionId },
        },
      },
    });

    const transaction = result.data.transactions?.[0] as Transaction | undefined;

    // Security check: ensure user owns the transaction
    if (transaction && transaction.userId !== userId) {
      logger.warn('Access denied: user does not own this transaction'); // FIX: SEC-003
      return null;
    }

    return transaction || null;
  } catch (error) {
    logger.error('Get transaction error:', getErrorMessage(error)); // FIX: SEC-003
    return null;
  }
}

/**
 * Update a transaction with balance adjustments + budget update atomically.
 * Handles: amount changes, type changes, account changes, future date transitions.
 *
 * FIX: DAT-002 - For simple cases (same category, amount changed), the budget update
 * is included in the atomic db.transact() call. For complex cases (category changed),
 * updates are done as best-effort follow-up because two different budgets must be updated.
 */
export async function updateTransaction(request: UpdateTransactionRequest): Promise<TransactionResponse> {
  try {
    logger.debug('Updating transaction'); // FIX: SEC-003 - Don't log IDs or amounts

    // FIX: CODE-4 - Use typed validation
    validateTransactionInput(request);

    // Get the original transaction
    const originalTxResult = await db.queryOnce({
      transactions: {
        $: {
          where: { id: request.id },
        },
      },
    });

    const originalTx = originalTxResult.data.transactions?.[0] as Transaction | undefined;
    if (!originalTx) {
      return { success: false, error: 'Transaction not found' };
    }

    // Security check: ensure user owns the transaction
    if (originalTx.userId !== request.userId) {
      return { success: false, error: 'Access denied' };
    }

    // Get current balances for affected accounts
    const oldAccount = await fetchAccountOrThrow(originalTx.accountId);

    let newAccountData: AccountRecord = oldAccount;
    let needsSecondAccountUpdate = false;

    const todayStr = getTodayDateString();
    const wasOriginalFuture = originalTx.date > todayStr;
    const isNewFuture = request.date > todayStr;

    // If account changed, get the new account
    if (originalTx.accountId !== request.accountId) {
      newAccountData = await fetchAccountOrThrow(request.accountId);
      needsSecondAccountUpdate = true;
    }

    // Calculate balance adjustments
    // FIX: DAT-008 - Null safety: use ?? 0 for all balance/amount references
    // Step 1: Reverse original transaction impact (only if not future)
    let oldAccountNewBalance = oldAccount.balance ?? 0;
    if (!wasOriginalFuture) {
      if (originalTx.type === 'income') {
        oldAccountNewBalance -= (originalTx.amount ?? 0);
      } else {
        oldAccountNewBalance += (originalTx.amount ?? 0);
      }
    }

    // Step 2: Apply new transaction impact (only if not future)
    let newAccountNewBalance = needsSecondAccountUpdate
      ? (newAccountData.balance ?? 0)
      : oldAccountNewBalance;

    if (!isNewFuture) {
      if (request.type === 'income') {
        newAccountNewBalance += (request.amount ?? 0);
      } else {
        newAccountNewBalance -= (request.amount ?? 0);
      }
    }

    // Step 3: Build atomic operations array
    const now = Date.now();

    const txUpdate = db.tx.transactions[request.id].update({
      type: request.type,
      amount: request.amount,
      categoryId: request.categoryId,
      accountId: request.accountId,
      date: request.date,
      note: request.note,
      payee: request.payee && request.payee.trim() ? request.payee.trim() : undefined,
      isExcludedFromBudget: request.isExcludedFromBudget || false,
      isShared: request.isShared || false,
      paidByUserId: request.paidByUserId || undefined,
    });

    const needsBalanceUpdate = !wasOriginalFuture || !isNewFuture;

    // FIX: DAT-002 - Build atomic operations including budget where possible
    const atomicOps: any[] = [txUpdate];

    // Update account link when wallet changes so relationship traversal stays correct
    if (needsSecondAccountUpdate) {
      atomicOps.push(db.tx.transactions[request.id].link({ account: request.accountId }));
    }

    if (needsBalanceUpdate) {
      if (needsSecondAccountUpdate) {
        if (!wasOriginalFuture) {
          atomicOps.push(db.tx.accounts[originalTx.accountId].update({ balance: oldAccountNewBalance }));
        }
        if (!isNewFuture) {
          atomicOps.push(db.tx.accounts[request.accountId].update({ balance: newAccountNewBalance }));
        }
      } else {
        if (!wasOriginalFuture || !isNewFuture) {
          atomicOps.push(db.tx.accounts[originalTx.accountId].update({ balance: newAccountNewBalance }));
        }
      }
    }

    // FIX: DAT-002 - For same-category updates, include budget in atomic transaction
    let budgetUpdatedAtomically = false;
    if (request.type === 'expense' && originalTx.type === 'expense' && !isNewFuture) {
      const isOriginalAccountExcluded = oldAccount.isExcludedFromBudget;
      const isNewAccountExcluded = needsSecondAccountUpdate ? newAccountData.isExcludedFromBudget : isOriginalAccountExcluded;
      const isOriginalTxExcluded = originalTx.isExcludedFromBudget || false;
      const isNewTxExcluded = request.isExcludedFromBudget || false;
      const shouldUpdateBudget = !isNewAccountExcluded && !isNewTxExcluded;

      if (shouldUpdateBudget && originalTx.categoryId === request.categoryId) {
        // Same category: we can include budget update in atomic transaction
        try {
          const budgetPeriod = await getMemberBudgetPeriod(request.userId, request.householdId);
          const txDate = request.date;
          if (txDate >= budgetPeriod.start && txDate <= budgetPeriod.end) {
            const budgetResult = await db.queryOnce({
              budgets: { $: { where: { userId: request.userId, categoryId: request.categoryId, isActive: true } } },
            });
            // @ts-ignore - InstantDB types
            const budget = budgetResult.data.budgets?.[0] as BudgetRecord | undefined;
            if (budget) {
              // FIX: DAT-008 - Null safety
              const currentSpent = budget.spentAmount ?? 0;
              let newSpentAmount: number;
              if (!wasOriginalFuture) {
                // Both dates are non-future: apply diff
                const amountDiff = (request.amount ?? 0) - (originalTx.amount ?? 0);
                newSpentAmount = Math.max(0, currentSpent + amountDiff);
              } else {
                // Original was future, now it's not - add full new amount
                newSpentAmount = currentSpent + (request.amount ?? 0);
              }
              atomicOps.push(
                db.tx.budgets[budget.id].update({ spentAmount: newSpentAmount })
              );
              budgetUpdatedAtomically = true;
            }
          }
        } catch (error) {
          logger.warn('Failed to include budget in atomic update, will fall back:', getErrorMessage(error));
        }
      }
    }

    // Execute atomic transaction
    await db.transact(atomicOps);

    logger.debug('Transaction updated successfully'); // FIX: SEC-003

    // FIX: DAT-002 - Handle category-change budget updates (requires two budget records,
    // can't easily be atomic with the main transaction)
    if (request.type === 'expense' && originalTx.type === 'expense' && !isNewFuture && !budgetUpdatedAtomically) {
      try {
        const isOriginalAccountExcluded = oldAccount.isExcludedFromBudget;
        const isNewAccountExcluded = needsSecondAccountUpdate ? newAccountData.isExcludedFromBudget : isOriginalAccountExcluded;
        const isOriginalTxExcluded = originalTx.isExcludedFromBudget || false;
        const isNewTxExcluded = request.isExcludedFromBudget || false;
        const shouldUpdateBudget = !isNewAccountExcluded && !isNewTxExcluded;

        if (shouldUpdateBudget) {
          const budgetPeriod = await getMemberBudgetPeriod(request.userId, request.householdId);
          const txDate = request.date;
          if (txDate >= budgetPeriod.start && txDate <= budgetPeriod.end) {
            if (originalTx.categoryId !== request.categoryId) {
              // Category changed: update both old and new categories
              if (!isOriginalAccountExcluded && !isOriginalTxExcluded && !wasOriginalFuture) {
                const oldBudgetResult = await db.queryOnce({
                  budgets: { $: { where: { userId: request.userId, categoryId: originalTx.categoryId, isActive: true } } },
                });
                // @ts-ignore - InstantDB types
                const oldBudget = oldBudgetResult.data.budgets?.[0] as BudgetRecord | undefined;
                if (oldBudget) {
                  // FIX: DAT-008 - Null safety
                  const newSpentAmount = Math.max(0, (oldBudget.spentAmount ?? 0) - (originalTx.amount ?? 0));
                  await updateBudgetSpentAmount(request.userId, originalTx.categoryId, budgetPeriod.start, newSpentAmount);
                }
              }

              if (!isNewAccountExcluded && !isNewTxExcluded) {
                const newBudgetResult = await db.queryOnce({
                  budgets: { $: { where: { userId: request.userId, categoryId: request.categoryId, isActive: true } } },
                });
                // @ts-ignore - InstantDB types
                const newBudget = newBudgetResult.data.budgets?.[0] as BudgetRecord | undefined;
                if (newBudget) {
                  // FIX: DAT-008 - Null safety
                  const newSpentAmount = (newBudget.spentAmount ?? 0) + (request.amount ?? 0);
                  await updateBudgetSpentAmount(request.userId, request.categoryId, budgetPeriod.start, newSpentAmount);
                }
              }
            }
            // Note: same-category amount-change case is handled atomically above
          }
        }
      } catch (error) {
        logger.warn('Failed to update budget spent amount on transaction update:', getErrorMessage(error)); // FIX: SEC-003
      }
    }

    // FIX: DAT-002 - Best-effort: update budget summary totalSpent
    if (budgetUpdatedAtomically || (request.type === 'expense' && !isNewFuture)) {
      await bestEffortUpdateBudgetSummary(request.userId);
    }

    return {
      success: true,
      transactionId: request.id,
      data: {
        id: request.id,
        userId: request.userId,
        householdId: request.householdId,
        accountId: request.accountId,
        categoryId: request.categoryId,
        type: request.type,
        amount: request.amount,
        date: request.date,
        note: request.note,
        payee: request.payee,
        isShared: request.isShared || false,
        paidByUserId: request.paidByUserId,
        isRecurring: request.isRecurring || false,
        recurringDay: request.recurringDay,
        isExcludedFromBudget: request.isExcludedFromBudget || false,
        createdAt: originalTx.createdAt,
        updatedAt: now,
      } as Transaction,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    if (error instanceof DataIntegrityError) {
      return { success: false, error: error.message };
    }
    logger.error('Update transaction error:', getErrorMessage(error)); // FIX: SEC-003
    return {
      success: false,
      error: 'Failed to update transaction',
    };
  }
}

export function formatCurrency(amount: number, currency: string = 'CHF'): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date as European format DD/MM/YYYY
 */
export function formatDateSwiss(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Parse Swiss date format DD.MM.YYYY to ISO format YYYY-MM-DD
 */
export function parseSwissDate(dateString: string): string | null {
  const patterns = [
    /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ];

  for (const pattern of patterns) {
    const match = dateString.match(pattern);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Get recent transactions for dashboard (last N transactions for current period)
 * Excludes future-dated transactions
 */
export async function getRecentTransactions(
  userId: string,
  limit: number = 5,
  periodStart?: string,
  periodEnd?: string
): Promise<Transaction[]> {
  try {
    const result = await db.queryOnce({
      transactions: {
        $: {
          where: { userId },
        },
      },
    });

    let transactions = (result.data.transactions || []) as Transaction[];

    const todayStr = getTodayDateString();

    // Filter out future transactions
    transactions = transactions.filter((tx) => tx.date <= todayStr);

    // Filter by period if provided
    if (periodStart && periodEnd) {
      transactions = transactions.filter(
        (tx) => tx.date >= periodStart && tx.date <= periodEnd
      );
    }

    // Sort by date descending and limit
    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  } catch (error) {
    logger.error('Get recent transactions error:', getErrorMessage(error)); // FIX: SEC-003
    return [];
  }
}
