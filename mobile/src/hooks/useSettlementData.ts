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
  institution: string;
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
        institution: w.institution || 'Other',
        type: w.accountType || 'Checking',
        balance: w.balance || 0,
      }));

      // 9. Get categories
      const categories = await getCategories(householdId, userProfile.id);
      const formattedCategories: SettlementCategory[] = categories.map((c: any) => {
        // Extract emoji from category name if present (format: "🏠 Rent")
        const emojiMatch = c.name.match(/^(\p{Emoji})\s*/u);
        const emoji = emojiMatch ? emojiMatch[1] : '📊';
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
    staleTime: 5000,
    refetchInterval: 10000,
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
