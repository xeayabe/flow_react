import { db } from './db';
import { Transaction } from './transactions-api';
import { Category } from './categories-api';

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
 * Get transactions within a date range
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

    let transactions = (result.data.transactions || []) as Transaction[];

    // Filter by date range
    transactions = transactions.filter(
      (tx) => tx.date >= startDate && tx.date <= endDate
    );

    // Filter by type if specified
    if (type) {
      transactions = transactions.filter((tx) => tx.type === type);
    }

    return transactions;
  } catch (error) {
    console.error('Get transactions in range error:', error);
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

        categoryBreakdown.push({
          categoryId,
          categoryName: category.name,
          categoryGroup: category.categoryGroup,
          amount: data.amount,
          percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 1000) / 10 : 0,
          color,
          transactionCount: data.count,
        });
      }
    });

    // Get top category
    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    return {
      totalAmount,
      categoryCount: categoryBreakdown.length,
      averagePerCategory: categoryBreakdown.length > 0 ? totalAmount / categoryBreakdown.length : 0,
      topCategory,
      categoryBreakdown,
    };
  } catch (error) {
    console.error('Get category analytics error:', error);
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

  const formatDate = (d: Date): string => {
    return d.toISOString().split('T')[0];
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
        // Previous period: payday last month to payday this month - 1
        const lastMonth = month === 0 ? 11 : month - 1;
        const lastYear = month === 0 ? year - 1 : year;
        periodStart = new Date(lastYear, lastMonth, paydayDay);
        periodEnd = new Date(year, month, paydayDay - 1);
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
