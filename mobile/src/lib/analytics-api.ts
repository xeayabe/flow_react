// FIX: SEC-003 - Replaced console.log/error with secure logger
// All queries in this file are already properly scoped by userId or householdId

import { db } from './db';
import { Transaction } from './transactions-api';
import { Category } from './categories-api';
import { logger } from './logger'; // FIX: SEC-003 - Secure logger

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryGroup: string; // Can be default keys or custom keys like 'custom_123456'
  amount: number;
  percentage: number;
  color: string;
  transactionCount: number;
}

export interface AnalyticsSummary {
  totalAmount: number;
  categoryCount: number;
  averagePerCategory: number;
  topCategory: CategorySpending | null;
  categoryBreakdown: CategorySpending[];
}

// Color palette for categories by group
const GROUP_COLORS: Record<string, string[]> = {
  needs: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
  wants: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7', '#FFFBEB'],
  savings: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#ECFDF5'],
  income: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF'],
  other: ['#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB'],
};

// Get color for a category based on its group and index
function getCategoryColor(categoryGroup: string, index: number): string {
  const colors = GROUP_COLORS[categoryGroup] || GROUP_COLORS.other;
  return colors[index % colors.length];
}

/**
 * Get transactions within a date range (excludes future transactions)
 */
export async function getTransactionsInRange(
  userId: string,
  startDate: string,
  endDate: string,
  type?: 'income' | 'expense'
): Promise<Transaction[]> {
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

    if (!result) {
      logger.error('Get transactions in range: Query returned null/undefined');
      return [];
    }

    if (!result.data) {
      logger.error('Get transactions in range: result.data is undefined', { result });
      return [];
    }

    let transactions = (result.data.transactions || []) as Transaction[];

    // Get today's date for future filtering
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const todayStr = today.toISOString().split('T')[0];

    // Filter by date range, exclude future transactions, AND exclude transactions marked as excluded from budget
    transactions = transactions.filter(
      (tx) =>
        tx.date >= startDate &&
        tx.date <= endDate &&
        tx.date <= todayStr &&
        tx.isExcludedFromBudget !== true // Exclude transactions marked to be excluded from budget
    );

    // Filter by type if specified
    if (type) {
      transactions = transactions.filter((tx) => tx.type === type);
    }

    return transactions;
  } catch (error) {
    logger.error('Get transactions in range error:', error); // FIX: SEC-003
    return [];
  }
}

/**
 * Calculate spending analytics by category
 */
