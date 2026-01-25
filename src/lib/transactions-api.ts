import { db } from './db';
import { getUserAccounts } from './accounts-api';
import { updateBudgetSpentAmount, getMemberBudgetPeriod } from './budget-api';
import { calculateBudgetPeriod } from './payday-utils';
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
  isShared: boolean;
  paidByUserId?: string;
  isRecurring: boolean;
  recurringDay?: number;
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
  isRecurring?: boolean;
  recurringDay?: number;
  isShared?: boolean;
  paidByUserId?: string;
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

/**
 * Create a new transaction and update account balance
 */
export async function createTransaction(request: CreateTransactionRequest): Promise<TransactionResponse> {
  try {
    console.log('Creating transaction:', { type: request.type, amount: request.amount });

    // Validate input
    if (!request.amount || request.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    if (!request.date) {
      return { success: false, error: 'Please select a date' };
    }

    // Allow any valid date (past, present, or future)
    // This allows users to plan ahead for expenses like rent
    const transactionDate = new Date(request.date + 'T00:00:00');
    if (isNaN(transactionDate.getTime())) {
      return { success: false, error: 'Invalid date format' };
    }

    const transactionId = uuidv4();
    const now = Date.now();

    // Get current account balance
    const accountResult = await db.queryOnce({
      accounts: {
        $: {
          where: {
            id: request.accountId,
          },
        },
      },
    });

    const account = accountResult.data.accounts?.[0];
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    console.log('Account found:', { accountId: account.id, currentBalance: account.balance });

    // Calculate new balance
    let newBalance = account.balance;
    if (request.type === 'income') {
      newBalance += request.amount;
      console.log('Income transaction: adding', request.amount, 'to balance');
    } else {
      newBalance -= request.amount;
      console.log('Expense transaction: subtracting', request.amount, 'from balance');
    }

    console.log('New balance will be:', newBalance);

    // Create transaction and update account balance in a transaction
    await db.transact([
      db.tx.transactions[transactionId].update({
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
        isRecurring: request.isRecurring || false,
        recurringDay: request.recurringDay,
        createdAt: now,
        updatedAt: now,
      }),
      db.tx.accounts[request.accountId].update({
        balance: newBalance,
        updatedAt: now,
      }),
    ]);

    console.log('Transaction created successfully:', { transactionId, type: request.type, newBalance, isShared: request.isShared });

    // Update budget spent amount if this is an expense transaction
    if (request.type === 'expense') {
      try {
        console.log('Updating budget for expense transaction');
        // Get member's personal budget period (or fallback to household)
        const budgetPeriod = await getMemberBudgetPeriod(request.userId, request.householdId);

        // Check if transaction date falls within this budget period
        const txDate = request.date;
        if (txDate >= budgetPeriod.start && txDate <= budgetPeriod.end) {
          // Get current budget spent amount
          const budgetResult = await db.queryOnce({
            budgets: {
              $: {
                where: {
                  userId: request.userId,
                  categoryId: request.categoryId,
                  periodStart: budgetPeriod.start,
                },
              },
            },
          });

          const budget = budgetResult.data.budgets?.[0];
          if (budget) {
            const newSpentAmount = (budget.spentAmount || 0) + request.amount;
            await updateBudgetSpentAmount(request.userId, request.categoryId, budgetPeriod.start, newSpentAmount);
            console.log('Budget updated for expense transaction');
          }
        }
      } catch (error) {
        console.warn('Failed to update budget spent amount:', error);
        // Don't fail the transaction creation if budget update fails
      }
    }

    console.log('✅ Transaction fully completed and committed to database');
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
        isRecurring: request.isRecurring || false,
        recurringDay: request.recurringDay,
        createdAt: now,
        updatedAt: now
      } as Transaction
    };
  } catch (error) {
    console.error('Create transaction error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transaction',
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
          where: {
            userId,
          },
        },
      },
    });

    const transactions = (result.data.transactions ?? []) as Transaction[];

    // Sort by date descending (newest first)
    transactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return transactions;
  } catch (error) {
    console.error('Get transactions error:', error);
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
          where: {
            householdId,
          },
        },
      },
    });

    const transactions = (result.data.transactions ?? []) as Transaction[];

    // Sort by date descending (newest first)
    transactions.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return transactions;
  } catch (error) {
    console.error('Get household transactions error:', error);
    return [];
  }
}

