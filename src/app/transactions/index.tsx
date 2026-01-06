import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, SectionList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Trash2, ArrowDownLeft, ArrowUpRight, AlertCircle, Plus, X, TrendingUp, TrendingDown, Scale3D } from 'lucide-react-native';
import { router } from 'expo-router';
import { db } from '@/lib/db';
import { getUserTransactions, deleteTransaction, formatCurrency, formatDateSwiss, Transaction } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getUserAccounts } from '@/lib/accounts-api';
import { cn } from '@/lib/cn';

interface TransactionWithDetails extends Transaction {
  categoryName?: string;
  accountName?: string;
}

interface SectionData {
  title: string;
  data: TransactionWithDetails[];
}

type DateRange = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all_time';
type TransactionType = 'all' | 'income' | 'expense';

export default function TransactionsListScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

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

  // Get transactions
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', householdQuery.data?.userRecord?.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['wallets', user?.email] });
      setDeleteConfirmId(null);
    },
  });

  // Helper function to get date range
  const getDateRangeFilter = (range: DateRange): [string, string] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);

    switch (range) {
      case 'this_week': {
        const day = today.getDay();
        startDate.setDate(today.getDate() - day);
        break;
      }
      case 'this_month': {
        startDate.setDate(1);
        break;
      }
      case 'last_month': {
        startDate.setMonth(today.getMonth() - 1);
        startDate.setDate(1);
        const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        return [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];
      }
      case 'last_3_months': {
        startDate.setMonth(today.getMonth() - 3);
        break;
      }
      case 'this_year': {
        startDate.setMonth(0);
        startDate.setDate(1);
        break;
      }
      case 'all_time': {
        return ['1900-01-01', today.toISOString().split('T')[0]];
      }
    }

    return [startDate.toISOString().split('T')[0], today.toISOString().split('T')[0]];
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactionsQuery.data) return [];

    const [startDate, endDate] = getDateRangeFilter(dateRange);

    return (transactionsQuery.data ?? [])
      .filter((tx) => {
        // Date range filter
        if (tx.date < startDate || tx.date > endDate) return false;

        // Type filter
        if (transactionType !== 'all' && tx.type !== transactionType) return false;

        // Category filter
        if (selectedCategories.length > 0 && !selectedCategories.includes(tx.categoryId)) return false;

        // Account filter
        if (selectedAccounts.length > 0 && !selectedAccounts.includes(tx.accountId)) return false;

        return true;
      });
  }, [transactionsQuery.data, dateRange, transactionType, selectedCategories, selectedAccounts]);

  // Enrich transactions with category and account names
  const enrichedTransactions: TransactionWithDetails[] = filteredTransactions.map((tx) => {
    const category = categoriesQuery.data?.find((c) => c.id === tx.categoryId);
    const account = accountsQuery.data?.find((a) => a.id === tx.accountId);
    return {
      ...tx,
      categoryName: category?.name,
      accountName: account?.name,
    };
  });

  // Group transactions by date
  const groupedTransactions: SectionData[] = useMemo(() => {
    const dateMap = new Map<string, TransactionWithDetails[]>();

    enrichedTransactions.forEach((tx) => {
      const dateKey = tx.date;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(tx);
    });

    return Array.from(dateMap.entries())
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([date, txs]) => ({
        title: formatDateSwiss(date),
        data: txs,
      }));
  }, [enrichedTransactions]);

  // Calculate summary stats
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    enrichedTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      net: totalIncome - totalExpense,
    };
  }, [enrichedTransactions]);

  const isLoading =
    householdQuery.isLoading || transactionsQuery.isLoading || categoriesQuery.isLoading || accountsQuery.isLoading;

  const hasActiveFilters = dateRange !== 'this_month' || transactionType !== 'all' || selectedCategories.length > 0 || selectedAccounts.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-3">
        <Text className="text-3xl font-bold mb-4" style={{ color: '#006A6A' }}>
          Transactions
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#006A6A" />
        </View>
      ) : enrichedTransactions.length === 0 ? (
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}>
          {/* Filters even when no transactions */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-3">Filters</Text>
            <View className="flex-row gap-2 flex-wrap">
              <Pressable
                onPress={() => setShowDateRangeModal(true)}
                className="px-3 py-2 rounded-full border border-gray-300"
              >
                <Text className="text-xs font-medium text-gray-700">📅 {dateRange.replace(/_/g, ' ')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowTypeModal(true)}
                className="px-3 py-2 rounded-full border border-gray-300"
              >
                <Text className="text-xs font-medium text-gray-700">💰 {transactionType === 'all' ? 'All Types' : transactionType}</Text>
              </Pressable>
              {hasActiveFilters && (
                <Pressable
                  onPress={() => {
                    setDateRange('this_month');
                    setTransactionType('all');
                    setSelectedCategories([]);
                    setSelectedAccounts([]);
                  }}
                  className="px-3 py-2 rounded-full bg-gray-100"
                >
                  <Text className="text-xs font-medium text-gray-700">Clear</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Empty State */}
          <View className="flex-1 justify-center items-center">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(0, 106, 106, 0.1)' }}
            >
              {hasActiveFilters ? (
                <AlertCircle size={40} color="#006A6A" />
              ) : (
                <AlertCircle size={40} color="#006A6A" />
              )}
            </View>
            <Text className="text-xl font-bold mb-2 text-center" style={{ color: '#1F2937' }}>
              {hasActiveFilters ? 'No transactions found' : 'No transactions yet'}
            </Text>
            <Text className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
              {hasActiveFilters ? 'Try adjusting your filters' : 'Start tracking your finances by adding your first transaction'}
            </Text>
            {hasActiveFilters ? (
              <Pressable
                onPress={() => {
                  setDateRange('this_month');
                  setTransactionType('all');
                  setSelectedCategories([]);
                  setSelectedAccounts([]);
                }}
                className="rounded-full px-6 py-3"
                style={{ backgroundColor: '#006A6A' }}
              >
                <Text className="text-white font-bold text-sm">Clear Filters</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push('/transactions/add')}
                className="rounded-full px-6 py-3"
                style={{ backgroundColor: '#006A6A' }}
              >
                <Text className="text-white font-bold text-sm">Add Your First Transaction</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1">
          {/* Filter Bar */}
          <View className="px-6 pb-4 border-b border-gray-200">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              <Pressable
                onPress={() => setShowDateRangeModal(true)}
                className="px-3 py-2 rounded-full border border-gray-300 flex-row items-center gap-1"
              >
                <Text className="text-xs font-medium text-gray-700">📅</Text>
                <Text className="text-xs font-medium text-gray-700">{dateRange.replace(/_/g, ' ')}</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowTypeModal(true)}
                className="px-3 py-2 rounded-full border border-gray-300 flex-row items-center gap-1"
              >
                <Text className="text-xs font-medium text-gray-700">💰</Text>
                <Text className="text-xs font-medium text-gray-700">
                  {transactionType === 'all' ? 'All Types' : transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowCategoryModal(true)}
                className="px-3 py-2 rounded-full border border-gray-300 flex-row items-center gap-1"
              >
                <Text className="text-xs font-medium text-gray-700">🏷️</Text>
                <Text className="text-xs font-medium text-gray-700">
                  {selectedCategories.length === 0 ? 'All Categories' : `${selectedCategories.length} selected`}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowAccountModal(true)}
                className="px-3 py-2 rounded-full border border-gray-300 flex-row items-center gap-1"
              >
                <Text className="text-xs font-medium text-gray-700">💳</Text>
                <Text className="text-xs font-medium text-gray-700">
                  {selectedAccounts.length === 0 ? 'All Accounts' : `${selectedAccounts.length} selected`}
                </Text>
              </Pressable>

              {hasActiveFilters && (
                <Pressable
                  onPress={() => {
                    setDateRange('this_month');
                    setTransactionType('all');
                    setSelectedCategories([]);
                    setSelectedAccounts([]);
                  }}
                  className="px-3 py-2 rounded-full bg-red-100"
                >
                  <Text className="text-xs font-medium text-red-700">✕ Clear</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>

          {/* Summary Cards */}
          <View className="px-6 py-4 gap-3">
            {/* Income Card */}
            <View className="p-4 rounded-2xl" style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' }}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold text-green-700">INCOME</Text>
                <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                  <TrendingUp size={16} color="#16A34A" />
                </View>
              </View>
              <Text className="text-2xl font-bold text-green-700">+{formatCurrency(stats.income)}</Text>
            </View>

            {/* Expenses Card */}
            <View className="p-4 rounded-2xl" style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold text-red-700">EXPENSES</Text>
                <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
                  <TrendingDown size={16} color="#DC2626" />
                </View>
              </View>
              <Text className="text-2xl font-bold text-red-700">-{formatCurrency(stats.expense)}</Text>
            </View>

            {/* Net Balance Card */}
            <View className="p-4 rounded-2xl" style={{ backgroundColor: stats.net >= 0 ? '#F0FDF4' : '#FEF2F2', borderWidth: 1, borderColor: stats.net >= 0 ? '#86EFAC' : '#FECACA' }}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold" style={{ color: stats.net >= 0 ? '#16A34A' : '#DC2626' }}>
                  NET BALANCE
                </Text>
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: stats.net >= 0 ? '#DCFCE7' : '#FEE2E2' }}
                >
                  <Scale3D size={16} color={stats.net >= 0 ? '#16A34A' : '#DC2626'} />
                </View>
              </View>
              <Text className="text-2xl font-bold" style={{ color: stats.net >= 0 ? '#16A34A' : '#DC2626' }}>
                {stats.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(stats.net))}
              </Text>
            </View>
          </View>

          {/* Transaction List */}
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
        </View>
      )}

      {/* Filter Modals */}
      {/* Date Range Modal */}
      <Modal visible={showDateRangeModal} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold">Select Date Range</Text>
            <Pressable onPress={() => setShowDateRangeModal(false)}>
              <X size={24} color="#006A6A" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-6 py-4">
            {(['this_week', 'this_month', 'last_month', 'last_3_months', 'this_year', 'all_time'] as DateRange[]).map((range) => (
              <Pressable
                key={range}
                onPress={() => {
                  setDateRange(range);
                  setShowDateRangeModal(false);
                }}
                className={cn(
                  'p-4 rounded-lg mb-2 border-2',
                  dateRange === range ? 'border-teal-600 bg-teal-50' : 'border-gray-200'
                )}
              >
                <Text className={cn('font-semibold text-base', dateRange === range ? 'text-teal-600' : 'text-gray-900')}>
                  {range.replace(/_/g, ' ').charAt(0).toUpperCase() + range.replace(/_/g, ' ').slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Type Modal */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold">Select Type</Text>
            <Pressable onPress={() => setShowTypeModal(false)}>
              <X size={24} color="#006A6A" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-6 py-4">
            {(['all', 'income', 'expense'] as TransactionType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => {
                  setTransactionType(type);
                  setShowTypeModal(false);
                }}
                className={cn(
                  'p-4 rounded-lg mb-2 border-2',
                  transactionType === type ? 'border-teal-600 bg-teal-50' : 'border-gray-200'
                )}
              >
                <Text className={cn('font-semibold text-base', transactionType === type ? 'text-teal-600' : 'text-gray-900')}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold">Select Categories</Text>
            <Pressable onPress={() => setShowCategoryModal(false)}>
              <X size={24} color="#006A6A" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-6 py-4">
            <Pressable
              onPress={() => setSelectedCategories([])}
              className={cn('p-4 rounded-lg mb-2 border-2', selectedCategories.length === 0 ? 'border-teal-600 bg-teal-50' : 'border-gray-200')}
            >
              <Text className={cn('font-semibold text-base', selectedCategories.length === 0 ? 'text-teal-600' : 'text-gray-900')}>
                All Categories
              </Text>
            </Pressable>
            {categoriesQuery.data?.map((category) => {
              const catId = category.id || '';
              return (
                <Pressable
                  key={catId}
                  onPress={() => {
                    setSelectedCategories((prev) =>
                      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
                    );
                  }}
                  className={cn(
                    'p-4 rounded-lg mb-2 border-2 flex-row items-center',
                    selectedCategories.includes(catId) ? 'border-teal-600 bg-teal-50' : 'border-gray-200'
                  )}
                >
                  <Text className={cn('font-semibold text-base flex-1', selectedCategories.includes(catId) ? 'text-teal-600' : 'text-gray-900')}>
                    {category.name}
                  </Text>
                  {selectedCategories.includes(catId) && <Text className="text-teal-600">✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Account Modal */}
      <Modal visible={showAccountModal} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
            <Text className="text-lg font-bold">Select Accounts</Text>
            <Pressable onPress={() => setShowAccountModal(false)}>
              <X size={24} color="#006A6A" />
            </Pressable>
          </View>
          <ScrollView className="flex-1 px-6 py-4">
            <Pressable
              onPress={() => setSelectedAccounts([])}
              className={cn('p-4 rounded-lg mb-2 border-2', selectedAccounts.length === 0 ? 'border-teal-600 bg-teal-50' : 'border-gray-200')}
            >
              <Text className={cn('font-semibold text-base', selectedAccounts.length === 0 ? 'text-teal-600' : 'text-gray-900')}>
                All Accounts
              </Text>
            </Pressable>
            {accountsQuery.data?.map((account) => {
              const accId = account.id || '';
              return (
                <Pressable
                  key={accId}
                  onPress={() => {
                    setSelectedAccounts((prev) =>
                      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
                    );
                  }}
                  className={cn(
                    'p-4 rounded-lg mb-2 border-2 flex-row items-center',
                    selectedAccounts.includes(accId) ? 'border-teal-600 bg-teal-50' : 'border-gray-200'
                  )}
                >
                  <View className="flex-1">
                    <Text className={cn('font-semibold text-base', selectedAccounts.includes(accId) ? 'text-teal-600' : 'text-gray-900')}>
                      {account.name}
                    </Text>
                    <Text className="text-xs text-gray-600">{formatCurrency(account.balance)}</Text>
                  </View>
                  {selectedAccounts.includes(accId) && <Text className="text-teal-600">✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
