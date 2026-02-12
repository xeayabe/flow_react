// FIX: PERF-4 - Removed aggressive refetchInterval: 5000 from balance query.
// This widget was polling the database every 5 seconds (~17,280 calls/day).
// Balance only changes when transactions or settlements are created, both of which
// invalidate ['true-balance'] via queryClient.invalidateQueries().

import React from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { calculateTrueBalance } from '@/lib/balance-api';
import { db } from '@/lib/db';
import { TruePositionHero } from './TruePositionHero';

export default function TrueBalanceWidget() {
  const { user } = db.useAuth();

  const { data: balanceInfo } = useQuery({
    queryKey: ['true-balance', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;

      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } }
      });
      const userProfile = userData.users[0];

      if (!userProfile) return null;

      // Calculate balance for THIS USER only (not entire household)
      return calculateTrueBalance(userProfile.id);
    },
    enabled: !!user?.email,
    // FIX: PERF-4 - Removed refetchInterval: 5000.
    // Balance data is refreshed via query invalidation after transactions/settlements.
    staleTime: 30_000,
  });

  if (!balanceInfo) {
    return (
      <View className="p-4">
        <Text className="text-gray-500">Loading balance...</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Swiss Precision Hero Card */}
      <TruePositionHero
        netWorth={balanceInfo.netWorth}
        assets={balanceInfo.assets.total}
        liabilities={balanceInfo.liabilities.total}
      />

      {/* Detailed Breakdown Below */}
      <View className="px-6 py-4">
        {/* ASSETS SECTION */}
        <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-3">
          <Text className="text-sm text-gray-600 mb-3 font-semibold">ASSETS</Text>

          {balanceInfo.assets.accounts.map(account => (
            <View key={account.id} className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl">💰</Text>
                <Text className="text-base text-gray-700">{account.name}</Text>
              </View>
              <Text className="text-base font-semibold text-gray-900">
                {account.balance.toFixed(2)} CHF
              </Text>
            </View>
          ))}

          <View className="border-t border-gray-200 mt-2 pt-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-semibold text-gray-700">Total Assets</Text>
              <Text className="text-lg font-bold text-green-600">
                {balanceInfo.assets.total.toFixed(2)} CHF
              </Text>
            </View>
          </View>
        </View>

        {/* LIABILITIES SECTION - Only show if there are liabilities */}
        {balanceInfo.liabilities.accounts.length > 0 && (
          <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-3">
            <Text className="text-sm text-gray-600 mb-3 font-semibold">LIABILITIES</Text>

            {balanceInfo.liabilities.accounts.map(account => (
              <View key={account.id} className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl">💳</Text>
                  <Text className="text-base text-gray-700">{account.name}</Text>
                </View>
                <Text className="text-base font-semibold text-red-600">
                  {account.balance.toFixed(2)} CHF
                </Text>
              </View>
            ))}

            <View className="border-t border-gray-200 mt-2 pt-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-base font-semibold text-gray-700">Total Debt</Text>
                <Text className="text-lg font-bold text-red-600">
                  {balanceInfo.liabilities.total.toFixed(2)} CHF
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
