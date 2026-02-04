import React, { useCallback } from 'react';
import { Text, View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { db } from '@/lib/db';
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

/**
 * Dashboard Screen - Swiss Design Dark Theme
 * Main financial overview with glassmorphism cards
 */
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = db.useAuth();
  const [showResetNotification, setShowResetNotification] = React.useState(false);

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
  });

  const budgetPeriod = budgetPeriodQuery.data ?? {
    start: getCurrentBudgetPeriod(25).periodStartISO,
    end: getCurrentBudgetPeriod(25).periodEndISO,
    paydayDay: 25,
    source: 'household' as const,
    daysRemaining: getCurrentBudgetPeriod(25).daysRemaining,
  };

  // Get balance data (net worth, assets, liabilities)
  const balanceQuery = useQuery({
    queryKey: ['true-balance', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      return calculateTrueBalance(userId);
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  // Get all accounts
  const accountsQuery = useQuery({
    queryKey: ['user-accounts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  // Get recent transactions (without budget period filter - show all recent)
  const recentTransactionsQuery = useQuery({
    queryKey: ['recent-transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      return getRecentTransactions(userId, 10);
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

  // Get category groups (for mapping group keys to display names)
  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdId, userId],
    queryFn: async () => {
      if (!householdId || !userId) return [];
      return getCategoryGroups(householdId, userId);
    },
    enabled: !!householdId && !!userId,
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

  // Get budget summary (for accurate totals matching Budget screen)
  const budgetSummaryQuery = useQuery({
    queryKey: ['budget-summary', userId, householdId, budgetPeriod.start],
    queryFn: async () => {
      if (!userId || !householdId) return null;
      return getBudgetSummary(userId, householdId, budgetPeriod.start);
    },
    enabled: !!userId && !!householdId,
  });

  // Refetch when focused
  const { refetch: refetchBalance } = balanceQuery;
  const { refetch: refetchAccounts } = accountsQuery;
  const { refetch: refetchRecentTransactions } = recentTransactionsQuery;
  const { refetch: refetchBudgetDetails } = budgetDetailsQuery;
  const { refetch: refetchBudgetSummary } = budgetSummaryQuery;

  useFocusEffect(
    useCallback(() => {
      refetchBalance();
      refetchAccounts();
      refetchRecentTransactions();
      refetchBudgetDetails();
      refetchBudgetSummary();
    }, [refetchBalance, refetchAccounts, refetchRecentTransactions, refetchBudgetDetails, refetchBudgetSummary])
  );

  // Recalculate spent amounts when user/period data is available
  const [hasRecalculated, setHasRecalculated] = React.useState(false);

  React.useEffect(() => {
    if (userId && householdId && !budgetDetailsQuery.isLoading && budgetDetailsQuery.data && !hasRecalculated) {
      setHasRecalculated(true);

      recalculateBudgetSpentAmounts(
        userId,
        budgetPeriod.start,
        budgetPeriod.end
      ).then(() => {
        refetchBudgetDetails();
        refetchBudgetSummary();
      }).catch((error) => {
        console.warn('Failed to recalculate budget spent amounts:', error);
      });
    }
  }, [userId, householdId, budgetDetailsQuery.isLoading, budgetDetailsQuery.data, budgetPeriod.start, budgetPeriod.end, hasRecalculated, refetchBudgetDetails, refetchBudgetSummary]);

  // Check if budget reset is needed on component mount
  React.useEffect(() => {
    if (householdId && userId) {
      checkAndResetBudgetIfNeeded(householdId, userId).then((resetHappened) => {
        if (resetHappened) {
          setShowResetNotification(true);
          setTimeout(() => {
            refetchBalance();
            refetchAccounts();
            refetchRecentTransactions();
            refetchBudgetDetails();
            refetchBudgetSummary();
          }, 500);
        }
      }).catch((error) => {
        console.error('Error checking budget reset:', error);
      });
    }
  }, [householdId, userId]);

  const isLoading =
    userProfileQuery.isLoading ||
    budgetPeriodQuery.isLoading ||
    balanceQuery.isLoading ||
    accountsQuery.isLoading ||
    recentTransactionsQuery.isLoading ||
    categoriesQuery.isLoading ||
    categoryGroupsQuery.isLoading ||
    budgetDetailsQuery.isLoading ||
    budgetSummaryQuery.isLoading;

  // Dark-themed loading state
  if (isLoading) {
    return (
      <LinearGradient
        colors={['#1A1C1E', '#2C5F5D']}
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

  const accounts = accountsQuery.data || [];
  const balance = balanceQuery.data || { netWorth: 0, assets: { total: 0 }, liabilities: { total: 0 } };
  const recentTransactions = recentTransactionsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const categoryGroups = categoryGroupsQuery.data || [];
  const budgetDetails = budgetDetailsQuery.data || [];
  const budgetSummary = budgetSummaryQuery.data || { totalAllocated: 0, totalSpent: 0 };

  // Create a map of group key -> group name/icon for display
  const groupKeyToDisplay = categoryGroups.reduce((map, group: any) => {
    map[group.key] = { name: group.name, icon: group.icon };
    return map;
  }, {} as Record<string, { name: string; icon?: string }>);

  // Enrich recent transactions with category info
  const enrichedTransactions = getRecentTransactionsWithCategories(recentTransactions, categories, 10);

  // Transform budget details for BudgetStatusCard
  const enrichedBudgets = budgetDetails.map((budget: any) => {
    const category = categories.find((c: any) => c.id === budget.categoryId);
    // Extract emoji from category name
    const { emoji, name } = category
      ? extractEmoji(category.name)
      : { emoji: '📊', name: 'Unknown' };

    // Look up group display name from categoryGroups (key -> name)
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
  const formattedWallets = accounts.map((account: any) => ({
    id: account.id,
    name: account.name,
    institution: account.institution || 'Other',
    type: account.accountType || 'Checking',
    balance: account.balance || 0,
    isDefault: account.isDefault || false,
  }));

  // Format transactions for RecentTransactionsCard
  const formattedTransactions = enrichedTransactions.map((tx: any) => {
    // Extract emoji from category name if present
    const { emoji, name: categoryName } = tx.categoryName
      ? extractEmoji(tx.categoryName)
      : { emoji: '💰', name: 'Uncategorized' };
    return {
      id: tx.id,
      name: tx.description || tx.payee || 'Unknown',
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
      {/* Budget Reset Notification */}
      {showResetNotification && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="mx-5 mt-2 rounded-xl overflow-hidden"
          style={{
            marginTop: insets.top + 8,
            backgroundColor: 'rgba(44, 95, 93, 0.3)',
            borderWidth: 1,
            borderColor: 'rgba(168, 181, 161, 0.3)',
          }}
        >
          <View className="px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">New Budget Period Started</Text>
              <Text className="text-xs text-white/60 mt-0.5">Your budget has been reset</Text>
            </View>
            <Pressable onPress={() => setShowResetNotification(false)}>
              <Text className="text-lg font-bold text-white/60">×</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: showResetNotification ? 16 : insets.top + 16,
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
          {householdData.partner && !householdData.isLoading && householdData.hasUnsettledExpenses && (
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
          {enrichedBudgets.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <BudgetStatusCard
                budgets={enrichedBudgets}
                summaryTotals={budgetSummary}
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
      </ScrollView>

      {/* 6. Floating Action Button - Bright Sage Green */}
      <Pressable
        onPress={() => router.push('/add-transaction')}
        className="absolute items-center justify-center"
        style={{
          bottom: insets.bottom + 64,
          right: 16,
          width: 64,
          height: 64,
          borderRadius: 32,
          shadowColor: '#A8B5A1',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <LinearGradient
          colors={['#A8B5A1', '#8FA888']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={28} color="#fff" strokeWidth={2.5} />
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}
