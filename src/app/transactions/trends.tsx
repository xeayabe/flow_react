import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, TrendingUp, Calendar } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { db } from '@/lib/db';
import { getTrendData, formatCurrency, formatPercentage, MonthlySummary } from '@/lib/trends-api';
import { cn } from '@/lib/cn';

type TimeRange = '3months' | '6months' | '12months' | 'all';

export default function TrendsScreen() {
  const { user } = db.useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('6months');

  // Get user and household info
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: {
          $: {
            where: {
              email: user.email,
            },
          },
        },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const householdsResult = await db.queryOnce({
        households: {
          $: {
            where: {
              createdByUserId: userRecord.id,
            },
          },
        },
      });

      const household = householdsResult.data.households?.[0];
      if (!household) throw new Error('No household found');

      return { userRecord, household };
    },
    enabled: !!user?.email,
  });

  // Map time range to months
  const monthsMap: Record<TimeRange, number> = {
    '3months': 3,
    '6months': 6,
    '12months': 12,
    'all': 120, // Far future (10 years)
  };

  // Get trends data
  const trendsQuery = useQuery({
    queryKey: [
      'trends',
      householdQuery.data?.userRecord?.id,
      householdQuery.data?.household?.id,
      timeRange,
      monthsMap[timeRange],
    ],
    queryFn: async () => {
      if (!householdQuery.data?.userRecord?.id || !householdQuery.data?.household?.id) {
        return null;
      }

      return getTrendData(
        householdQuery.data.userRecord.id,
        householdQuery.data.household.id,
        monthsMap[timeRange]
      );
    },
    enabled: !!householdQuery.data?.userRecord?.id && !!householdQuery.data?.household?.id,
  });

  const timeRangeLabels: Record<TimeRange, string> = {
    '3months': 'Last 3 Months',
    '6months': 'Last 6 Months',
    '12months': 'Last 12 Months',
    'all': 'All Time',
  };

  if (householdQuery.isLoading || trendsQuery.isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

  const data = trendsQuery.data;

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Income vs Expenses Trend',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="pl-4">
              <ChevronLeft size={24} color="#006A6A" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="px-6 py-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <TrendingUp size={24} color="#0D9488" />
                <Text className="text-lg font-semibold text-gray-900">Trends</Text>
              </View>

              {/* Time Range Selector */}
              <Pressable
                className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-gray-100"
                onPress={() => {
                  // Simple toggle for now - will enhance later
                  const ranges: TimeRange[] = ['3months', '6months', '12months', 'all'];
                  const currentIndex = ranges.indexOf(timeRange);
                  const nextIndex = (currentIndex + 1) % ranges.length;
                  setTimeRange(ranges[nextIndex]);
                }}
              >
                <Calendar size={16} color="#006A6A" />
                <Text className="text-sm font-medium text-gray-700">{timeRangeLabels[timeRange]}</Text>
              </Pressable>
            </View>

            <Text className="text-sm text-gray-600">Track your financial health over time</Text>
          </View>

          {data && (
            <>
              {/* Summary Cards */}
              <View className="px-6 mb-6">
                <View className="gap-3">
                  {/* Row 1: Income & Expenses */}
                  <View className="flex-row gap-3">
                    <View className="flex-1 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <Text className="text-xs font-semibold text-green-700 mb-1">Avg Income</Text>
                      <Text className="text-xl font-bold text-green-900 mb-1">
                        {formatCurrency(data.avgIncome)}
                      </Text>
                      <Text className="text-xs text-green-700">per month</Text>
                    </View>

                    <View className="flex-1 bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                      <Text className="text-xs font-semibold text-red-700 mb-1">Avg Expenses</Text>
                      <Text className="text-xl font-bold text-red-900 mb-1">
                        {formatCurrency(data.avgExpenses)}
                      </Text>
                      <Text className="text-xs text-red-700">per month</Text>
                    </View>
                  </View>

                  {/* Row 2: Savings & Rate */}
                  <View className="flex-row gap-3">
                    <View className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <Text className="text-xs font-semibold text-blue-700 mb-1">Avg Savings</Text>
                      <Text className={cn('text-xl font-bold mb-1', data.avgNet >= 0 ? 'text-blue-900' : 'text-red-900')}>
                        {(data.avgNet >= 0 ? '+' : '') + formatCurrency(data.avgNet)}
                      </Text>
                      <Text className="text-xs text-blue-700">per month</Text>
                    </View>

                    <View className="flex-1 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <Text className="text-xs font-semibold text-purple-700 mb-1">Savings Rate</Text>
                      <Text className="text-xl font-bold text-purple-900 mb-1">
                        {formatPercentage(data.avgSavingsRate)}
                      </Text>
                      {/* Simple bar visualization */}
                      <View className="w-full h-1.5 bg-purple-200 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${Math.min(100, data.avgSavingsRate)}%` }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Chart */}
              {data.data.length > 1 ? (
                <View className="px-6 mb-6">
                  <Animated.View entering={FadeIn.duration(600)} className="bg-gray-50 rounded-lg p-4">
                    <View className="h-64" style={{ width: Dimensions.get('window').width - 48 }}>
                      {/* Simple bar chart */}
                      <View className="flex-row items-flex-end justify-between h-56">
                        {data.data.map((month) => {
                          const maxValue = Math.max(...data.data.flatMap((d) => [d.income, d.expenses]), 1);
                          const incomeHeight = (month.income / maxValue) * 200;
                          const expenseHeight = (month.expenses / maxValue) * 200;

                          return (
                            <View key={month.month} className="items-center flex-1 mx-0.5">
                              {/* Income bar */}
                              <View
                                className="w-1.5 bg-green-500 rounded-t"
                                style={{ height: incomeHeight }}
                              />
                              {/* Expense bar */}
                              <View
                                className="w-1.5 bg-red-500 rounded-t mt-1"
                                style={{ height: expenseHeight }}
                              />
                            </View>
                          );
                        })}
                      </View>

                      {/* X-axis labels */}
                      <View className="flex-row justify-between mt-2 px-1">
                        {data.data.map((d, i) => {
                          if (data.data.length > 6 && i % 2 !== 0) return <View key={`empty-${i}`} className="flex-1" />;
                          return (
                            <Text key={`label-${i}`} className="text-xs text-gray-600 flex-1 text-center">
                              {d.monthLabel.split(' ')[0]}
                            </Text>
                          );
                        })}
                      </View>
                    </View>

                    {/* Legend */}
                    <View className="flex-row justify-center gap-6 mt-4 border-t border-gray-200 pt-4">
                      <View className="flex-row items-center gap-2">
                        <View className="w-3 h-3 bg-green-500 rounded" />
                        <Text className="text-xs text-gray-700">Income</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <View className="w-3 h-3 bg-red-500 rounded" />
                        <Text className="text-xs text-gray-700">Expenses</Text>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              ) : (
                <View className="mx-6 mb-6 h-64 bg-gray-50 rounded-lg items-center justify-center">
                  <Text className="text-sm text-gray-600">Need more data to show trends</Text>
                </View>
              )}

              {/* Monthly Breakdown Table */}
              <View className="px-6 mb-6">
                <Text className="text-sm font-semibold text-gray-900 mb-3">Monthly Breakdown</Text>
                <View className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header */}
                  <View className="flex-row bg-gray-50 border-b border-gray-200 px-3 py-2">
                    <Text className="flex-1 text-xs font-semibold text-gray-700">Month</Text>
                    <Text className="flex-1 text-right text-xs font-semibold text-gray-700">Income</Text>
                    <Text className="flex-1 text-right text-xs font-semibold text-gray-700">Expenses</Text>
                    <Text className="flex-1 text-right text-xs font-semibold text-gray-700">Net</Text>
                  </View>

                  {/* Rows - reversed to show newest first */}
                  {[...data.data].reverse().map((month) => (
                    <View key={month.month} className="flex-row border-b border-gray-100 px-3 py-2 last:border-b-0">
                      <Text className="flex-1 text-xs text-gray-900 font-medium">{month.monthLabel}</Text>
                      <Text className="flex-1 text-right text-xs text-green-700 font-medium">
                        {formatCurrency(month.income)}
                      </Text>
                      <Text className="flex-1 text-right text-xs text-red-700 font-medium">
                        {formatCurrency(month.expenses)}
                      </Text>
                      <Text className={cn('flex-1 text-right text-xs font-semibold', month.net >= 0 ? 'text-teal-700' : 'text-red-700')}>
                        {(month.net >= 0 ? '+' : '') + formatCurrency(month.net)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
