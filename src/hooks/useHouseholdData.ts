import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { calculateDebtBalance, calculateSplitRatio } from '@/lib/shared-expenses-api';

/**
 * Household data for the Household Balance Widget
 */
interface HouseholdData {
  partner: {
    id: string;
    name: string;
  } | null;
  debtAmount: number; // Positive if partner owes you, negative if you owe partner
  yourSplitRatio: number;
  partnerSplitRatio: number;
  hasUnsettledExpenses: boolean;
  isLoading: boolean;
}

/**
 * Hook to fetch household debt and split ratio data
 * Used by HouseholdBalanceWidget to display unsettled expenses
 */
export function useHouseholdData(): HouseholdData {
  const { user } = db.useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['household-data', user?.email],
    queryFn: async () => {
      if (!user?.email) {
        throw new Error('No user email');
      }

      // Get current user profile
      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });
      const userProfile = userData.users?.[0];
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get household membership
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

      // Get all household members
      const { data: allMembersData } = await db.queryOnce({
        householdMembers: {
          $: { where: { householdId, status: 'active' } },
        },
      });
      const allMembers = allMembersData.householdMembers || [];

      // Find partner (other household member)
      const partnerMembership = allMembers.find(
        (m: any) => m.userId !== userProfile.id
      );

      if (!partnerMembership) {
        // No partner - single member household
        return {
          partner: null,
          debtAmount: 0,
          yourSplitRatio: 100,
          partnerSplitRatio: 0,
          hasUnsettledExpenses: false,
        };
      }

      // Get partner user profile
      const { data: partnerUserData } = await db.queryOnce({
        users: { $: { where: { id: partnerMembership.userId } } },
      });
      const partnerProfile = partnerUserData.users?.[0];

      // Calculate debt balance between you and partner
      const debtBalance = await calculateDebtBalance(
        userProfile.id,
        partnerMembership.userId
      );

      // Get split ratios
      const splitRatios = await calculateSplitRatio(householdId);
      const yourRatio = splitRatios.find((r) => r.userId === userProfile.id);
      const partnerRatio = splitRatios.find(
        (r) => r.userId === partnerMembership.userId
      );

      // Check if there are unsettled expenses
      const { data: splitsData } = await db.queryOnce({
        shared_expense_splits: {
          $: {
            where: {
              isPaid: false,
            },
          },
        },
      });
      const allSplits = splitsData.shared_expense_splits || [];
      // Only count splits between these two users
      const hasUnsettledExpenses = allSplits.some(
        (split: any) =>
          (split.owerUserId === userProfile.id && split.owedToUserId === partnerMembership.userId) ||
          (split.owerUserId === partnerMembership.userId && split.owedToUserId === userProfile.id)
      );

      // Determine debt direction
      // If debtBalance.netBalance is positive, you owe partner
      // If negative, partner owes you
      const debtAmount =
        debtBalance.whoOwesUserId === userProfile.id
          ? -debtBalance.amount // You owe (negative)
          : debtBalance.amount; // Partner owes you (positive)

      return {
        partner: partnerProfile
          ? {
              id: partnerProfile.id,
              name: partnerProfile.name || 'Partner',
            }
          : null,
        debtAmount,
        yourSplitRatio: Math.round(yourRatio?.percentage || 50),
        partnerSplitRatio: Math.round(partnerRatio?.percentage || 50),
        hasUnsettledExpenses,
      };
    },
    enabled: !!user?.email,
    staleTime: 30000, // 30 seconds
  });

  return {
    partner: data?.partner || null,
    debtAmount: data?.debtAmount || 0,
    yourSplitRatio: data?.yourSplitRatio || 50,
    partnerSplitRatio: data?.partnerSplitRatio || 50,
    hasUnsettledExpenses: data?.hasUnsettledExpenses || false,
    isLoading,
  };
}
