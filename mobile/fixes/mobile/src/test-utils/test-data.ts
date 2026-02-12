/**
 * Realistic Swiss test data for Flow test suite
 *
 * All monetary values in CHF. Scenarios reflect typical Swiss household
 * budgeting patterns (rent in Zurich, Migros/Coop groceries, SBB transport, etc.)
 */

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const testUsers = {
  alex: {
    id: 'user-alex-0001',
    email: 'alex@flow.ch',
    name: 'Alexander',
    emailVerified: true,
    isActive: true,
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
  },
  cecilia: {
    id: 'user-cecilia-0002',
    email: 'cecilia@flow.ch',
    name: 'Cecilia',
    emailVerified: true,
    isActive: true,
    createdAt: Date.now() - 85 * 24 * 60 * 60 * 1000,
  },
};

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

export const testHousehold = {
  id: 'household-zurich-001',
  name: "Alex & Cecilia's Household",
  currency: 'CHF',
  paydayDay: 25, // Legacy fallback
  splitMethod: 'manual',
  manualSplitRatios: {
    [testUsers.alex.id]: 60,
    [testUsers.cecilia.id]: 40,
  },
};

// ---------------------------------------------------------------------------
// Household Members
// ---------------------------------------------------------------------------

export const testMembers = {
  alex: {
    id: 'member-alex-001',
    householdId: testHousehold.id,
    userId: testUsers.alex.id,
    status: 'active',
    role: 'admin',
    paydayDay: 25, // Source of truth for budget period
  },
  cecilia: {
    id: 'member-cecilia-001',
    householdId: testHousehold.id,
    userId: testUsers.cecilia.id,
    status: 'active',
    role: 'member',
    paydayDay: 25,
  },
};

// ---------------------------------------------------------------------------
// Accounts (Wallets)
// ---------------------------------------------------------------------------

