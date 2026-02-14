// FIX: PERF-4 - Removed aggressive refetchInterval (was 10000ms / 10s).
// InstantDB provides real-time subscriptions, so polling is unnecessary and
// wastes battery + network. Replaced with longer staleTime and rely on
// query invalidation after mutations for freshness.

import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { getUnsettledSharedExpenses, calculateHouseholdDebt, UnsettledExpense } from '@/lib/settlement-api';
import { calculateSplitRatio } from '@/lib/shared-expenses-api';
import { getCategories } from '@/lib/categories-api';
import { getUserAccounts } from '@/lib/accounts-api';

/**
 * Wallet type for settlement
 */
export interface SettlementWallet {
  id: string;
  name: string;
  type: string;
  balance: number;
}

/**
 * Category type for settlement
 */
export interface SettlementCategory {
  id: string;
  name: string;
  emoji: string;
  categoryGroup: string;
}

/**
 * Split ratio info
 */
export interface SplitRatioInfo {
  you: number;
  partner: number;
}

/**
 * Settlement data returned by the hook
 */
export interface SettlementData {
  totalOwed: number; // positive = you owe, negative = you're owed
  unsettledExpenses: UnsettledExpense[];
  partnerName: string;
  partnerId: string;
  splitRatio: SplitRatioInfo;
  wallets: SettlementWallet[];
  categories: SettlementCategory[];
  householdId: string;
  userId: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and calculate settlement data
 * Used by the Settlement screen to display debt and handle settlement
 */
export function useSettlementData(): SettlementData {
  const { user } = db.useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['settlement-data', user?.email],
    queryFn: async () => {
      if (!user?.email) {
        throw new Error('No user email');
      }

      // 1. Get current user profile
      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });
      const userProfile = userData.users?.[0];
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // 2. Get household membership
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } },
        },
      });
      const membership = memberData.householdMembers?.[0];
      if (!membership) {
        throw new Error('No household membership found');
      }

      const householdId = membership.householdId;

      // 3. Get all household members to find partner
      const { data: allMembersData } = await db.queryOnce({
        householdMembers: {
          $: { where: { householdId, status: 'active' } },
        },
      });
      const allMembers = allMembersData.householdMembers || [];
      const partnerMembership = allMembers.find(
        (m: any) => m.userId !== userProfile.id
      );

      // 4. Get partner user profile
      let partnerProfile = null;
      if (partnerMembership) {
        const { data: partnerUserData } = await db.queryOnce({
          users: { $: { where: { id: partnerMembership.userId } } },
        });
        partnerProfile = partnerUserData.users?.[0];
      }

      // 5. Get unsettled expenses
      const unsettledExpenses = await getUnsettledSharedExpenses(
        householdId,
        userProfile.id
      );

      // 6. Calculate debt summary
      const debtSummary = await calculateHouseholdDebt(
        householdId,
        userProfile.id
      );

      // 7. Get split ratios
      const splitRatios = await calculateSplitRatio(householdId);
      const yourRatio = splitRatios.find((r) => r.userId === userProfile.id);
      const partnerRatio = partnerMembership
        ? splitRatios.find((r) => r.userId === partnerMembership.userId)
        : null;

      // 8. Get user's wallets
      const wallets = await getUserAccounts(user.email);
      const formattedWallets: SettlementWallet[] = wallets.map((w: any) => ({
        id: w.id,
        name: w.name,
        type: w.accountType || 'Checking',
        balance: w.balance || 0,
      }));

      // 9. Get categories
      const categories = await getCategories(householdId, userProfile.id);
      const formattedCategories: SettlementCategory[] = categories.map((c: any) => {
        // Extract emoji from category name if present (format: "emoji Rent")
        const emojiMatch = c.name.match(/^(\p{Emoji})\s*/u);
        const emoji = emojiMatch ? emojiMatch[1] : c.emoji || '📊';
        const name = emojiMatch ? c.name.replace(emojiMatch[0], '').trim() : c.name;

        return {
          id: c.id,
          name,
          emoji,
          categoryGroup: c.categoryGroup || 'other',
        };
      });

      // 10. Calculate total owed
      // DebtSummary.amount is already signed: positive = you owe, negative = you're owed
      const totalOwed = debtSummary?.amount || 0;

      return {
        totalOwed,
        unsettledExpenses,
        partnerName: partnerProfile?.name || partnerProfile?.email?.split('@')[0] || 'Partner',
        partnerId: partnerMembership?.userId || '',
        splitRatio: {
          you: Math.round(yourRatio?.percentage || 50),
          partner: Math.round(partnerRatio?.percentage || 50),
        },
        wallets: formattedWallets,
        categories: formattedCategories,
        householdId,
        userId: userProfile.id,
      };
    },
    enabled: !!user?.email,
    // FIX: PERF-4 - Increased staleTime from 5s to 60s.
    // Data refreshes on screen focus and after settlement mutations.
    staleTime: 60_000,
    // FIX: PERF-4 - Removed refetchInterval: 10000.
    // Settlement data changes only when a settlement is created or a shared expense is added.
    // Both of those operations invalidate this query via queryClient.invalidateQueries().
    // Polling every 10s was causing ~8,640 unnecessary API calls per day per user.
  });

  return {
    totalOwed: data?.totalOwed || 0,
    unsettledExpenses: data?.unsettledExpenses || [],
    partnerName: data?.partnerName || 'Partner',
    partnerId: data?.partnerId || '',
    splitRatio: data?.splitRatio || { you: 50, partner: 50 },
    wallets: data?.wallets || [],
    categories: data?.categories || [],
    householdId: data?.householdId || '',
    userId: data?.userId || '',
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
