import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { calculateDebtBalance, DebtBalance, calculateSplitRatio } from '@/lib/shared-expenses-api';
import { db } from '@/lib/db';
import SettlementModal from './SettlementModal';
import { debugSettlementData } from '@/lib/settlement-api';

interface DebtInfo extends DebtBalance {
  otherUserName: string;
  currentUserId: string;
  currentUserPercentage: number;
  otherUserPercentage: number;
}

export default function DebtBalanceWidget() {
  const { user } = db.useAuth();
  const [showSettlement, setShowSettlement] = useState(false);

  // Get household info for debug
  const { data: householdInfo } = useQuery({
    queryKey: ['household-info-debug', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });
      if (!userData?.users?.[0]) return null;
      const userProfile = userData.users[0];

      const { data: memberData } = await db.queryOnce({
        householdMembers: { $: { where: { userId: userProfile.id, status: 'active' } } },
      });
      if (!memberData?.householdMembers?.[0]) return null;

      return {
        householdId: memberData.householdMembers[0].householdId,
        userId: userProfile.id,
      };
    },
    enabled: !!user?.email,
  });

  const handleDebug = async () => {
    if (!householdInfo) {
      Alert.alert('Error', 'No household info');
      return;
    }

    try {
      // Get the other member
      const { data: allMembersData } = await db.queryOnce({
        householdMembers: {
          $: { where: { householdId: householdInfo.householdId, status: 'active' } },
        },
      });
      const otherMember = (allMembersData.householdMembers || []).find(
        (m: any) => m.userId !== householdInfo.userId
      );

      if (!otherMember) {
        Alert.alert('Error', 'No other member found');
        return;
      }

      const data = await debugSettlementData(
        householdInfo.householdId,
        householdInfo.userId,
        otherMember.userId
      );

      const txInfo = data.transactions.map((t: any) =>
        `TX: amt=${t.amount}, paidBy=${t.paidByUserId?.slice(-6) || 'none'}`
      ).join('\n');

      const splitInfo = data.householdSplits.map((s: any) =>
        `Split: ower=${s.owerUserId?.slice(-6)}, owedTo=${s.owedToUserId?.slice(-6)}, amt=${s.splitAmount}, paid=${s.isPaid}`
      ).join('\n');

      Alert.alert(
        'Debug Data',
        `Transactions (${data.transactions.length}):\n${txInfo || 'None'}\n\n` +
        `Household Splits (${data.householdSplits.length}):\n${splitInfo || 'None'}\n\n` +
        `Payer Unpaid (${data.payerSplits.length})\n\n` +
        `Current User: ${data.payerUserId?.slice(-6)}\nOther User: ${data.receiverUserId?.slice(-6)}`
      );
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  };

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
      console.log('🏠 Current member:', currentMember.id, 'Household:', currentMember.householdId);

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
  });

  // Don't show widget if no data (single-member household)
  if (!debtInfo) {
    console.log('⚠️ Widget hidden: No debt info (likely single-member household)');
    return null;
  }

  // Don't show widget if balance is 0 (no active settlement needed)
  if (debtInfo.amount === 0) {
    console.log('⚠️ Widget hidden: Balance is 0, no active settlement');
    return null;
  }

  const youOwe = debtInfo.whoOwesUserId === debtInfo.currentUserId;

  // Determine who receives the payment
  const receiverUserId = youOwe ? debtInfo.whoIsOwedUserId : debtInfo.whoOwesUserId;

  return (
    <>
      <View className="bg-white rounded-2xl p-4 border border-gray-200">
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
            <Text className="text-3xl font-bold text-red-600 mb-4">{debtInfo.amount.toFixed(2)} CHF</Text>
            <Pressable
              onPress={() => router.push('/settlement')}
              className="bg-red-600 py-3 rounded-xl active:opacity-80"
            >
              <Text className="text-white text-center font-semibold">View Details & Settle</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="text-base text-gray-700 mb-1">
              <Text className="font-bold">{debtInfo.otherUserName}</Text> owes you
            </Text>
            <Text className="text-3xl font-bold text-green-600 mb-4">{debtInfo.amount.toFixed(2)} CHF</Text>
            <Pressable
              onPress={() => router.push('/settlement')}
              className="bg-green-600 py-3 rounded-xl active:opacity-80"
            >
              <Text className="text-white text-center font-semibold">View Details & Settle</Text>
            </Pressable>
          </View>
        )}

        <Text className="text-xs text-gray-500 mt-2">Shared expenses split based on income ratio</Text>

        {/* Debug button - tap to see data */}
        <Pressable onPress={handleDebug} className="mt-2 py-1">
          <Text className="text-xs text-blue-500 text-center">Tap here to debug</Text>
        </Pressable>
      </View>
    </>
  );
}
