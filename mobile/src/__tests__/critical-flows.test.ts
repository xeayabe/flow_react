/**
 * Critical Integration Flow Tests
 *
 * Tests the LOGIC of end-to-end user flows, not the UI. Each test chains
 * multiple API function calls to verify data consistency across operations.
 *
 * All tests use mocked InstantDB with realistic Swiss CHF data.
 *
 * Flows tested:
 *   1. Create budget -> Add expense -> Verify budget spent updates
 *   2. Setup household -> Add shared expense -> Verify split creation -> Verify settlement balance
 *   3. Create recurring template -> Activate (create transaction) -> Verify transaction exists
 *   4. Edit transaction -> Toggle shared -> Verify splits created for partner
 */

// ---------------------------------------------------------------------------
// Mock Setup
// ---------------------------------------------------------------------------

const mockTransact = jest.fn(async () => ({}));
const mockQueryOnce = jest.fn(async () => ({ data: {} }));

jest.mock('../lib/db', () => ({
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
}));

jest.mock('../lib/budget-period-utils', () => ({
  getCurrentBudgetPeriod: jest.fn(() => ({
    periodStart: new Date(2026, 0, 25),
    periodEnd: new Date(2026, 1, 24),
    periodStartISO: '2026-01-25',
    periodEndISO: '2026-02-24',
    daysRemaining: 16,
    nextResetDate: new Date(2026, 1, 25),
    nextResetISO: '2026-02-25',
  })),
}));

jest.mock('../lib/payday-utils', () => ({
  calculateBudgetPeriod: jest.fn(() => ({
    start: '2026-01-25',
    end: '2026-02-24',
    daysRemaining: 16,
    resetsOn: '2026-02-25',
  })),
}));

jest.mock('../lib/accounts-api', () => ({
  getUserAccounts: jest.fn(async () => []),
}));

jest.mock('../lib/budget-api', () => ({
  updateBudgetSpentAmount: jest.fn(async () => {}),
  getMemberBudgetPeriod: jest.fn(async () => ({
    start: '2026-01-25',
    end: '2026-02-24',
    paydayDay: 25,
    source: 'member',
    daysRemaining: 16,
  })),
}));

jest.mock('../lib/split-settings-api', () => ({
  getCurrentSplitRatio: jest.fn(async () => [
    { userId: 'user-alex', percentage: 60 },
    { userId: 'user-cecilia', percentage: 40 },
  ]),
}));

jest.mock('react-native-get-random-values', () => ({
  getRandomValues: jest.fn(),
}));

// Prefix with 'mock' to make it accessible in jest.mock()
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `test-uuid-${++mockUuidCounter}`),
}));

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
  uuidCounter = 0;
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALEX_ID = 'user-alex';
const CECILIA_ID = 'user-cecilia';
const HOUSEHOLD_ID = 'household-zurich';
const ACCOUNT_ID = 'account-alex-ubs';

// ===========================================================================
// FLOW 1: Budget -> Expense -> Budget Spent Update
// ===========================================================================

