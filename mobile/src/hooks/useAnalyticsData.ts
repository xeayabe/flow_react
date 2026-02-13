import { useQuery } from '@tanstack/react-query';
import {
  getHealthSummary,
  getCategoryDistribution,
  getIncomeTrend,
  getCategoryTrends,
  getBudgetPerformance,
  getPeriodComparison,
  generateInsights,
  getTransactionsInRange,
} from '@/lib/analytics-api';
import { db } from '@/lib/db';
import type { Transaction } from '@/lib/transactions-api';
import { extractEmoji } from '@/lib/extractEmoji';

export interface AnalyticsData {
  healthSummary: {
    netPosition: number;
    netPositionTrend: number;
    income: number;
    expenses: number;
    savingsRate: number;
    status: 'on-track' | 'progressing' | 'nearly-there' | 'flow-adjusted';
  };
  categoryDistribution: {
    categories: Array<{
      categoryId: string;
      categoryName: string;
      emoji: string;
      amount: number;
      percentage: number;
      color: string;
    }>;
    totalAmount: number;
    performanceInsights: {
      mostConsistent: {
        categoryId: string;
        categoryName: string;
        emoji: string;
        metric: string;
      } | null;
      trendingUp: {
        categoryId: string;
        categoryName: string;
        emoji: string;
        metric: string;
      } | null;
    };
  };
  incomeTrend: {
    periods: Array<{
      label: string;
      income: number;
      expenses: number;
      savingsRate: number;
    }>;
  };
  categoryTrends: {
    periods: string[];
    categories: Array<{
      categoryId: string;
      categoryName: string;
      values: number[];
      color: string;
    }>;
  };
  budgetPerformance: {
    overallStatus: string;
    overallPercentUsed: number;
    categories: Array<{
      categoryId: string;
      categoryName: string;
      emoji: string;
      actual: number;
      budget: number;
      percentUsed: number;
    }>;
  };
  periodComparison: {
    topChanges: Array<{
      categoryId: string;
      categoryName: string;
      emoji: string;
      previousValue: number;
      currentValue: number;
      changeAmount: number;
      changePercent: number;
    }>;
  };
  insights: {
    insights: Array<{
      type: 'positive' | 'attention' | 'neutral';
      icon: string;
      message: string;
    }>;
  };
}

export function useAnalyticsData(
  userId: string,
  householdId: string,
  periodStart: string,
  periodEnd: string
) {
  const query = useQuery({
    queryKey: ['analytics', userId, householdId, periodStart, periodEnd],
    queryFn: async () => {
      if (!userId || !householdId) {
        throw new Error('Missing userId or householdId');
      }

      // FIX: Fetch ALL transactions once to avoid query storm (20+ simultaneous queries was overwhelming InstantDB)
      // Calculate extended date range to cover all periods needed for analytics (4 months back for trends)
      const endDate = new Date(periodEnd);
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, 1); // 6 months back for safety
      const extendedStart = startDate.toISOString().split('T')[0];

      // Fetch all transactions in one query
      const result = await db.queryOnce({
        transactions: {
          $: {
            where: {
              userId,
            },
          },
        },
      });

      const allTransactions = (result?.data?.transactions || []) as Transaction[];

      // Helper function to filter transactions by date and type (replaces getTransactionsInRange calls)
      const filterTransactions = (start: string, end: string, type?: 'income' | 'expense'): Transaction[] => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const todayStr = today.toISOString().split('T')[0];

        let filtered = allTransactions.filter(
          (tx) =>
            tx.date >= start &&
            tx.date <= end &&
            tx.date <= todayStr &&
            tx.isExcludedFromBudget !== true // Exclude transactions marked to be excluded from budget
        );

        if (type) {
          filtered = filtered.filter((tx) => tx.type === type);
        }

        return filtered;
      };

      // Now compute all analytics with the pre-fetched data
      // Each function will filter the allTransactions array instead of making DB queries
      const healthSummary = await computeHealthSummary(userId, periodStart, periodEnd, filterTransactions);
      const categoryDistribution = await computeCategoryDistribution(userId, householdId, periodStart, periodEnd, filterTransactions);
      const incomeTrend = await computeIncomeTrend(userId, periodEnd, 4, filterTransactions);
      const categoryTrends = await computeCategoryTrends(userId, householdId, periodEnd, 4, filterTransactions);
      const budgetPerformance = await getBudgetPerformance(userId, householdId, periodStart, periodEnd);
      const periodComparison = await computePeriodComparison(userId, householdId, periodStart, periodEnd, filterTransactions);

      // Generate insights using the computed data
      const insights = await generateInsights(userId, householdId, periodStart, periodEnd);

      return {
        healthSummary,
        categoryDistribution,
        incomeTrend,
        categoryTrends,
        budgetPerformance,
        periodComparison,
        insights,
      };
    },
    enabled: !!userId && !!householdId,
    staleTime: 2 * 60 * 1000, // 2 minutes - data stays fresh without refetching
    gcTime: 5 * 60 * 1000, // 5 minutes - cache persists in memory (renamed from cacheTime in v5)
  });

  return {
    data: query.data || null,
    loading: query.isLoading,
    error: query.error as Error | null,
  };
}

