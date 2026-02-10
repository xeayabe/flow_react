/**
 * Composite Queries - Optimized InstantDB queries
 * FIXED: Handles users without households gracefully
 */

import { db } from './db';
import { getCurrentBudgetPeriod } from './budget-period-utils';

export interface DashboardData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  household: {
    id: string;
    name: string;
    currency: string;
  } | null;  // FIXED: Can be null
  member: {
    id: string;
    role: string;
    paydayDay: number;
  } | null;  // FIXED: Can be null
  accounts: Array<{
    id: string;
    name: string;
    institution: string;
    accountType: string;
    balance: number;
    isDefault: boolean;
    isExcludedFromBudget: boolean;
  }>;
  categories: Array<{
    id: string;
    name: string;
    type: 'income' | 'expense';
    categoryGroup: string;
    isDefault: boolean;
    icon?: string;
    color?: string;
  }>;
  categoryGroups: Array<{
    id: string;
    key: string;
    name: string;
    type: string;
    icon?: string;
    isDefault: boolean;
  }>;
  budgets: Array<{
    id: string;
    categoryId: string;
    allocatedAmount: number;
    spentAmount: number;
    percentage: number;
    categoryGroup: string;
  }>;
  budgetSummary: {
    totalIncome: number;
    totalAllocated: number;
    totalSpent: number;
  } | null;
  recentTransactions: Array<{
    id: string;
    type: 'income' | 'expense';
    amount: number;
    date: string;
    payee?: string;
    note?: string;
    isShared: boolean;
    categoryId: string;
    accountId: string;
  }>;
  budgetPeriod: {
    start: string;
    end: string;
    paydayDay: number;
    daysRemaining: number;
  };
  needsHouseholdSetup: boolean;  // FIXED: New flag
}

/**
 * Get all dashboard data in a SINGLE optimized query
 * FIXED: Handles users without households gracefully
 */
export async function getDashboardData(userEmail: string): Promise<DashboardData> {
  try {
    // Step 1: Get user with all linked data
    const result = await db.queryOnce({
      users: {
        $: { where: { email: userEmail.toLowerCase() } },
        memberships: {
          household: {
            categories: {
              $: { where: { isActive: true } },
            },
            categoryGroups: {
              $: { where: { isActive: true } },
            },
          },
        },
        accounts: {
          $: { where: { isActive: true } },
        },
        budgets: {
          $: { where: { isActive: true } },
          category: {},
        },
        budgetSummary: {},
      },
    });

    if (!result || !result.data) {
      throw new Error('No data returned from database');
    }

    const user = result.data.users?.[0];
    if (!user) {
      throw new Error('User not found');
    }

    // FIXED: Handle users without household membership gracefully
    const member = user.memberships?.[0];
    const household = member?.household;
    
    const needsHouseholdSetup = !member || !household;

    // If no household, return minimal data structure
    if (needsHouseholdSetup) {
      console.log('User has no household membership, showing setup screen');
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        household: null,
        member: null,
        accounts: [],
        categories: [],
        categoryGroups: [],
        budgets: [],
        budgetSummary: null,
        recentTransactions: [],
        budgetPeriod: {
          start: '',
          end: '',
          paydayDay: 25,
          daysRemaining: 0,
        },
        needsHouseholdSetup: true,
      };
    }

    // Calculate budget period from member's payday
    const paydayDay = member.paydayDay || household.paydayDay || 25;
    const budgetPeriod = getCurrentBudgetPeriod(paydayDay);

    // Step 2: Get transactions separately (with date filter)
    const transactionsResult = await db.queryOnce({
      transactions: {
        $: {
          where: {
            userId: user.id,
            date: { $gte: budgetPeriod.periodStartISO },
          },
          limit: 20,
          order: {
            serverCreatedAt: 'desc',
          },
        },
        category: {},
        account: {},
      },
    });

    // Safe access with defaults
    const transactions = transactionsResult?.data?.transactions || [];
    const accounts = user.accounts || [];
    const categories = household.categories || [];
    const categoryGroups = household.categoryGroups || [];
    const budgets = user.budgets || [];
    const budgetSummary = user.budgetSummary?.[0] || null;

    // Transform data to match expected format
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      household: {
        id: household.id,
        name: household.name,
        currency: household.currency,
      },
      member: {
        id: member.id,
        role: member.role || 'member',
        paydayDay: paydayDay,
      },
      accounts: accounts.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        institution: acc.institution,
        accountType: acc.accountType,
        balance: acc.balance,
        isDefault: acc.isDefault,
        isExcludedFromBudget: acc.isExcludedFromBudget || false,
      })),
      categories: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        categoryGroup: cat.categoryGroup,
        isDefault: cat.isDefault,
        icon: cat.icon,
        color: cat.color,
      })),
      categoryGroups: categoryGroups.map((group: any) => ({
        id: group.id,
        key: group.key,
        name: group.name,
        type: group.type,
        icon: group.icon,
        isDefault: group.isDefault,
      })),
      budgets: budgets.map((budget: any) => ({
        id: budget.id,
        categoryId: budget.categoryId,
        allocatedAmount: budget.allocatedAmount,
        spentAmount: budget.spentAmount || 0,
        percentage: budget.percentage,
        categoryGroup: budget.categoryGroup,
      })),
      budgetSummary: budgetSummary
        ? {
            totalIncome: budgetSummary.totalIncome,
            totalAllocated: budgetSummary.totalAllocated,
            totalSpent: budgetSummary.totalSpent || 0,
          }
        : null,
      recentTransactions: transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        payee: tx.payee,
        note: tx.note,
        isShared: tx.isShared,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
      })),
      budgetPeriod: {
        start: budgetPeriod.periodStartISO,
        end: budgetPeriod.periodEndISO,
        paydayDay: paydayDay,
        daysRemaining: budgetPeriod.daysRemaining,
      },
      needsHouseholdSetup: false,
    };
  } catch (error) {
    console.error('Error in getDashboardData:', error);
    throw error;
  }
}

/**
 * Get household data for debt widget (optimized)
 */
export async function getHouseholdDebtData(userId: string, householdId: string) {
  try {
    const result = await db.queryOnce({
      householdMembers: {
        $: {
          where: {
            householdId,
            status: 'active',
          },
        },
        user: {},
      },
      shared_expense_splits: {
        $: {
          where: {
            owerUserId: userId,
            isPaid: false,
          },
        },
      },
    });

    const members = result?.data?.householdMembers || [];
    const splits = result?.data?.shared_expense_splits || [];

    // Calculate total debt
    const totalDebt = splits.reduce((sum: number, split: any) => sum + split.splitAmount, 0);

    // Find partner (other active member)
    const partner = members.find((m: any) => m.userId !== userId);

    return {
      members,
      partner: partner
        ? {
            id: partner.userId,
            name: partner.user?.name || 'Partner',
            email: partner.user?.email || '',
          }
        : null,
      debtAmount: totalDebt,
      hasUnsettledExpenses: totalDebt > 0,
    };
  } catch (error) {
    console.error('Error in getHouseholdDebtData:', error);
    return {
      members: [],
      partner: null,
      debtAmount: 0,
      hasUnsettledExpenses: false,
    };
  }
}