import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Plus, Star, Building2, CreditCard, Wallet, TrendingUp, Banknote, ArrowLeft, EyeOff, ArrowLeftRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { getUserAccounts, formatBalance, type Account } from '@/lib/accounts-api';
import { db } from '@/lib/db';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/Glass';
import { colors, borderRadius } from '@/lib/design-tokens';

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

function WalletCard({ account, index, showTransfer }: { account: Account; index: number; showTransfer: boolean }) {
  const Icon = getWalletIcon(account.accountType);
  const isNegative = account.balance < 0;

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 80).duration(400)}>
      <Pressable
        onPress={() => {
          router.push(`/wallets/${account.id}`);
        }}
      >
        <GlassCard className="p-5 mb-3">
          {/* Header Row */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-semibold" style={{ color: colors.textWhite }}>
                  {account.name}
                </Text>
                {account.isDefault && (
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(168, 181, 161, 0.2)' }}
                  >
                    <Star size={10} color={colors.sageGreen} fill={colors.sageGreen} />
                  </View>
                )}
                {account.isExcludedFromBudget && (
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(184, 168, 200, 0.2)' }}
                  >
                    <EyeOff size={10} color={colors.softLavender} />
                  </View>
                )}
              </View>
              <Text className="text-sm mt-1" style={{ color: colors.textWhiteSecondary }}>
                {account.accountType}
              </Text>
            </View>

            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}
            >
              <Icon size={20} color={colors.sageGreen} />
            </View>
          </View>

          {/* Balance */}
          <View className="pt-3 border-t border-white/5">
            <Text
              className="text-xs mb-1"
              style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}
            >
              {isNegative ? 'Amount Owed' : 'Current Balance'}
            </Text>
            <Text
              className="text-xl font-bold"
              style={{
                color: isNegative ? '#64748B' : colors.textWhite,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatBalance(account.balance, account.currency)}
            </Text>
          </View>

          {/* Account Info Row + Transfer Button */}
          <View className="flex-row items-center mt-3 pt-3 border-t border-white/5">
            <View className="flex-1">
              <Text className="text-xs" style={{ color: colors.textWhiteDisabled }}>
                {account.accountType}
              </Text>
            </View>
            {account.last4Digits && (
              <Text className="text-xs mr-3" style={{ color: colors.textWhiteDisabled }}>
                ••••{account.last4Digits}
              </Text>
            )}
            {showTransfer && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/wallets/transfer?fromId=${account.id}`);
                }}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}
              >
                <ArrowLeftRight size={12} color={colors.sageGreen} />
                <Text className="text-xs font-medium" style={{ color: colors.sageGreen }}>
                  Transfer
                </Text>
              </Pressable>
            )}
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

export default function WalletsScreen() {
  const { user } = db.useAuth();
  const insets = useSafeAreaInsets();

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
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View
        className="flex-row items-center px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center rounded-xl mr-4"
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
        </Pressable>
        <Text className="text-white text-xl font-semibold flex-1">My Wallets</Text>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
      >
        {/* Total Balance Card */}
        {accounts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(0).duration(400)}>
            <GlassCard className="p-6 mb-6">
              <Text
                className="mb-1"
                style={{
                  color: colors.textWhiteDisabled,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Total Balance
              </Text>
              <Text
                className="text-3xl font-bold mb-1"
                style={{ color: colors.textWhite, fontVariant: ['tabular-nums'] }}
              >
                {formatBalance(totalBalance, defaultAccount?.currency || 'CHF')}
              </Text>
              <Text className="text-xs" style={{ color: colors.textWhiteSecondary }}>
                Across {accounts.length} {accounts.length === 1 ? 'wallet' : 'wallets'}
              </Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View className="py-12 items-center">
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text className="text-4xl mb-4">💳</Text>
            </Animated.View>
            <Text className="text-sm" style={{ color: colors.textWhiteSecondary }}>
              Loading wallets...
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && accounts.length === 0 && (
          <Animated.View entering={FadeInDown.duration(400)} className="py-12 items-center">
            <View
              className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}
            >
              <Wallet size={40} color={colors.sageGreen} />
            </View>
            <Text className="text-xl font-semibold mb-2 text-center" style={{ color: colors.textWhite }}>
              No Wallets Yet
            </Text>
            <Text className="text-sm text-center mb-6" style={{ color: colors.textWhiteSecondary }}>
              Add your first wallet to start tracking your finances
            </Text>
          </Animated.View>
        )}

        {/* Wallets List */}
        {!isLoading && accounts.length > 0 && (
          <>
            {/* Section Label */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text
                className="mb-3 px-1"
                style={{
                  color: colors.textWhiteDisabled,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Your Wallets
              </Text>
            </Animated.View>

            {accounts.map((account, index) => (
              <WalletCard key={account.id} account={account} index={index} showTransfer={accounts.length >= 2} />
            ))}
          </>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <View className="absolute" style={{ bottom: 120, right: 20 }}>
        <Pressable
          onPress={() => router.push('/wallets/add')}
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{
            backgroundColor: colors.contextTeal,
            shadowColor: colors.sageGreen,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Plus size={28} color="white" strokeWidth={2.5} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}
