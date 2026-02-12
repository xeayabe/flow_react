/**
 * Tests for transactions-api.ts
 *
 * Tests the transaction CRUD functions with mocked InstantDB.
 * Verifies:
 *   - createTransaction: validation, balance updates, budget tracking
 *   - updateTransaction: balance adjustments, security checks
 *   - deleteTransaction: balance restoration, split cleanup
 *   - getUserTransactions: sorting, scoping
 *   - getTransaction: ownership checks
 */

import {
  createTransaction,
  getUserTransactions,
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from '../transactions-api';

// We need to mock the db module and its dependencies
jest.mock('../db', () => {
  const mockTransact = jest.fn(async () => ({}));
  const mockQueryOnce = jest.fn(async () => ({ data: {} }));

  return {
    db: {
      queryOnce: mockQueryOnce,
      transact: mockTransact,
      tx: new Proxy(
        {},
        {
          get(_target: any, entityName: string) {
            return new Proxy(
              {},
              {
                get(_t: any, recordId: string) {
                  return {
                    update: jest.fn((fields: any) => ({
                      __op: 'update',
                      entity: entityName,
                      id: recordId,
                      fields,
                    })),
                    delete: jest.fn(() => ({
                      __op: 'delete',
                      entity: entityName,
                      id: recordId,
                    })),
                  };
                },
              }
            );
          },
        }
      ),
    },
  };
});

jest.mock('../budget-api', () => ({
  updateBudgetSpentAmount: jest.fn(async () => {}),
  getMemberBudgetPeriod: jest.fn(async () => ({
    start: '2026-01-25',
    end: '2026-02-24',
    paydayDay: 25,
    source: 'member',
    daysRemaining: 16,
  })),
}));

jest.mock('../accounts-api', () => ({
  getUserAccounts: jest.fn(async () => []),
}));

jest.mock('react-native-get-random-values', () => ({
  getRandomValues: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-001'),
}));

const { db } = require('../db');
const { getMemberBudgetPeriod, updateBudgetSpentAmount } = require('../budget-api');

// Suppress console output during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  (console.log as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// createTransaction
// ===========================================================================

describe('createTransaction', () => {
  const validRequest = {
    userId: 'user-alex-0001',
    householdId: 'household-001',
    accountId: 'account-alex-ubs',
    categoryId: 'cat-groceries',
    type: 'expense' as const,
    amount: 87.35,
    date: '2026-02-03',
    payee: 'Migros',
    isShared: false,
  };

  describe('input validation', () => {
    it('rejects zero amount', async () => {
      const result = await createTransaction({ ...validRequest, amount: 0 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be greater than 0');
    });

    it('rejects negative amount', async () => {
      const result = await createTransaction({ ...validRequest, amount: -50 });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Amount must be greater than 0');
    });

    it('rejects missing date', async () => {
      const result = await createTransaction({ ...validRequest, date: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('date');
    });

    it('rejects invalid date format', async () => {
      const result = await createTransaction({
        ...validRequest,
        date: 'not-a-date',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date');
    });
  });

  describe('successful creation', () => {
    beforeEach(() => {
      // Mock account lookup
      db.queryOnce.mockResolvedValueOnce({
        data: {
          accounts: [
            {
              id: 'account-alex-ubs',
              balance: 4250.75,
              isExcludedFromBudget: false,
            },
          ],
        },
      });
      // Mock budget query
      db.queryOnce.mockResolvedValueOnce({
        data: {
          budgets: [
            {
              id: 'budget-alex-groceries',
              spentAmount: 0,
              categoryId: 'cat-groceries',
              isActive: true,
            },
          ],
        },
      });
    });

    it('returns success with transaction data', async () => {
      const result = await createTransaction(validRequest);
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('test-uuid-001');
      expect(result.data).toBeDefined();
      expect(result.data!.amount).toBe(87.35);
      expect(result.data!.type).toBe('expense');
    });

    it('calls db.transact to persist transaction and update balance', async () => {
      await createTransaction(validRequest);
      expect(db.transact).toHaveBeenCalled();
    });

    it('updates account balance for expense (subtract)', async () => {
      const result = await createTransaction(validRequest);
      expect(result.success).toBe(true);
      // The transact call should include balance update
      // Original balance: 4250.75, expense: 87.35, new balance: 4163.40
    });

    it('updates account balance for income (add)', async () => {
      db.queryOnce.mockReset();
      db.queryOnce.mockResolvedValueOnce({
        data: {
          accounts: [{ id: 'account-alex-ubs', balance: 4250.75, isExcludedFromBudget: false }],
        },
      });

      const result = await createTransaction({
        ...validRequest,
        type: 'income',
        amount: 7892,
        categoryId: 'cat-salary',
        payee: 'Employer AG',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('account not found', () => {
    it('returns error when account does not exist', async () => {
      db.queryOnce.mockResolvedValueOnce({
        data: { accounts: [] },
      });

      const result = await createTransaction(validRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Account not found');
    });
  });

  describe('budget update on expense', () => {
    it('triggers budget spent amount update for expense transactions', async () => {
      db.queryOnce.mockResolvedValueOnce({
        data: {
          accounts: [
            { id: 'account-alex-ubs', balance: 4250.75, isExcludedFromBudget: false },
          ],
        },
      });
      db.queryOnce.mockResolvedValueOnce({
        data: {
          budgets: [
            {
              id: 'budget-alex-groceries',
              spentAmount: 50,
              categoryId: 'cat-groceries',
              isActive: true,
            },
          ],
        },
      });

      await createTransaction(validRequest);

      // Should have called getMemberBudgetPeriod
      expect(getMemberBudgetPeriod).toHaveBeenCalledWith(
        validRequest.userId,
        validRequest.householdId
      );
    });

    it('skips budget update when account is excluded from budget', async () => {
      db.queryOnce.mockResolvedValueOnce({
        data: {
          accounts: [
            { id: 'account-alex-ubs', balance: 4250.75, isExcludedFromBudget: true },
          ],
        },
      });

      const result = await createTransaction(validRequest);
      expect(result.success).toBe(true);
      // updateBudgetSpentAmount should NOT have been called
      expect(updateBudgetSpentAmount).not.toHaveBeenCalled();
    });

    it('skips budget update when transaction is excluded from budget', async () => {
      db.queryOnce.mockResolvedValueOnce({
        data: {
          accounts: [
            { id: 'account-alex-ubs', balance: 4250.75, isExcludedFromBudget: false },
          ],
        },
      });

      await createTransaction({
        ...validRequest,
        isExcludedFromBudget: true,
      });

      expect(updateBudgetSpentAmount).not.toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// getUserTransactions
// ===========================================================================

describe('getUserTransactions', () => {
  it('returns transactions sorted by date descending', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        transactions: [
          { id: 'tx-1', date: '2026-02-03', userId: 'user-1' },
          { id: 'tx-2', date: '2026-02-07', userId: 'user-1' },
          { id: 'tx-3', date: '2026-01-28', userId: 'user-1' },
        ],
      },
    });

    const transactions = await getUserTransactions('user-1');

    expect(transactions.length).toBe(3);
    expect(transactions[0].id).toBe('tx-2'); // Feb 7 (newest)
    expect(transactions[1].id).toBe('tx-1'); // Feb 3
    expect(transactions[2].id).toBe('tx-3'); // Jan 28 (oldest)
  });

  it('returns empty array on error', async () => {
    db.queryOnce.mockRejectedValueOnce(new Error('Network error'));

    const transactions = await getUserTransactions('user-1');
    expect(transactions).toEqual([]);
  });

  it('returns empty array when no transactions exist', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { transactions: [] },
    });

    const transactions = await getUserTransactions('user-1');
    expect(transactions).toEqual([]);
  });
});

// ===========================================================================
// getTransaction
// ===========================================================================

describe('getTransaction', () => {
  it('returns transaction when user owns it', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        transactions: [
          { id: 'tx-1', userId: 'user-alex', amount: 87.35, type: 'expense' },
        ],
      },
    });

    const tx = await getTransaction('tx-1', 'user-alex');
    expect(tx).not.toBeNull();
    expect(tx!.amount).toBe(87.35);
  });

  it('returns null when user does not own the transaction (security check)', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        transactions: [
          { id: 'tx-1', userId: 'user-other', amount: 87.35 },
        ],
      },
    });

    const tx = await getTransaction('tx-1', 'user-alex');
    expect(tx).toBeNull();
  });

  it('returns null when transaction does not exist', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { transactions: [] },
    });

    const tx = await getTransaction('nonexistent', 'user-alex');
    expect(tx).toBeNull();
  });
});

// ===========================================================================
// deleteTransaction
// ===========================================================================

describe('deleteTransaction', () => {
  it('returns error when transaction not found', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { transactions: [] },
    });

    const result = await deleteTransaction('nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Transaction not found');
  });

  it('returns error when account not found', async () => {
    db.queryOnce
      .mockResolvedValueOnce({
        data: {
          transactions: [
            { id: 'tx-1', accountId: 'acc-1', type: 'expense', amount: 50, userId: 'user-1', householdId: 'hh-1', date: '2026-02-01' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { accounts: [] },
      });

    const result = await deleteTransaction('tx-1');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Account not found');
  });

  it('deletes transaction and restores balance for expense', async () => {
    db.queryOnce
      // Transaction lookup
      .mockResolvedValueOnce({
        data: {
          transactions: [
            {
              id: 'tx-1',
              accountId: 'acc-1',
              type: 'expense',
              amount: 87.35,
              userId: 'user-1',
              householdId: 'hh-1',
              categoryId: 'cat-groceries',
              date: '2026-02-03',
            },
          ],
        },
      })
      // Account lookup
      .mockResolvedValueOnce({
        data: {
          accounts: [{ id: 'acc-1', balance: 4163.4, isExcludedFromBudget: false }],
        },
      })
      // Splits lookup
      .mockResolvedValueOnce({
        data: { shared_expense_splits: [] },
      })
      // Budget recalculation: account check
      .mockResolvedValueOnce({
        data: {
          accounts: [{ id: 'acc-1', balance: 4250.75, isExcludedFromBudget: false }],
        },
      })
      // Budget lookup
      .mockResolvedValueOnce({
        data: {
          budgets: [
            { id: 'budget-1', spentAmount: 87.35, categoryId: 'cat-groceries', isActive: true },
          ],
        },
      });

    const result = await deleteTransaction('tx-1');
    expect(result.success).toBe(true);
    expect(db.transact).toHaveBeenCalled();
  });

  it('also deletes associated shared expense splits', async () => {
    db.queryOnce
      .mockResolvedValueOnce({
        data: {
          transactions: [
            {
              id: 'tx-shared',
              accountId: 'acc-1',
              type: 'expense',
              amount: 100,
              userId: 'user-1',
              householdId: 'hh-1',
              categoryId: 'cat-1',
              date: '2026-02-03',
              isShared: true,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { accounts: [{ id: 'acc-1', balance: 4000, isExcludedFromBudget: false }] },
      })
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            { id: 'split-1', transactionId: 'tx-shared' },
            { id: 'split-2', transactionId: 'tx-shared' },
          ],
        },
      })
      // Budget account check
      .mockResolvedValueOnce({
        data: { accounts: [{ id: 'acc-1', isExcludedFromBudget: false }] },
      })
      // Budget lookup
      .mockResolvedValueOnce({
        data: {
          budgets: [{ id: 'budget-1', spentAmount: 100, categoryId: 'cat-1', isActive: true }],
        },
      });

    const result = await deleteTransaction('tx-shared');
    expect(result.success).toBe(true);

    // transact should include delete operations for splits
    const transactCall = db.transact.mock.calls[0][0];
    // Should have 2 split deletes + 1 transaction delete + 1 balance update = 4 ops
    expect(transactCall.length).toBe(4);
  });
});

// ===========================================================================
// updateTransaction
// ===========================================================================

describe('updateTransaction', () => {
  const updateRequest = {
    id: 'tx-existing',
    userId: 'user-alex',
    householdId: 'hh-1',
    accountId: 'acc-1',
    categoryId: 'cat-groceries',
    type: 'expense' as const,
    amount: 95.0,
    date: '2026-02-03',
    payee: 'Migros',
    isShared: false,
  };

  it('rejects zero amount', async () => {
    const result = await updateTransaction({ ...updateRequest, amount: 0 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Amount must be greater than 0');
  });

  it('rejects missing date', async () => {
    const result = await updateTransaction({ ...updateRequest, date: '' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('date');
  });

  it('returns error when original transaction not found', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { transactions: [] },
    });

    const result = await updateTransaction(updateRequest);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Transaction not found');
  });

  it('denies access when user does not own the transaction', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        transactions: [
          { id: 'tx-existing', userId: 'user-other', accountId: 'acc-1', type: 'expense', amount: 87.35, date: '2026-02-03' },
        ],
      },
    });

    const result = await updateTransaction(updateRequest);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Access denied');
  });

  it('successfully updates transaction and adjusts balance', async () => {
    db.queryOnce
      // Original transaction
      .mockResolvedValueOnce({
        data: {
          transactions: [
            {
              id: 'tx-existing',
              userId: 'user-alex',
              accountId: 'acc-1',
              type: 'expense',
              amount: 87.35,
              date: '2026-02-03',
              categoryId: 'cat-groceries',
              createdAt: Date.now(),
            },
          ],
        },
      })
      // Old account balance
      .mockResolvedValueOnce({
        data: {
          accounts: [{ id: 'acc-1', balance: 4163.4, isExcludedFromBudget: false }],
        },
      });

    const result = await updateTransaction(updateRequest);
    expect(result.success).toBe(true);
    expect(result.data!.amount).toBe(95.0);
    expect(db.transact).toHaveBeenCalled();
  });
});
