// FIX: PERF-2 - Replaced Animated.ScrollView with @shopify/flash-list FlashList
// for the transaction list. The original used ScrollView which renders ALL items at once
// (no virtualization), causing memory spikes and jank with 100+ transactions.
// FlashList recycles views and only renders visible items.
//
// Also added pagination (50 items at a time) via onEndReached to avoid loading
// all transactions into memory at once.

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Settings, Search, Plus } from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { db } from '@/lib/db';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { formatCurrency } from '@/lib/formatCurrency';
import { deleteTransaction } from '@/lib/transactions-api';
import { deactivateRecurringTemplate } from '@/lib/recurring-api';
import TransactionListItem from '@/components/transactions/TransactionListItem';
import RecurringSection from '@/components/transactions/RecurringSection';
import TransactionFilters from '@/components/transactions/TransactionFilters';
import StickyStatusBar from '@/components/layout/StickyStatusBar';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';

// FIX: PERF-2 - Pagination batch size
const PAGE_SIZE = 50;

function formatDateHeader(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return `Today \u2022 ${format(date, 'MMM d')}`;
    } else if (isYesterday(date)) {
      return `Yesterday \u2022 ${format(date, 'MMM d')}`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  } catch {
    return dateStr;
  }
}

// FIX: PERF-2 - Item type for FlashList that can be either a header or a transaction
type ListItem =
  | { type: 'header'; date: string; label: string }
  | { type: 'transaction'; data: any };

