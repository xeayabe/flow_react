import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2, ArrowDownLeft, ArrowUpRight, AlertCircle, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { db } from '@/lib/db';
import { getUserTransactions, deleteTransaction, formatCurrency, formatDateSwiss, Transaction } from '@/lib/transactions-api';
import { getCategories, Category } from '@/lib/categories-api';
import { getUserAccounts } from '@/lib/accounts-api';

interface TransactionWithDetails extends Transaction {
  categoryName?: string;
  accountName?: string;
}

interface SectionData {
  title: string;
  data: TransactionWithDetails[];
}

export default function TransactionsTabScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Get user and household info
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: {
          $: {
            where: {
              email: user.email,
            },
          },
        },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const householdsResult = await db.queryOnce({
        households: {
          $: {
            where: {
              createdByUserId: userRecord.id,
            },
          },
        },
      });

      const household = householdsResult.data.households?.[0];
      if (!household) throw new Error('No household found');

      return { userRecord, household };
    },
    enabled: !!user?.email,
  });

  // Get transactions using the actual userId from householdQuery
  const transactionsQuery = useQuery({
    queryKey: ['transactions', householdQuery.data?.userRecord?.id],
    queryFn: async () => {
      if (!householdQuery.data?.userRecord?.id) return [];
      return getUserTransactions(householdQuery.data.userRecord.id);
    },
    enabled: !!householdQuery.data?.userRecord?.id,
  });

  // Get categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdQuery.data?.household?.id],
    queryFn: async () => {
      if (!householdQuery.data?.household?.id) return [];
      return getCategories(householdQuery.data.household.id);
    },
    enabled: !!householdQuery.data?.household?.id,
  });

  // Get accounts
  const accountsQuery = useQuery({
    queryKey: ['accounts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  // Refetch transactions when tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['transactions', householdQuery.data?.userRecord?.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.email] });
    }, [householdQuery.data?.userRecord?.id, user?.email, queryClient])
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', householdQuery.data?.userRecord?.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.email] });
      setDeleteConfirmId(null);
    },
  });

  // Enrich transactions with category and account names
  const enrichedTransactions: TransactionWithDetails[] = (transactionsQuery.data ?? []).map((tx) => {
    const category = categoriesQuery.data?.find((c) => c.id === tx.categoryId);
    const account = accountsQuery.data?.find((a) => a.id === tx.accountId);
    return {
      ...tx,
      categoryName: category?.name,
      accountName: account?.name,
    };
  });

  // Group transactions by date
  const groupedTransactions: SectionData[] = [];
  const dateMap = new Map<string, TransactionWithDetails[]>();

  enrichedTransactions.forEach((tx) => {
    const dateKey = tx.date;
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, []);
    }
    dateMap.get(dateKey)!.push(tx);
  });

  // Convert to sorted sections
  Array.from(dateMap.entries())
    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
    .forEach(([date, txs]) => {
      groupedTransactions.push({
        title: formatDateSwiss(date),
        data: txs,
      });
    });

  const isLoading =
    householdQuery.isLoading || transactionsQuery.isLoading || categoriesQuery.isLoading || accountsQuery.isLoading;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-3xl font-bold" style={{ color: '#006A6A' }}>
              Transactions
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/transactions/add')}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: '#006A6A' }}
          >
            <Plus size={20} color="white" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#006A6A" />
        </View>
      ) : enrichedTransactions.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}
          >
            <AlertCircle size={40} color="#006A6A" />
          </View>
          <Text className="text-xl font-bold mb-2 text-center" style={{ color: '#1F2937' }}>
            No Transactions Yet
          </Text>
          <Text className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
            Start tracking your finances by adding your first transaction
          </Text>
          <Pressable
            onPress={() => router.push('/transactions/add')}
            className="rounded-full px-6 py-3"
            style={{ backgroundColor: '#006A6A' }}
          >
            <Text className="text-white font-bold text-sm">Add Your First Transaction</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={groupedTransactions}
          keyExtractor={(item) => item.id || ''}
          renderItem={({ item: tx }) => {
            const isIncome = tx.type === 'income';
            const isDeleting = deleteMutation.isPending && deleteConfirmId === tx.id;

            return (
              <View>
                {deleteConfirmId === tx.id ? (
                  <View className="mx-4 mb-3 p-4 rounded-2xl" style={{ backgroundColor: '#FEF2F2' }}>
                    <Text className="text-sm font-semibold mb-3" style={{ color: '#DC2626' }}>
                      Delete this transaction?
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => setDeleteConfirmId(null)}
                        className="flex-1 rounded-lg py-2"
                        style={{ backgroundColor: '#E5E7EB' }}
                      >
                        <Text className="text-center text-sm font-semibold" style={{ color: '#374151' }}>
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => tx.id && deleteMutation.mutate(tx.id)}
                        disabled={isDeleting}
                        className="flex-1 rounded-lg py-2"
                        style={{ backgroundColor: '#DC2626' }}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-center text-sm font-semibold text-white">Delete</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    className="mx-4 mb-3 p-4 rounded-2xl flex-row justify-between items-center"
                    style={{ backgroundColor: '#F9FAFB' }}
                  >
                    {/* Left: Icon and Details */}
                    <View className="flex-1 flex-row items-center">
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: isIncome ? 'rgba(139, 157, 139, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                        }}
                      >
                        {isIncome ? (
                          <ArrowUpRight size={20} color="#8B9D8B" />
                        ) : (
                          <ArrowDownLeft size={20} color="#DC2626" />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                          {tx.categoryName || 'Unknown'}
                        </Text>
                        <Text className="text-xs" style={{ color: '#9CA3AF' }}>
                          {tx.accountName || 'Unknown Account'}
                        </Text>
                      </View>
                    </View>

                    {/* Right: Amount and Delete */}
                    <View className="items-end">
                      <Text
                        className="font-bold text-sm mb-1"
                        style={{
                          color: isIncome ? '#8B9D8B' : '#DC2626',
                        }}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </Text>
                      <Pressable
                        onPress={() => setDeleteConfirmId(tx.id || null)}
                        className="p-1"
                        hitSlop={8}
                      >
                        <Trash2 size={16} color="#9CA3AF" />
                      </Pressable>
                    </View>
                  </Pressable>
                )}
              </View>
            );
          }}
          renderSectionHeader={({ section: { title } }) => (
            <View className="px-6 py-3 bg-white">
              <Text className="font-semibold text-sm" style={{ color: '#6B7280' }}>
                {title}
              </Text>
            </View>
          )}
          scrollEnabled={true}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}