// Helper computation functions that use pre-fetched transactions instead of making DB queries

type TransactionFilter = (start: string, end: string, type?: 'income' | 'expense') => Transaction[];

async function computeHealthSummary(
  userId: string,
  periodStart: string,
  periodEnd: string,
  filterTransactions: TransactionFilter
) {
  const incomeTransactions = filterTransactions(periodStart, periodEnd, 'income');
  const expenseTransactions = filterTransactions(periodStart, periodEnd, 'expense');

  const income = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const expenses = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const netPosition = income - expenses;
  const savingsRate = income > 0 ? Math.round((netPosition / income) * 1000) / 10 : 0;

  // Calculate trend
  const periodLength = new Date(periodEnd).getTime() - new Date(periodStart).getTime();
  const previousPeriodEnd = new Date(new Date(periodStart).getTime() - 86400000).toISOString().split('T')[0];
  const previousPeriodStart = new Date(new Date(periodStart).getTime() - periodLength).toISOString().split('T')[0];

  const previousIncomeTransactions = filterTransactions(previousPeriodStart, previousPeriodEnd, 'income');
  const previousExpenseTransactions = filterTransactions(previousPeriodStart, previousPeriodEnd, 'expense');

  const previousIncome = previousIncomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const previousExpenses = previousExpenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const previousNetPosition = previousIncome - previousExpenses;

  const netPositionTrend = previousNetPosition !== 0
    ? Math.round(((netPosition - previousNetPosition) / Math.abs(previousNetPosition)) * 100)
    : 0;

  let status: 'on-track' | 'progressing' | 'nearly-there' | 'flow-adjusted';
  if (savingsRate >= 20) {
    status = 'on-track';
  } else if (savingsRate >= 10) {
    status = 'progressing';
  } else if (savingsRate >= 0) {
    status = 'nearly-there';
  } else {
    status = 'flow-adjusted';
  }

  return {
    netPosition: Math.round(netPosition * 100) / 100,
    netPositionTrend,
    income: Math.round(income * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    savingsRate,
    status,
  };
}

async function computeCategoryDistribution(
  userId: string,
  householdId: string,
  periodStart: string,
  periodEnd: string,
  filterTransactions: TransactionFilter
) {
  const transactions = filterTransactions(periodStart, periodEnd, 'expense');

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
    return {
      categories: [],
      totalAmount: 0,
      performanceInsights: {
        mostConsistent: null,
        trendingUp: null,
      },
    };
  }

  const categories = categoriesResult.data.categories || [];
  const categoryMap = new Map();
  categories.forEach((cat: any) => {
    if (cat.id) {
      categoryMap.set(cat.id, cat);
    }
  });

  const categoryTotals = new Map();
  transactions.forEach((tx) => {
    const existing = categoryTotals.get(tx.categoryId) || { amount: 0, count: 0 };
    categoryTotals.set(tx.categoryId, {
      amount: existing.amount + Math.abs(tx.amount),
      count: existing.count + 1,
    });
  });

  const totalAmount = Array.from(categoryTotals.values()).reduce(
    (sum: number, cat: any) => sum + cat.amount,
    0
  );
  const roundedTotal = Math.round(totalAmount * 100) / 100;

  const sortedCategoryIds = Array.from(categoryTotals.keys()).sort((a, b) => {
    const amountA = (categoryTotals.get(a) as any)?.amount || 0;
    const amountB = (categoryTotals.get(b) as any)?.amount || 0;
    return amountB - amountA;
  });

  const categoryList: any[] = [];
  sortedCategoryIds.forEach((categoryId: string) => {
    const category = categoryMap.get(categoryId);
    const data = categoryTotals.get(categoryId);

    if (category && data) {
      const roundedAmount = Math.round(data.amount * 100) / 100;
      const percentage = roundedTotal > 0 ? Math.round((roundedAmount / roundedTotal) * 1000) / 10 : 0;
      const { emoji, name } = extractEmoji(category.name);

      categoryList.push({
        categoryId,
        categoryName: name,
        emoji: emoji,
        amount: roundedAmount,
        percentage,
        color: category.color || '#6B7280',
      });
    }
  });

  // Calculate performance insights (most consistent and trending up)
  const performanceInsights = await computePerformanceInsights(
    userId,
    periodStart,
    periodEnd,
    filterTransactions,
    categoryMap
  );

  return {
    categories: categoryList,
    totalAmount: roundedTotal,
    performanceInsights,
  };
}

