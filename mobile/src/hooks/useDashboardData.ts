// FIX: PERF-4 - Removed aggressive refetchInterval from balanceQuery (was 5000ms / 5s)
// and useBalanceData (was 5000ms / 5s). Balance data changes only when transactions are
// created/edited/deleted, which already invalidate these queries. Polling every 5s was
// causing ~17,280 unnecessary API calls per day per user for each query.

import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { calculateTrueBalance, BalanceBreakdown } from '@/lib/balance-api';
import { getBudgetSummary, getMemberBudgetPeriod } from '@/lib/budget-api';
import { getRecentTransactions } from '@/lib/transactions-api';
import { getUserAccounts } from '@/lib/accounts-api';
import { getCurrentBudgetPeriod } from '@/lib/budget-period-utils';

/**
 * Custom hook for dashboard data aggregation
 * Combines balance, budget, and transaction data for dashboard display
 */
export function useDashboardData() {
  const { user } = db.useAuth();

  // Get user profile and household
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

  // Get balance breakdown (assets, liabilities, net worth)
  const balanceQuery = useQuery({
    queryKey: ['true-balance', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      return calculateTrueBalance(userId);
    },
    enabled: !!userId,
    // FIX: PERF-4 - Removed refetchInterval: 5000.
    // Balance changes only when transactions/settlements are created.
    // Those operations already call queryClient.invalidateQueries(['true-balance']).
    // Added staleTime to avoid unnecessary refetches on screen focus.
    staleTime: 30_000,
  });

  // Get accounts
  const accountsQuery = useQuery({
    queryKey: ['user-accounts', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      return getUserAccounts(userId);
    },
    enabled: !!userId,
  });

  // Get budget summary
  const budgetSummaryQuery = useQuery({
    queryKey: ['budget-summary', userId, householdId, budgetPeriod.start],
    queryFn: async () => {
      if (!userId || !householdId) throw new Error('Missing user or household ID');
      return getBudgetSummary(userId, householdId, budgetPeriod.start);
    },
    enabled: !!userId && !!householdId && !!budgetPeriod.start,
  });

  // Get recent transactions
  const transactionsQuery = useQuery({
    queryKey: ['recent-transactions', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      return getRecentTransactions(userId, 10, undefined, undefined);
    },
    enabled: !!userId,
  });

  // Calculate loading state
  const isLoading =
    userProfileQuery.isLoading ||
    budgetPeriodQuery.isLoading ||
    balanceQuery.isLoading ||
    accountsQuery.isLoading ||
    budgetSummaryQuery.isLoading ||
    transactionsQuery.isLoading;

  // Calculate error state
  const error =
    userProfileQuery.error ||
    budgetPeriodQuery.error ||
    balanceQuery.error ||
    accountsQuery.error ||
    budgetSummaryQuery.error ||
    transactionsQuery.error;

  // Aggregate data
  const data = {
    user: userProfileQuery.data?.userRecord,
    member: userProfileQuery.data?.member,
    budgetPeriod,
    balance: balanceQuery.data || { netWorth: 0, assets: { accounts: [], total: 0 }, liabilities: { accounts: [], total: 0 } },
    accounts: accountsQuery.data || [],
    budgetSummary: budgetSummaryQuery.data || { totalIncome: 0, totalAllocated: 0, totalSpent: 0 },
    transactions: transactionsQuery.data || [],
  };

  // Refetch functions
  const refetch = () => {
    userProfileQuery.refetch();
    budgetPeriodQuery.refetch();
    balanceQuery.refetch();
    accountsQuery.refetch();
    budgetSummaryQuery.refetch();
    transactionsQuery.refetch();
  };

  return {
    data,
    loading: isLoading,
    error,
    refetch,
    // Convenience accessors for common values
    netWorth: data.balance.netWorth,
    assets: data.balance.assets.total,
    liabilities: data.balance.liabilities.total,
    userId,
    householdId,
  };
}

/**
 * Simplified hook for just balance data (net worth, assets, liabilities)
 * Use this when you only need financial position, not full dashboard data
 */
export function useBalanceData() {
  const { user } = db.useAuth();

  const userQuery = useQuery({
    queryKey: ['user', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const result = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });
      return result.data.users?.[0];
    },
    enabled: !!user?.email,
  });

  const balanceQuery = useQuery({
    queryKey: ['true-balance', userQuery.data?.id],
    queryFn: async () => {
      if (!userQuery.data?.id) throw new Error('No user ID');
      return calculateTrueBalance(userQuery.data.id);
    },
    enabled: !!userQuery.data?.id,
    // FIX: PERF-4 - Removed refetchInterval: 5000.
    // Same reasoning as above: balance data is invalidated after mutations.
    staleTime: 30_000,
  });

  return {
    balance: balanceQuery.data || { netWorth: 0, assets: { accounts: [], total: 0 }, liabilities: { accounts: [], total: 0 } },
    loading: userQuery.isLoading || balanceQuery.isLoading,
    error: userQuery.error || balanceQuery.error,
    netWorth: balanceQuery.data?.netWorth || 0,
    assets: balanceQuery.data?.assets.total || 0,
    liabilities: balanceQuery.data?.liabilities.total || 0,
  };
}