export async function getCategoryAnalytics(
  userId: string,
  householdId: string,
  startDate: string,
  endDate: string,
  type: 'income' | 'expense' = 'expense'
): Promise<AnalyticsSummary> {
  try {
    // Get transactions in range
    const transactions = await getTransactionsInRange(userId, startDate, endDate, type);

    // Get categories
    const categoriesResult = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    const categories = (categoriesResult.data.categories || []) as Category[];
    const categoryMap = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.id) {
        categoryMap.set(cat.id, cat);
      }
    });

    // Aggregate by category
    const categoryTotals = new Map<string, { amount: number; count: number }>();

    transactions.forEach((tx) => {
      const existing = categoryTotals.get(tx.categoryId) || { amount: 0, count: 0 };
      categoryTotals.set(tx.categoryId, {
        amount: existing.amount + tx.amount,
        count: existing.count + 1,
      });
    });

    // Calculate total
    const totalAmount = Array.from(categoryTotals.values()).reduce(
      (sum, cat) => sum + cat.amount,
      0
    );
    // Round total to fix floating-point errors
    const roundedTotal = Math.round(totalAmount * 100) / 100;

    // Build category breakdown with colors
    const groupIndices: Record<string, number> = {};
    const categoryBreakdown: CategorySpending[] = [];

    // Sort by amount descending for assignment
    const sortedCategoryIds = Array.from(categoryTotals.keys()).sort((a, b) => {
      const amountA = categoryTotals.get(a)?.amount || 0;
      const amountB = categoryTotals.get(b)?.amount || 0;
      return amountB - amountA;
    });

    sortedCategoryIds.forEach((categoryId) => {
      const category = categoryMap.get(categoryId);
      const data = categoryTotals.get(categoryId);

      if (category && data) {
        const group = category.categoryGroup || 'other';
        groupIndices[group] = (groupIndices[group] || 0);
        const color = category.color || getCategoryColor(group, groupIndices[group]);
        groupIndices[group]++;

        // Round amount and percentage to fix floating-point precision
        const roundedAmount = Math.round(data.amount * 100) / 100;
        const percentage = roundedTotal > 0 ? Math.round((roundedAmount / roundedTotal) * 1000) / 10 : 0;

        categoryBreakdown.push({
          categoryId,
          categoryName: category.name,
          categoryGroup: category.categoryGroup,
          amount: roundedAmount,
          percentage,
          color,
          transactionCount: data.count,
        });
      }
    });

    // Get top category
    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // Calculate averages with rounding
    const averagePerCategory = categoryBreakdown.length > 0 ? Math.round((roundedTotal / categoryBreakdown.length) * 100) / 100 : 0;

    return {
      totalAmount: roundedTotal,
      categoryCount: categoryBreakdown.length,
      averagePerCategory,
      topCategory,
      categoryBreakdown,
    };
  } catch (error) {
    logger.error('Get category analytics error:', error); // FIX: SEC-003
    return {
      totalAmount: 0,
      categoryCount: 0,
      averagePerCategory: 0,
      topCategory: null,
      categoryBreakdown: [],
    };
  }
}

/**
 * Format ISO date (YYYY-MM-DD) to DD/MM/YYYY
 */
export function formatISOtoEuropean(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Get date range options
 */
export type DateRangeOption =
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'all_time';

export function getDateRange(option: DateRangeOption, paydayDay: number = 25): { start: string; end: string; label: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  logger.debug('getDateRange called', { option }); // FIX: SEC-003 - Don't log payday or date details

  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  switch (option) {
    case 'this_week': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(day - today.getDay() + 1); // Monday
      return {
        start: formatDate(startOfWeek),
        end: formatDate(today),
        label: 'This Week',
      };
    }
    case 'this_month': {
      // Use payday-based month
      let periodStart: Date;
      let periodEnd: Date;

      if (day >= paydayDay) {
        // Current period: payday this month to payday next month - 1
        periodStart = new Date(year, month, paydayDay);
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        periodEnd = new Date(nextYear, nextMonth, paydayDay - 1);
      } else {
        // Current period: payday last month to payday this month - 1
        const lastMonth = month === 0 ? 11 : month - 1;
        const lastYear = month === 0 ? year - 1 : year;
        periodStart = new Date(lastYear, lastMonth, paydayDay);
        periodEnd = new Date(year, month, paydayDay - 1); // Period ends day before next payday
      }

      return {
        start: formatDate(periodStart),
        end: formatDate(periodEnd),
        label: 'This Period',
      };
    }
    case 'last_month': {
      // Previous payday period
      let periodStart: Date;
      let periodEnd: Date;

      if (day >= paydayDay) {
        // Last period: payday of 2 months ago to payday last month - 1
        const twoMonthsAgo = month <= 1 ? 12 + (month - 2) : month - 2;
        const twoMonthsAgoYear = month <= 1 ? year - 1 : year;
        const lastMonth = month === 0 ? 11 : month - 1;
        const lastMonthYear = month === 0 ? year - 1 : year;

        periodStart = new Date(twoMonthsAgoYear, twoMonthsAgo, paydayDay);
        periodEnd = new Date(lastMonthYear, lastMonth, paydayDay - 1);
      } else {
        // Last period: payday of 2 months ago to payday last month - 1
        const twoMonthsAgo = month <= 1 ? 12 + (month - 2) : month - 2;
        const twoMonthsAgoYear = month <= 1 ? year - 1 : year;
        const lastMonth = month === 0 ? 11 : month - 1;
        const lastMonthYear = month === 0 ? year - 1 : year;

        periodStart = new Date(twoMonthsAgoYear, twoMonthsAgo, paydayDay);
        periodEnd = new Date(lastMonthYear, lastMonth, paydayDay - 1);
      }

      return {
        start: formatDate(periodStart),
        end: formatDate(periodEnd),
        label: 'Last Period',
      };
    }
    case 'last_3_months': {
      const threeMonthsAgo = new Date(year, month - 3, 1);
      return {
        start: formatDate(threeMonthsAgo),
        end: formatDate(today),
        label: 'Last 3 Months',
      };
    }
    case 'last_6_months': {
      const sixMonthsAgo = new Date(year, month - 6, 1);
      return {
        start: formatDate(sixMonthsAgo),
        end: formatDate(today),
        label: 'Last 6 Months',
      };
    }
    case 'this_year': {
      return {
        start: `${year}-01-01`,
        end: formatDate(today),
        label: 'This Year',
      };
    }
    case 'all_time':
    default: {
      return {
        start: '2020-01-01',
        end: formatDate(today),
        label: 'All Time',
      };
    }
  }
}

