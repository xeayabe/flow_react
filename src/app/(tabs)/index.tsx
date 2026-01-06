import React from 'react';
import { Text, View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Wallet, Plus, Star, Building2, CreditCard, Banknote, TrendingUp, ArrowRight, Settings } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { getUserAccounts, formatBalance } from '@/lib/accounts-api';
import Animated, { FadeInDown } from 'react-native-reanimated';

function getAccountIcon(accountType: string) {
  switch (accountType) {
    case 'Checking':
      return Building2;
    case 'Savings':
      return Wallet;
    case 'Credit Card':
      return CreditCard;
    case 'Investment':
      return TrendingUp;
    case 'Cash':
      return Banknote;
    default:
      return Building2;
  }
}

export default function DashboardScreen() {
  const { user } = db.useAuth();

  // Query user profile from database
  const { data: profileData } = db.useQuery({
    users: {
      $: {
        where: {
          email: user?.email || '',
        },
      },
    },
  });

  // Query user accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['wallets', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  const userProfile = profileData?.users?.[0];
  const displayName = userProfile?.name || user?.email?.split('@')[0] || 'User';

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const defaultAccount = accounts.find((acc) => acc.isDefault);
  const hasAccounts = accounts.length > 0;

  // Get current month and year
  const currentDate = new Date();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <View className="flex-row justify-between items-start mb-1">
          <View className="flex-1">
            <Text className="text-3xl font-bold mb-1" style={{ color: '#006A6A' }}>
              My Wallets
            </Text>
            <Text className="text-sm" style={{ color: 'rgba(0, 106, 106, 0.6)' }}>
              {monthYear}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            className="rounded-full p-2"
            style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}
          >
            <Settings size={20} color="#006A6A" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Loading State */}
        {accountsLoading && (
          <View className="px-6 py-12 items-center">
            <ActivityIndicator size="large" color="#006A6A" />
            <Text className="text-sm mt-4" style={{ color: '#9CA3AF' }}>
              Loading wallets...
            </Text>
          </View>
        )}

        {/* Wallet Cards */}
        {!accountsLoading && hasAccounts && (
          <View className="px-6 mb-6">
            {accounts.map((account, index) => {
              const Icon = getAccountIcon(account.accountType);
              return (
                <Animated.View key={account.id} entering={FadeInDown.delay(index * 100).duration(600)}>
                  <Pressable
                    onPress={() => router.push('/accounts')}
                    className="mb-3 rounded-3xl p-5"
                    style={{
                      backgroundColor: '#FFFFFF',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                      borderWidth: 1,
                      borderColor: '#F3F4F6',
                    }}
                  >
                    {/* Header Row */}
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="text-lg font-bold" style={{ color: '#1F2937' }}>
                            {account.name}
                          </Text>
                          {account.isDefault && (
                            <View
                              className="ml-2 px-2 py-1 rounded-full flex-row items-center"
                              style={{ backgroundColor: 'rgba(196, 181, 253, 0.2)' }}
                            >
                              <Star size={10} color="#C4B5FD" fill="#C4B5FD" />
                              <Text className="text-xs ml-1 font-medium" style={{ color: '#C4B5FD' }}>
                                Default
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm mt-1" style={{ color: 'rgba(0, 106, 106, 0.6)' }}>
                          {account.institution} • {account.accountType}
                        </Text>
                      </View>

                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}
                      >
                        <Icon size={24} color="#006A6A" />
                      </View>
                    </View>

                    {/* Balance */}
                    <View className="pt-3 border-t" style={{ borderTopColor: '#F3F4F6' }}>
                      <Text
                        className="text-2xl font-bold text-right"
                        style={{ color: account.balance >= 0 ? '#8B9D8B' : '#DC2626' }}
                      >
                        {formatBalance(account.balance, account.currency)}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}

            {/* View All Wallets Link */}
            <Animated.View entering={FadeInDown.delay(accounts.length * 100).duration(600)}>
              <Pressable
                onPress={() => router.push('/accounts')}
                className="flex-row items-center justify-center py-3"
              >
                <Text className="text-sm font-semibold mr-1" style={{ color: '#006A6A' }}>
                  View All Wallets
                </Text>
                <ArrowRight size={16} color="#006A6A" />
              </Pressable>
            </Animated.View>
          </View>
        )}

        {/* Empty State - No Wallets */}
        {!accountsLoading && !hasAccounts && (
          <View className="px-6 mb-6">
            <Animated.View entering={FadeInDown.duration(600)}>
              <View className="rounded-3xl p-8 items-center" style={{ backgroundColor: 'rgba(0, 106, 106, 0.05)' }}>
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}
                >
                  <Wallet size={40} color="#006A6A" />
                </View>
                <Text className="text-xl font-bold mb-2 text-center" style={{ color: '#1F2937' }}>
                  No Wallets Yet
                </Text>
                <Text className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
                  Add your first wallet to start tracking your finances
                </Text>
                <Pressable
                  onPress={() => router.push('/accounts/add')}
                  className="rounded-full px-6 py-3"
                  style={{ backgroundColor: '#006A6A' }}
                >
                  <Text className="text-white font-bold text-sm">Add Your First Wallet</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button - Only show if user has accounts */}
      {hasAccounts && (
        <View className="absolute bottom-6 right-6">
          <Pressable
            onPress={() => router.push('/accounts/add')}
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{
              backgroundColor: '#006A6A',
              shadowColor: '#006A6A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Plus size={28} color="white" strokeWidth={2.5} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
