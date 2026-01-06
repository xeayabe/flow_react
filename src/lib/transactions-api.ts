import { db } from './db';
import { getUserAccounts } from './accounts-api';
import { updateBudgetSpentAmount } from './budget-api';
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
}

export interface UpdateTransactionRequest extends CreateTransactionRequest {
  id: string; // transaction ID to update
}

export interface TransactionResponse {
  success: boolean;
  data?: Transaction;
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

    // Check date is not in future
    const transactionDate = new Date(request.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (transactionDate > today) {
      return { success: false, error: 'Date cannot be in the future' };
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
        isShared: false, // Phase 1: all personal
        paidByUserId: request.userId,
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

    console.log('Transaction created successfully:', { transactionId, type: request.type, newBalance });

    // Update budget spent amount if this is an expense transaction
    if (request.type === 'expense') {
      try {
        // Get household to retrieve payday info
        const householdResult = await db.queryOnce({
          households: {
            $: {
              where: { id: request.householdId },
            },
          },
        });

        const household = householdResult.data.households?.[0];
        if (household) {
          const paydayDay = household.paydayDay ?? 25;
          const budgetPeriod = calculateBudgetPeriod(paydayDay);

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
            }
          }
        }
      } catch (error) {
        console.warn('Failed to update budget spent amount:', error);
        // Don't fail the transaction creation if budget update fails
      }
    }

    return { success: true, data: { id: transactionId, ...request, isShared: false, createdAt: now, updatedAt: now } as Transaction };
  } catch (error) {
    console.error('Create transaction error:', error);
    return {
      success: false,
      error: 'Failed to create transaction',
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

    // Restore balance (opposite of what was added/subtracted)
    let restoredBalance = account.balance;
    if (transaction.type === 'income') {
      restoredBalance -= transaction.amount;
    } else {
      restoredBalance += transaction.amount;
    }

    // Delete transaction and restore balance
    await db.transact([
      db.tx.transactions[transactionId].delete(),
      db.tx.accounts[transaction.accountId].update({
        balance: restoredBalance,
        updatedAt: Date.now(),
      }),
    ]);

    console.log('Transaction deleted:', transactionId);

    // Update budget spent amount if this was an expense transaction
    if (transaction.type === 'expense') {
      try {
        // Get household to retrieve payday info
        const householdResult = await db.queryOnce({
          households: {
            $: {
              where: { id: transaction.householdId },
            },
          },
        });

        const household = householdResult.data.households?.[0];
        if (household) {
          const paydayDay = household.paydayDay ?? 25;
          const budgetPeriod = calculateBudgetPeriod(paydayDay);

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

    // Check date is not in future
    const transactionDate = new Date(request.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (transactionDate > today) {
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
    const transactionsToUpdate = [
      db.tx.transactions[request.id].update({
        type: request.type,
        amount: request.amount,
        categoryId: request.categoryId,
        accountId: request.accountId,
        date: request.date,
        note: request.note,
        isRecurring: request.isRecurring || false,
        recurringDay: request.recurringDay,
        updatedAt: now,
      }),
      db.tx.accounts[originalTx.accountId].update({
        balance: oldAccountNewBalance,
        updatedAt: now,
      }),
    ];

    // If account changed, update the new account as well
    if (needsSecondAccountUpdate) {
      transactionsToUpdate.push(
        db.tx.accounts[request.accountId].update({
          balance: newAccountNewBalance,
          updatedAt: now,
        })
      );
    }

    await db.transact(transactionsToUpdate);

    console.log('Transaction updated successfully:', request.id);

    // Update budget spent amounts if category or amount changed
    if (request.type === 'expense' && originalTx.type === 'expense') {
      try {
        // Get household for budget period calculation
        const householdResult = await db.queryOnce({
          households: {
            $: {
              where: { id: request.householdId },
            },
          },
        });

        const household = householdResult.data.households?.[0];
        if (household) {
          const paydayDay = household.paydayDay ?? 25;
          const budgetPeriod = calculateBudgetPeriod(paydayDay);

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
 * Format date as Swiss format DD.MM.YYYY
 */
export function formatDateSwiss(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('de-CH', {
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
