import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, SectionList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2, ArrowDownLeft, ArrowUpRight, AlertCircle, Plus, X, TrendingUp, TrendingDown } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db } from '@/lib/db';
import { getUserTransactions, deleteTransaction, formatCurrency, formatDateSwiss, Transaction, getHouseholdTransactionsWithCreators, TransactionWithCreator } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getUserAccounts } from '@/lib/accounts-api';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { cn } from '@/lib/cn';

interface TransactionWithDetails extends TransactionWithCreator {
  categoryName?: string;
  accountName?: string;
}

interface SectionData {
  title: string;
  data: TransactionWithDetails[];
}

type DateRange = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all_time';
type TransactionType = 'all' | 'income' | 'expense';

export default function TransactionsTabScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const { category: categoryParam, month: monthParam, start: startParam, end: endParam } = useLocalSearchParams<{ category?: string; month?: string; start?: string; end?: string }>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>('all_time');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [customDateStart, setCustomDateStart] = useState<string | null>(null);
  const [customDateEnd, setCustomDateEnd] = useState<string | null>(null);
  const [monthFilterLabel, setMonthFilterLabel] = useState<string | null>(null);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Apply filters from URL parameters when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Apply category filter
      if (categoryParam) {
        setSelectedCategories([categoryParam]);
        // Clear month filter when category is set
        setCustomDateStart(null);
        setCustomDateEnd(null);
        setMonthFilterLabel(null);
      }

      // Apply budget period date range filter (from trends drill-down)
      if (startParam && endParam) {
        setCustomDateStart(startParam);
        setCustomDateEnd(endParam);

        // Format period label (e.g., "25/12/2025 - 24/01/2026")
        const startDate = new Date(startParam);
        const endDate = new Date(endParam);
        const formatDate = (date: Date) => {
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };
        setMonthFilterLabel(`${formatDate(startDate)} - ${formatDate(endDate)}`);

        // Clear category filter when date range is set
        setSelectedCategories([]);
        setDateRange('all_time');
      }

      // Apply month filter (calendar month)
      if (monthParam && !startParam && !endParam) {
        const [year, month] = monthParam.split('-');
        const monthNumber = parseInt(month);

        // Calculate first and last day of month
        const firstDay = new Date(parseInt(year), monthNumber - 1, 1);
        const lastDay = new Date(parseInt(year), monthNumber, 0);

        const y1 = firstDay.getFullYear();
        const m1 = String(firstDay.getMonth() + 1).padStart(2, '0');
        const d1 = String(firstDay.getDate()).padStart(2, '0');
        const startStr = `${y1}-${m1}-${d1}`;

        const y2 = lastDay.getFullYear();
        const m2 = String(lastDay.getMonth() + 1).padStart(2, '0');
        const d2 = String(lastDay.getDate()).padStart(2, '0');
        const endStr = `${y2}-${m2}-${d2}`;

        setCustomDateStart(startStr);
        setCustomDateEnd(endStr);

        // Format month label (e.g., "January 2025")
        const monthName = firstDay.toLocaleString('en-US', { month: 'long' });
        setMonthFilterLabel(`${monthName} ${year}`);

        // Clear category filter when month is set
        setSelectedCategories([]);
        setDateRange('all_time');
      }
    }, [categoryParam, monthParam, startParam, endParam])
  );

  // Get user and household info (works for both admin and members)
  const householdQuery = useQuery({
    queryKey: ['user-household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const result = await getUserProfileAndHousehold(user.email);
      if (!result) throw new Error('No household found');
      return result;
    },
    enabled: !!user?.email,
  });

  // Get transactions using the household ID from householdQuery
  const transactionsQuery = useQuery({
    queryKey: ['transactions-household', householdQuery.data?.householdId, householdQuery.data?.userRecord?.id],
    queryFn: async () => {
      if (!householdQuery.data?.householdId) return [];
      // Pass current user ID to filter: own transactions + shared transactions
      return getHouseholdTransactionsWithCreators(householdQuery.data.householdId, householdQuery.data.userRecord?.id);
    },
    enabled: !!householdQuery.data?.householdId,
  });

  // Get categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdQuery.data?.householdId, householdQuery.data?.userRecord?.id],
    queryFn: async () => {
      if (!householdQuery.data?.householdId || !householdQuery.data?.userRecord?.id) return [];
      return getCategories(householdQuery.data.householdId, householdQuery.data.userRecord.id);
    },
    enabled: !!householdQuery.data?.householdId && !!householdQuery.data?.userRecord?.id,
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
      queryClient.invalidateQueries({ queryKey: ['transactions-household', householdQuery.data?.householdId, householdQuery.data?.userRecord?.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['wallets', user?.email] });
    }, [householdQuery.data?.householdId, householdQuery.data?.userRecord?.id, user?.email, queryClient])
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-household', householdQuery.data?.householdId, householdQuery.data?.userRecord?.id] });
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
        return [startDate.toISOString().split('T')[0], '2099-12-31'];
      }
      case 'this_month': {
        startDate.setDate(1);
        return [startDate.toISOString().split('T')[0], '2099-12-31'];
      }
      case 'last_month': {
        startDate.setMonth(today.getMonth() - 1);
        startDate.setDate(1);
        const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        return [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];
      }
      case 'last_3_months': {
        startDate.setMonth(today.getMonth() - 3);
        return [startDate.toISOString().split('T')[0], '2099-12-31'];
      }
      case 'this_year': {
        startDate.setMonth(0);
        startDate.setDate(1);
        return [startDate.toISOString().split('T')[0], '2099-12-31'];
      }
      case 'all_time': {
        return ['1900-01-01', '2099-12-31'];
      }
    }

    return [startDate.toISOString().split('T')[0], '2099-12-31'];
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactionsQuery.data) return [];

    let startDate: string;
    let endDate: string;

    // Use custom date range if month filter is applied
    if (customDateStart && customDateEnd) {
      startDate = customDateStart;
      endDate = customDateEnd;
    } else {
      [startDate, endDate] = getDateRangeFilter(dateRange);
    }

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
  }, [transactionsQuery.data, dateRange, transactionType, selectedCategories, selectedAccounts, customDateStart, customDateEnd]);

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
        data: txs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), // Sort by creation time, newest first
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

  const hasActiveFilters = monthFilterLabel !== null || dateRange !== 'all_time' || transactionType !== 'all' || selectedCategories.length > 0 || selectedAccounts.length > 0;

  const clearAllFilters = () => {
    setDateRange('all_time');
    setTransactionType('all');
    setSelectedCategories([]);
    setSelectedAccounts([]);
    setCustomDateStart(null);
    setCustomDateEnd(null);
    setMonthFilterLabel(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-3">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-3xl font-bold" style={{ color: '#006A6A' }}>
            Transactions
          </Text>
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
              <Pressable
                onPress={() => setShowCategoryModal(true)}
                className={cn('px-3 py-2 rounded-full flex-row items-center gap-1',
                  selectedCategories.length === 0 ? 'border border-gray-300' : 'bg-teal-100'
                )}
              >
                <Text className={cn('text-xs font-medium',
                  selectedCategories.length === 0 ? 'text-gray-700' : 'text-teal-700'
                )}>
                  🏷️ {selectedCategories.length === 0
                    ? 'All Categories'
                    : selectedCategories.length === 1
                      ? (() => {
                          const cat = categoriesQuery.data?.find((c: any) => c.id === selectedCategories[0]);
                          return cat ? cat.name : '1 selected';
                        })()
                      : `${selectedCategories.length} selected`}
                </Text>
                {selectedCategories.length > 0 && (
                  <Text className="text-xs font-medium text-teal-700">×</Text>
                )}
              </Pressable>
              {monthFilterLabel && (
                <Pressable
                  onPress={clearAllFilters}
                  className="px-3 py-2 rounded-full bg-teal-100 flex-row items-center gap-1"
                >
                  <Text className="text-xs font-medium text-teal-700">{monthFilterLabel}</Text>
                  <Text className="text-xs font-medium text-teal-700">×</Text>
                </Pressable>
              )}
              {hasActiveFilters && (
                <Pressable
                  onPress={clearAllFilters}
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
              <AlertCircle size={40} color="#006A6A" />
            </View>
            <Text className="text-xl font-bold mb-2 text-center" style={{ color: '#1F2937' }}>
              {hasActiveFilters ? 'No transactions found' : 'No transactions yet'}
            </Text>
            <Text className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
              {hasActiveFilters ? 'Try adjusting your filters' : 'Start tracking your finances by adding your first transaction'}
            </Text>
            {hasActiveFilters ? (
              <Pressable
                onPress={clearAllFilters}
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
                className={cn('px-3 py-2 rounded-full flex-row items-center gap-1',
                  selectedCategories.length === 0 ? 'border border-gray-300' : 'bg-teal-100'
                )}
              >
                <Text className="text-xs font-medium text-gray-700">🏷️</Text>
                <Text className={cn('text-xs font-medium',
                  selectedCategories.length === 0 ? 'text-gray-700' : 'text-teal-700'
                )}>
                  {selectedCategories.length === 0
                    ? 'All Categories'
                    : selectedCategories.length === 1
                      ? (() => {
                          const cat = categoriesQuery.data?.find((c: any) => c.id === selectedCategories[0]);
                          return cat ? cat.name : '1 selected';
                        })()
                      : `${selectedCategories.length} selected`}
                </Text>
                {selectedCategories.length > 0 && (
                  <Text className="text-xs font-medium text-teal-700">×</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowAccountModal(true)}
                className={cn('px-3 py-2 rounded-full flex-row items-center gap-1',
                  selectedAccounts.length === 0 ? 'border border-gray-300' : 'bg-teal-100'
                )}
              >
                <Text className="text-xs font-medium text-gray-700">💳</Text>
                <Text className={cn('text-xs font-medium',
                  selectedAccounts.length === 0 ? 'text-gray-700' : 'text-teal-700'
                )}>
                  {selectedAccounts.length === 0 ? 'All Accounts' : `${selectedAccounts.length} selected`}
                </Text>
                {selectedAccounts.length > 0 && (
                  <Text className="text-xs font-medium text-teal-700">×</Text>
                )}
              </Pressable>

              {monthFilterLabel && (
                <Pressable
                  onPress={clearAllFilters}
                  className="px-3 py-2 rounded-full bg-teal-100 flex-row items-center gap-1"
                >
                  <Text className="text-xs font-medium text-teal-700">{monthFilterLabel}</Text>
                  <Text className="text-xs font-medium text-teal-700">×</Text>
                </Pressable>
              )}

              {hasActiveFilters && !monthFilterLabel && (
                <Pressable
                  onPress={clearAllFilters}
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
          </View>

          {/* Transaction List */}
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id || ''}
            renderItem={({ item: tx }) => {
              const isIncome = tx.type === 'income';
              const isDeleting = deleteMutation.isPending && deleteConfirmId === tx.id;
              const isOtherUser = tx.userId !== householdQuery.data?.userRecord?.id;

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
                      onPress={() => tx.id && router.push(`/transactions/${tx.id}/edit`)}
                      onLongPress={() => setDeleteConfirmId(tx.id || null)}
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
                          <View className="flex-row items-center gap-2">
                            <Text className="font-semibold text-sm" style={{ color: '#1F2937' }}>
                              {tx.categoryName || 'Unknown'}
                            </Text>
                            {isOtherUser && (
                              <Text className="text-xs" style={{ color: '#9CA3AF' }}>
                                ({tx.creatorName})
                              </Text>
                            )}
                          </View>
                          <Text className="text-xs" style={{ color: '#9CA3AF' }}>
                            {tx.accountName || 'Unknown Account'}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <View className="items-end">
                          <Text
                            className="font-bold text-sm"
                            style={{
                              color: isIncome ? '#8B9D8B' : '#DC2626',
                            }}
                          >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </Text>
                        </View>
                        {/* Shared badge */}
                        {tx.isShared && (
                          <View className="bg-purple-100 px-2 py-1 rounded-full">
                            <Text className="text-xs text-purple-700 font-semibold">Shared</Text>
                          </View>
                        )}
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