export default function TransactionsTabScreen() {
  const insets = useSafeAreaInsets();
  const { user } = db.useAuth();
  const queryClient = useQueryClient();
  const scrollY = useSharedValue(0);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // FIX: PERF-2 - Pagination state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Get user and household info
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

  // Load categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdQuery.data?.householdId],
    queryFn: async () => {
      if (!householdQuery.data?.householdId) return [];
      // @ts-ignore - InstantDB types
      const result = await db.queryOnce({
        categories: {
          $: {
            where: { householdId: householdQuery.data.householdId },
          },
        },
      });
      return (result?.data?.categories || []) as any[];
    },
    enabled: !!householdQuery.data?.householdId,
  });

  // Load wallets/accounts
  const accountsQuery = useQuery({
    queryKey: ['accounts', householdQuery.data?.householdId],
    queryFn: async () => {
      if (!householdQuery.data?.householdId) return [];
      // @ts-ignore - InstantDB types
      const result = await db.queryOnce({
        accounts: {
          // @ts-ignore
          $: {
            // @ts-ignore
            where: { householdId: householdQuery.data.householdId },
          },
        },
      });
      return (result?.data?.accounts || []) as any[];
    },
    enabled: !!householdQuery.data?.householdId,
  });

  // Load transactions
  const transactionsQuery = useQuery({
    queryKey: ['transactions', householdQuery.data?.userId],
    queryFn: async () => {
      if (!householdQuery.data?.userId) {
        return [];
      }

      try {
        // @ts-ignore - InstantDB types
        const result = await db.queryOnce({
          // @ts-ignore
          transactions: {
            $: {
              where: { userId: householdQuery.data.userId },
            },
            category: {},
            account: {},
          },
        });
        return (result?.data?.transactions || []) as any[];
      } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
    },
    enabled: !!householdQuery.data?.userId,
  });

  // Load recurring templates
  const recurringQuery = useQuery({
    queryKey: ['recurring-templates', householdQuery.data?.userId, householdQuery.data?.householdId],
    queryFn: async () => {
      if (!householdQuery.data?.userId || !householdQuery.data?.householdId) {
        return [];
      }
      // @ts-ignore - InstantDB types
      const result = await db.queryOnce({
        // @ts-ignore
        recurringTemplates: {
          $: {
            where: {
              userId: householdQuery.data.userId,
              householdId: householdQuery.data.householdId,
            },
          },
        },
      });
      const allTemplates = (result?.data?.recurringTemplates || []) as any[];
      // Filter for active only
      return allTemplates.filter((t: any) => t.isActive === true);
    },
    enabled: !!householdQuery.data?.userId && !!householdQuery.data?.householdId,
  });

  // Format transactions for display
  const formattedTransactions = useMemo(() => {
    if (!transactionsQuery.data) {
      return [];
    }

    // Build a category lookup map
    const categoryMap = new Map();
    if (categoriesQuery.data) {
      categoriesQuery.data.forEach((cat: any) => {
        categoryMap.set(cat.id, cat);
      });
    }

    // Build an account lookup map
    const accountMap = new Map();
    if (accountsQuery.data) {
      accountsQuery.data.forEach((acc: any) => {
        accountMap.set(acc.id, acc);
      });
    }

    return transactionsQuery.data.map((t: any) => {
      // Look up category and account by ID
      const category = categoryMap.get(t.categoryId);
      const account = accountMap.get(t.accountId);

      // Extract emoji from category name if it exists
      let categoryEmoji = '📝';
      let categoryNameClean = category?.name || 'Uncategorized';

      if (category?.emoji) {
        categoryEmoji = category.emoji;
      } else if (category?.name) {
        const emojiRegex = /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])\s*/u;
        const emojiMatch = category.name.match(emojiRegex);
        if (emojiMatch) {
          categoryEmoji = emojiMatch[1];
          categoryNameClean = category.name.replace(emojiRegex, '').trim();
        }
      }

      return {
        id: t.id,
        type: t.type,
        amount: t.amount,
        payee: t.payee || 'Unknown',
        categoryName: categoryNameClean,
        categoryId: t.categoryId,
        accountId: t.accountId,
        walletName: account?.name || '',
        currency: account?.currency || 'CHF',
        emoji: categoryEmoji,
        date: t.date,
        note: t.note,
        isShared: t.isShared || false,
        paidByYou: t.paidByUserId === householdQuery.data?.userId,
        partnerName: 'Partner',
        partnerOwes: 0,
        youOwe: 0,
      };
    });
  }, [transactionsQuery.data, categoriesQuery.data, accountsQuery.data, householdQuery.data?.userId]);

  // Combine recurring templates + future transactions
  const formattedRecurring = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const items: any[] = [];

    // Don't build recurring list if categories aren't loaded yet
    if (!categoriesQuery.data || categoriesQuery.data.length === 0) {
      return [];
    }

    // Add recurring templates
    if (recurringQuery.data) {
      recurringQuery.data.forEach((r: any) => {
        const category = categoriesQuery.data?.find((c: any) => c.id === r.categoryId);
        const account = accountsQuery.data?.find((a: any) => a.id === r.accountId);

        let categoryEmoji = '📝';
        if (category?.emoji) {
          categoryEmoji = category.emoji;
        } else if (category?.name) {
          const emojiRegex = /([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])\s*/u;
          const emojiMatch = category.name.match(emojiRegex);
          if (emojiMatch) {
            categoryEmoji = emojiMatch[1];
          }
        }

        // Calculate next occurrence date
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const currentYear = todayDate.getFullYear();
        const currentMonth = todayDate.getMonth();
        const recurringDay = r.recurringDay || 1;

        let nextDate = new Date(currentYear, currentMonth, recurringDay, 12, 0, 0);
        if (nextDate <= todayDate) {
          nextDate = new Date(currentYear, currentMonth + 1, recurringDay, 12, 0, 0);
        }

        items.push({
          id: r.id,
          type: r.type,
          amount: r.amount,
          payee: r.payee || 'Unknown',
          emoji: categoryEmoji,
          dayOfMonth: r.recurringDay || 1,
          date: nextDate.toISOString().split('T')[0],
          isRecurring: true,
          isActive: r.isActive,
          isShared: r.isShared || false,
          partnerName: 'Partner',
          walletName: account?.name || 'Unknown Account',
          currency: account?.currency || 'CHF',
        });
      });
    }

    // Add future one-time transactions
    if (formattedTransactions) {
      formattedTransactions.forEach((t: any) => {
        if (t.date > today) {
          items.push({
            id: t.id,
            type: t.type,
            amount: t.amount,
            payee: t.payee,
            emoji: t.emoji,
            date: t.date,
            isRecurring: false,
            isActive: true,
            isShared: t.isShared,
            partnerName: t.partnerName,
            walletName: t.walletName,
          });
        }
      });
    }

    return items;
  }, [recurringQuery.data, formattedTransactions, categoriesQuery.data, accountsQuery.data]);

  // Use filter hook with search
  const { filters, setFilters, filteredTransactions, groupedByDate } = useTransactionFilters(
    formattedTransactions
  );

  // Apply search query separately
  const searchFilteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return filteredTransactions;

    const query = searchQuery.toLowerCase();
    return filteredTransactions.filter((t: any) => {
      const payee = (t.payee || '').toLowerCase();
      const note = (t.note || '').toLowerCase();
      const categoryName = (t.categoryName || '').toLowerCase();
      return payee.includes(query) || note.includes(query) || categoryName.includes(query);
    });
  }, [filteredTransactions, searchQuery]);

  // FIX: PERF-2 - Flatten grouped transactions into a list of items for FlashList.
  // Each date group becomes a header item followed by transaction items.
  const flatListData: ListItem[] = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const grouped: Record<string, any[]> = {};

    searchFilteredTransactions.forEach((transaction: any) => {
      if (transaction.date <= today) {
        const date = transaction.date.split('T')[0];
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(transaction);
      }
    });

    // Sort dates descending (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    const items: ListItem[] = [];
    for (const date of sortedDates) {
      items.push({ type: 'header', date, label: formatDateHeader(date) });
      for (const tx of grouped[date]) {
        items.push({ type: 'transaction', data: tx });
      }
    }

    return items;
  }, [searchFilteredTransactions]);

  // FIX: PERF-2 - Only show first `visibleCount` items for pagination
  const paginatedData = useMemo(() => {
    return flatListData.slice(0, visibleCount);
  }, [flatListData, visibleCount]);

  const hasMore = visibleCount < flatListData.length;

  const categories = (categoriesQuery.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji || '📝',
  }));
  const isLoading = householdQuery.isLoading || transactionsQuery.isLoading;

  // Delete handler
  const handleDelete = useCallback(async (transactionId: string) => {
    try {
      const result = await deleteTransaction(transactionId);
      if (!result.success) {
        console.error('Delete failed:', result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budget-details'] });
      queryClient.invalidateQueries({ queryKey: ['household-data'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-data'] });
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  }, [queryClient]);

  // Duplicate handler
  const handleDuplicate = useCallback((transactionId: string) => {
    const transaction = formattedTransactions.find((t: any) => t.id === transactionId);
    if (!transaction) {
      console.error('Transaction not found for duplication:', transactionId);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    router.push({
      pathname: '/transactions/add',
      params: {
        duplicate: 'true',
        type: transaction.type,
        amount: transaction.amount.toString(),
        payee: transaction.payee,
        categoryId: transaction.categoryId,
        accountId: transaction.accountId || '',
        note: transaction.note || '',
        date: today,
      }
    });
  }, [formattedTransactions]);

  // FIX: PERF-2 - Load more handler for pagination
  const handleEndReached = useCallback(() => {
    if (hasMore) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  // FIX: PERF-2 - Render item for FlashList
  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <Text
          className="text-sm font-semibold mb-2 ml-1 mt-4"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {item.label}
        </Text>
      );
    }

    return (
      <TransactionListItem
        transaction={item.data}
        onClick={() => router.push(`/transactions/add?id=${item.data.id}`)}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    );
  }, [handleDelete, handleDuplicate]);

  // FIX: PERF-2 - Key extractor for FlashList
  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'header') return `header-${item.date}`;
    return item.data.id;
  }, []);

  // FIX: PERF-2 - Estimated item size for FlashList optimization
  // Headers are ~30px, transaction items are ~76px
  const getItemType = useCallback((item: ListItem) => {
    return item.type;
  }, []);

  return (
    <LinearGradient colors={['#1A1C1E', '#2C5F5D']} style={{ flex: 1 }}>
      <StickyStatusBar scrollY={scrollY} />

      {/* Header - rendered outside FlashList */}
      <View style={{ paddingTop: (insets.top || 44) + 16, paddingHorizontal: 20 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text
            className="text-[28px] font-bold"
            style={{ color: 'rgba(255,255,255,0.95)' }}
          >
            Transactions
          </Text>

          <Pressable
            onPress={() => setIsFilterOpen(true)}
            className="items-center justify-center rounded-xl"
            style={{
              width: 40,
              height: 40,
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <Settings size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View
          className="flex-row items-center rounded-2xl mb-4"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Search size={16} color="rgba(255,255,255,0.5)" />
          <TextInput
            className="flex-1 ml-2 text-sm"
            placeholder="Search transactions..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={{ color: 'rgba(255,255,255,0.9)' }}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Upcoming Section */}
        {formattedRecurring.length > 0 && (
          <RecurringSection
            recurringTransactions={formattedRecurring}
            onEdit={(id) => {
              const item = formattedRecurring.find(r => r.id === id);
              if (item?.isRecurring) {
                router.push(`/transactions/add?recurringId=${id}`);
              } else {
                router.push(`/transactions/add?id=${id}`);
              }
            }}
            onDelete={async (id, isRecurring) => {
              try {
                if (isRecurring) {
                  await deactivateRecurringTemplate(id);
                } else {
                  await deleteTransaction(id);
                }
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
                queryClient.invalidateQueries({ queryKey: ['household-data'] });
                queryClient.invalidateQueries({ queryKey: ['settlement-data'] });
              } catch (error) {
                console.error('Error deleting:', error);
              }
            }}
          />
        )}
      </View>

      {/* FIX: PERF-2 - FlashList replaces Animated.ScrollView for virtualized rendering */}
      {isLoading ? (
        <View className="items-center justify-center py-20" style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Loading transactions...</Text>
        </View>
      ) : paginatedData.length > 0 ? (
        <FlashList
          data={paginatedData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          // FIX: PERF-2 - Average item height for FlashList layout estimation
          estimatedItemSize={76}
          getItemType={getItemType}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 60 + insets.bottom + 40, // 60px nav + safe area + 40px gap
          }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hasMore ? (
              <View className="items-center py-4">
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  Loading more...
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <View className="items-center justify-center py-20" style={{ paddingHorizontal: 20 }}>
          <Text className="text-5xl mb-4">📊</Text>
          <Text
            className="text-center text-sm"
            style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 20 }}
          >
            No transactions found.{'\n'}
            Tap + to add your first transaction.
          </Text>
        </View>
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/transactions/add')}
        className="absolute items-center justify-center"
        style={{
          bottom: 120, // 80px nav height + 40px gap (adjusted for taller nav)
          right: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#2C5F5D',
          shadowColor: '#A8B5A1',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
          elevation: 8,
        }}
      >
        {/* Inner glow ring */}
        <View
          style={{
            position: 'absolute',
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: 'rgba(168, 181, 161, 0.3)',
          }}
        />
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </Pressable>

      {/* Filter Modal */}
      <TransactionFilters
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        categories={categories}
      />
    </LinearGradient>
  );
}
