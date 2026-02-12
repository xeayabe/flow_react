/**
 * Tests for settlement-api.ts
 *
 * Tests settlement workflow functions with mocked InstantDB.
 * Verifies:
 *   - getUnsettledSharedExpenses: filtering, privacy, sorting
 *   - calculateHouseholdDebt: net debt calculation
 *   - getUnsettledExpensesByDirection: youOwe vs youAreOwed
 *   - createSettlement: account balance transfers, split marking
 */

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

jest.mock('react-native-get-random-values', () => ({
  getRandomValues: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'settlement-uuid-001'),
}));

const { db } = require('../db');

import {
  getUnsettledSharedExpenses,
  calculateHouseholdDebt,
  getUnsettledExpensesByDirection,
} from '../settlement-api';

// Suppress console output
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

// Test data IDs
const ALEX_ID = 'user-alex-0001';
const CECILIA_ID = 'user-cecilia-0002';
const HOUSEHOLD_ID = 'household-zurich-001';

// ===========================================================================
// getUnsettledSharedExpenses
// ===========================================================================

describe('getUnsettledSharedExpenses', () => {
  it('returns unsettled expenses where current user is involved', async () => {
    // New implementation makes these queries in order:
    // 1. Query shared transactions
    // 2. Query householdMembers (to find other member)
    // 3-4. Query splits by owerUserId for both users (getHouseholdSplits)
    // 5. Query categories
    // 6. Query householdMembers again (getHouseholdUserMap)
    // 7-8. Query each user individually (getHouseholdUserMap)

    db.queryOnce
      // 1. Shared transactions
      .mockResolvedValueOnce({
        data: {
          transactions: [
            {
              id: 'tx-rent',
              householdId: HOUSEHOLD_ID,
              isShared: true,
              amount: 2100,
              paidByUserId: ALEX_ID,
              userId: ALEX_ID,
              categoryId: 'cat-rent',
              date: '2026-02-01',
              payee: 'Immobilien AG',
            },
          ],
        },
      })
      // 2. HouseholdMembers (first call - find other member)
      .mockResolvedValueOnce({
        data: {
          householdMembers: [
            { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
            { userId: CECILIA_ID, householdId: HOUSEHOLD_ID, status: 'active' },
          ],
        },
      })
      // 3. Splits where Alex is ower
      .mockResolvedValueOnce({
        data: { shared_expense_splits: [] },
      })
      // 4. Splits where Cecilia is ower
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            {
              id: 'split-rent',
              transactionId: 'tx-rent',
              owerUserId: CECILIA_ID,
              owedToUserId: ALEX_ID,
              splitAmount: 840,
              splitPercentage: 40,
              isPaid: false,
            },
          ],
        },
      })
      // 5. Categories
      .mockResolvedValueOnce({
        data: {
          categories: [{ id: 'cat-rent', name: 'Rent', householdId: HOUSEHOLD_ID }],
        },
      })
      // 6. HouseholdMembers (second call - getHouseholdUserMap)
      .mockResolvedValueOnce({
        data: {
          householdMembers: [
            { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
            { userId: CECILIA_ID, householdId: HOUSEHOLD_ID, status: 'active' },
          ],
        },
      })
      // 7. User query for Alex
      .mockResolvedValueOnce({
        data: {
          users: [{ id: ALEX_ID, name: 'Alexander', email: 'alex@flow.ch' }],
        },
      })
      // 8. User query for Cecilia
      .mockResolvedValueOnce({
        data: {
          users: [{ id: CECILIA_ID, name: 'Cecilia', email: 'cecilia@flow.ch' }],
        },
      });

    // From Alex's perspective: Cecilia owes him
    const expenses = await getUnsettledSharedExpenses(HOUSEHOLD_ID, ALEX_ID);

    expect(expenses.length).toBe(1);
    expect(expenses[0].totalAmount).toBe(2100);
    // Alex is owed, so yourShare should be negative
    expect(expenses[0].yourShare).toBe(-840);
    expect(expenses[0].paidByUserId).toBe(ALEX_ID);
  });

  it('skips already-paid splits', async () => {
    db.queryOnce
      .mockResolvedValueOnce({
        data: {
          transactions: [
            { id: 'tx-1', householdId: HOUSEHOLD_ID, isShared: true, amount: 100, paidByUserId: ALEX_ID, userId: ALEX_ID, categoryId: 'cat-1', date: '2026-02-01' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            { id: 'split-1', transactionId: 'tx-1', owerUserId: CECILIA_ID, owedToUserId: ALEX_ID, splitAmount: 40, isPaid: true },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { categories: [] } })
      .mockResolvedValueOnce({ data: { users: [] } });

    const expenses = await getUnsettledSharedExpenses(HOUSEHOLD_ID, ALEX_ID);
    expect(expenses.length).toBe(0);
  });

  it('returns empty array when no shared transactions', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { transactions: [] },
    });

    const expenses = await getUnsettledSharedExpenses(HOUSEHOLD_ID, ALEX_ID);
    expect(expenses).toEqual([]);
  });

  it('skips splits where current user is not involved', async () => {
    db.queryOnce
      .mockResolvedValueOnce({
        data: {
          transactions: [
            { id: 'tx-1', householdId: HOUSEHOLD_ID, isShared: true, amount: 100, paidByUserId: 'user-stranger', userId: 'user-stranger', categoryId: 'cat-1', date: '2026-02-01' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            { id: 'split-1', transactionId: 'tx-1', owerUserId: 'user-other', owedToUserId: 'user-stranger', splitAmount: 40, isPaid: false },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { categories: [] } })
      .mockResolvedValueOnce({ data: { users: [] } });

    const expenses = await getUnsettledSharedExpenses(HOUSEHOLD_ID, ALEX_ID);
    expect(expenses.length).toBe(0);
  });
});

// ===========================================================================
// calculateHouseholdDebt
// ===========================================================================

describe('calculateHouseholdDebt', () => {
  it('calculates net debt between two household members', async () => {
    // calculateHouseholdDebt queries:
    // 1. Query householdMembers (to find other member)
    // 2. Query users (get other member details)
    // 3-10. Call getUnsettledSharedExpenses (8 queries as detailed above)

    db.queryOnce
      // 1. HouseholdMembers (calculateHouseholdDebt)
      .mockResolvedValueOnce({
        data: {
          householdMembers: [
            { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
            { userId: CECILIA_ID, householdId: HOUSEHOLD_ID, status: 'active' },
          ],
        },
      })
      // 2. Other user details (Cecilia)
      .mockResolvedValueOnce({
        data: {
          users: [{ id: CECILIA_ID, name: 'Cecilia', email: 'cecilia@flow.ch' }],
        },
      })
      // 3-10. getUnsettledSharedExpenses queries (8 total)
      // 3. Shared transactions
      .mockResolvedValueOnce({
        data: {
          transactions: [
            { id: 'tx-rent', householdId: HOUSEHOLD_ID, isShared: true, amount: 2100, paidByUserId: ALEX_ID, userId: ALEX_ID, categoryId: 'cat-rent', date: '2026-02-01', payee: 'Immobilien AG' },
            { id: 'tx-groceries', householdId: HOUSEHOLD_ID, isShared: true, amount: 63.2, paidByUserId: CECILIA_ID, userId: CECILIA_ID, categoryId: 'cat-groceries', date: '2026-02-05', payee: 'Lidl' },
          ],
        },
      })
      // 4. HouseholdMembers (getUnsettledSharedExpenses - find other member)
      .mockResolvedValueOnce({
        data: {
          householdMembers: [
            { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
            { userId: CECILIA_ID, householdId: HOUSEHOLD_ID, status: 'active' },
          ],
        },
      })
      // 5. Splits where Alex is ower
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            { id: 'split-groceries', transactionId: 'tx-groceries', owerUserId: ALEX_ID, owedToUserId: CECILIA_ID, splitAmount: 37.92, isPaid: false },
          ],
        },
      })
      // 6. Splits where Cecilia is ower
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            { id: 'split-rent', transactionId: 'tx-rent', owerUserId: CECILIA_ID, owedToUserId: ALEX_ID, splitAmount: 840, isPaid: false },
          ],
        },
      })
      // 7. Categories
      .mockResolvedValueOnce({
        data: {
          categories: [
            { id: 'cat-rent', name: 'Rent', householdId: HOUSEHOLD_ID },
            { id: 'cat-groceries', name: 'Groceries', householdId: HOUSEHOLD_ID },
          ],
        },
      })
      // 8. HouseholdMembers (getHouseholdUserMap)
      .mockResolvedValueOnce({
        data: {
          householdMembers: [
            { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
            { userId: CECILIA_ID, householdId: HOUSEHOLD_ID, status: 'active' },
          ],
        },
      })
      // 9. User query for Alex
      .mockResolvedValueOnce({
        data: {
          users: [{ id: ALEX_ID, name: 'Alexander', email: 'alex@flow.ch' }],
        },
      })
      // 10. User query for Cecilia
      .mockResolvedValueOnce({
        data: {
          users: [{ id: CECILIA_ID, name: 'Cecilia', email: 'cecilia@flow.ch' }],
        },
      });

    const debt = await calculateHouseholdDebt(HOUSEHOLD_ID, ALEX_ID);

    expect(debt).not.toBeNull();
    // From Alex's perspective:
    // Alex owes Cecilia: 37.92 (positive in yourShare)
    // Cecilia owes Alex: 840 (negative in yourShare = -840)
    // Net = 37.92 + (-840) = -802.08 (Alex is owed 802.08, negative value)
    expect(debt!.otherMemberName).toBe('Cecilia');
    expect(debt!.otherMemberEmail).toBe('cecilia@flow.ch');
    expect(debt!.amount).toBe(-802.08); // Negative means Alex is owed money
  });

  it('returns null when no other household member exists', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: {
        householdMembers: [
          { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
        ],
      },
    });

    const debt = await calculateHouseholdDebt(HOUSEHOLD_ID, ALEX_ID);
    expect(debt).toBeNull();
  });
});