/**
 * Get household transactions with creator user names
 */
export interface TransactionWithCreator extends Transaction {
  creatorName?: string;
}

export async function getHouseholdTransactionsWithCreators(householdId: string): Promise<TransactionWithCreator[]> {
  try {
    const result = await db.queryOnce({
      transactions: {
        $: {
          where: {
            householdId,
          },
        },
      },
      users: {},
    });

    const transactions = (result.data.transactions ?? []) as Transaction[];
    const users = result.data.users ?? [];

    // Enrich transactions with creator names
    const enrichedTransactions = transactions.map((tx) => {
      const creator = users.find((u: any) => u.id === tx.userId);
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
    console.error('Get household transactions with creators error:', error);
    return [];
  }
}

/**
 * Delete a transaction and restore account balance
 */
export async function deleteTransaction(transactionId: string): Promise<TransactionResponse> {
  try {
    // Get the transaction
    const transactionResult = await db.queryOnce({
      transactions: {
        $: {
          where: {
            id: transactionId,
          },
        },
      },
    });

    const transaction = transactionResult.data.transactions?.[0];
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    // Get current account balance
    const accountResult = await db.queryOnce({
      accounts: {
        $: {
          where: {
            id: transaction.accountId,
          },
        },
      },
    });

    const account = accountResult.data.accounts?.[0];
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    // Check for associated shared expense splits
    console.log('🔍 Checking for shared expense splits for transaction:', transactionId);
    const splitsResult = await db.queryOnce({
      shared_expense_splits: {
        $: {
          where: {
            transactionId: transactionId,
          },
        },
      },
    });

    const splits = splitsResult.data?.shared_expense_splits || [];
    console.log(`Found ${splits.length} splits to delete`);

    // Restore balance (opposite of what was added/subtracted)
    let restoredBalance = account.balance;
    if (transaction.type === 'income') {
      restoredBalance -= transaction.amount;
    } else {
      restoredBalance += transaction.amount;
    }

    // Build delete operations: splits first, then transaction and balance update
    const deleteOperations = [
      // Delete all associated splits
      ...splits.map((split: any) => db.tx.shared_expense_splits[split.id].delete()),
      // Delete transaction
      db.tx.transactions[transactionId].delete(),
      // Update account balance
      db.tx.accounts[transaction.accountId].update({
        balance: restoredBalance,
        updatedAt: Date.now(),
      }),
    ];

    // Delete transaction, splits, and restore balance
    await db.transact(deleteOperations);

    console.log(`✅ Transaction deleted: ${transactionId} (${splits.length} splits also deleted)`);

    // Update budget spent amount if this was an expense transaction
    if (transaction.type === 'expense') {
      try {
        // Get member's personal budget period (or fallback to household)
        const budgetPeriod = await getMemberBudgetPeriod(transaction.userId, transaction.householdId);

        // Check if transaction date falls within this budget period
        const txDate = transaction.date;
        if (txDate >= budgetPeriod.start && txDate <= budgetPeriod.end) {
          // Get current budget spent amount
          const budgetResult = await db.queryOnce({
            budgets: {
              $: {
                where: {
                  userId: transaction.userId,
                  categoryId: transaction.categoryId,
                  periodStart: budgetPeriod.start,
                },
              },
            },
          });

          const budget = budgetResult.data.budgets?.[0];
          if (budget) {
            const newSpentAmount = Math.max(0, (budget.spentAmount || 0) - transaction.amount);
            await updateBudgetSpentAmount(transaction.userId, transaction.categoryId, budgetPeriod.start, newSpentAmount);
          }
        }
      } catch (error) {
        console.warn('Failed to update budget spent amount on delete:', error);
        // Don't fail the transaction deletion if budget update fails
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Delete transaction error:', error);
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
          where: {
            id: transactionId,
          },
        },
      },
    });

    const transaction = result.data.transactions?.[0] as Transaction | undefined;

    // Security check: ensure user owns the transaction
    if (transaction && transaction.userId !== userId) {
      console.warn('Access denied: user does not own this transaction');
      return null;
    }

    return transaction || null;
  } catch (error) {
    console.error('Get transaction error:', error);
    return null;
  }
}