async function computePerformanceInsights(
  userId: string,
  currentPeriodStart: string,
  currentPeriodEnd: string,
  filterTransactions: TransactionFilter,
  categoryMap: Map<string, any>
) {
  // Calculate previous 3 months for variance and trend analysis
  const endDate = new Date(currentPeriodEnd);
  const monthlySpending = new Map<string, number[]>();

  // Get spending for current month + 3 previous months
  for (let i = 3; i >= 0; i--) {
    const periodEndDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, endDate.getDate());
    const periodStartDate = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() - 1, periodEndDate.getDate() + 1);

    const periodStartStr = periodStartDate.toISOString().split('T')[0];
    const periodEndStr = periodEndDate.toISOString().split('T')[0];

    const periodTransactions = filterTransactions(periodStartStr, periodEndStr, 'expense');

    // Aggregate by category
    periodTransactions.forEach((tx) => {
      if (!monthlySpending.has(tx.categoryId)) {
        monthlySpending.set(tx.categoryId, [0, 0, 0, 0]);
      }
      const amounts = monthlySpending.get(tx.categoryId)!;
      amounts[3 - i] += Math.abs(tx.amount);
    });
  }

  let mostConsistent: any = null;
  let trendingUp: any = null;
  let lowestVariance = Infinity;
  let highestTrend = -Infinity;

  // Analyze each category
  monthlySpending.forEach((amounts, categoryId) => {
    const category = categoryMap.get(categoryId);
    if (!category) return;

    // Filter out categories with low spending (less than 50 CHF average)
    const average = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    if (average < 50) return;

    // Calculate variance (consistency)
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = average > 0 ? (stdDev / average) * 100 : 0;

    // Calculate trend (current month vs previous 3-month average)
    const currentAmount = amounts[3];
    const previousAverage = (amounts[0] + amounts[1] + amounts[2]) / 3;
    const trendPercent = previousAverage > 0 ? ((currentAmount - previousAverage) / previousAverage) * 100 : 0;

    // Track most consistent (lowest coefficient of variation)
    if (coefficientOfVariation < lowestVariance && coefficientOfVariation < 15) {
      lowestVariance = coefficientOfVariation;
      const { emoji, name } = extractEmoji(category.name);
      mostConsistent = {
        categoryId,
        categoryName: name,
        emoji,
        metric: `±${coefficientOfVariation.toFixed(1)}% variance`,
      };
    }

    // Track trending up (highest positive trend, minimum 20% increase)
    if (trendPercent > highestTrend && trendPercent > 20) {
      highestTrend = trendPercent;
      const { emoji, name } = extractEmoji(category.name);
      trendingUp = {
        categoryId,
        categoryName: name,
        emoji,
        metric: `+${trendPercent.toFixed(0)}% vs avg`,
      };
    }
  });

  return {
    mostConsistent,
    trendingUp,
  };
}

async function computeIncomeTrend(
  userId: string,
  periodEnd: string,
  periodsCount: number,
  filterTransactions: TransactionFilter
) {
  const periods: any[] = [];
  const endDate = new Date(periodEnd);

  for (let i = periodsCount - 1; i >= 0; i--) {
    const periodEndDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, endDate.getDate());
    const periodStartDate = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() - 1, periodEndDate.getDate() + 1);

    const periodStartStr = periodStartDate.toISOString().split('T')[0];
    const periodEndStr = periodEndDate.toISOString().split('T')[0];

    const incomeTransactions = filterTransactions(periodStartStr, periodEndStr, 'income');
    const expenseTransactions = filterTransactions(periodStartStr, periodEndStr, 'expense');

    const income = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = expenseTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

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
}