/**
 * NEW ANALYTICS API FUNCTIONS FOR REDESIGNED ANALYTICS SCREEN
 * Phase 1: Stub implementations (return mock data)
 * Phase 2: Full implementations
 */

/**
 * Get financial health summary for analytics dashboard
 */
export async function getHealthSummary(
  userId: string,
  householdId: string,
  periodStart: string,
  periodEnd: string
) {
  try {
    logger.debug('getHealthSummary called', { periodStart, periodEnd });

    // Fetch income and expense transactions for current period
    const incomeTransactions = await getTransactionsInRange(userId, periodStart, periodEnd, 'income');
    const expenseTransactions = await getTransactionsInRange(userId, periodStart, periodEnd, 'expense');

    logger.debug('Transactions fetched', {
      incomeCount: incomeTransactions.length,
      expenseCount: expenseTransactions.length,
      incomeTransactions: incomeTransactions.slice(0, 2),
      expenseTransactions: expenseTransactions.slice(0, 2)
    });

    // Calculate totals
    const income = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    logger.debug('Calculated totals', { income, expenses, expenseCount: expenseTransactions.length });

    // Calculate net position and savings rate
    const netPosition = income - expenses;
    const savingsRate = income > 0 ? Math.round((netPosition / income) * 1000) / 10 : 0;

    // Calculate trend by comparing to previous period
    const periodLength = new Date(periodEnd).getTime() - new Date(periodStart).getTime();
    const previousPeriodEnd = new Date(new Date(periodStart).getTime() - 86400000).toISOString().split('T')[0]; // Day before period start
    const previousPeriodStart = new Date(new Date(periodStart).getTime() - periodLength).toISOString().split('T')[0];

    const previousIncomeTransactions = await getTransactionsInRange(userId, previousPeriodStart, previousPeriodEnd, 'income');
    const previousExpenseTransactions = await getTransactionsInRange(userId, previousPeriodStart, previousPeriodEnd, 'expense');

    const previousIncome = previousIncomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const previousExpenses = previousExpenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const previousNetPosition = previousIncome - previousExpenses;

    // Calculate trend percentage
    const netPositionTrend = previousNetPosition !== 0
      ? Math.round(((netPosition - previousNetPosition) / Math.abs(previousNetPosition)) * 100)
      : 0;

    // Determine status based on savings rate
    let status: 'on-track' | 'progressing' | 'nearly-there' | 'flow-adjusted';
    if (savingsRate >= 20) {
      status = 'on-track';
    } else if (savingsRate >= 10) {
      status = 'progressing';
    } else if (savingsRate >= 0) {
      status = 'nearly-there';
    } else {
      status = 'flow-adjusted'; // Spending more than earning
    }

    return {
      netPosition: Math.round(netPosition * 100) / 100,
      netPositionTrend,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      savingsRate,
      status,
    };
  } catch (error) {
    logger.error('Get health summary error:', error);
    // Return safe defaults on error
    return {
      netPosition: 0,
      netPositionTrend: 0,
      income: 0,
      expenses: 0,
      savingsRate: 0,
      status: 'flow-adjusted' as const,
    };
  }
}

