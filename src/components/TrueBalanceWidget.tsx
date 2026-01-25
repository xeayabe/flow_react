import React from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { calculateTrueBalance } from '@/lib/balance-api';
import { db } from '@/lib/db';

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
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  if (!balanceInfo) {
    return (
      <View className="p-4">
        <Text className="text-gray-500">Loading balance...</Text>
      </View>
    );
  }

  return (
    <View className="mx-4 mb-4">
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

      {/* NET WORTH SECTION */}
      <View className="bg-teal-500 rounded-2xl p-4 border border-teal-600">
        <Text className="text-sm text-teal-100 mb-2 font-semibold">NET WORTH</Text>
        <Text className="text-4xl font-bold text-white mb-1">
          {balanceInfo.netWorth.toFixed(2)} CHF
        </Text>
        <Text className="text-xs text-teal-100">
          Your true financial position
        </Text>
      </View>
    </View>
  );
}