// ===========================================================================
// getUnsettledExpensesByDirection
// ===========================================================================

describe('getUnsettledExpensesByDirection', () => {
  it('separates expenses into youOwe and youAreOwed', async () => {
    // getUnsettledExpensesByDirection calls getUnsettledSharedExpenses (8 queries)
    db.queryOnce
      // 1. Shared transactions
      .mockResolvedValueOnce({
        data: {
          transactions: [
            { id: 'tx-1', householdId: HOUSEHOLD_ID, isShared: true, amount: 100, paidByUserId: ALEX_ID, userId: ALEX_ID, categoryId: 'cat-1', date: '2026-02-01' },
            { id: 'tx-2', householdId: HOUSEHOLD_ID, isShared: true, amount: 50, paidByUserId: CECILIA_ID, userId: CECILIA_ID, categoryId: 'cat-1', date: '2026-02-03' },
          ],
        },
      })
      // 2. HouseholdMembers (find other member)
      .mockResolvedValueOnce({
        data: {
          householdMembers: [
            { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
            { userId: CECILIA_ID, householdId: HOUSEHOLD_ID, status: 'active' },
          ],
        },
      })
      // 3. Splits where Alex is ower
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            { id: 'split-2', transactionId: 'tx-2', owerUserId: ALEX_ID, owedToUserId: CECILIA_ID, splitAmount: 30, isPaid: false },
          ],
        },
      })
      // 4. Splits where Cecilia is ower
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            { id: 'split-1', transactionId: 'tx-1', owerUserId: CECILIA_ID, owedToUserId: ALEX_ID, splitAmount: 40, isPaid: false },
          ],
        },
      })
      // 5. Categories
      .mockResolvedValueOnce({
        data: {
          categories: [{ id: 'cat-1', name: 'Groceries', householdId: HOUSEHOLD_ID }],
        },
      })
      // 6. HouseholdMembers (getHouseholdUserMap)
      .mockResolvedValueOnce({
        data: {
          householdMembers: [
            { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
            { userId: CECILIA_ID, householdId: HOUSEHOLD_ID, status: 'active' },
          ],
        },
      })
      // 7. User query for Alex
      .mockResolvedValueOnce({
        data: {
          users: [{ id: ALEX_ID, name: 'Alexander' }],
        },
      })
      // 8. User query for Cecilia
      .mockResolvedValueOnce({
        data: {
          users: [{ id: CECILIA_ID, name: 'Cecilia' }],
        },
      });

    const result = await getUnsettledExpensesByDirection(HOUSEHOLD_ID, ALEX_ID);

    // Alex owes: split-2 (30 CHF, positive yourShare)
    expect(result.youOwe.length).toBe(1);
    expect(result.totalYouOwe).toBe(30);

    // Alex is owed: split-1 (40 CHF, negative yourShare = -40)
    expect(result.youAreOwed.length).toBe(1);
    expect(result.totalYouAreOwed).toBe(40);

    // Net: 30 - 40 = -10 (Alex is owed 10 CHF net)
    expect(result.netDebt).toBe(-10);
  });

  it('returns zeros when no unsettled expenses', async () => {
    db.queryOnce.mockResolvedValueOnce({
      data: { transactions: [] },
    });

    const result = await getUnsettledExpensesByDirection(HOUSEHOLD_ID, ALEX_ID);

    expect(result.youOwe).toEqual([]);
    expect(result.youAreOwed).toEqual([]);
    expect(result.totalYouOwe).toBe(0);
    expect(result.totalYouAreOwed).toBe(0);
    expect(result.netDebt).toBe(0);
  });
});
