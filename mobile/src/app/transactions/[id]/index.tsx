import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Receipt, Users, Calendar, Tag, Wallet } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/Glass';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatTransactionDate } from '@/lib/formatTransactionDate';
import { colors } from '@/lib/design-tokens';
import { db } from '@/lib/db';

export default function TransactionDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Fetch transaction details
  const { data: transaction, isLoading, error } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      if (!id) return null;

      const result = await db.queryOnce({
        transactions: {
          $: { where: { id } },
        },
      });

      const tx = result.data.transactions?.[0];
      if (!tx) return null;

      // Get category info
      let category = null;
      if (tx.categoryId) {
        const categoryResult = await db.queryOnce({
          categories: {
            $: { where: { id: tx.categoryId } },
          },
        });
        category = categoryResult.data.categories?.[0];
      }

      // Get account info
      let account = null;
      if (tx.accountId) {
        const accountResult = await db.queryOnce({
          accounts: {
            $: { where: { id: tx.accountId } },
          },
        });
        account = accountResult.data.accounts?.[0];
      }

      return {
        ...tx,
        category,
        account,
      };
    },
    enabled: !!id,
  });

  const handleEdit = () => {
    router.push(`/transactions/${id}/edit`);
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white/70 mt-4">Loading transaction...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !transaction) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-xl font-semibold mb-2">
            Transaction not found
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.contextSage }}>Go back</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const isExpense = transaction.type === 'expense';
  const amount = isExpense ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);

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
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <ArrowLeft size={20} color="white" />
              </Pressable>
              <Text className="text-white text-lg font-semibold">
                Transaction Details
              </Text>
              <Pressable
                onPress={handleEdit}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <Pencil size={18} color="white" />
              </Pressable>
            </View>

            {/* Main Card */}
            <GlassCard className="p-6 mb-6">
              {/* Icon and Category */}
              <View className="items-center mb-4">
                <View
                  className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <Text className="text-3xl">
                    💰
                  </Text>
                </View>
                <Text className="text-white text-xl font-semibold text-center">
                  {transaction.payee || 'Transaction'}
                </Text>
                {transaction.isShared && (
                  <View
                    className="mt-2 px-3 py-1 rounded-full flex-row items-center gap-1"
                    style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}
                  >
                    <Users size={12} color={colors.contextSage} />
                    <Text
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: colors.contextSage,
                      }}
                    >
                      Shared Expense
                    </Text>
                  </View>
                )}
              </View>

              {/* Amount */}
              <View className="items-center py-4 border-t border-b border-white/10 my-4">
                <Text
                  className="text-white/50 mb-1"
                  style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  {isExpense ? 'Amount Spent' : 'Amount Received'}
                </Text>
                <Text
                  className="font-bold"
                  style={{
                    fontSize: 36,
                    fontVariant: ['tabular-nums'],
                    // CRITICAL: Expenses in neutral white, income in sage green - NO RED!
                    color: isExpense ? 'rgba(255, 255, 255, 0.9)' : colors.contextSage,
                  }}
                >
                  {isExpense ? '' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </View>

              {/* Details Grid */}
              <View>
                {/* Date */}
                <View className="flex-row items-center py-3 border-b border-white/5">
                  <Calendar size={16} color="rgba(255, 255, 255, 0.4)" />
                  <Text className="text-white/40 text-xs uppercase tracking-wide ml-3 flex-1">
                    Date
                  </Text>
                  <Text className="text-white/90 text-sm font-medium">
                    {formatTransactionDate(transaction.date)}
                  </Text>
                </View>

                {/* Category */}
                <View className="flex-row items-center py-3 border-b border-white/5">
                  <Tag size={16} color="rgba(255, 255, 255, 0.4)" />
                  <Text className="text-white/40 text-xs uppercase tracking-wide ml-3 flex-1">
                    Category
                  </Text>
                  <Text className="text-white/90 text-sm font-medium">
                    {transaction.category?.name || 'Uncategorized'}
                  </Text>
                </View>

                {/* Account */}
                {transaction.account && (
                  <View className="flex-row items-center py-3 border-b border-white/5">
                    <Wallet size={16} color="rgba(255, 255, 255, 0.4)" />
                    <Text className="text-white/40 text-xs uppercase tracking-wide ml-3 flex-1">
                      Account
                    </Text>
                    <Text className="text-white/90 text-sm font-medium">
                      {transaction.account.name}
                    </Text>
                  </View>
                )}

                {/* Type */}
                <View className="flex-row items-center py-3">
                  <Receipt size={16} color="rgba(255, 255, 255, 0.4)" />
                  <Text className="text-white/40 text-xs uppercase tracking-wide ml-3 flex-1">
                    Type
                  </Text>
                  <Text className="text-white/90 text-sm font-medium capitalize">
                    {transaction.type}
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Notes (if any) */}
            {transaction.note && (
              <GlassCard className="p-5 mb-6">
                <Text
                  className="text-white/50 mb-2"
                  style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}
                >
                  Notes
                </Text>
                <Text className="text-white/80 text-sm leading-5">
                  {transaction.note}
                </Text>
              </GlassCard>
            )}

            {/* Bottom padding */}
            <View className="h-10" />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}