export const testAccounts = {
  alexUBS: {
    id: 'account-alex-ubs',
    userId: testUsers.alex.id,
    name: 'UBS Privatkonto',
    institution: 'UBS',
    accountType: 'checking',
    balance: 4250.75,
    currency: 'CHF',
    last4Digits: '4521',
    isDefault: true,
    isActive: true,
    isExcludedFromBudget: false,
  },
  alexSavings: {
    id: 'account-alex-savings',
    userId: testUsers.alex.id,
    name: 'UBS Sparkonto',
    institution: 'UBS',
    accountType: 'savings',
    balance: 15000.0,
    currency: 'CHF',
    isDefault: false,
    isActive: true,
    isExcludedFromBudget: true, // Savings excluded from budget
  },
  ceciliaPostFinance: {
    id: 'account-cecilia-pf',
    userId: testUsers.cecilia.id,
    name: 'PostFinance Privatkonto',
    institution: 'PostFinance',
    accountType: 'checking',
    balance: 3120.5,
    currency: 'CHF',
    last4Digits: '7892',
    isDefault: true,
    isActive: true,
    isExcludedFromBudget: false,
  },
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const testCategories = {
  // Needs
  rent: {
    id: 'cat-rent',
    householdId: testHousehold.id,
    name: 'Rent',
    type: 'expense',
    categoryGroup: 'needs',
    isShareable: true,
    isDefault: true,
    isActive: true,
  },
  groceries: {
    id: 'cat-groceries',
    householdId: testHousehold.id,
    name: 'Groceries',
    type: 'expense',
    categoryGroup: 'needs',
    isShareable: true,
    isDefault: true,
    isActive: true,
  },
  transport: {
    id: 'cat-transport',
    householdId: testHousehold.id,
    name: 'Transportation',
    type: 'expense',
    categoryGroup: 'needs',
    isShareable: false,
    isDefault: true,
    isActive: true,
  },
  insurance: {
    id: 'cat-insurance',
    householdId: testHousehold.id,
    name: 'Insurance',
    type: 'expense',
    categoryGroup: 'needs',
    isShareable: false,
    isDefault: true,
    isActive: true,
  },
  utilities: {
    id: 'cat-utilities',
    householdId: testHousehold.id,
    name: 'Utilities',
    type: 'expense',
    categoryGroup: 'needs',
    isShareable: true,
    isDefault: true,
    isActive: true,
  },

  // Wants
  diningOut: {
    id: 'cat-dining',
    householdId: testHousehold.id,
    name: 'Dining Out',
    type: 'expense',
    categoryGroup: 'wants',
    isShareable: true,
    isDefault: true,
    isActive: true,
  },
  entertainment: {
    id: 'cat-entertainment',
    householdId: testHousehold.id,
    name: 'Entertainment',
    type: 'expense',
    categoryGroup: 'wants',
    isShareable: true,
    isDefault: true,
    isActive: true,
  },
  subscriptions: {
    id: 'cat-subscriptions',
    householdId: testHousehold.id,
    name: 'Subscriptions',
    type: 'expense',
    categoryGroup: 'wants',
    isShareable: false,
    isDefault: true,
    isActive: true,
  },

  // Savings
  emergencyFund: {
    id: 'cat-emergency',
    householdId: testHousehold.id,
    name: 'Emergency Fund',
    type: 'expense',
    categoryGroup: 'savings',
    isShareable: false,
    isDefault: true,
    isActive: true,
  },
  investments: {
    id: 'cat-investments',
    householdId: testHousehold.id,
    name: 'Investments',
    type: 'expense',
    categoryGroup: 'savings',
    isShareable: false,
    isDefault: true,
    isActive: true,
  },

  // Income
  salary: {
    id: 'cat-salary',
    householdId: testHousehold.id,
    name: 'Salary',
    type: 'income',
    categoryGroup: 'income',
    isShareable: false,
    isDefault: true,
    isActive: true,
  },
};

// ---------------------------------------------------------------------------
// Transactions (realistic Swiss scenario for Jan 25 - Feb 24 period)
// ---------------------------------------------------------------------------

export const testTransactions = {
  alexSalary: {
    id: 'tx-alex-salary',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    accountId: testAccounts.alexUBS.id,
    categoryId: testCategories.salary.id,
    type: 'income',
    amount: 7892.0, // Typical Swiss salary after deductions
    date: '2026-01-25',
    note: 'January salary',
    payee: 'Employer AG',
    isShared: false,
    isExcludedFromBudget: false,
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
  },
  alexRent: {
    id: 'tx-alex-rent',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    accountId: testAccounts.alexUBS.id,
    categoryId: testCategories.rent.id,
    type: 'expense',
    amount: 2100.0, // Typical Zurich 3.5-room apartment
    date: '2026-02-01',
    note: 'February rent',
    payee: 'Immobilien AG',
    isShared: true,
    paidByUserId: testUsers.alex.id,
    isExcludedFromBudget: false,
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
  },
  alexMigros: {
    id: 'tx-alex-migros',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    accountId: testAccounts.alexUBS.id,
    categoryId: testCategories.groceries.id,
    type: 'expense',
    amount: 87.35,
    date: '2026-02-03',
    note: 'Weekly groceries',
    payee: 'Migros',
    isShared: true,
    paidByUserId: testUsers.alex.id,
    isExcludedFromBudget: false,
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  },
  alexCoop: {
    id: 'tx-alex-coop',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    accountId: testAccounts.alexUBS.id,
    categoryId: testCategories.groceries.id,
    type: 'expense',
    amount: 52.9,
    date: '2026-02-06',
    payee: 'Coop',
    isShared: true,
    paidByUserId: testUsers.alex.id,
    isExcludedFromBudget: false,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  },
  alexSBB: {
    id: 'tx-alex-sbb',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    accountId: testAccounts.alexUBS.id,
    categoryId: testCategories.transport.id,
    type: 'expense',
    amount: 220.0,
    date: '2026-01-28',
    payee: 'SBB',
    note: 'GA Halbtax monthly pass',
    isShared: false,
    isExcludedFromBudget: false,
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
  alexDining: {
    id: 'tx-alex-dining',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    accountId: testAccounts.alexUBS.id,
    categoryId: testCategories.diningOut.id,
    type: 'expense',
    amount: 45.5,
    date: '2026-02-07',
    payee: 'Restaurant Kronenhalle',
    isShared: true,
    paidByUserId: testUsers.alex.id,
    isExcludedFromBudget: false,
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
  },
  ceciliaGroceries: {
    id: 'tx-cecilia-groceries',
    userId: testUsers.cecilia.id,
    householdId: testHousehold.id,
    accountId: testAccounts.ceciliaPostFinance.id,
    categoryId: testCategories.groceries.id,
    type: 'expense',
    amount: 63.2,
    date: '2026-02-05',
    payee: 'Lidl',
    isShared: true,
    paidByUserId: testUsers.cecilia.id,
    isExcludedFromBudget: false,
    createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
  },
};

// ---------------------------------------------------------------------------
// Budgets (Alex's budget for current period, CHF 7'892 income)
// ---------------------------------------------------------------------------

export const testBudgets = {
  alexRentBudget: {
    id: 'budget-alex-rent',
    userId: testUsers.alex.id,
    categoryId: testCategories.rent.id,
    allocatedAmount: 2100.0,
    spentAmount: 2100.0,
    percentage: 26.6,
    categoryGroup: 'needs',
    isActive: true,
  },
  alexGroceriesBudget: {
    id: 'budget-alex-groceries',
    userId: testUsers.alex.id,
    categoryId: testCategories.groceries.id,
    allocatedAmount: 600.0,
    spentAmount: 140.25, // 87.35 + 52.90
    percentage: 7.6,
    categoryGroup: 'needs',
    isActive: true,
  },
  alexTransportBudget: {
    id: 'budget-alex-transport',
    userId: testUsers.alex.id,
    categoryId: testCategories.transport.id,
    allocatedAmount: 250.0,
    spentAmount: 220.0,
    percentage: 3.2,
    categoryGroup: 'needs',
    isActive: true,
  },
  alexDiningBudget: {
    id: 'budget-alex-dining',
    userId: testUsers.alex.id,
    categoryId: testCategories.diningOut.id,
    allocatedAmount: 300.0,
    spentAmount: 45.5,
    percentage: 3.8,
    categoryGroup: 'wants',
    isActive: true,
  },
  alexEntertainmentBudget: {
    id: 'budget-alex-entertainment',
    userId: testUsers.alex.id,
    categoryId: testCategories.entertainment.id,
    allocatedAmount: 200.0,
    spentAmount: 0,
    percentage: 2.5,
    categoryGroup: 'wants',
    isActive: true,
  },
  alexEmergencyBudget: {
    id: 'budget-alex-emergency',
    userId: testUsers.alex.id,
    categoryId: testCategories.emergencyFund.id,
    allocatedAmount: 500.0,
    spentAmount: 0,
    percentage: 6.3,
    categoryGroup: 'savings',
    isActive: true,
  },
};

// ---------------------------------------------------------------------------
// Budget Summary
// ---------------------------------------------------------------------------

export const testBudgetSummary = {
  alex: {
    id: 'summary-alex-001',
    userId: testUsers.alex.id,
    totalIncome: 7892.0,
    totalAllocated: 3950.0,
    totalSpent: 2505.75,
  },
};

// ---------------------------------------------------------------------------
// Shared Expense Splits (60/40 ratio, Alex pays, Cecilia owes 40%)
// ---------------------------------------------------------------------------

export const testSplits = {
  rentSplit: {
    id: 'split-rent-001',
    transactionId: testTransactions.alexRent.id,
    owerUserId: testUsers.cecilia.id,
    owedToUserId: testUsers.alex.id,
    splitAmount: 840.0, // 40% of 2100
    splitPercentage: 40.0,
    isPaid: false,
  },
  migrosSplit: {
    id: 'split-migros-001',
    transactionId: testTransactions.alexMigros.id,
    owerUserId: testUsers.cecilia.id,
    owedToUserId: testUsers.alex.id,
    splitAmount: 34.94, // 40% of 87.35
    splitPercentage: 40.0,
    isPaid: false,
  },
  coopSplit: {
    id: 'split-coop-001',
    transactionId: testTransactions.alexCoop.id,
    owerUserId: testUsers.cecilia.id,
    owedToUserId: testUsers.alex.id,
    splitAmount: 21.16, // 40% of 52.90
    splitPercentage: 40.0,
    isPaid: false,
  },
  diningSplit: {
    id: 'split-dining-001',
    transactionId: testTransactions.alexDining.id,
    owerUserId: testUsers.cecilia.id,
    owedToUserId: testUsers.alex.id,
    splitAmount: 18.2, // 40% of 45.50
    splitPercentage: 40.0,
    isPaid: false,
  },
  // Cecilia paid for groceries, Alex owes 60%
  lidlSplit: {
    id: 'split-lidl-001',
    transactionId: testTransactions.ceciliaGroceries.id,
    owerUserId: testUsers.alex.id,
    owedToUserId: testUsers.cecilia.id,
    splitAmount: 37.92, // 60% of 63.20
    splitPercentage: 60.0,
    isPaid: false,
  },
};

// ---------------------------------------------------------------------------
// Recurring Templates
// ---------------------------------------------------------------------------

export const testRecurringTemplates = {
  rent: {
    id: 'template-rent',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    amount: 2100.0,
    categoryId: testCategories.rent.id,
    accountId: testAccounts.alexUBS.id,
    recurringDay: 1,
    payee: 'Immobilien AG',
    note: 'Monthly rent',
    isActive: true,
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastCreatedDate: '2026-02-01',
  },
  netflix: {
    id: 'template-netflix',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    amount: 17.9,
    categoryId: testCategories.subscriptions.id,
    accountId: testAccounts.alexUBS.id,
    recurringDay: 15,
    payee: 'Netflix',
    note: 'Standard plan',
    isActive: true,
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastCreatedDate: '2026-01-15',
  },
  sbb: {
    id: 'template-sbb',
    userId: testUsers.alex.id,
    householdId: testHousehold.id,
    amount: 220.0,
    categoryId: testCategories.transport.id,
    accountId: testAccounts.alexUBS.id,
    recurringDay: 28,
    payee: 'SBB',
    note: 'GA Halbtax monthly pass',
    isActive: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastCreatedDate: '2026-01-28',
  },
};

// ---------------------------------------------------------------------------
// Helper: Get all data as flat arrays for seeding
// ---------------------------------------------------------------------------

export function getAllTestData() {
  return {
    users: Object.values(testUsers),
    households: [testHousehold],
    householdMembers: Object.values(testMembers),
    accounts: Object.values(testAccounts),
    categories: Object.values(testCategories),
    transactions: Object.values(testTransactions),
    budgets: Object.values(testBudgets),
    budgetSummary: [testBudgetSummary.alex],
    shared_expense_splits: Object.values(testSplits),
    recurringTemplates: Object.values(testRecurringTemplates),
    settlements: [],
  };
}

/**
 * Seed all test data into the mock data store
 */
export function seedAllTestData(seedFn: (entity: string, records: any[]) => void): void {
  const allData = getAllTestData();
  for (const [entity, records] of Object.entries(allData)) {
    seedFn(entity, records);
  }
}
