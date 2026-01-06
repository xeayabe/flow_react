import { init, i } from '@instantdb/react-native';

// Define the database schema
const schema = i.schema({
  entities: {
    users: i.entity({
      email: i.string(),
      name: i.string(),
      emailVerified: i.boolean(),
      isActive: i.boolean(),
      createdAt: i.number(),
    }),
    households: i.entity({
      name: i.string(),
      currency: i.string(),
      createdByUserId: i.string(),
      paydayDay: i.number().optional(), // 1-31 or -1 for last day
      payFrequency: i.string().optional(), // 'monthly'
      budgetPeriodStart: i.string().optional(), // ISO format YYYY-MM-DD
      budgetPeriodEnd: i.string().optional(), // ISO format YYYY-MM-DD
      createdAt: i.number(),
      updatedAt: i.number().optional(),
    }),
    householdMembers: i.entity({
      householdId: i.string(),
      userId: i.string(),
      role: i.string(),
      status: i.string(),
      joinedAt: i.number(),
    }),
    accounts: i.entity({
      userId: i.string(),
      householdId: i.string(),
      name: i.string(),
      institution: i.string(),
      accountType: i.string(),
      balance: i.number(),
      startingBalance: i.number(),
      currency: i.string(),
      last4Digits: i.string().optional(),
      isDefault: i.boolean(),
      isActive: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    categories: i.entity({
      householdId: i.string(),
      name: i.string(),
      type: i.string(), // 'income' | 'expense'
      categoryGroup: i.string(), // 'needs' | 'wants' | 'savings' | 'income' | 'other'
      isShareable: i.boolean(),
      isDefault: i.boolean(),
      createdByUserId: i.string().optional(),
      icon: i.string().optional(),
      color: i.string().optional(),
      isActive: i.boolean(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    transactions: i.entity({
      userId: i.string(),
      householdId: i.string(),
      accountId: i.string(),
      categoryId: i.string(),
      type: i.string(), // 'income' | 'expense'
      amount: i.number(),
      date: i.string(), // ISO format YYYY-MM-DD
      note: i.string().optional(),
      isShared: i.boolean(),
      paidByUserId: i.string().optional(),
      isRecurring: i.boolean(),
      recurringDay: i.number().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    budgets: i.entity({
      userId: i.string(),
      householdId: i.string(),
      categoryId: i.string(),
      periodStart: i.string(), // ISO format YYYY-MM-DD
      periodEnd: i.string(), // ISO format YYYY-MM-DD
      allocatedAmount: i.number(), // Budget amount in CHF
      spentAmount: i.number().optional(), // Calculated from transactions, default 0
      percentage: i.number(), // (allocatedAmount / totalIncome) * 100
      categoryGroup: i.string(), // 'needs' | 'wants' | 'savings' | 'other'
      isActive: i.boolean().optional(), // default true
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    budgetSummary: i.entity({
      userId: i.string(),
      householdId: i.string(),
      periodStart: i.string(), // ISO format YYYY-MM-DD
      periodEnd: i.string(), // ISO format YYYY-MM-DD
      totalIncome: i.number(), // Monthly income set by user
      totalAllocated: i.number(), // Sum of all category budgets
      totalSpent: i.number().optional(), // Sum of spent_amount, default 0
      needsAllocated: i.number().optional(), // Sum of needs categories
      wantsAllocated: i.number().optional(), // Sum of wants categories
      savingsAllocated: i.number().optional(), // Sum of savings categories
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
  },
  links: {
    householdsByCreator: {
      forward: {
        on: 'households',
        has: 'one',
        label: 'createdBy',
      },
      reverse: {
        on: 'users',
        has: 'many',
        label: 'createdHouseholds',
      },
    },
    householdMembersByHousehold: {
      forward: {
        on: 'householdMembers',
        has: 'one',
        label: 'household',
      },
      reverse: {
        on: 'households',
        has: 'many',
        label: 'members',
      },
    },
    householdMembersByUser: {
      forward: {
        on: 'householdMembers',
        has: 'one',
        label: 'user',
      },
      reverse: {
        on: 'users',
        has: 'many',
        label: 'memberships',
      },
    },
    accountsByUser: {
      forward: {
        on: 'accounts',
        has: 'one',
        label: 'user',
      },
      reverse: {
        on: 'users',
        has: 'many',
        label: 'accounts',
      },
    },
    accountsByHousehold: {
      forward: {
        on: 'accounts',
        has: 'one',
        label: 'household',
      },
      reverse: {
        on: 'households',
        has: 'many',
        label: 'accounts',
      },
    },
    categoriesByHousehold: {
      forward: {
        on: 'categories',
        has: 'one',
        label: 'household',
      },
      reverse: {
        on: 'households',
        has: 'many',
        label: 'categories',
      },
    },
    categoriesByCreator: {
      forward: {
        on: 'categories',
        has: 'one',
        label: 'createdBy',
      },
      reverse: {
        on: 'users',
        has: 'many',
        label: 'createdCategories',
      },
    },
    transactionsByUser: {
      forward: {
        on: 'transactions',
        has: 'one',
        label: 'user',
      },
      reverse: {
        on: 'users',
        has: 'many',
        label: 'transactions',
      },
    },
    transactionsByAccount: {
      forward: {
        on: 'transactions',
        has: 'one',
        label: 'account',
      },
      reverse: {
        on: 'accounts',
        has: 'many',
        label: 'transactions',
      },
    },
    transactionsByCategory: {
      forward: {
        on: 'transactions',
        has: 'one',
        label: 'category',
      },
      reverse: {
        on: 'categories',
        has: 'many',
        label: 'transactions',
      },
    },
    transactionsByHousehold: {
      forward: {
        on: 'transactions',
        has: 'one',
        label: 'household',
      },
      reverse: {
        on: 'households',
        has: 'many',
        label: 'transactions',
      },
    },
  },
});

// Initialize InstantDB
const APP_ID = process.env.EXPO_PUBLIC_INSTANTDB_APP_ID || '';

export const db = init({
  appId: APP_ID,
  schema,
});

export type Schema = typeof schema;