/**
 * Get category distribution for TreeMap
 */
export async function getCategoryDistribution(
  userId: string,
  householdId: string,
  periodStart: string,
  periodEnd: string
) {
  try {
    // Get expense transactions for the period
    const transactions = await getTransactionsInRange(userId, periodStart, periodEnd, 'expense');

    // Get categories
    const categoriesResult = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    if (!categoriesResult || !categoriesResult.data) {
      logger.error('Get category distribution: No categories data returned');
      return {
        categories: [],
        totalAmount: 0,
      };
    }

    const categories = (categoriesResult.data.categories || []) as Category[];
    const categoryMap = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.id) {
        categoryMap.set(cat.id, cat);
      }
    });

    // Aggregate by category
    const categoryTotals = new Map<string, { amount: number; count: number }>();

    transactions.forEach((tx) => {
      const existing = categoryTotals.get(tx.categoryId) || { amount: 0, count: 0 };
      categoryTotals.set(tx.categoryId, {
        amount: existing.amount + Math.abs(tx.amount),
        count: existing.count + 1,
      });
    });

    // Calculate total
    const totalAmount = Array.from(categoryTotals.values()).reduce(
      (sum, cat) => sum + cat.amount,
      0
    );
    const roundedTotal = Math.round(totalAmount * 100) / 100;

    // Sort by amount descending
    const sortedCategoryIds = Array.from(categoryTotals.keys()).sort((a, b) => {
      const amountA = categoryTotals.get(a)?.amount || 0;
      const amountB = categoryTotals.get(b)?.amount || 0;
      return amountB - amountA;
    });

    // Build category breakdown with colors and emojis
    const groupIndices: Record<string, number> = {};
    const categoryList: Array<{
      categoryId: string;
      categoryName: string;
      emoji: string;
      amount: number;
      percentage: number;
      color: string;
    }> = [];

    sortedCategoryIds.forEach((categoryId) => {
      const category = categoryMap.get(categoryId);
      const data = categoryTotals.get(categoryId);

      if (category && data) {
        const group = category.categoryGroup || 'other';
        groupIndices[group] = (groupIndices[group] || 0);
        const color = category.color || getCategoryColor(group, groupIndices[group]);
        groupIndices[group]++;

        const roundedAmount = Math.round(data.amount * 100) / 100;
        const percentage = roundedTotal > 0 ? Math.round((roundedAmount / roundedTotal) * 1000) / 10 : 0;

        categoryList.push({
          categoryId,
          categoryName: category.name,
          emoji: category.icon || '📦', // Default emoji if not set
          amount: roundedAmount,
          percentage,
          color,
        });
      }
    });

    return {
      categories: categoryList,
      totalAmount: roundedTotal,
    };
  } catch (error) {
    logger.error('Get category distribution error:', error);
    return {
      categories: [],
      totalAmount: 0,
    };
  }
}

/**
 * Get income vs expenses trend over periods
 */
