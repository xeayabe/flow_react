import React from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { calculateDebtBalance, DebtBalance, calculateSplitRatio } from '@/lib/shared-expenses-api';
import { db } from '@/lib/db';

interface DebtInfo extends DebtBalance {
  otherUserName: string;
  currentUserId: string;
  currentUserPercentage: number;
  otherUserPercentage: number;
}

export default function DebtBalanceWidget() {
  const { user } = db.useAuth();

  const { data: debtInfo } = useQuery({
    queryKey: ['debt-balance', user?.email],
    queryFn: async () => {
      console.log('🔍 DebtBalanceWidget: Starting query for', user?.email);

      if (!user?.email) throw new Error('No user email');

      // Get current user profile
      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      if (!userData?.users?.[0]) {
        console.log('❌ No user profile found');
        return null;
      }

      const userProfile = userData.users[0];
      console.log('👤 User profile:', userProfile.id, userProfile.name);

      // Get current user's household membership
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } },
        },
      });

      if (!memberData?.householdMembers?.[0]) {
        console.log('❌ No household membership found for user');
        return null;
      }

      const currentMember = memberData.householdMembers[0];
      console.log('🏠 Current member:', currentMember.id, 'Role:', currentMember.role, 'Household:', currentMember.householdId);

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

      if (!allMembersData?.householdMembers) {
        console.log('❌ No household members data returned');
        return null;
      }

      console.log('👥 Total household members:', allMembersData.householdMembers.length);
      allMembersData.householdMembers.forEach((m: any) => {
        console.log('   -', m.userId, 'Role:', m.role);
      });

      // Find the other member (partner)
      const otherMember = allMembersData.householdMembers.find(
        (m: any) => m.userId !== userProfile.id
      );

      if (!otherMember) {
        console.log('❌ No partner found in household');
        return null;
      }

      const otherUser = allMembersData.users?.find((u: any) => u.id === otherMember.userId);
      console.log('👥 Partner found:', otherUser?.name);

      // Get split percentages based on income
      console.log('📊 Calculating split ratios for household:', currentMember.householdId);
      const splits = await calculateSplitRatio(currentMember.householdId);
      console.log('📊 Split ratios returned:', splits);

      const currentUserSplit = splits.find((s: any) => s.userId === userProfile.id);
      const otherUserSplit = splits.find((s: any) => s.userId === otherMember.userId);

      console.log('📊 Current user split:', currentUserSplit?.percentage || 50, '%');
      console.log('📊 Other user split:', otherUserSplit?.percentage || 50, '%');

      // Calculate debt balance
      console.log('💰 Calculating debt balance between', userProfile.id, 'and', otherMember.userId);
      const balance = await calculateDebtBalance(userProfile.id, otherMember.userId);
      console.log('💰 Debt balance result:', balance);

      const result = {
        ...balance,
        otherUserName: otherUser?.name || 'Partner',
        currentUserId: userProfile.id,
        currentUserPercentage: currentUserSplit?.percentage || 50,
        otherUserPercentage: otherUserSplit?.percentage || 50,
      } as DebtInfo;

      console.log('✅ DebtBalanceWidget query complete:', result);
      return result;
    },
    enabled: !!user?.email,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  console.log('🎨 Rendering DebtBalanceWidget:', {
    hasData: !!debtInfo,
    amount: debtInfo?.amount,
    showWidget: debtInfo && debtInfo.amount > 0,
  });

  // Don't show widget if no debt or no data
  if (!debtInfo) {
    console.log('⚠️ Widget hidden: No debt info');
    return null;
  }

  if (debtInfo.amount === 0) {
    console.log('⚠️ Widget hidden: Balance is 0');
    return null;
  }

  const youOwe = debtInfo.whoOwesUserId === debtInfo.currentUserId;

  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-200 mx-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm text-gray-600">Household Balance</Text>
        <Text className="text-xs text-gray-500">
          {debtInfo.currentUserPercentage.toFixed(0)}% / {debtInfo.otherUserPercentage.toFixed(0)}%
        </Text>
      </View>

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

      <Text className="text-xs text-gray-500 mt-2">Shared expenses split based on income ratio</Text>
    </View>
  );
}
