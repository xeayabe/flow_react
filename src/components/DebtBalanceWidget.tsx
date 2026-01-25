import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { calculateDebtBalance, DebtBalance } from '@/lib/shared-expenses-api';
import { db } from '@/lib/db';

interface DebtInfo extends DebtBalance {
  otherUserName: string;
  currentUserId: string;
}

export default function DebtBalanceWidget() {
  const { user } = db.useAuth();

  const { data: debtInfo, isLoading } = useQuery({
    queryKey: ['debt-balance', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      // Get current user profile
      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      if (!userData?.users?.[0]) return null;
      const userProfile = userData.users[0];

      // Get current user's household membership
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } },
        },
      });

      if (!memberData?.householdMembers?.[0]) return null;
      const currentMember = memberData.householdMembers[0];

      // Get all household members
      const { data: allMembersData } = await db.queryOnce({
        householdMembers: {
          $: {
            where: {
              householdId: currentMember.householdId,
              status: 'active',
            },
          },
        },
        users: {},
      });

      if (!allMembersData?.householdMembers) return null;

      // Find the other member (partner)
      const otherMember = allMembersData.householdMembers.find(
        (m: any) => m.userId !== userProfile.id
      );

      // If no partner, don't show widget
      if (!otherMember) return null;

      const otherUser = allMembersData.users?.find((u: any) => u.id === otherMember.userId);

      // Calculate debt balance between current user and other member
      const balance = await calculateDebtBalance(userProfile.id, otherMember.userId);

      return {
        ...balance,
        otherUserName: otherUser?.name || 'Partner',
        currentUserId: userProfile.id,
      } as DebtInfo;
    },
    enabled: !!user?.email,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Don't show widget if:
  // - Loading
  // - No debt info loaded
  // - No partner in household
  // - Balance is exactly 0
  if (isLoading) {
    return null;
  }

  if (!debtInfo || debtInfo.amount === 0) {
    return null;
  }

  // Determine if current user owes or is owed
  const youOwe = debtInfo.whoOwesUserId === debtInfo.currentUserId;

  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-200 mx-4 mb-4">
      <Text className="text-sm text-gray-600 mb-2">Household Balance</Text>

      {youOwe ? (
        <View>
          <Text className="text-base text-gray-700 mb-1">
            You owe <Text className="font-bold">{debtInfo.otherUserName}</Text>
          </Text>
          <Text className="text-3xl font-bold text-red-600">{debtInfo.amount.toFixed(2)} CHF</Text>
        </View>
      ) : (
        <View>
          <Text className="text-base text-gray-700 mb-1">
            <Text className="font-bold">{debtInfo.otherUserName}</Text> owes you
          </Text>
          <Text className="text-3xl font-bold text-green-600">{debtInfo.amount.toFixed(2)} CHF</Text>
        </View>
      )}
    </View>
  );
}