export async function getIncomeTrend(
  userId: string,
  householdId: string,
  periodEnd: string,
  periodsCount: number = 4
) {
  try {
    const periods: Array<{
      label: string;
      income: number;
      expenses: number;
      savingsRate: number;
    }> = [];

    // Calculate periods working backwards from periodEnd
    const endDate = new Date(periodEnd);

    for (let i = periodsCount - 1; i >= 0; i--) {
      // Calculate period: go back i months from current
      const periodEndDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, endDate.getDate());
      const periodStartDate = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() - 1, periodEndDate.getDate() + 1);

      const periodStartStr = periodStartDate.toISOString().split('T')[0];
      const periodEndStr = periodEndDate.toISOString().split('T')[0];

      // Fetch transactions for this period
      const incomeTransactions = await getTransactionsInRange(userId, periodStartStr, periodEndStr, 'income');
      const expenseTransactions = await getTransactionsInRange(userId, periodStartStr, periodEndStr, 'expense');

      // Calculate totals
      const income = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const expenses = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      // Calculate savings rate
      const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

      // Format label (e.g., "Nov", "Dec", or "Feb (current)")
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = monthNames[periodEndDate.getMonth()];
      const label = i === 0 ? `${monthLabel} (current)` : monthLabel;

      periods.push({
        label,
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        savingsRate,
      });
    }

    return { periods };
  } catch (error) {
    logger.error('Get income trend error:', error);
    return { periods: [] };
  }
}

/**
 * Get category trends over time (multi-line chart)
 */
export async function getCategoryTrends(
  userId: string,
  householdId: string,
  periodEnd: string,
  periodsCount: number = 4
) {
  try {
    const endDate = new Date(periodEnd);
    const periodLabels: string[] = [];
    const categorySpendingByPeriod: Map<string, number[]> = new Map();

    // Get categories
    const categoriesResult = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    if (!categoriesResult || !categoriesResult.data) {
      logger.error('Get category trends: No categories data returned');
      return {
        periods: [],
        categories: [],
      };
    }

    const categories = (categoriesResult.data.categories || []) as Category[];
    const categoryMap = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.id) {
        categoryMap.set(cat.id, cat);
      }
    });

    // Calculate spending per category per period
    for (let i = periodsCount - 1; i >= 0; i--) {
      const periodEndDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, endDate.getDate());
      const periodStartDate = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() - 1, periodEndDate.getDate() + 1);

      const periodStartStr = periodStartDate.toISOString().split('T')[0];
      const periodEndStr = periodEndDate.toISOString().split('T')[0];

      // Get period label
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      periodLabels.push(monthNames[periodEndDate.getMonth()]);

      // Fetch transactions for this period
      const transactions = await getTransactionsInRange(userId, periodStartStr, periodEndStr, 'expense');

      // Aggregate by category for this period
      transactions.forEach((tx) => {
        if (!categorySpendingByPeriod.has(tx.categoryId)) {
          categorySpendingByPeriod.set(tx.categoryId, new Array(periodsCount).fill(0));
        }
        const values = categorySpendingByPeriod.get(tx.categoryId)!;
        values[periodsCount - 1 - i] += Math.abs(tx.amount);
      });
    }

    // Calculate total spending per category (sum across all periods)
    const categoryTotals: Array<{ categoryId: string; total: number }> = [];
    categorySpendingByPeriod.forEach((values, categoryId) => {
      const total = values.reduce((sum, val) => sum + val, 0);
      categoryTotals.push({ categoryId, total });
    });

    // Sort by total and take top 5
    categoryTotals.sort((a, b) => b.total - a.total);
    const top5CategoryIds = categoryTotals.slice(0, 5).map((c) => c.categoryId);

    // Build result for top 5 categories
    const groupIndices: Record<string, number> = {};
    const categoryTrends = top5CategoryIds.map((categoryId) => {
      const category = categoryMap.get(categoryId);
      const values = categorySpendingByPeriod.get(categoryId) || [];

      if (category) {
        const group = category.categoryGroup || 'other';
        groupIndices[group] = (groupIndices[group] || 0);
        const color = category.color || getCategoryColor(group, groupIndices[group]);
        groupIndices[group]++;

        return {
          categoryId,
          categoryName: category.name,
          values: values.map((v) => Math.round(v * 100) / 100),
          color,
        };
      }

      return {
        categoryId,
        categoryName: 'Unknown',
        values: values.map((v) => Math.round(v * 100) / 100),
        color: '#6B7280',
      };
    });

    return {
      periods: periodLabels,
      categories: categoryTrends,
    };
  } catch (error) {
    logger.error('Get category trends error:', error);
    return {
      periods: [],
      categories: [],
    };
  }
}