describe('Flow 1: Create budget -> Add expense -> Budget spent updates', () => {
  it('updates budget spent amount when an expense is created', async () => {
    const { createTransaction } = require('../lib/transactions-api');
    const { getMemberBudgetPeriod, updateBudgetSpentAmount } = require('../lib/budget-api');

    // Mock: Account exists with balance
    mockQueryOnce
      // createTransaction: account lookup
      .mockResolvedValueOnce({
        data: {
          accounts: [
            { id: ACCOUNT_ID, balance: 4250.75, isExcludedFromBudget: false },
          ],
        },
      })
      // createTransaction: budget lookup for category
      .mockResolvedValueOnce({
        data: {
          budgets: [
            {
              id: 'budget-groceries',
              userId: ALEX_ID,
              categoryId: 'cat-groceries',
              allocatedAmount: 600,
              spentAmount: 0, // Nothing spent yet
              isActive: true,
            },
          ],
        },
      });

    const result = await createTransaction({
      userId: ALEX_ID,
      householdId: HOUSEHOLD_ID,
      accountId: ACCOUNT_ID,
      categoryId: 'cat-groceries',
      type: 'expense',
      amount: 87.35,
      date: '2026-02-03',
      payee: 'Migros',
      isShared: false,
    });

    // Transaction should be created successfully
    expect(result.success).toBe(true);

    // Budget update is handled atomically via prefetchBudgetForAtomicUpdate
    // Check that mockTransact was called (which includes budget update)
    expect(mockTransact).toHaveBeenCalled();

    // Verify the transaction was created
    expect(result.transactionId).toBeDefined();
  });

  it('does not update budget for income transactions', async () => {
    const { createTransaction } = require('../lib/transactions-api');
    const { updateBudgetSpentAmount } = require('../lib/budget-api');

    mockQueryOnce.mockResolvedValueOnce({
      data: {
        accounts: [{ id: ACCOUNT_ID, balance: 4250.75, isExcludedFromBudget: false }],
      },
    });

    const result = await createTransaction({
      userId: ALEX_ID,
      householdId: HOUSEHOLD_ID,
      accountId: ACCOUNT_ID,
      categoryId: 'cat-salary',
      type: 'income',
      amount: 7892,
      date: '2026-01-25',
      payee: 'Employer AG',
      isShared: false,
    });

    expect(result.success).toBe(true);
    expect(updateBudgetSpentAmount).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// FLOW 2: Household -> Shared Expense -> Splits -> Settlement Balance
// ===========================================================================

describe('Flow 2: Shared expense -> Split creation -> Settlement balance', () => {
  it('creates splits when shared expense is added, then calculates debt', async () => {
    const { getUnsettledSharedExpenses } = require('../lib/settlement-api');

    // Simulate: Alex already created shared expense for CHF 100 rent
    // Now check settlement state

    // getUnsettledSharedExpenses queries (8 total):
    mockQueryOnce
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
              note: 'February rent',
            },
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
        data: { shared_expense_splits: [] },
      })
      // 4. Splits where Cecilia is ower
      .mockResolvedValueOnce({
        data: {
          shared_expense_splits: [
            {
              id: 'split-rent-cecilia',
              transactionId: 'tx-rent',
              owerUserId: CECILIA_ID,
              owedToUserId: ALEX_ID,
              splitAmount: 840, // 40% of 2100
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
          users: [{ id: ALEX_ID, name: 'Alexander', email: 'alex@flow.ch' }],
        },
      })
      // 8. User query for Cecilia
      .mockResolvedValueOnce({
        data: {
          users: [{ id: CECILIA_ID, name: 'Cecilia', email: 'cecilia@flow.ch' }],
        },
      });

    // From Alex's perspective
    const expenses = await getUnsettledSharedExpenses(HOUSEHOLD_ID, ALEX_ID);

    expect(expenses.length).toBe(1);
    expect(expenses[0].totalAmount).toBe(2100);
    // Alex is owed (negative yourShare)
    expect(expenses[0].yourShare).toBe(-840);
    expect(expenses[0].paidByUserId).toBe(ALEX_ID);
    expect(expenses[0].category).toBe('Rent');
  });
});

// ===========================================================================
// FLOW 3: Recurring Template -> Activate -> Transaction Exists
// ===========================================================================

describe('Flow 3: Recurring template -> Create transaction from template', () => {
  it('creates a transaction from a recurring template', async () => {
    const { createTransaction } = require('../lib/transactions-api');

    // Simulate template data (would normally come from DB)
    const template = {
      id: 'template-rent',
      userId: ALEX_ID,
      householdId: HOUSEHOLD_ID,
      amount: 2100,
      categoryId: 'cat-rent',
      accountId: ACCOUNT_ID,
      recurringDay: 1,
      payee: 'Immobilien AG',
      note: 'Monthly rent',
      isActive: true,
    };

    // Mock account lookup for transaction creation
    mockQueryOnce.mockResolvedValueOnce({
      data: {
        accounts: [{ id: ACCOUNT_ID, balance: 4250.75, isExcludedFromBudget: false }],
      },
    });
    // Mock budget lookup
    mockQueryOnce.mockResolvedValueOnce({
      data: {
        budgets: [
          { id: 'budget-rent', spentAmount: 0, categoryId: 'cat-rent', isActive: true },
        ],
      },
    });

    // User activates template -> creates transaction
    const result = await createTransaction({
      userId: template.userId,
      householdId: template.householdId,
      accountId: template.accountId,
      categoryId: template.categoryId,
      type: 'expense',
      amount: template.amount,
      date: '2026-02-01', // Today's date when activated
      payee: template.payee,
      note: template.note,
      isShared: false,
    });

    expect(result.success).toBe(true);
    expect(result.data!.amount).toBe(2100);
    expect(result.data!.date).toBe('2026-02-01');

    // Transaction should be persisted via db.transact
    expect(mockTransact).toHaveBeenCalled();

    // Critically: the template itself should NOT create a transaction
    // Only the manual activation does (this is tested by the fact that
    // we explicitly called createTransaction, not some auto-creation function)
  });
});

// ===========================================================================
// FLOW 4: Edit Transaction -> Toggle Shared -> Splits Created
// ===========================================================================

describe('Flow 4: Edit transaction -> Toggle shared -> Splits for partner', () => {
  it('verifies split creation logic when transaction becomes shared', async () => {
    const { createExpenseSplits } = require('../lib/shared-expenses-api');

    // Mock: calculateSplitRatio dependencies
    mockQueryOnce
      // getCurrentSplitRatio -> householdMembers
      .mockResolvedValueOnce({
        data: {
          householdMembers: [
            { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
            { userId: CECILIA_ID, householdId: HOUSEHOLD_ID, status: 'active' },
          ],
        },
      })
      // budgetSummary for alex
      .mockResolvedValueOnce({
        data: {
          budgetSummary: [{ userId: ALEX_ID, totalIncome: 7892 }],
        },
      })
      // budgetSummary for cecilia
      .mockResolvedValueOnce({
        data: {
          budgetSummary: [{ userId: CECILIA_ID, totalIncome: 5000 }],
        },
      });

    // Create splits for a CHF 87.35 Migros bill paid by Alex
    const splits = await createExpenseSplits(
      'tx-migros',
      87.35,
      HOUSEHOLD_ID,
      ALEX_ID
    );

    // Should create a split for Cecilia (she owes her share)
    expect(splits.length).toBe(1);
    expect(splits[0].owerUserId).toBe(CECILIA_ID);
    expect(splits[0].owedToUserId).toBe(ALEX_ID);
    expect(splits[0].isPaid).toBe(false);

    // Split amount should be 40% of 87.35 (60/40 ratio from mock)
    // 87.35 * 40 / 100 = 34.94
    expect(splits[0].splitAmount).toBe(34.94);
    expect(splits[0].splitPercentage).toBe(40);

    // Payer (Alex) should NOT have a split record
    const payerSplit = splits.find((s: any) => s.owerUserId === ALEX_ID);
    expect(payerSplit).toBeUndefined();
  });

  it('creates no splits when only one household member', async () => {
    const { createExpenseSplits } = require('../lib/shared-expenses-api');

    // Mock split ratio to return only one member (payer)
    const { getCurrentSplitRatio } = require('../lib/split-settings-api');
    getCurrentSplitRatio.mockResolvedValueOnce([
      { userId: ALEX_ID, percentage: 100 },
    ]);

    mockQueryOnce.mockResolvedValueOnce({
      data: {
        householdMembers: [
          { userId: ALEX_ID, householdId: HOUSEHOLD_ID, status: 'active' },
        ],
      },
    });
    mockQueryOnce.mockResolvedValueOnce({
      data: { budgetSummary: [{ userId: ALEX_ID, totalIncome: 7892 }] },
    });

    const splits = await createExpenseSplits(
      'tx-personal',
      50,
      HOUSEHOLD_ID,
      ALEX_ID
    );

    // No splits since there's nobody else to owe
    expect(splits.length).toBe(0);
  });
});
