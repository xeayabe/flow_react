import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Plus, Star, Building2, CreditCard, Wallet, TrendingUp, Banknote, ChevronLeft, EyeOff } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { getUserAccounts, formatBalance, type Account } from '@/lib/accounts-api';
import { db } from '@/lib/db';
import Animated, { FadeInDown } from 'react-native-reanimated';

function getWalletIcon(accountType: string) {
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

function WalletCard({ account, index }: { account: Account; index: number }) {
  const Icon = getWalletIcon(account.accountType);

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(600)}>
      <Pressable
        onPress={() => {
          router.push(`/accounts/edit?id=${account.id}`);
        }}
        className="mb-4 rounded-3xl p-5"
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
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-semibold" style={{ color: '#1F2937' }}>
                {account.name}
              </Text>
              {account.isDefault && (
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}>
                  <Star size={12} color="#006A6A" fill="#006A6A" />
                </View>
              )}
              {account.isExcludedFromBudget && (
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <EyeOff size={12} color="#DC2626" />
                </View>
              )}
            </View>
            <Text className="text-sm mt-1" style={{ color: '#6B7280' }}>
              {account.institution}
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
          <Text className="text-xs mb-1" style={{ color: '#9CA3AF' }}>
            Current Balance
          </Text>
          <Text
            className="text-2xl font-bold"
            style={{ color: account.balance >= 0 ? '#006A6A' : '#DC2626' }}
          >
            {formatBalance(account.balance, account.currency)}
          </Text>
        </View>

        {/* Account Info Row */}
        <View className="flex-row items-center mt-3 pt-3 border-t" style={{ borderTopColor: '#F3F4F6' }}>
          <View className="flex-1">
            <Text className="text-xs" style={{ color: '#9CA3AF' }}>
              {account.accountType}
            </Text>
          </View>
          {account.last4Digits && (
            <Text className="text-xs" style={{ color: '#9CA3AF' }}>
              ••••{account.last4Digits}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function WalletsScreen() {
  const { user } = db.useAuth();

  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: ['wallets', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  // Refetch when component mounts
  React.useEffect(() => {
    refetch();
  }, []);

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const defaultAccount = accounts.find((acc) => acc.isDefault);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ChevronLeft size={24} color="#006A6A" />
          </Pressable>
          <View className="flex-1 ml-2">
            <Text className="text-3xl font-bold mb-2" style={{ color: '#006A6A' }}>
              My Wallets
            </Text>
            <Text className="text-sm" style={{ color: '#8B9D8B' }}>
              Manage your finances across multiple wallets
            </Text>
          </View>
        </View>

        {/* Total Balance Card */}
        {accounts.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600)} className="mx-6 mb-6">
            <View
              className="rounded-3xl p-6"
              style={{
                backgroundColor: '#006A6A',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <Text className="text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Total Balance
              </Text>
              <Text className="text-3xl font-bold text-white mb-1">
                {formatBalance(totalBalance, defaultAccount?.currency || 'CHF')}
              </Text>
              <Text className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Across {accounts.length} {accounts.length === 1 ? 'wallet' : 'wallets'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Wallets List */}
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {isLoading && (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#006A6A" />
              <Text className="text-sm mt-4" style={{ color: '#9CA3AF' }}>
                Loading wallets...
              </Text>
            </View>
          )}

          {!isLoading && accounts.length === 0 && (
            <Animated.View entering={FadeInDown.duration(600)} className="py-12 px-6 items-center">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}
              >
                <Wallet size={40} color="#006A6A" />
              </View>
              <Text className="text-xl font-semibold mb-2 text-center" style={{ color: '#1F2937' }}>
                No Wallets Yet
              </Text>
              <Text className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
                Add your first wallet to start tracking your finances
              </Text>
            </Animated.View>
          )}

          {!isLoading && accounts.length > 0 && (
            <>
              {accounts.map((account, index) => (
                <WalletCard key={account.id} account={account} index={index} />
              ))}
            </>
          )}
        </ScrollView>

        {/* Floating Add Button */}
        <View className="absolute bottom-6 right-6">
          <Pressable
            onPress={() => router.push('/wallets/add')}
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
      </SafeAreaView>
    </View>
  );
}