/**
 * Get budget performance for bullet graphs
 */
export async function getBudgetPerformance(
  userId: string,
  householdId: string,
  periodStart: string,
  periodEnd: string
) {
  try {
    // Query budgets
    const budgetsResult = await db.queryOnce({
      budgets: {
        $: {
          where: {
            userId,
            isActive: true,
          },
        },
      },
    });

    if (!budgetsResult || !budgetsResult.data) {
      logger.error('Get budget performance: No budgets data returned');
      return {
        overallStatus: 'on-track',
        overallPercentUsed: 0,
        categories: [],
      };
    }

    // @ts-ignore - InstantDB types
    const budgets = (budgetsResult.data.budgets || []) as Array<{
      id: string;
      categoryId: string;
      allocatedAmount: number;
      spentAmount?: number;
      categoryGroup: string;
    }>;

    if (budgets.length === 0) {
      return {
        overallStatus: 'on-track',
        overallPercentUsed: 0,
        categories: [],
      };
    }

    // Get categories
    const categoriesResult = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    if (!categoriesResult || !categoriesResult.data) {
      logger.error('Get budget performance: No categories data returned');
      return {
        overallStatus: 'on-track',
        overallPercentUsed: 0,
        categories: [],
      };
    }

    const categories = (categoriesResult.data.categories || []) as Category[];
    const categoryMap = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.id) {
        categoryMap.set(cat.id, cat);
      }
    });

    // Get transactions for the period
    const transactions = await getTransactionsInRange(userId, periodStart, periodEnd, 'expense');

    // Calculate actual spending per category
    const actualSpending = new Map<string, number>();
    transactions.forEach((tx) => {
      const current = actualSpending.get(tx.categoryId) || 0;
      actualSpending.set(tx.categoryId, current + Math.abs(tx.amount));
    });

    // Build budget performance data
    const categoryPerformance = budgets.map((budget) => {
      const category = categoryMap.get(budget.categoryId);
      const actual = actualSpending.get(budget.categoryId) || 0;
      const percentUsed = budget.allocatedAmount > 0
        ? Math.round((actual / budget.allocatedAmount) * 100)
        : 0;

      return {
        categoryId: budget.categoryId,
        categoryName: category?.name || 'Unknown',
        emoji: category?.icon || '📦',
        actual: Math.round(actual * 100) / 100,
        budget: Math.round(budget.allocatedAmount * 100) / 100,
        percentUsed,
      };
    });

    // Calculate overall status
    const totalBudget = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const totalActual = Array.from(actualSpending.values()).reduce((sum, val) => sum + val, 0);
    const overallPercentUsed = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

    let overallStatus: string;
    if (overallPercentUsed <= 70) {
      overallStatus = 'on-track';
    } else if (overallPercentUsed <= 90) {
      overallStatus = 'progressing';
    } else if (overallPercentUsed <= 100) {
      overallStatus = 'nearly-there';
    } else {
      overallStatus = 'flow-adjusted';
    }

    return {
      overallStatus,
      overallPercentUsed,
      categories: categoryPerformance,
    };
  } catch (error) {
    logger.error('Get budget performance error:', error);
    return {
      overallStatus: 'on-track',
      overallPercentUsed: 0,
      categories: [],
    };
  }
}

/**
 * Get period comparison for slope chart
 */
