// FIX: PERF-4 - Removed aggressive refetchInterval: 5000 from debt balance query.
// This widget was polling the database every 5 seconds (~17,280 calls/day),
// even when the settlement screen was not visible. Debt balances only change
// when settlements are created or shared expenses are added, both of which
// invalidate the relevant queries via queryClient.

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
      if (!user?.email) throw new Error('No user email');

      // Get current user profile
      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      if (!userData?.users?.[0]) {
        return null;
      }

      const userProfile = userData.users[0];

      // Get current user's household membership
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } },
        },
      });

      if (!memberData?.householdMembers?.[0]) {
        return null;
      }

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

      if (!allMembersData?.householdMembers) {
        return null;
      }

      // Find the other member (partner)
      const otherMember = allMembersData.householdMembers.find(
        (m: any) => m.userId !== userProfile.id
      );

      if (!otherMember) {
        return null;
      }

      const otherUser = allMembersData.users?.find((u: any) => u.id === otherMember.userId);

      // Get split percentages based on income
      const splits = await calculateSplitRatio(currentMember.householdId);

      const currentUserSplit = splits.find((s: any) => s.userId === userProfile.id);
      const otherUserSplit = splits.find((s: any) => s.userId === otherMember.userId);

      // Calculate debt balance
      const balance = await calculateDebtBalance(userProfile.id, otherMember.userId);

      const result = {
        ...balance,
        otherUserName: otherUser?.name || 'Partner',
        currentUserId: userProfile.id,
        currentUserPercentage: currentUserSplit?.percentage || 50,
        otherUserPercentage: otherUserSplit?.percentage || 50,
      } as DebtInfo;

      return result;
    },
    enabled: !!user?.email,
    // FIX: PERF-4 - Removed refetchInterval: 5000.
    // Debt balance only changes when settlements or shared expenses are created.
    // Those mutations invalidate ['debt-balance'] via queryClient.invalidateQueries().
    staleTime: 60_000,
  });

  // Don't show widget if no data (single-member household)
  if (!debtInfo) {
    return null;
  }

  // Don't show widget if balance is 0 (no active settlement needed)
  if (debtInfo.amount === 0) {
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
      </View>
    </>
  );
}
