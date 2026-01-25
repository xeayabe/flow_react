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
      // Personal budget fields (moved from households for per-member budget cycles)
      paydayDay: i.number().optional(), // 1-31 or -1 for last day
      payFrequency: i.string().optional(), // 'monthly'
      budgetPeriodStart: i.string().optional(), // ISO format YYYY-MM-DD
      budgetPeriodEnd: i.string().optional(), // ISO format YYYY-MM-DD
      lastBudgetReset: i.number().optional(), // timestamp
      monthlyIncome: i.number().optional(), // For shared expense splits
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
      isExcludedFromBudget: i.boolean().optional(), // Exclude wallet from budget calculations
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
      // DEPRECATED: icon and color are no longer used - emoji is stored directly in name field
      icon: i.string().optional(), // @deprecated
      color: i.string().optional(), // @deprecated
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
      isExcludedFromBudget: i.boolean().optional(), // Exclude transaction from budget calculations
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
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    categoryGroups: i.entity({
      householdId: i.string(),
      key: i.string(), // 'needs' | 'wants' | 'savings' | custom key
      name: i.string(), // Display name (e.g., "Needs", "Custom Group")
      type: i.string(), // 'expense' | 'income'
      icon: i.string().optional(),
      color: i.string().optional(),
      isDefault: i.boolean(), // true for needs, wants, savings; false for custom
      displayOrder: i.number().optional(), // For sorting
      isActive: i.boolean(),
      createdByUserId: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    household_invites: i.entity({
      householdId: i.string(),
      invitedByUserId: i.string(),
      inviteToken: i.string(),
      status: i.string(), // 'pending' | 'accepted' | 'expired'
      expiresAt: i.number(),
      acceptedByUserId: i.string().optional(),
      acceptedAt: i.number().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    shared_expense_splits: i.entity({
      transactionId: i.string(), // References transactions.id
      owerUserId: i.string(), // Who owes this portion (userId)
      owedToUserId: i.string(), // Who is owed (the person who paid)
      splitAmount: i.number(), // How much they owe (e.g., 40.00 CHF)
      splitPercentage: i.number(), // Their percentage (e.g., 40.0)
      isPaid: i.boolean(), // true if settled, false if still owed
      createdAt: i.number(),
      updatedAt: i.number().optional(),
    }),
    settlements: i.entity({
      householdId: i.string(),
      payerUserId: i.string(), // Who paid (e.g., Cecilia)
      receiverUserId: i.string(), // Who received (e.g., Alexander)
      amount: i.number(), // Settlement amount in CHF
      payerAccountId: i.string(), // Account debited
      receiverAccountId: i.string(), // Account credited
      categoryId: i.string().optional(), // Category for budget tracking
      note: i.string().optional(), // Optional note
      settledAt: i.number(), // Timestamp when settled
      createdAt: i.number(),
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
    categoryGroupsByHousehold: {
      forward: {
        on: 'categoryGroups',
        has: 'one',
        label: 'household',
      },
      reverse: {
        on: 'households',
        has: 'many',
        label: 'categoryGroups',
      },
    },
    householdInvitesByHousehold: {
      forward: {
        on: 'household_invites',
        has: 'one',
        label: 'household',
      },
      reverse: {
        on: 'households',
        has: 'many',
        label: 'invites',
      },
    },
    householdInvitesByInviter: {
      forward: {
        on: 'household_invites',
        has: 'one',
        label: 'invitedBy',
      },
      reverse: {
        on: 'users',
        has: 'many',
        label: 'sentInvites',
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