export async function getPeriodComparison(
  userId: string,
  householdId: string,
  currentPeriodStart: string,
  currentPeriodEnd: string
) {
  try {
    // Calculate previous period (same length as current period)
    const periodLength = new Date(currentPeriodEnd).getTime() - new Date(currentPeriodStart).getTime();
    const previousPeriodEnd = new Date(new Date(currentPeriodStart).getTime() - 86400000).toISOString().split('T')[0]; // Day before current start
    const previousPeriodStart = new Date(new Date(currentPeriodStart).getTime() - periodLength).toISOString().split('T')[0];

    // Get transactions for both periods
    const currentTransactions = await getTransactionsInRange(userId, currentPeriodStart, currentPeriodEnd, 'expense');
    const previousTransactions = await getTransactionsInRange(userId, previousPeriodStart, previousPeriodEnd, 'expense');

    // Get categories
    const categoriesResult = await db.queryOnce({
      categories: {
        $: {
          where: {
            householdId,
          },
        },
      },
    });

    if (!categoriesResult || !categoriesResult.data) {
      logger.error('Get period comparison: No categories data returned');
      return {
        topChanges: [],
      };
    }

    const categories = (categoriesResult.data.categories || []) as Category[];
    const categoryMap = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.id) {
        categoryMap.set(cat.id, cat);
      }
    });

    // Aggregate spending by category for current period
    const currentSpending = new Map<string, number>();
    currentTransactions.forEach((tx) => {
      const current = currentSpending.get(tx.categoryId) || 0;
      currentSpending.set(tx.categoryId, current + Math.abs(tx.amount));
    });

    // Aggregate spending by category for previous period
    const previousSpending = new Map<string, number>();
    previousTransactions.forEach((tx) => {
      const current = previousSpending.get(tx.categoryId) || 0;
      previousSpending.set(tx.categoryId, current + Math.abs(tx.amount));
    });

    // Get all categories that appear in either period
    const allCategoryIds = new Set([
      ...currentSpending.keys(),
      ...previousSpending.keys(),
    ]);

    // Calculate changes for each category
    const changes: Array<{
      categoryId: string;
      categoryName: string;
      emoji: string;
      previousValue: number;
      currentValue: number;
      changeAmount: number;
      changePercent: number;
      absoluteChangePercent: number; // For sorting
    }> = [];

    allCategoryIds.forEach((categoryId) => {
      const category = categoryMap.get(categoryId);
      if (!category) return;

      const previousValue = previousSpending.get(categoryId) || 0;
      const currentValue = currentSpending.get(categoryId) || 0;

      // Skip if both values are negligible (less than CHF 1)
      if (previousValue < 1 && currentValue < 1) return;

      const changeAmount = currentValue - previousValue;
      const changePercent = previousValue > 0
        ? Math.round((changeAmount / previousValue) * 100 * 10) / 10
        : (currentValue > 0 ? 100 : 0);

      changes.push({
        categoryId,
        categoryName: category.name,
        emoji: category.icon || '📦',
        previousValue: Math.round(previousValue * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        changeAmount: Math.round(changeAmount * 100) / 100,
        changePercent,
        absoluteChangePercent: Math.abs(changePercent),
      });
    });

    // Sort by absolute change percentage (biggest changes first) and take top 5
    changes.sort((a, b) => b.absoluteChangePercent - a.absoluteChangePercent);
    const topChanges = changes.slice(0, 5).map(({ absoluteChangePercent, ...rest }) => rest);

    return {
      topChanges,
    };
  } catch (error) {
    logger.error('Get period comparison error:', error);
    return {
      topChanges: [],
    };
  }
}

/**
 * Generate smart insights based on spending patterns
 */
