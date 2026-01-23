import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Edit3 } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '@/lib/db';
import { getBudgetSummary, getBudgetDetails } from '@/lib/budget-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { calculateBudgetPeriod, formatDateSwiss } from '@/lib/payday-utils';

interface BudgetSummaryData {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
  needsAllocated: number;
  wantsAllocated: number;
  savingsAllocated: number;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'on-track':
      return '#10B981';
    case 'warning':
      return '#F59E0B';
    case 'over-budget':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

export default function BudgetOverviewScreen() {
  const { user } = db.useAuth();
  const queryClient = useQueryClient();

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

  const paydayDay = householdQuery.data?.household?.paydayDay ?? 25;
  const budgetPeriod = calculateBudgetPeriod(paydayDay);

  const summaryQuery = useQuery({
    queryKey: ['budget-summary', householdQuery.data?.userRecord?.id, householdQuery.data?.household?.id, budgetPeriod.start],
    queryFn: async () => {
      if (!householdQuery.data?.userRecord?.id) return null;
      return getBudgetSummary(householdQuery.data.userRecord.id, householdQuery.data.household.id, budgetPeriod.start);
    },
    enabled: !!householdQuery.data?.userRecord?.id,
  });

  const detailsQuery = useQuery({
    queryKey: ['budget-details', householdQuery.data?.userRecord?.id, budgetPeriod.start],
    queryFn: async () => {
      if (!householdQuery.data?.userRecord?.id) return [];
      return getBudgetDetails(householdQuery.data.userRecord.id, budgetPeriod.start);
    },
    enabled: !!householdQuery.data?.userRecord?.id,
  });

  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdQuery.data?.household?.id],
    queryFn: async () => {
      if (!householdQuery.data?.household?.id) return [];
      return getCategoryGroups(householdQuery.data.household.id);
    },
    enabled: !!householdQuery.data?.household?.id,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budget-details'] });
    }, [queryClient])
  );

  const summary = summaryQuery.data as BudgetSummaryData | null;
  const details = detailsQuery.data || [];

  const groupedDetails = useMemo(() => {
    const groups: Record<string, any[]> = {
      needs: [],
      wants: [],
      savings: [],
      other: [],
    };

    details.forEach((detail: any) => {
      const group = detail.categoryGroup || 'other';
      if (groups[group]) {
        groups[group].push(detail);
      }
    });

    return groups;
  }, [details]);

  if (householdQuery.isLoading || summaryQuery.isLoading || categoryGroupsQuery.isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View className="items-center">
            <View className="w-20 h-20 rounded-full bg-teal-50 items-center justify-center mb-6">
              <Text className="text-4xl">📊</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 text-center mb-3">Set up your budget</Text>
            <Text className="text-base text-gray-600 text-center leading-6 mb-8">
              Allocate your monthly income to track spending and ensure every franc has a purpose.
            </Text>
            <Pressable
              onPress={() => router.push('/budget/category-group-allocation')}
              className="bg-teal-600 py-3 px-8 rounded-lg"
            >
              <Text className="text-white font-semibold text-center">Create My First Budget</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const remaining = summary.totalIncome - summary.totalSpent;
  const spentPercentage = (summary.totalSpent / summary.totalIncome) * 100;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Budget',
          headerRight: () => (
            <Pressable onPress={() => router.push('/budget/setup')} className="mr-4 flex-row items-center gap-2">
              <Edit3 size={20} color="#006A6A" />
            </Pressable>
          ),
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#006A6A',
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        }}
      />
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View className="px-6 py-6">
            <View className="mb-8">
              <Text className="text-sm text-gray-500 mb-1">Period</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {formatDateSwiss(budgetPeriod.start)} - {formatDateSwiss(budgetPeriod.end)}
              </Text>
            </View>

            <View className="mb-8 p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-blue-50" style={{ borderWidth: 1, borderColor: '#CCFBF1' }}>
              <View className="mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Total Allocated</Text>
                  <Text className="text-sm font-semibold text-gray-900">{spentPercentage.toFixed(1)}%</Text>
                </View>
                <View className="h-3 bg-teal-200 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-teal-600"
                    style={{ width: `${Math.min(100, spentPercentage)}%` }}
                  />
                </View>
              </View>

              <View className="flex-row justify-between mb-3">
                <View>
                  <Text className="text-xs text-gray-600 mb-0.5">Allocated</Text>
                  <Text className="text-xl font-bold text-teal-700">{summary.totalAllocated.toFixed(2)}</Text>
                  <Text className="text-xs text-gray-500">CHF</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-gray-600 mb-0.5">Spent</Text>
                  <Text className="text-xl font-bold text-gray-900">{summary.totalSpent.toFixed(2)}</Text>
                  <Text className="text-xs text-gray-500">CHF</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-gray-600 mb-0.5">Remaining</Text>
                  <Text className="text-xl font-bold text-teal-600">{remaining.toFixed(2)}</Text>
                  <Text className="text-xs text-gray-500">CHF</Text>
                </View>
              </View>
            </View>

            <View className="mb-8 gap-3">
              {(categoryGroupsQuery.data || [])
                .filter((g) => g.type === 'expense')
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((group) => {
                  const groupDetails = groupedDetails[group.key] || [];
                  const allocated = groupDetails.reduce((sum: number, d: any) => sum + d.allocatedAmount, 0);
                  const spent = groupDetails.reduce((sum: number, d: any) => sum + d.spentAmount, 0);
                  const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;

                  return (
                    <View key={group.key} className="p-4 rounded-xl" style={{ backgroundColor: '#F3F4F615', borderWidth: 1, borderColor: '#E5E7EB' }}>
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-lg">{group.icon || '📂'}</Text>
                          <View>
                            <Text className="text-sm font-semibold text-gray-900">{group.name}</Text>
                            <Text className="text-xs text-gray-600">{allocated.toFixed(2)} CHF budget</Text>
                          </View>
                        </View>
                        <Text className="text-sm font-bold" style={{ color: '#006A6A' }}>
                          {percentage.toFixed(0)}%
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-full"
                          style={{ width: `${Math.min(100, percentage)}%`, backgroundColor: '#006A6A' }}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>

            <View>
              <Text className="text-sm font-semibold text-gray-900 mb-4 uppercase">Categories</Text>

              {(categoryGroupsQuery.data || [])
                .filter((g) => g.type === 'expense')
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((group) => {
                  const groupDetails = groupedDetails[group.key] || [];
                  if (groupDetails.length === 0) return null;

                  return (
                    <View key={group.key} className="mb-6">
                      <Text className="text-xs font-semibold text-gray-500 mb-3 uppercase">
                        {group.icon && `${group.icon} `}{group.name}
                      </Text>

                      {groupDetails.map((detail: any) => {
                        const percentage = detail.allocatedAmount > 0 ? (detail.spentAmount / detail.allocatedAmount) * 100 : 0;
                        const statusColor = getStatusColor(detail.status);

                        return (
                          <View key={detail.id} className="mb-4 p-4 rounded-xl bg-gray-50">
                            <View className="flex-row items-start justify-between mb-3">
                              <View className="flex-1">
                                <Text className="text-sm font-semibold text-gray-900">{detail.categoryName}</Text>
                                <View className="flex-row gap-3 mt-1">
                                  <Text className="text-xs text-gray-600">
                                    Budget: <Text className="font-semibold">{detail.allocatedAmount.toFixed(2)}</Text> CHF
                                  </Text>
                                  <Text className="text-xs text-gray-600">
                                    Spent: <Text className="font-semibold">{detail.spentAmount.toFixed(2)}</Text> CHF
                                  </Text>
                                </View>
                              </View>
                              <View className="items-end">
                                <Text className="text-sm font-bold" style={{ color: statusColor }}>
                                  {percentage.toFixed(0)}%
                                </Text>
                              </View>
                            </View>

                            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <View
                                className="h-full"
                                style={{
                                  width: `${Math.min(100, percentage)}%`,
                                  backgroundColor: statusColor,
                                }}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
