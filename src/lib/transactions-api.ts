import { db } from './db';
import { getUserAccounts } from './accounts-api';
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

    // Calculate new balance
    let newBalance = account.balance;
    if (request.type === 'income') {
      newBalance += request.amount;
    } else {
      newBalance -= request.amount;
    }

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

    console.log('Transaction created:', { transactionId, amount: request.amount, type: request.type });
    console.log('New account balance:', newBalance);

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
 * Format amount as currency
 */
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
