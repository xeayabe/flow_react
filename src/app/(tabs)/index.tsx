import React, { useCallback } from 'react';
import { Text, View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp } from 'lucide-react-native';
import { db } from '@/lib/db';
import { getUserAccounts } from '@/lib/accounts-api';
import { getRecentTransactions, Transaction } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { getBudgetSummary, getBudgetDetails, recalculateBudgetSpentAmounts, checkAndResetBudgetIfNeeded, getMemberBudgetPeriod } from '@/lib/budget-api';
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
  BudgetBreakdownWidget,
  BudgetGroupData,
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
  const [showResetNotification, setShowResetNotification] = React.useState(false);

  // Get user profile and household membership
  const userProfileQuery = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      // Get household membership to get householdId and personal budget period
      const memberResult = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userRecord.id, status: 'active' } },
        },
      });

      const member = memberResult.data.householdMembers?.[0];
      if (!member) throw new Error('No household membership found');

      return { userRecord, member };
    },
    enabled: !!user?.email,
  });

  const userId = userProfileQuery.data?.userRecord?.id;
  const householdId = userProfileQuery.data?.member?.householdId;
  const member = userProfileQuery.data?.member;

  // Get personal budget period from member (or fallback to household)
  const budgetPeriodQuery = useQuery({
    queryKey: ['my-budget-period', userId, householdId],
    queryFn: async () => {
      if (!userId || !householdId) throw new Error('Missing user or household');
      return getMemberBudgetPeriod(userId, householdId);
    },
    enabled: !!userId && !!householdId,
  });

  const budgetPeriod = budgetPeriodQuery.data ?? {
    start: calculateBudgetPeriod(25).start,
    end: calculateBudgetPeriod(25).end,
    paydayDay: 25,
    source: 'household' as const,
  };

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
    queryKey: ['categories', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategories(householdId, userId);
    },
    enabled: !!householdId && !!userId,
  });

  // Get category groups
  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      return getCategoryGroups(householdId);
    },
    enabled: !!householdId,
  });

  // Get budget details (per-category allocations and spent amounts)
  const budgetDetailsQuery = useQuery({
    queryKey: ['budget-details', userId, budgetPeriod.start],
    queryFn: async () => {
      if (!userId) return [];
      return getBudgetDetails(userId, budgetPeriod.start);
    },
    enabled: !!userId,
  });

  // Refetch when focused
  const { refetch: refetchBudgetSummary } = summaryQuery;
  const { refetch: refetchAccounts } = accountsQuery;
  const { refetch: refetchRecentTransactions } = recentTransactionsQuery;
  const { refetch: refetchBudgetDetails } = budgetDetailsQuery;

  useFocusEffect(
    useCallback(() => {
      refetchBudgetSummary();
      refetchAccounts();
      refetchRecentTransactions();
      refetchBudgetDetails();
    }, [refetchBudgetSummary, refetchAccounts, refetchRecentTransactions, refetchBudgetDetails])
  );

  // Recalculate spent amounts when user/period data is available
  const [hasRecalculated, setHasRecalculated] = React.useState(false);

  React.useEffect(() => {
    if (userId && householdId && !summaryQuery.isLoading && summaryQuery.data && !hasRecalculated) {
      setHasRecalculated(true);
      recalculateBudgetSpentAmounts(
        userId,
        budgetPeriod.start,
        budgetPeriod.end
      ).then(() => {
        refetchBudgetSummary();
      }).catch((error) => {
        console.warn('Failed to recalculate budget spent amounts:', error);
      });
    }
  }, [userId, householdId, summaryQuery.isLoading, summaryQuery.data, budgetPeriod.start, budgetPeriod.end, hasRecalculated, refetchBudgetSummary]);

  // Check if budget reset is needed on component mount
  React.useEffect(() => {
    if (householdId) {
      checkAndResetBudgetIfNeeded(householdId).then((resetHappened) => {
        if (resetHappened) {
          setShowResetNotification(true);
          // Refetch data after reset
          setTimeout(() => {
            refetchBudgetSummary();
            refetchAccounts();
            refetchRecentTransactions();
          }, 500);
        }
      }).catch((error) => {
        console.error('Error checking budget reset:', error);
      });
    }
  }, [householdId]);

  const isLoading =
    userProfileQuery.isLoading ||
    budgetPeriodQuery.isLoading ||
    accountsQuery.isLoading ||
    summaryQuery.isLoading ||
    recentTransactionsQuery.isLoading ||
    categoriesQuery.isLoading ||
    categoryGroupsQuery.isLoading ||
    budgetDetailsQuery.isLoading;

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
  const budgetDetails = budgetDetailsQuery.data || [];
  const categoryGroups = categoryGroupsQuery.data || [];
  const userName = userProfileQuery.data?.userRecord?.name || 'User';
  const totalBalance = calculateTotalBalance(accounts);
  const monthSpending = calculatePeriodSpending(recentTransactions, budgetPeriod.start, budgetPeriod.end, 'expense');

  // Enrich recent transactions with category info
  const enrichedTransactions = getRecentTransactionsWithCategories(recentTransactions, categories, 5);

  // Build dynamic budget groups from category groups and budget details
  // First, aggregate budget details by category group
  const groupTotals: Record<string, { allocated: number; spent: number }> = {};
  budgetDetails.forEach((budget: any) => {
    const groupKey = budget.categoryGroup || 'other';
    if (!groupTotals[groupKey]) {
      groupTotals[groupKey] = { allocated: 0, spent: 0 };
    }
    groupTotals[groupKey].allocated += budget.allocatedAmount || 0;
    groupTotals[groupKey].spent += budget.spentAmount || 0;
  });

  const budgetGroups: BudgetGroupData[] = categoryGroups
    .filter((g: any) => g.type === 'expense')
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((group: any) => {
      // Get allocated and spent amounts from aggregated budget details
      const totals = groupTotals[group.key] || { allocated: 0, spent: 0 };

      return {
        key: group.key,
        name: group.name,
        icon: group.icon,
        allocated: Math.round(totals.allocated * 100) / 100,
        spent: Math.round(totals.spent * 100) / 100,
      };
    });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Budget Reset Notification */}
      {showResetNotification && (
        <View className="bg-green-50 border-b border-green-200 px-6 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-bold text-green-900">🎉 New Budget Period Started!</Text>
              <Text className="text-xs text-green-700 mt-1">Your budget has been reset to zero</Text>
            </View>
            <Pressable onPress={() => setShowResetNotification(false)}>
              <Text className="text-lg font-bold text-green-600">×</Text>
            </Pressable>
          </View>
        </View>
      )}

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
                        const daysRemaining = Math.ceil((endDate.getTime() - todayForCalc.getTime()) / (1000 * 60 * 60 * 24));
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

          {/* Budget Breakdown Widget - Dynamic */}
          {summary && budgetGroups.length > 0 && (
            <BudgetBreakdownWidget groups={budgetGroups} />
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