async function computeCategoryTrends(
  userId: string,
  householdId: string,
  periodEnd: string,
  periodsCount: number,
  filterTransactions: TransactionFilter
) {
  const endDate = new Date(periodEnd);
  const periodLabels: string[] = [];
  const categorySpendingByPeriod = new Map();

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
    return { periods: [], categories: [] };
  }

  const categories = categoriesResult.data.categories || [];
  const categoryMap = new Map();
  categories.forEach((cat: any) => {
    if (cat.id) {
      categoryMap.set(cat.id, cat);
    }
  });

  for (let i = periodsCount - 1; i >= 0; i--) {
    const periodEndDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, endDate.getDate());
    const periodStartDate = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() - 1, periodEndDate.getDate() + 1);

    const periodStartStr = periodStartDate.toISOString().split('T')[0];
    const periodEndStr = periodEndDate.toISOString().split('T')[0];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    periodLabels.push(monthNames[periodEndDate.getMonth()]);

    const transactions = filterTransactions(periodStartStr, periodEndStr, 'expense');

    transactions.forEach((tx) => {
      if (!categorySpendingByPeriod.has(tx.categoryId)) {
        categorySpendingByPeriod.set(tx.categoryId, new Array(periodsCount).fill(0));
      }
      const values = categorySpendingByPeriod.get(tx.categoryId)!;
      values[periodsCount - 1 - i] += Math.abs(tx.amount);
    });
  }

  const categoryTotals: any[] = [];
  categorySpendingByPeriod.forEach((values, categoryId) => {
    const total = values.reduce((sum: number, val: number) => sum + val, 0);
    categoryTotals.push({ categoryId, total });
  });

  categoryTotals.sort((a, b) => b.total - a.total);
  const top5CategoryIds = categoryTotals.slice(0, 5).map((c) => c.categoryId);

  const categoryTrends = top5CategoryIds.map((categoryId: string) => {
    const category = categoryMap.get(categoryId);
    const values = categorySpendingByPeriod.get(categoryId) || [];

    if (category) {
      const { name } = extractEmoji(category.name);
      return {
        categoryId,
        categoryName: name,
        values: values.map((v: number) => Math.round(v * 100) / 100),
        color: category.color || '#6B7280',
      };
    }

    return {
      categoryId,
      categoryName: 'Unknown',
      values: values.map((v: number) => Math.round(v * 100) / 100),
      color: '#6B7280',
    };
  });

  return {
    periods: periodLabels,
    categories: categoryTrends,
  };
}

async function computePeriodComparison(
  userId: string,
  householdId: string,
  currentPeriodStart: string,
  currentPeriodEnd: string,
  filterTransactions: TransactionFilter
) {
  const periodLength = new Date(currentPeriodEnd).getTime() - new Date(currentPeriodStart).getTime();
  const previousPeriodEnd = new Date(new Date(currentPeriodStart).getTime() - 86400000).toISOString().split('T')[0];
  const previousPeriodStart = new Date(new Date(currentPeriodStart).getTime() - periodLength).toISOString().split('T')[0];

  const currentTransactions = filterTransactions(currentPeriodStart, currentPeriodEnd, 'expense');
  const previousTransactions = filterTransactions(previousPeriodStart, previousPeriodEnd, 'expense');

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
    return { topChanges: [] };
  }

  const categories = categoriesResult.data.categories || [];
  const categoryMap = new Map();
  categories.forEach((cat: any) => {
    if (cat.id) {
      categoryMap.set(cat.id, cat);
    }
  });

  const currentSpending = new Map();
  currentTransactions.forEach((tx) => {
    const current = currentSpending.get(tx.categoryId) || 0;
    currentSpending.set(tx.categoryId, current + Math.abs(tx.amount));
  });

  const previousSpending = new Map();
  previousTransactions.forEach((tx) => {
    const current = previousSpending.get(tx.categoryId) || 0;
    previousSpending.set(tx.categoryId, current + Math.abs(tx.amount));
  });

  const allCategoryIds = new Set([
    ...currentSpending.keys(),
    ...previousSpending.keys(),
  ]);

  const changes: any[] = [];

  allCategoryIds.forEach((categoryId: string) => {
    const category = categoryMap.get(categoryId);
    if (!category) return;

    const previousValue = previousSpending.get(categoryId) || 0;
    const currentValue = currentSpending.get(categoryId) || 0;

    if (previousValue < 1 && currentValue < 1) return;

    const changeAmount = currentValue - previousValue;
    const changePercent = previousValue > 0
      ? Math.round((changeAmount / previousValue) * 100 * 10) / 10
      : (currentValue > 0 ? 100 : 0);

    const { emoji, name } = extractEmoji(category.name);

    changes.push({
      categoryId,
      categoryName: name,
      emoji: emoji,
      previousValue: Math.round(previousValue * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      changeAmount: Math.round(changeAmount * 100) / 100,
      changePercent,
      absoluteChangePercent: Math.abs(changePercent),
    });
  });

  changes.sort((a, b) => b.absoluteChangePercent - a.absoluteChangePercent);
  const topChanges = changes.slice(0, 5).map(({ absoluteChangePercent, ...rest }) => rest);

  return {
    topChanges,
  };
}
