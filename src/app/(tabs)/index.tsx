import React, { useCallback } from 'react';
import { Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp } from 'lucide-react-native';
import { db } from '@/lib/db';
import { getUserAccounts } from '@/lib/accounts-api';
import { getRecentTransactions, Transaction } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getBudgetSummary, recalculateBudgetSpentAmounts } from '@/lib/budget-api';
import { calculateBudgetPeriod, formatDateSwiss } from '@/lib/payday-utils';
import {
  calculateTotalBalance,
  calculatePeriodSpending,
  getRecentTransactionsWithCategories,
  formatCurrency,
} from '@/lib/dashboard-helpers';
import {
  DashboardLoadingSkeleton,
} from '@/components/SkeletonLoaders';
import {
  WelcomeHeader,
  TotalBalanceCard,
  ThisMonthSpendingCard,
  RecentTransactionsWidget,
  AccountsListWidget,
  Budget50_30_20Widget,
  FloatingActionButton,
} from '@/components/DashboardWidgets';

interface BudgetSummaryData {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  needsAllocated: number;
  wantsAllocated: number;
  savingsAllocated: number;
  needsSpent?: number;
  wantsSpent?: number;
  savingsSpent?: number;
}

export default function DashboardScreen() {
  const { user } = db.useAuth();

  // Get household for payday info
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const householdsResult = await db.queryOnce({
        households: { $: { where: { createdByUserId: userRecord.id } } },
      });

      const household = householdsResult.data.households?.[0];
      if (!household) throw new Error('No household found');

      return { userRecord, household };
    },
    enabled: !!user?.email,
  });

  // Calculate budget period
  const paydayDay = householdQuery.data?.household?.paydayDay ?? 25;
  const budgetPeriod = calculateBudgetPeriod(paydayDay);
  const userId = householdQuery.data?.userRecord?.id;
  const householdId = householdQuery.data?.household?.id;

  // Get all accounts
  const accountsQuery = useQuery({
    queryKey: ['user-accounts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  // Get budget summary
  const summaryQuery = useQuery({
    queryKey: ['budget-summary', userId, householdId, budgetPeriod.start],
    queryFn: async () => {
      if (!userId || !householdId) return null;
      return getBudgetSummary(userId, householdId, budgetPeriod.start);
    },
    enabled: !!userId && !!householdId,
  });

  // Get recent transactions
  const recentTransactionsQuery = useQuery({
    queryKey: ['recent-transactions', userId, budgetPeriod.start, budgetPeriod.end],
    queryFn: async () => {
      if (!userId) return [];
      return getRecentTransactions(userId, 5, budgetPeriod.start, budgetPeriod.end);
    },
    enabled: !!userId,
  });

  // Get categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      return getCategories(householdId);
    },
    enabled: !!householdId,
  });

  // Refetch when focused
  const { refetch: refetchBudgetSummary } = summaryQuery;
  const { refetch: refetchAccounts } = accountsQuery;
  const { refetch: refetchRecentTransactions } = recentTransactionsQuery;

  useFocusEffect(
    useCallback(() => {
      refetchBudgetSummary();
      refetchAccounts();
      refetchRecentTransactions();
    }, [refetchBudgetSummary, refetchAccounts, refetchRecentTransactions])
  );

  // Recalculate spent amounts on first load
  React.useEffect(() => {
    if (userId && householdId && !summaryQuery.isLoading && summaryQuery.data) {
      recalculateBudgetSpentAmounts(
        userId,
        budgetPeriod.start,
        budgetPeriod.end
      ).then(() => {
        setTimeout(() => refetchBudgetSummary(), 500);
      }).catch((error) => {
        console.warn('Failed to recalculate budget spent amounts:', error);
      });
    }
  }, []);

  const isLoading =
    householdQuery.isLoading ||
    accountsQuery.isLoading ||
    summaryQuery.isLoading ||
    recentTransactionsQuery.isLoading ||
    categoriesQuery.isLoading;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <DashboardLoadingSkeleton />
      </SafeAreaView>
    );
  }

  const accounts = accountsQuery.data || [];
  const summary = (summaryQuery.data as BudgetSummaryData) || null;
  const recentTransactions = recentTransactionsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const userName = householdQuery.data?.userRecord?.name || 'User';
  const totalBalance = calculateTotalBalance(accounts);
  const monthSpending = calculatePeriodSpending(recentTransactions, budgetPeriod.start, budgetPeriod.end, 'expense');

  // Enrich recent transactions with category info
  const enrichedTransactions = getRecentTransactionsWithCategories(recentTransactions, categories, 5);

  // Calculate spent amounts by category group if summary exists
  let needsSpent = 0;
  let wantsSpent = 0;
  let savingsSpent = 0;

  if (summary) {
    // This would require fetching budgets for each group
    // For now, we can estimate based on the proportion of allocated to total
    const totalAllocated = summary.needsAllocated + summary.wantsAllocated + summary.savingsAllocated;
    if (totalAllocated > 0 && summary.totalSpent > 0) {
      const needsProportion = summary.needsAllocated / totalAllocated;
      const wantsProportion = summary.wantsAllocated / totalAllocated;
      const savingsProportion = summary.savingsAllocated / totalAllocated;

      needsSpent = summary.totalSpent * needsProportion;
      wantsSpent = summary.totalSpent * wantsProportion;
      savingsSpent = summary.totalSpent * savingsProportion;
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6 gap-6">
          {/* Welcome Header */}
          <WelcomeHeader
            userName={userName}
            budgetPeriodStart={budgetPeriod.start}
            budgetPeriodEnd={budgetPeriod.end}
          />

          {/* Summary Cards Row */}
          <View className="flex-row gap-4">
            <TotalBalanceCard totalBalance={totalBalance} />
            {summary && (
              <ThisMonthSpendingCard
                monthSpending={monthSpending}
                budgetAllocated={summary.totalAllocated}
              />
            )}
          </View>

          {/* Budget Status Widget */}
          {summary ? (
            <View className="rounded-2xl overflow-hidden bg-slate-50">
              {/* Card Header */}
              <View className="px-6 py-5 border-b border-gray-200">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-lg bg-teal-100 items-center justify-center">
                    <TrendingUp size={20} color="#0D9488" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-700">Budget Status</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {formatDateSwiss(budgetPeriod.start)} - {formatDateSwiss(budgetPeriod.end)} • {(() => {
                        const endDate = new Date(budgetPeriod.end + 'T00:00:00');
                        const todayForCalc = new Date();
                        todayForCalc.setHours(0, 0, 0, 0);
                        const daysRemaining = Math.ceil((endDate.getTime() - todayForCalc.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        return daysRemaining > 0 ? daysRemaining : 0;
                      })()} days left
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card Content */}
              <View className="px-6 py-5">
                {/* Spending Summary */}
                <View className="mb-5">
                  <View className="flex-row justify-between items-baseline mb-2">
                    <Text className="text-sm text-gray-600">Spent</Text>
                    <Text className="text-2xl font-bold text-gray-900">
                      {formatCurrency(summary.totalSpent)}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    of {formatCurrency(summary.totalAllocated)} allocated
                  </Text>
                </View>

                {/* Progress Bar */}
                <View className="mb-4">
                  <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <View
                      className="h-full"
                      style={{
                        width: `${Math.min(100, (summary.totalSpent / summary.totalAllocated) * 100)}%`,
                        backgroundColor:
                          (summary.totalSpent / summary.totalAllocated) * 100 >= 100
                            ? '#EF4444'
                            : (summary.totalSpent / summary.totalAllocated) * 100 >= 90
                              ? '#F59E0B'
                              : '#10B981',
                      }}
                    />
                  </View>
                </View>

                {/* Status and Remaining */}
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-xs text-gray-600 mb-0.5">Status</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {(summary.totalSpent / summary.totalAllocated) * 100 >= 100
                        ? 'Over Budget'
                        : (summary.totalSpent / summary.totalAllocated) * 100 >= 90
                          ? 'Approaching Limit'
                          : (summary.totalSpent / summary.totalAllocated) * 100 >= 70
                            ? 'Watch Spending'
                            : 'On Track'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-gray-600 mb-0.5">Remaining</Text>
                    <Text
                      className="text-sm font-semibold"
                      style={{
                        color:
                          summary.totalIncome - summary.totalSpent > 0 ? '#10B981' : '#EF4444',
                      }}
                    >
                      {summary.totalIncome - summary.totalSpent > 0 ? '+' : ''}
                      {formatCurrency(summary.totalIncome - summary.totalSpent)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* Empty State */
            <View className="rounded-2xl p-6 bg-blue-50 border border-blue-100">
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-teal-100 items-center justify-center mb-3">
                  <TrendingUp size={24} color="#0D9488" />
                </View>
                <Text className="text-base font-semibold text-gray-900 mb-2">No Budget Yet</Text>
                <Text className="text-sm text-gray-600 text-center mb-4">
                  Create your first budget to track spending and see your financial overview here.
                </Text>
              </View>
            </View>
          )}

          {/* Budget 50/30/20 Breakdown */}
          {summary && (
            <Budget50_30_20Widget
              needsAllocated={summary.needsAllocated}
              needsSpent={needsSpent}
              wantsAllocated={summary.wantsAllocated}
              wantsSpent={wantsSpent}
              savingsAllocated={summary.savingsAllocated}
              savingsSpent={savingsSpent}
            />
          )}

          {/* Recent Transactions Widget */}
          <RecentTransactionsWidget transactions={enrichedTransactions} />

          {/* Accounts List Widget */}
          <AccountsListWidget accounts={accounts} />

          {/* Bottom Padding */}
          <View className="h-4" />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </SafeAreaView>
  );
}