export async function generateInsights(
  userId: string,
  householdId: string,
  periodStart: string,
  periodEnd: string
) {
  try {
    const insights: Array<{
      type: 'positive' | 'attention' | 'neutral';
      icon: string;
      message: string;
    }> = [];

    // Get health summary for context
    const healthSummary = await getHealthSummary(userId, householdId, periodStart, periodEnd);

    // Get budget performance
    const budgetPerformance = await getBudgetPerformance(userId, householdId, periodStart, periodEnd);

    // Get period comparison for trend analysis
    const periodComparison = await getPeriodComparison(userId, householdId, periodStart, periodEnd);

    // Insight 1: Savings rate insight
    if (healthSummary.savingsRate >= 20) {
      insights.push({
        type: 'positive',
        icon: '🎯',
        message: `Excellent! You're saving ${healthSummary.savingsRate}% of your income, which is well above the recommended 15-20% guideline.`,
      });
    } else if (healthSummary.savingsRate >= 10) {
      insights.push({
        type: 'neutral',
        icon: '💡',
        message: `You're saving ${healthSummary.savingsRate}% of your income. Consider increasing this to 15-20% for better financial security.`,
      });
    } else if (healthSummary.savingsRate < 0) {
      insights.push({
        type: 'attention',
        icon: '⚠️',
        message: `You're spending more than you're earning this period. Review your expenses and consider adjusting your budget.`,
      });
    }

    // Insight 2: Budget performance insight
    if (budgetPerformance.categories.length > 0) {
      const atRiskCategories = budgetPerformance.categories.filter(c => c.percentUsed >= 85 && c.percentUsed < 100);
      const overBudgetCategories = budgetPerformance.categories.filter(c => c.percentUsed >= 100);

      if (overBudgetCategories.length > 0) {
        const categoryNames = overBudgetCategories.map(c => c.categoryName).join(', ');
        insights.push({
          type: 'attention',
          icon: '🔍',
          message: `${overBudgetCategories.length === 1 ? 'Category' : 'Categories'} over budget: ${categoryNames}. Consider adjusting your spending or reallocating budget.`,
        });
      } else if (atRiskCategories.length > 0) {
        const category = atRiskCategories[0];
        insights.push({
          type: 'attention',
          icon: '⏰',
          message: `${category.categoryName} is at ${category.percentUsed}% of budget. Watch spending in this category to stay on track.`,
        });
      } else if (budgetPerformance.overallPercentUsed <= 70) {
        insights.push({
          type: 'positive',
          icon: '✅',
          message: `Great discipline! You're at ${budgetPerformance.overallPercentUsed}% of your overall budget with room to spare.`,
        });
      }
    }

    // Insight 3: Spending trend insights
    if (periodComparison.topChanges.length > 0) {
      const topChange = periodComparison.topChanges[0];

      if (topChange.changePercent > 15) {
        insights.push({
          type: 'attention',
          icon: '📈',
          message: `${topChange.categoryName} increased ${topChange.changePercent}% this period (CHF ${topChange.currentValue} vs CHF ${topChange.previousValue}). Was this expected?`,
        });
      } else if (topChange.changePercent < -15) {
        insights.push({
          type: 'positive',
          icon: '📉',
          message: `Great progress! ${topChange.categoryName} decreased ${Math.abs(topChange.changePercent)}% this period (saved CHF ${Math.abs(topChange.changeAmount)}).`,
        });
      } else if (Math.abs(topChange.changePercent) <= 5 && topChange.previousValue > 0) {
        insights.push({
          type: 'positive',
          icon: '✅',
          message: `Excellent consistency! Your ${topChange.categoryName} spending has been stable at ~CHF ${topChange.currentValue}.`,
        });
      }
    }

    // Insight 4: Net position trend insight
    if (healthSummary.netPositionTrend > 10) {
      insights.push({
        type: 'positive',
        icon: '🚀',
        message: `Your net position improved by ${healthSummary.netPositionTrend}% compared to last period. Keep up the momentum!`,
      });
    } else if (healthSummary.netPositionTrend < -10) {
      insights.push({
        type: 'attention',
        icon: '📊',
        message: `Your net position decreased by ${Math.abs(healthSummary.netPositionTrend)}% from last period. Review what changed.`,
      });
    }

    // Return max 3 insights (prioritize attention > positive > neutral)
    const sorted = [
      ...insights.filter(i => i.type === 'attention'),
      ...insights.filter(i => i.type === 'positive'),
      ...insights.filter(i => i.type === 'neutral'),
    ];

    return {
      insights: sorted.slice(0, 3),
    };
  } catch (error) {
    logger.error('Generate insights error:', error);
    return {
      insights: [],
    };
  }
}