/**
 * Update a transaction with balance adjustments
 * Handles: amount changes, type changes, account changes
 */
export async function updateTransaction(request: UpdateTransactionRequest): Promise<TransactionResponse> {
  try {
    console.log('Updating transaction:', { id: request.id, type: request.type, amount: request.amount });

    // Validate input
    if (!request.amount || request.amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    if (!request.date) {
      return { success: false, error: 'Please select a date' };
    }

    // Check date is not in future using string comparison (YYYY-MM-DD format)
    const currentDate = new Date();
    const todayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

    if (request.date > todayStr) {
      return { success: false, error: 'Date cannot be in the future' };
    }

    // Get the original transaction
    const originalTxResult = await db.queryOnce({
      transactions: {
        $: {
          where: {
            id: request.id,
          },
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
    const oldAccountResult = await db.queryOnce({
      accounts: {
        $: {
          where: {
            id: originalTx.accountId,
          },
        },
      },
    });

    const oldAccount = oldAccountResult.data.accounts?.[0];
    if (!oldAccount) {
      return { success: false, error: 'Original account not found' };
    }

    let newAccountData = oldAccount;
    let needsSecondAccountUpdate = false;

    // If account changed, get the new account
    if (originalTx.accountId !== request.accountId) {
      const newAccountResult = await db.queryOnce({
        accounts: {
          $: {
            where: {
              id: request.accountId,
            },
          },
        },
      });

      newAccountData = newAccountResult.data.accounts?.[0];
      if (!newAccountData) {
        return { success: false, error: 'New account not found' };
      }
      needsSecondAccountUpdate = true;
    }

    // Calculate balance adjustments
    // Step 1: Reverse the original transaction's impact
    let oldAccountNewBalance = oldAccount.balance;
    if (originalTx.type === 'income') {
      oldAccountNewBalance -= originalTx.amount;
      console.log(`Reversing income: subtracting ${originalTx.amount} from old account`);
    } else {
      oldAccountNewBalance += originalTx.amount;
      console.log(`Reversing expense: adding ${originalTx.amount} to old account`);
    }

    // Step 2: Apply the new transaction's impact
    let newAccountNewBalance = newAccountData.balance;
    if (needsSecondAccountUpdate) {
      // If account changed, we're working with the new account's balance
      newAccountNewBalance = newAccountData.balance;
    } else {
      // If account didn't change, we're updating the same account
      newAccountNewBalance = oldAccountNewBalance;
    }

    if (request.type === 'income') {
      newAccountNewBalance += request.amount;
      console.log(`Applying income: adding ${request.amount} to new account`);
    } else {
      newAccountNewBalance -= request.amount;
      console.log(`Applying expense: subtracting ${request.amount} from new account`);
    }

    console.log('Balance adjustments:', {
      oldAccountId: originalTx.accountId,
      oldAccountBalance: oldAccount.balance,
      oldAccountNewBalance,
      newAccountId: request.accountId,
      newAccountBalance: newAccountData.balance,
      newAccountNewBalance,
    });

    // Step 3: Update transaction and balance(s)
    const now = Date.now();

    // Build the transaction update
    const txUpdate = db.tx.transactions[request.id].update({
      type: request.type,
      amount: request.amount,
      categoryId: request.categoryId,
      accountId: request.accountId,
      date: request.date,
      note: request.note,
      isRecurring: request.isRecurring || false,
      recurringDay: request.recurringDay,
      updatedAt: now,
    });

    // If account changed, update both old and new accounts separately
    if (needsSecondAccountUpdate) {
      await db.transact([
        txUpdate,
        // Update old account (with reversal only)
        db.tx.accounts[originalTx.accountId].update({
          balance: oldAccountNewBalance,
          updatedAt: now,
        }),
        // Update new account (with new transaction applied)
        db.tx.accounts[request.accountId].update({
          balance: newAccountNewBalance,
          updatedAt: now,
        }),
      ]);
    } else {
      // Same account - use the final calculated balance (newAccountNewBalance has both reversal and new transaction)
      await db.transact([
        txUpdate,
        db.tx.accounts[originalTx.accountId].update({
          balance: newAccountNewBalance,
          updatedAt: now,
        }),
      ]);
    }

    console.log('Transaction updated successfully:', request.id);

    // Update budget spent amounts if category or amount changed
    if (request.type === 'expense' && originalTx.type === 'expense') {
      try {
        // Get member's personal budget period
        const budgetPeriod = await getMemberBudgetPeriod(request.userId, request.householdId);

        const txDate = request.date;
        if (txDate >= budgetPeriod.start && txDate <= budgetPeriod.end) {
          // If category changed, update both old and new categories
          if (originalTx.categoryId !== request.categoryId) {
            // Update old category
            const oldBudgetResult = await db.queryOnce({
              budgets: {
                $: {
                  where: {
                    userId: request.userId,
                    categoryId: originalTx.categoryId,
                    periodStart: budgetPeriod.start,
                  },
                },
              },
            });

            const oldBudget = oldBudgetResult.data.budgets?.[0];
            if (oldBudget) {
              const newSpentAmount = Math.max(0, (oldBudget.spentAmount || 0) - originalTx.amount);
              await updateBudgetSpentAmount(request.userId, originalTx.categoryId, budgetPeriod.start, newSpentAmount);
            }

            // Update new category
            const newBudgetResult = await db.queryOnce({
              budgets: {
                $: {
                  where: {
                    userId: request.userId,
                    categoryId: request.categoryId,
                    periodStart: budgetPeriod.start,
                  },
                },
              },
            });

            const newBudget = newBudgetResult.data.budgets?.[0];
            if (newBudget) {
              const newSpentAmount = (newBudget.spentAmount || 0) + request.amount;
              await updateBudgetSpentAmount(request.userId, request.categoryId, budgetPeriod.start, newSpentAmount);
            }
          } else if (originalTx.amount !== request.amount) {
            // If amount changed but category didn't
            const budgetResult = await db.queryOnce({
              budgets: {
                $: {
                  where: {
                    userId: request.userId,
                    categoryId: request.categoryId,
                    periodStart: budgetPeriod.start,
                  },
                },
              },
            });

            const budget = budgetResult.data.budgets?.[0];
            if (budget) {
              const amountDiff = request.amount - originalTx.amount;
              const newSpentAmount = (budget.spentAmount || 0) + amountDiff;
              await updateBudgetSpentAmount(request.userId, request.categoryId, budgetPeriod.start, newSpentAmount);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to update budget spent amount on transaction update:', error);
        // Don't fail the transaction update if budget update fails
      }
    }

    return {
      success: true,
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
        isShared: originalTx.isShared,
        paidByUserId: originalTx.paidByUserId,
        isRecurring: request.isRecurring || false,
        recurringDay: request.recurringDay,
        createdAt: originalTx.createdAt,
        updatedAt: now,
      } as Transaction,
    };
  } catch (error) {
    console.error('Update transaction error:', error);
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
  // Accept formats: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
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
          where: {
            userId,
          },
        },
      },
    });

    let transactions = (result.data.transactions || []) as Transaction[];

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
    console.error('Get recent transactions error:', error);
    return [];
  }
}
