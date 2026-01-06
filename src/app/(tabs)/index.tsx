import React, { useCallback } from 'react';
import { Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { TrendingUp, ChevronRight } from 'lucide-react-native';
import { db } from '@/lib/db';
import { getBudgetSummary } from '@/lib/budget-api';
import { calculateBudgetPeriod, formatDateSwiss } from '@/lib/payday-utils';

interface BudgetSummaryData {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  needsAllocated: number;
  wantsAllocated: number;
  savingsAllocated: number;
}

function getSpendingStatus(spent: number, allocated: number): { status: string; color: string } {
  if (allocated === 0) return { status: 'empty', color: '#9CA3AF' };
  const percentage = (spent / allocated) * 100;
  if (percentage >= 100) return { status: 'over', color: '#EF4444' };
  if (percentage >= 90) return { status: 'warning', color: '#F59E0B' };
  return { status: 'on-track', color: '#10B981' };
}

export default function DashboardScreen() {
  const { user } = db.useAuth();
  const queryClient = useQueryClient();

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

  // Get budget summary
  const summaryQuery = useQuery({
    queryKey: ['budget-summary', householdQuery.data?.userRecord?.id, householdQuery.data?.household?.id, budgetPeriod.start],
    queryFn: async () => {
      if (!householdQuery.data?.userRecord?.id) return null;
      return getBudgetSummary(householdQuery.data.userRecord.id, householdQuery.data.household.id, budgetPeriod.start);
    },
    enabled: !!householdQuery.data?.userRecord?.id,
  });

  const { refetch: refetchBudgetSummary } = summaryQuery;

  // Refetch when focused
  useFocusEffect(
    useCallback(() => {
      refetchBudgetSummary();
    }, [refetchBudgetSummary])
  );

  const summary = summaryQuery.data as BudgetSummaryData | null;

  if (householdQuery.isLoading || summaryQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#006A6A" />
        </View>
      </SafeAreaView>
    );
  }

  const remaining = summary ? summary.totalIncome - summary.totalSpent : 0;
  const spentPercentage = summary ? (summary.totalSpent / summary.totalIncome) * 100 : 0;
  const { status: spendingStatus, color: statusColor } = summary
    ? getSpendingStatus(summary.totalSpent, summary.totalAllocated)
    : { status: 'empty', color: '#9CA3AF' };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-6 py-6">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900">Dashboard</Text>
            <Text className="text-sm text-gray-500 mt-2">Overview of your finances</Text>
          </View>

          {/* Budget Status Widget */}
          {summary ? (
            <View className="mb-8">
              <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#F8FAFC' }}>
                {/* Card Header */}
                <View className="px-6 py-5 border-b border-gray-200">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-lg bg-teal-100 items-center justify-center">
                        <TrendingUp size={20} color="#0D9488" />
                      </View>
                      <View>
                        <Text className="text-sm font-semibold text-gray-700">Budget Status</Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {formatDateSwiss(budgetPeriod.start)} - {formatDateSwiss(budgetPeriod.end)}
                        </Text>
                      </View>
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
                        {summary.totalSpent.toFixed(2)} CHF
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      of {summary.totalAllocated.toFixed(2)} CHF allocated
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View className="mb-4">
                    <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <View
                        className="h-full"
                        style={{
                          width: `${Math.min(100, spentPercentage)}%`,
                          backgroundColor: statusColor,
                        }}
                      />
                    </View>
                  </View>

                  {/* Status and Remaining */}
                  <View className="flex-row justify-between items-center mb-4">
                    <View>
                      <Text className="text-xs text-gray-600 mb-0.5">Status</Text>
                      <View className="flex-row items-center gap-2">
                        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                        <Text className="text-sm font-semibold text-gray-900">
                          {spendingStatus === 'on-track' && 'On Track'}
                          {spendingStatus === 'warning' && 'Warning'}
                          {spendingStatus === 'over' && 'Over Budget'}
                          {spendingStatus === 'empty' && 'No Budget'}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-gray-600 mb-0.5">Remaining</Text>
                      <Text className="text-sm font-semibold" style={{ color: remaining > 0 ? '#10B981' : '#EF4444' }}>
                        {remaining > 0 ? '+' : ''}{remaining.toFixed(2)} CHF
                      </Text>
                    </View>
                  </View>

                  {/* Allocation Breakdown */}
                  <View className="grid grid-cols-3 gap-3">
                    <View className="p-3 rounded-lg bg-white">
                      <Text className="text-xs text-gray-600 mb-1">Needs</Text>
                      <Text className="text-sm font-bold text-gray-900">{summary.needsAllocated.toFixed(0)}%</Text>
                    </View>
                    <View className="p-3 rounded-lg bg-white">
                      <Text className="text-xs text-gray-600 mb-1">Wants</Text>
                      <Text className="text-sm font-bold text-gray-900">{summary.wantsAllocated.toFixed(0)}%</Text>
                    </View>
                    <View className="p-3 rounded-lg bg-white">
                      <Text className="text-xs text-gray-600 mb-1">Savings</Text>
                      <Text className="text-sm font-bold text-gray-900">{summary.savingsAllocated.toFixed(0)}%</Text>
                    </View>
                  </View>
                </View>

                {/* Card Footer - View Budget Link */}
                <View className="px-6 py-4 border-t border-gray-200">
                  <Pressable
                    onPress={() => router.push('/budget')}
                    className="flex-row items-center justify-between"
                  >
                    <Text className="text-sm font-semibold text-teal-600">View Budget Details</Text>
                    <ChevronRight size={18} color="#0D9488" />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            /* Empty State */
            <View className="mb-8 rounded-2xl p-6" style={{ backgroundColor: '#F0F9FF' }}>
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-teal-100 items-center justify-center mb-3">
                  <TrendingUp size={24} color="#0D9488" />
                </View>
                <Text className="text-base font-semibold text-gray-900 mb-2">No Budget Yet</Text>
                <Text className="text-sm text-gray-600 text-center mb-4">
                  Create your first budget to track spending and see your financial overview here.
                </Text>
                <Pressable
                  onPress={() => router.push('/budget')}
                  className="bg-teal-600 py-2 px-4 rounded-lg"
                >
                  <Text className="text-sm font-semibold text-white">Create Budget</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Placeholder for future widgets */}
          <View className="py-4">
            <Text className="text-xs text-gray-500 text-center">More widgets coming soon</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
