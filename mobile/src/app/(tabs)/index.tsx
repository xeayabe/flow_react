import React, { useCallback } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import Animated, { FadeInDown, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { db } from '@/lib/db';
import { getDashboardData, getHouseholdDebtData } from '@/lib/composite-queries';
import { calculateTrueBalance } from '@/lib/balance-api';
import { extractEmoji } from '@/lib/extractEmoji';
import { TruePositionHero } from '@/components/TruePositionHero';
import { HouseholdBalanceWidget } from '@/components/dashboard/HouseholdBalanceWidget';
import { BudgetStatusCard } from '@/components/dashboard/BudgetStatusCard';
import { WalletsCard } from '@/components/dashboard/WalletsCard';
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import StickyStatusBar from '@/components/layout/StickyStatusBar';

/**
 * Dashboard Screen - Optimized with Composite Queries
 * PERFORMANCE: Reduced from 10+ queries to 2 queries (getDashboardData + getHouseholdDebtData)
 */
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = db.useAuth();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // OPTIMIZED: Single query for ALL dashboard data
  const dashboardQuery = useQuery({
    queryKey: ['dashboard-data', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      return getDashboardData(user.email);
    },
    enabled: !!user?.email,
    staleTime: 30000, // Cache for 30 seconds
  });

  const userId = dashboardQuery.data?.user.id;
  const householdId = dashboardQuery.data?.household.id;

  // Balance calculation (separate query as it's complex)
  const balanceQuery = useQuery({
    queryKey: ['true-balance', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      return calculateTrueBalance(userId);
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  // Household debt data (only if household exists)
  const householdDebtQuery = useQuery({
    queryKey: ['household-debt', userId, householdId],
    queryFn: async () => {
      if (!userId || !householdId) return null;
      return getHouseholdDebtData(userId, householdId);
    },
    enabled: !!userId && !!householdId,
  });

  // Refetch when focused
  const { refetch: refetchDashboard } = dashboardQuery;
  const { refetch: refetchBalance } = balanceQuery;
  const { refetch: refetchDebt } = householdDebtQuery;

  useFocusEffect(
    useCallback(() => {
      refetchDashboard();
      refetchBalance();
      refetchDebt();
    }, [refetchDashboard, refetchBalance, refetchDebt])
  );

  // Loading state - show consistent loading screen
  const isLoading = dashboardQuery.isLoading || balanceQuery.isLoading;

  if (isLoading) {
    return <LoadingScreen message="Loading your financial overview..." />;
  }

  // Error state
  if (dashboardQuery.error || balanceQuery.error) {
    return (
      <LinearGradient
        colors={['#1A1C1E', '#2C5F5D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-white text-lg font-semibold mb-2">Unable to load dashboard</Text>
          <Text className="text-white/60 text-sm text-center mb-6">
            Please check your connection and try again
          </Text>
          <Pressable
            onPress={() => refetchDashboard()}
            className="bg-[#2C5F5D] px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const data = dashboardQuery.data!;
  const balance = balanceQuery.data || { netWorth: 0, assets: { total: 0 }, liabilities: { total: 0 } };
  const householdDebt = householdDebtQuery.data;

  // Create a map of group key -> group name/icon for display
  const groupKeyToDisplay = data.categoryGroups.reduce((map, group) => {
    map[group.key] = { name: group.name, icon: group.icon };
    return map;
  }, {} as Record<string, { name: string; icon?: string }>);

  // Transform budget details for BudgetStatusCard
  const enrichedBudgets = data.budgets.map((budget) => {
    const category = data.categories.find((c) => c.id === budget.categoryId);
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

  // Format accounts for WalletsCard
  const formattedWallets = data.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    institution: account.institution || 'Other',
    type: account.accountType || 'Checking',
    balance: account.balance || 0,
    isDefault: account.isDefault || false,
  }));

  // Format transactions for RecentTransactionsCard
  const formattedTransactions = data.recentTransactions.slice(0, 10).map((tx) => {
    const category = data.categories.find((c) => c.id === tx.categoryId);
    const { emoji, name: categoryName } = category
      ? extractEmoji(category.name)
      : { emoji: '💰', name: 'Uncategorized' };

    return {
      id: tx.id,
      name: tx.payee || 'Unknown',
      emoji: emoji,
      category: categoryName,
      amount: tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
      date: tx.date,
      isShared: tx.isShared || false,
    };
  });

  return (
    <LinearGradient
      colors={['#1A1C1E', '#2C5F5D']}
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

          {/* 2. Household Balance Widget (conditional) */}
          {householdDebt?.partner && householdDebt.hasUnsettledExpenses && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <HouseholdBalanceWidget
                debtAmount={householdDebt.debtAmount}
                partnerName={householdDebt.partner.name}
                yourSplitRatio={50} // TODO: Get from split settings
                partnerSplitRatio={50}
                hasUnsettledExpenses={householdDebt.hasUnsettledExpenses}
              />
            </Animated.View>
          )}

          {/* 3. Budget Status Card */}
          {enrichedBudgets.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <BudgetStatusCard
                budgets={enrichedBudgets}
                summaryTotals={data.budgetSummary || { totalAllocated: 0, totalSpent: 0 }}
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
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <RecentTransactionsCard transactions={formattedTransactions} />
          </Animated.View>
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
          backgroundColor: '#2C5F5D',
          shadowColor: '#A8B5A1',
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
            borderColor: 'rgba(168, 181, 161, 0.3)',
          }}
        />
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </Pressable>
    </LinearGradient>
  );
}