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
      paydayDay: i.number().optional(), // 1-31 or -1 for last day (fallback for legacy)
      splitMethod: i.string().optional(), // 'automatic' or 'manual'
      manualSplitRatios: i.json().optional(), // JSON: { userId1: 60, userId2: 40 }
    }),
    householdMembers: i.entity({
      householdId: i.string(),
      userId: i.string(),
      status: i.string(), // 'active' | 'inactive' | 'removed'
      role: i.string().optional(), // 'admin' | 'member' (admin = household creator)
      paydayDay: i.number().optional(), // 1-31 or -1 for last day (source of truth for budget period)
      removedAt: i.number().optional(), // Timestamp when removed
      removedBy: i.string().optional(), // userId of admin who removed
    }),
    accounts: i.entity({
      userId: i.string(),
      name: i.string(),
      institution: i.string(),
      accountType: i.string(),
      balance: i.number(),
      currency: i.string(),
      last4Digits: i.string().optional(),
      isDefault: i.boolean(),
      isActive: i.boolean(),
      isExcludedFromBudget: i.boolean().optional(), // Exclude wallet from budget calculations
    }),
    categories: i.entity({
      householdId: i.string(),
      name: i.string(),
      type: i.string(), // 'income' | 'expense'
      categoryGroup: i.string(), // 'needs' | 'wants' | 'savings' | 'income' | 'other'
      isShareable: i.boolean(),
      isDefault: i.boolean(),
      createdByUserId: i.string().optional(),
      isActive: i.boolean(),
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
      payee: i.string().optional(), // Merchant/vendor name (e.g., "Migros", "Coop", "Netflix")
      isShared: i.boolean(),
      paidByUserId: i.string().optional(),
      isExcludedFromBudget: i.boolean().optional(), // Exclude transaction from budget calculations
      // Settlement tracking
      settled: i.boolean().optional(), // true if this expense has been settled
      settledAt: i.number().optional(), // Timestamp when settled
      settlementId: i.string().optional(), // Links to settlements.id
      // Recurring transaction tracking
      createdFromTemplateId: i.string().optional(), // Links to recurringTemplates.id
    }),
    budgets: i.entity({
      userId: i.string(),
      categoryId: i.string(),
      allocatedAmount: i.number(), // Budget amount in CHF
      spentAmount: i.number().optional(), // Calculated from transactions, default 0
      percentage: i.number(), // (allocatedAmount / totalIncome) * 100
      categoryGroup: i.string(), // 'needs' | 'wants' | 'savings' | 'other'
      isActive: i.boolean().optional(), // default true
    }),
    budgetSummary: i.entity({
      userId: i.string(),
      totalIncome: i.number(), // Monthly income set by user
      totalAllocated: i.number(), // Sum of all category budgets
      totalSpent: i.number().optional(), // Sum of spent_amount, default 0
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
    }),
    settlements: i.entity({
      householdId: i.string(),
      payerUserId: i.string(), // Who paid (member who owes)
      receiverUserId: i.string(), // Who received (member who is owed)
      amount: i.number(), // Settlement amount in CHF
      paymentMethod: i.string().optional(), // How they settled (e.g., 'internal_transfer', 'cash', 'bank_transfer')
      categoryId: i.string().optional(), // Category for budget tracking (optional)
      note: i.string().optional(), // Optional note
      settledExpenses: i.json().optional(), // JSON array of transaction IDs that were settled: string[]
      settledAt: i.number(), // Timestamp when settled
      createdAt: i.number().optional(), // Timestamp when settlement record created
    }),
    payee_category_mappings: i.entity({
      userId: i.string(), // Personal to each user (like categories)
      payee: i.string(), // Normalized payee name (lowercase trimmed) - for lookups
      displayName: i.string(), // Original display name with user's capitalization
      categoryId: i.string(), // Last selected category
      lastUsedAt: i.number(), // Timestamp of last use
      usageCount: i.number(), // How many times used (for analytics)
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    recurringTemplates: i.entity({
      userId: i.string(),
      householdId: i.string(),
      amount: i.number(),
      categoryId: i.string(),
      accountId: i.string(), // wallet ID
      recurringDay: i.number(), // 1-31, day of month when transaction should be created
      payee: i.string().optional(),
      note: i.string().optional(),
      isActive: i.boolean(), // false = deleted/deactivated
      createdAt: i.number(),
      lastCreatedDate: i.string().optional(), // ISO date string (YYYY-MM-DD) of last transaction created
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
