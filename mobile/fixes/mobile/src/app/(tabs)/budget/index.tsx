import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Edit3 } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '@/lib/db';
import { getBudgetSummary, getBudgetDetails, getMemberBudgetPeriod } from '@/lib/budget-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { formatDateSwiss } from '@/lib/payday-utils';
import { getCurrentBudgetPeriod } from '@/lib/budget-period-utils';
// FIX: TASK-3/TASK-8 - Import design tokens and budget color system
import { colors } from '@/lib/design-tokens';
import { getBudgetColor } from '@/lib/getBudgetColor';

interface BudgetSummaryData {
  totalIncome: number;
  totalAllocated: number;
  totalSpent: number;
}

// FIX: TASK-8 - Replace hardcoded red/amber/green with 4-tier budget color system
function getStatusColor(percentUsed: number): string {
  return getBudgetColor(percentUsed);
}

export default function BudgetTabScreen() {
  const { user } = db.useAuth();
  const queryClient = useQueryClient();

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

      // Get household membership
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

  // Get personal budget period
  const budgetPeriodQuery = useQuery({
    queryKey: ['my-budget-period', userId, householdId],
    queryFn: async () => {
      if (!userId || !householdId) throw new Error('Missing user or household');
      return getMemberBudgetPeriod(userId, householdId);
    },
    enabled: !!userId && !!householdId,
  });

  const budgetPeriod = budgetPeriodQuery.data ?? {
    start: getCurrentBudgetPeriod(25).periodStartISO,
    end: getCurrentBudgetPeriod(25).periodEndISO,
    paydayDay: 25,
    source: 'household' as const,
  };

  const summaryQuery = useQuery({
    queryKey: ['budget-summary', userId, householdId, budgetPeriod.start],
    queryFn: async () => {
      if (!userId || !householdId) return null;
      return getBudgetSummary(userId, householdId, budgetPeriod.start);
    },
    enabled: !!userId && !!householdId,
  });

  const detailsQuery = useQuery({
    queryKey: ['budget-details', userId, budgetPeriod.start],
    queryFn: async () => {
      if (!userId) return [];
      return getBudgetDetails(userId, budgetPeriod.start);
    },
    enabled: !!userId,
  });

  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategoryGroups(householdId, userId);
    },
    enabled: !!householdId && !!userId,
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
    const groups: Record<string, any[]> = {};

    // Initialize groups for all expense category groups from DB
    (categoryGroupsQuery.data || [])
      .filter((g: any) => g.type === 'expense')
      .forEach((g: any) => {
        groups[g.key] = [];
      });

    // Also add 'other' as fallback
    if (!groups['other']) {
      groups['other'] = [];
    }

    details.forEach((detail: any) => {
      const group = detail.categoryGroup || 'other';
      if (groups[group]) {
        groups[group].push(detail);
      } else {
        // If group doesn't exist, add to other
        groups['other'].push(detail);
      }
    });

    return groups;
  }, [details, categoryGroupsQuery.data]);

  if (userProfileQuery.isLoading || budgetPeriodQuery.isLoading || summaryQuery.isLoading || categoryGroupsQuery.isLoading) {
    return (
      // FIX: TASK-3 - Replace hardcoded white background with design token
      <View style={{ flex: 1, backgroundColor: colors.contextDark, justifyContent: 'center', alignItems: 'center' }}>
        {/* FIX: TASK-3 - Replace hardcoded '#006A6A' with design token */}
        <ActivityIndicator size="large" color={colors.contextTeal} />
      </View>
    );
  }

  if (!summary) {
    return (
      // FIX: TASK-3 - Replace hardcoded white background with design token
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.contextDark }} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View className="items-center">
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              // FIX: TASK-3 - Replace hardcoded teal-50 with design token
              backgroundColor: colors.bgGlass,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Text className="text-4xl">📊</Text>
            </View>
            {/* FIX: TASK-3 - Use design token for text color */}
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.textWhite, textAlign: 'center', marginBottom: 12 }}>
              Set up your budget
            </Text>
            <Text style={{ fontSize: 16, color: colors.textWhiteSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
              Allocate your monthly income to track spending and ensure every franc has a purpose.
            </Text>
            <Pressable
              onPress={() => router.push('/budget/category-group-allocation')}
              // FIX: TASK-3 - Use design token for button background
              style={{ backgroundColor: colors.contextTeal, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 }}
            >
              <Text style={{ color: colors.textWhite, fontWeight: '600', textAlign: 'center' }}>Create My First Budget</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Round values to fix floating-point display errors
  const allocatedRounded = Math.round(summary.totalAllocated * 100) / 100;
  const spentRounded = Math.round(summary.totalSpent * 100) / 100;
  const incomeRounded = Math.round(summary.totalIncome * 100) / 100;

  // Remaining is what's left from allocated that hasn't been spent
  const remaining = Math.round((allocatedRounded - spentRounded) * 100) / 100;
  const allocatedPercentage = (allocatedRounded / incomeRounded) * 100;
  // FIX: TASK-8 - Use 4-tier budget color for overall status
  const overallSpentPercentage = allocatedRounded > 0 ? (spentRounded / allocatedRounded) * 100 : 0;
  const overallStatusColor = getStatusColor(overallSpentPercentage);

  return (
    // FIX: TASK-3 - Replace hardcoded white background with dark theme
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.contextDark }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        // FIX: TASK-3 - Use design token for border color
        borderBottomColor: colors.borderTeal,
      }}>
        <View>
          {/* FIX: TASK-3 - Use design token for text color */}
          <Text style={{ fontSize: 30, fontWeight: 'bold', color: colors.textWhite }}>Budget</Text>
          <Text style={{ fontSize: 14, color: colors.textWhiteSecondary, marginTop: 4 }}>
            {formatDateSwiss(budgetPeriod.start)} - {formatDateSwiss(budgetPeriod.end)}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/budget/setup')}
          style={{ padding: 8, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          {/* FIX: TASK-3 - Replace hardcoded '#006A6A' with design token */}
          <Edit3 size={24} color={colors.contextTeal} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          {/* Summary Card */}
          <View style={{
            marginBottom: 32,
            padding: 20,
            borderRadius: 16,
            // FIX: TASK-3 - Use design token for background
            backgroundColor: colors.bgDark,
            borderWidth: 1,
            // FIX: TASK-3 - Use design token for border
            borderColor: colors.borderTeal,
          }}>
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                {/* FIX: TASK-3 - Use design token for text color */}
                <Text style={{ fontSize: 14, color: colors.textWhiteSecondary }}>Total Allocated</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textWhite }}>{allocatedPercentage.toFixed(1)}%</Text>
              </View>
              <View style={{ height: 12, backgroundColor: colors.bgGlass, borderRadius: 9999, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, allocatedPercentage)}%`,
                    // FIX: TASK-3 - Use design token for progress bar
                    backgroundColor: colors.contextTeal,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 12, color: colors.textWhiteSecondary, marginBottom: 2 }}>Allocated</Text>
                {/* FIX: TASK-3 - Use design token for text color */}
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.sageGreen }}>{allocatedRounded.toFixed(2)}</Text>
                <Text style={{ fontSize: 12, color: colors.textWhiteTertiary }}>CHF</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.textWhiteSecondary, marginBottom: 2 }}>Spent</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.textWhite }}>{summary.totalSpent.toFixed(2)}</Text>
                <Text style={{ fontSize: 12, color: colors.textWhiteTertiary }}>CHF</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: colors.textWhiteSecondary, marginBottom: 2 }}>Remaining</Text>
                {/* FIX: TASK-8 - Use 4-tier budget color instead of hardcoded teal */}
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: overallStatusColor }}>{remaining.toFixed(2)}</Text>
                <Text style={{ fontSize: 12, color: colors.textWhiteTertiary }}>CHF</Text>
              </View>
            </View>
          </View>

          {/* Category Groups */}
          <View style={{ marginBottom: 32, gap: 12 }}>
            {(categoryGroupsQuery.data || [])
              .filter((g) => g.type === 'expense')
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((group) => {
                const groupDetails = groupedDetails[group.key] || [];
                const allocated = groupDetails.reduce((sum: number, d: any) => sum + d.allocatedAmount, 0);
                const spent = groupDetails.reduce((sum: number, d: any) => sum + d.spentAmount, 0);
                const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
                // FIX: TASK-8 - Use 4-tier budget color system
                const groupColor = getStatusColor(percentage);

                return (
                  <View key={group.key} style={{
                    padding: 16,
                    borderRadius: 12,
                    // FIX: TASK-3 - Use design token for background
                    backgroundColor: colors.bgGlass,
                    borderWidth: 1,
                    borderColor: colors.borderTeal,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 18 }}>{group.icon || '📂'}</Text>
                        <View>
                          {/* FIX: TASK-3 - Use design token for text color */}
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textWhite }}>{group.name}</Text>
                          <Text style={{ fontSize: 12, color: colors.textWhiteTertiary }}>{allocated.toFixed(2)} CHF budget</Text>
                        </View>
                      </View>
                      {/* FIX: TASK-3/TASK-8 - Replace hardcoded '#006A6A' with budget color */}
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: groupColor }}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                    {/* FIX: TASK-3 - Use design tokens for progress bar */}
                    <View style={{ height: 8, backgroundColor: colors.bgDark, borderRadius: 9999, overflow: 'hidden' }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${Math.min(100, percentage)}%`,
                          // FIX: TASK-8 - Use 4-tier budget color instead of hardcoded '#006A6A'
                          backgroundColor: groupColor,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
          </View>

          {/* Individual Categories */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textWhite, marginBottom: 16, textTransform: 'uppercase' }}>Categories</Text>

            {(categoryGroupsQuery.data || [])
              .filter((g) => g.type === 'expense')
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((group) => {
                const groupDetails = groupedDetails[group.key] || [];
                if (groupDetails.length === 0) return null;

                return (
                  <View key={group.key} style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textWhiteTertiary, marginBottom: 12, textTransform: 'uppercase' }}>
                      {group.icon && `${group.icon} `}{group.name}
                    </Text>

                    {groupDetails
                      .sort((a: any, b: any) => b.allocatedAmount - a.allocatedAmount)
                      .map((detail: any) => {
                      const percentage = detail.allocatedAmount > 0 ? (detail.spentAmount / detail.allocatedAmount) * 100 : 0;
                      // FIX: TASK-8 - Use 4-tier budget color instead of red/amber/green
                      const statusColor = getStatusColor(percentage);

                      return (
                        <Pressable
                          key={detail.id}
                          onPress={() => router.push(`/(tabs)/transactions?category=${detail.categoryId}`)}
                          style={{
                            marginBottom: 16,
                            padding: 16,
                            borderRadius: 12,
                            // FIX: TASK-3 - Use design token for background
                            backgroundColor: colors.bgGlass,
                            borderWidth: 1,
                            borderColor: colors.borderTealLight,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                            <View style={{ flex: 1 }}>
                              {/* FIX: TASK-3 - Use design token for text color */}
                              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textWhite }}>{detail.categoryName}</Text>
                              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                <Text style={{ fontSize: 12, color: colors.textWhiteTertiary }}>
                                  Budget: <Text style={{ fontWeight: '600' }}>{detail.allocatedAmount.toFixed(2)}</Text> CHF
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.textWhiteTertiary }}>
                                  Spent: <Text style={{ fontWeight: '600' }}>{detail.spentAmount.toFixed(2)}</Text> CHF
                                </Text>
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              {/* FIX: TASK-8 - Use 4-tier budget color */}
                              <Text style={{ fontSize: 14, fontWeight: 'bold', color: statusColor }}>
                                {percentage.toFixed(0)}%
                              </Text>
                            </View>
                          </View>

                          {/* FIX: TASK-3 - Use design tokens for progress bar */}
                          <View style={{ height: 8, backgroundColor: colors.bgDark, borderRadius: 9999, overflow: 'hidden' }}>
                            <View
                              style={{
                                height: '100%',
                                width: `${Math.min(100, percentage)}%`,
                                // FIX: TASK-8 - Use 4-tier budget color
                                backgroundColor: statusColor,
                              }}
                            />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
