import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil, CreditCard, Wallet, PiggyBank, Banknote, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { getAccountById, getUserAccounts } from '@/lib/accounts-api';
import { type TransferRecord } from '@/lib/transfer-api';
import { formatCurrency } from '@/lib/formatCurrency';
import { GlassCard } from '@/components/ui/Glass';
import { colors } from '@/lib/design-tokens';
import { db } from '@/lib/db';

/**
 * Get the appropriate icon for a wallet type
 */
function getWalletIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'credit card':
      return CreditCard;
    case 'savings':
      return PiggyBank;
    case 'cash':
      return Banknote;
    case 'investment':
      return TrendingUp;
    default:
      return Wallet;
  }
}

function TransferHistoryItem({
  transfer,
  currentAccountId,
  accountNames,
}: {
  transfer: TransferRecord;
  currentAccountId: string;
  accountNames: Map<string, string>;
}) {
  const isOutgoing = transfer.fromAccountId === currentAccountId;
  const otherAccountId = isOutgoing ? transfer.toAccountId : transfer.fromAccountId;
  const otherAccountName = accountNames.get(otherAccountId) || 'Unknown';
  const date = new Date(transfer.transferredAt);
  const dateStr = date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View className="flex-row items-center py-3 border-b border-white/5">
      <View
        className="w-8 h-8 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: isOutgoing ? 'rgba(200, 168, 168, 0.15)' : 'rgba(168, 181, 161, 0.15)' }}
      >
        {isOutgoing ? (
          <ArrowUpRight size={16} color={colors.error} />
        ) : (
          <ArrowDownLeft size={16} color={colors.sageGreen} />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-white/90 text-sm font-medium">
          {isOutgoing ? `To ${otherAccountName}` : `From ${otherAccountName}`}
        </Text>
        <Text className="text-white/40 text-xs mt-0.5">
          {dateStr}{transfer.note ? ` · ${transfer.note}` : ''}
        </Text>
      </View>

      <Text
        className="text-sm font-medium"
        style={{
          fontVariant: ['tabular-nums'],
          color: isOutgoing ? colors.error : colors.sageGreen,
        }}
      >
        {isOutgoing ? '-' : '+'}{formatCurrency(transfer.amount)}
      </Text>
    </View>
  );
}

export default function WalletDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = db.useAuth();

  const { data: account, isLoading, error } = useQuery({
    queryKey: ['account', id],
    queryFn: async () => {
      if (!id) return null;
      return getAccountById(id);
    },
    enabled: !!id,
  });

  // Fetch transfer history using InstantDB's reactive query for reliable real-time data
  const userId = account?.userId;
  const { data: transferData } = db.useQuery(
    userId
      ? {
          accountTransfers: {
            $: { where: { userId } },
          },
        }
      : null
  );

  // Filter transfers for this specific account
  const transfers = React.useMemo(() => {
    if (!transferData?.accountTransfers || !id) return [];

    const relevant = transferData.accountTransfers.filter(
      (t: any) => t.fromAccountId === id || t.toAccountId === id
    );

    // Sort by transferredAt descending (newest first)
    relevant.sort((a: any, b: any) => (b.transferredAt ?? 0) - (a.transferredAt ?? 0));

    return relevant as TransferRecord[];
  }, [transferData?.accountTransfers, id]);

  // Fetch all user accounts for name resolution in transfer history
  const { data: allAccounts = [] } = useQuery({
    queryKey: ['wallets', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  const accountNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const acc of allAccounts) {
      map.set(acc.id, acc.name);
    }
    return map;
  }, [allAccounts]);

  const handleEdit = () => {
    router.push(`/wallets/edit?id=${id}`);
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white/70 mt-4">Loading wallet...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !account) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-xl font-semibold mb-2">
            Wallet not found
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.contextSage }}>Go back</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const Icon = getWalletIcon(account.accountType);
  const isNegative = account.balance < 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8">
              <Pressable
                onPress={() => router.back()}
                className="items-center justify-center rounded-xl"
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
              <Text className="text-white text-lg font-semibold">
                Wallet Details
              </Text>
              <Pressable
                onPress={handleEdit}
                className="items-center justify-center rounded-xl"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.05)',
                }}
              >
                <Pencil size={18} color="rgba(255,255,255,0.9)" />
              </Pressable>
            </View>

            {/* Main Balance Card */}
            <GlassCard className="p-6 mb-6">
              {/* Icon and Name */}
              <View className="items-center mb-4">
                <View
                  className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
                  style={{ backgroundColor: colors.contextTeal }}
                >
                  <Icon size={32} color="white" />
                </View>
                <Text className="text-white text-xl font-semibold">
                  {account.name}
                </Text>
                {account.isDefault && (
                  <View
                    className="mt-2 px-3 py-1 rounded-full"
                    style={{ backgroundColor: colors.contextTeal }}
                  >
                    <Text
                      className="text-white"
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Default Wallet
                    </Text>
                  </View>
                )}
              </View>

              {/* Balance */}
              <View className="items-center py-4 border-t border-b border-white/10 my-4">
                <Text
                  className="text-white/50 mb-1"
                  style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  {isNegative ? 'Amount Owed' : 'Current Balance'}
                </Text>
                <Text
                  className="font-bold"
                  style={{
                    fontSize: 36,
                    fontVariant: ['tabular-nums'],
                    color: isNegative ? '#64748B' : 'white',
                  }}
                >
                  {formatCurrency(account.balance)}
                </Text>
              </View>

              {/* Details Grid */}
              <View className="flex-row flex-wrap">
                <View className="w-1/2 py-3">
                  <Text className="text-white/40 text-xs uppercase tracking-wide mb-1">
                    Type
                  </Text>
                  <Text className="text-white/90 text-sm font-medium">
                    {account.accountType}
                  </Text>
                </View>
                {account.last4Digits && (
                  <View className="w-1/2 py-3">
                    <Text className="text-white/40 text-xs uppercase tracking-wide mb-1">
                      Last 4 Digits
                    </Text>
                    <Text className="text-white/90 text-sm font-medium">
                      •••• {account.last4Digits}
                    </Text>
                  </View>
                )}
                <View className="w-1/2 py-3">
                  <Text className="text-white/40 text-xs uppercase tracking-wide mb-1">
                    Currency
                  </Text>
                  <Text className="text-white/90 text-sm font-medium">
                    {account.currency}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Additional Info */}
            <GlassCard className="p-5">
              <Text
                className="text-white/50 mb-3"
                style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Account Info
              </Text>

              <View className="flex-row justify-between py-2 border-b border-white/5">
                <Text className="text-white/60 text-sm">Starting Balance</Text>
                <Text className="text-white/90 text-sm font-medium" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatCurrency(account.startingBalance)}
                </Text>
              </View>

              <View className="flex-row justify-between py-2 border-b border-white/5">
                <Text className="text-white/60 text-sm">Budget Tracking</Text>
                <Text className="text-white/90 text-sm font-medium">
                  {account.isExcludedFromBudget ? 'Excluded' : 'Included'}
                </Text>
              </View>

              <View className="flex-row justify-between py-2">
                <Text className="text-white/60 text-sm">Net Change</Text>
                <Text
                  className="text-sm font-medium"
                  style={{
                    fontVariant: ['tabular-nums'],
                    color: account.balance - account.startingBalance >= 0
                      ? colors.contextSage
                      : '#64748B',
                  }}
                >
                  {account.balance - account.startingBalance >= 0 ? '+' : ''}
                  {formatCurrency(account.balance - account.startingBalance, { showSign: false })}
                </Text>
              </View>
            </GlassCard>

            {/* Transfer History */}
            <View className="mt-6">
              <Text
                className="text-white/50 mb-3 px-1"
                style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Transfer History
              </Text>

              {transfers.length > 0 ? (
                <GlassCard className="p-5">
                  {transfers.map((transfer, index) => (
                    <TransferHistoryItem
                      key={transfer.id}
                      transfer={transfer}
                      currentAccountId={id!}
                      accountNames={accountNames}
                    />
                  ))}
                </GlassCard>
              ) : (
                <GlassCard className="p-8 items-center">
                  <Text className="text-4xl mb-3">🔄</Text>
                  <Text className="text-white/70 text-center text-sm">
                    No transfers yet
                  </Text>
                </GlassCard>
              )}
            </View>

            {/* Placeholder for transactions */}
            <View className="mt-6">
              <Text
                className="text-white/50 mb-3 px-1"
                style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Recent Transactions
              </Text>
              <GlassCard className="p-8 items-center">
                <Text className="text-4xl mb-3">📊</Text>
                <Text className="text-white/70 text-center text-sm">
                  Transaction history for this wallet coming soon!
                </Text>
              </GlassCard>
            </View>

            {/* Bottom padding */}
            <View className="h-10" />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}
