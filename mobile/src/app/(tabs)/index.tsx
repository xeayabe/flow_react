import React, { useCallback } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { db } from '@/lib/db';
import { colors } from '@/lib/design-tokens';
import { getUserAccounts } from '@/lib/accounts-api';
import { getRecentTransactions } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { getBudgetDetails, getBudgetSummary, recalculateBudgetSpentAmounts, checkAndResetBudgetIfNeeded, getMemberBudgetPeriod } from '@/lib/budget-api';
import { getCurrentBudgetPeriod } from '@/lib/budget-period-utils';
import { getRecentTransactionsWithCategories } from '@/lib/dashboard-helpers';
import { extractEmoji } from '@/lib/extractEmoji';
import { calculateTrueBalance } from '@/lib/balance-api';
import { TruePositionHero } from '@/components/TruePositionHero';
import { HouseholdBalanceWidget } from '@/components/dashboard/HouseholdBalanceWidget';
import { BudgetStatusCard } from '@/components/dashboard/BudgetStatusCard';
import { WalletsCard } from '@/components/dashboard/WalletsCard';
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard';
import { useHouseholdData } from '@/hooks/useHouseholdData';
import StickyStatusBar from '@/components/layout/StickyStatusBar';

/**
 * Dashboard Screen - Swiss Design Dark Theme
 * OPTIMIZED: Queries run in parallel, budget recalculation fixed
 */
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = db.useAuth();
  const [showResetNotification, setShowResetNotification] = React.useState(false);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Fetch household data for the Household Balance Widget
  const householdData = useHouseholdData();

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
    staleTime: 30000, // Cache for 30 seconds
  });

  const userId = userProfileQuery.data?.userRecord?.id;
  const householdId = userProfileQuery.data?.member?.householdId;

  // Get personal budget period from member (or fallback to household)
  const budgetPeriodQuery = useQuery({
    queryKey: ['my-budget-period', userId, householdId],
    queryFn: async () => {
      if (!userId || !householdId) throw new Error('Missing user or household');
      return getMemberBudgetPeriod(userId, householdId);
    },
    enabled: !!userId && !!householdId,
    staleTime: 30000,
  });

  const budgetPeriod = budgetPeriodQuery.data;

  // OPTIMIZED: All queries below now run in PARALLEL (not waterfall)
  
  // Get balance data (net worth, assets, liabilities)
  const balanceQuery = useQuery({
    queryKey: ['true-balance', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      return calculateTrueBalance(userId);
    },
    enabled: !!userId,
    // FIX: PERF-4 - Removed refetchInterval: 5000.
    // Balance changes only after transactions/settlements, which invalidate this query.
    staleTime: 30_000,
  });

  // Get all accounts
  const accountsQuery = useQuery({
    queryKey: ['user-accounts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // Get recent transactions
  const recentTransactionsQuery = useQuery({
    queryKey: ['recent-transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      return getRecentTransactions(userId, 10);
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Get categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategories(householdId, userId);
    },
    enabled: !!householdId && !!userId,
    staleTime: 30000,
  });

  // Get category groups
  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategoryGroups(householdId, userId);
    },
    enabled: !!householdId && !!userId,
    staleTime: 30000,
  });

  // Get budget details
  const budgetDetailsQuery = useQuery({
    queryKey: ['budget-details', userId, budgetPeriod?.start],
    queryFn: async () => {
      if (!userId || !budgetPeriod) return [];
      return getBudgetDetails(userId, budgetPeriod.start);
    },
    enabled: !!userId && !!budgetPeriod,
    staleTime: 30000,
  });

  // Get budget summary
  const budgetSummaryQuery = useQuery({
    queryKey: ['budget-summary', userId, householdId, budgetPeriod?.start],
    queryFn: async () => {
      if (!userId || !householdId || !budgetPeriod) return null;
      return getBudgetSummary(userId, householdId, budgetPeriod.start);
    },
    enabled: !!userId && !!householdId && !!budgetPeriod,
    staleTime: 30000,
  });

  // Refetch when focused
  const { refetch: refetchBalance } = balanceQuery;
  const { refetch: refetchAccounts } = accountsQuery;
  const { refetch: refetchRecentTransactions } = recentTransactionsQuery;
  const { refetch: refetchBudgetDetails } = budgetDetailsQuery;
  const { refetch: refetchBudgetSummary } = budgetSummaryQuery;
  const { refetch: refetchHouseholdData } = householdData;

  useFocusEffect(
    useCallback(() => {
      refetchBalance();
      refetchAccounts();
      refetchRecentTransactions();
      refetchBudgetDetails();
      refetchBudgetSummary();
      refetchHouseholdData();
    }, [refetchBalance, refetchAccounts, refetchRecentTransactions, refetchBudgetDetails, refetchBudgetSummary, refetchHouseholdData])
  );

  // FIXED: Recalculate spent amounts ONCE on mount, not on every render
  const [hasRecalculated, setHasRecalculated] = React.useState(false);

  React.useEffect(() => {
    // Only recalculate if we have the required data and haven't recalculated yet
    if (userId && householdId && budgetPeriod && budgetPeriod.start && budgetPeriod.end && !hasRecalculated) {
      setHasRecalculated(true);

      // Run recalculation in background without blocking UI
      recalculateBudgetSpentAmounts(
        userId,
        budgetPeriod.start,
        budgetPeriod.end
      ).then(() => {
        // Refetch budget data after recalculation
        refetchBudgetDetails();
        refetchBudgetSummary();
      }).catch((error) => {
        console.error('Budget recalculation error:', error);
      });
    }
  }, [userId, householdId, budgetPeriod?.start, budgetPeriod?.end, hasRecalculated]);

  // Loading state - show until we have all required data
  const isInitialLoading = userProfileQuery.isLoading || budgetPeriodQuery.isLoading || !budgetPeriod;

  if (isInitialLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <Animated.View entering={FadeIn.duration(500)}>
            <Text className="text-4xl mb-4">💎</Text>
          </Animated.View>
          <Text className="text-white/70 text-sm">Loading your financial overview...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Error state
  if (userProfileQuery.error) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-white text-lg font-semibold mb-2">Unable to load dashboard</Text>
          {/* FIX: TASK-3 - Use design token for text color */}
          <Text style={{ color: colors.textWhiteTertiary }} className="text-sm text-center mb-6">
            {(userProfileQuery.error as Error).message}
          </Text>
          <Pressable
            onPress={() => userProfileQuery.refetch()}
            style={{ backgroundColor: colors.contextTeal }}
            className="px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  // Get data with safe defaults
  const balance = balanceQuery.data || { netWorth: 0, assets: { total: 0, accounts: [] }, liabilities: { total: 0, accounts: [] } };
  const accounts = accountsQuery.data || [];
  const recentTransactions = recentTransactionsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const categoryGroups = categoryGroupsQuery.data || [];
  const budgetDetails = budgetDetailsQuery.data || [];
  const budgetSummary = budgetSummaryQuery.data;

  // Create a map of group key -> group name/icon for display
  const groupKeyToDisplay = categoryGroups.reduce((map, group) => {
    map[group.key] = { name: group.name, icon: group.icon };
    return map;
  }, {} as Record<string, { name: string; icon?: string }>);

  // Transform budget details for BudgetStatusCard
  const enrichedBudgets = budgetDetails.map((budget) => {
    const category = categories.find((c) => c.id === budget.categoryId);
    const { emoji, name } = category
      ? extractEmoji(category.name)
      : { emoji: '📊', name: 'Unknown' };

    const groupKey = budget.categoryGroup || 'other';
    const groupDisplay = groupKeyToDisplay[groupKey];
    const groupName = groupDisplay?.name || groupKey;
    const groupIcon = groupDisplay?.icon;

    return {
      id: budget.id,
      categoryName: name,
      categoryEmoji: emoji,
      categoryGroup: groupName,
      categoryGroupIcon: groupIcon,
      allocatedAmount: budget.allocatedAmount || 0,
      spentAmount: budget.spentAmount || 0,
    };
  });

  // Format accounts for WalletsCard - use stored balance directly
  const formattedWallets = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    institution: account.institution || 'Other',
    type: account.accountType || 'Checking',
    balance: account.balance ?? 0,
    isDefault: account.isDefault || false,
  }));

  // Format transactions for RecentTransactionsCard
  const formattedTransactions = recentTransactions
  .slice(0, 10)
  .filter((tx) => tx.id) // Filter out any undefined IDs
  .map((tx) => {
    const category = categories.find((c) => c.id === tx.categoryId);
    const { emoji, name: categoryName } = category
      ? extractEmoji(category.name)
      : { emoji: '💰', name: 'Uncategorized' };

    return {
      id: tx.id!, // Non-null assertion since we filtered
      name: tx.payee || tx.note || 'Unknown',
      emoji: emoji,
      category: categoryName,
      amount: tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
      date: tx.date,
      isShared: tx.isShared || false,
    };
  });

  return (
    <LinearGradient
      // FIX: TASK-3 - Replace hardcoded gradient colors with design tokens
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <StickyStatusBar scrollY={scrollY} />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
      >
        <View className="gap-4">
          {/* 1. True Position Hero */}
          <Animated.View entering={FadeInDown.delay(0).duration(400)}>
            <TruePositionHero
              netWorth={balance.netWorth}
              assets={balance.assets.total}
              liabilities={balance.liabilities.total}
            />
          </Animated.View>

          {/* 2. Household Balance Widget */}
          {householdData.partner && householdData.hasUnsettledExpenses && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <HouseholdBalanceWidget
                debtAmount={householdData.debtAmount}
                partnerName={householdData.partner.name}
                yourSplitRatio={householdData.yourSplitRatio}
                partnerSplitRatio={householdData.partnerSplitRatio}
                hasUnsettledExpenses={householdData.hasUnsettledExpenses}
              />
            </Animated.View>
          )}

          {/* 3. Budget Status Card */}
          {enrichedBudgets.length > 0 && budgetSummary && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <BudgetStatusCard
                budgets={enrichedBudgets}
                summaryTotals={{
                totalAllocated: budgetSummary.totalAllocated,
                totalSpent: budgetSummary.totalSpent,
              }}
              />
            </Animated.View>
          )}

          {/* 4. Wallets Card */}
          {formattedWallets.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <WalletsCard wallets={formattedWallets} />
            </Animated.View>
          )}

          {/* 5. Recent Transactions Card */}
          {formattedTransactions.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <RecentTransactionsCard transactions={formattedTransactions} />
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>

      {/* 6. Floating Action Button */}
      <Pressable
        onPress={() => router.push('/transactions/add')}
        className="absolute items-center justify-center"
        style={{
          bottom: 20,
          right: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.contextTeal,
          shadowColor: colors.sageGreen,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 8,
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: colors.borderSage,
          }}
        />
        {/* FIX: TASK-3 - Use design token for icon color */}
        <Plus size={28} color={colors.textWhite} strokeWidth={2.5} />
      </Pressable>
    </LinearGradient>
  );
}