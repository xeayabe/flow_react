import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { Settings, Search, Plus } from 'lucide-react-native';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { db } from '@/lib/db';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { formatCurrency } from '@/lib/formatCurrency';
import TransactionListItem from '@/components/transactions/TransactionListItem';
import RecurringSection from '@/components/transactions/RecurringSection';
import TransactionFilters from '@/components/transactions/TransactionFilters';
import StickyStatusBar from '@/components/layout/StickyStatusBar';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';

function formatDateHeader(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return `Today • ${format(date, 'MMM d')}`;
    } else if (isYesterday(date)) {
      return `Yesterday • ${format(date, 'MMM d')}`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  } catch {
    return dateStr;
  }
}

export default function TransactionsTabScreen() {
  const insets = useSafeAreaInsets();
  const { user } = db.useAuth();
  const queryClient = useQueryClient();
  const scrollY = useSharedValue(0);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Get user and household info
  const householdQuery = useQuery({
    queryKey: ['user-household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      console.log('🔍 Fetching household for user:', user.email);
      const result = await getUserProfileAndHousehold(user.email);
      if (!result) throw new Error('No household found');
      console.log('✅ Household data:', { userId: result.userId, householdId: result.householdId });
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
        console.log('❌ No userId available for transactions query');
        return [];
      }
      console.log('🔍 Fetching transactions for userId:', householdQuery.data.userId);

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
        console.log('✅ Transactions fetched:', result?.data?.transactions?.length || 0);
        if (result?.data?.transactions?.length > 0) {
          console.log('Sample transaction keys:', Object.keys(result.data.transactions[0]));
        }
        return (result?.data?.transactions || []) as any[];
      } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        return [];
      }
    },
    enabled: !!householdQuery.data?.userId,
  });

  // Load recurring templates
  const recurringQuery = useQuery({
    queryKey: ['recurring-templates', householdQuery.data?.userId, householdQuery.data?.householdId],
    queryFn: async () => {
      if (!householdQuery.data?.userId || !householdQuery.data?.householdId) return [];
      // @ts-ignore - InstantDB types
      const result = await db.queryOnce({
        // @ts-ignore
        recurringTemplates: {
          $: {
            where: {
              userId: householdQuery.data.userId,
              householdId: householdQuery.data.householdId,
              isActive: true
            },
          },
          category: {},
        },
      });
      return (result?.data?.recurringTemplates || []) as any[];
    },
    enabled: !!householdQuery.data?.userId && !!householdQuery.data?.householdId,
  });

  // Format transactions for display
  const formattedTransactions = React.useMemo(() => {
    if (!transactionsQuery.data) {
      console.log('⚠️ No transaction data available');
      return [];
    }

    console.log('📊 Raw transactions data:', transactionsQuery.data.length);
    console.log('📊 Sample transaction:', transactionsQuery.data[0]);
    console.log('📊 Categories available:', categoriesQuery.data?.length);

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
        // Try to extract emoji from the beginning of the name
        // Simple emoji detection - emojis are typically 1-2 chars at the start
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
        walletName: account?.name || 'Cash',
        emoji: categoryEmoji,
        date: t.date,
        note: t.note,
        isShared: false,
        paidByYou: false,
        partnerName: '',
        partnerOwes: 0,
        youOwe: 0,
      };
    });
  }, [transactionsQuery.data, categoriesQuery.data, accountsQuery.data, householdQuery.data?.userId]);

  // Format recurring transactions
  const formattedRecurring = React.useMemo(() => {
    if (!recurringQuery.data) return [];

    return recurringQuery.data.map((r: any) => {
      const category = r.category?.[0];
      return {
        id: r.id,
        type: r.type,
        amount: r.amount,
        payee: r.payee || 'Unknown',
        emoji: category?.emoji || '📝',
        dayOfMonth: r.recurringDay || 1,
        isActive: r.isActive,
        isShared: r.isShared || false,
        partnerName: 'Partner',
      };
    });
  }, [recurringQuery.data]);

  // Use filter hook with search
  const { filters, setFilters, filteredTransactions, groupedByDate } = useTransactionFilters(
    formattedTransactions
  );

  // Apply search query separately
  const searchFilteredTransactions = React.useMemo(() => {
    if (!searchQuery.trim()) return filteredTransactions;

    const query = searchQuery.toLowerCase();
    return filteredTransactions.filter((t: any) => {
      const payee = (t.payee || '').toLowerCase();
      const note = (t.note || '').toLowerCase();
      const categoryName = (t.categoryName || '').toLowerCase();
      return payee.includes(query) || note.includes(query) || categoryName.includes(query);
    });
  }, [filteredTransactions, searchQuery]);

  // Regroup by date after search
  const searchGroupedByDate = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    searchFilteredTransactions.forEach((transaction: any) => {
      const date = transaction.date.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });
    console.log('📅 Grouped by date:', Object.keys(grouped).length, 'dates');
    console.log('📅 First date group:', Object.keys(grouped)[0], grouped[Object.keys(grouped)[0]]?.length || 0, 'transactions');
    return grouped;
  }, [searchFilteredTransactions]);

  const categories = (categoriesQuery.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji || '📝',
  }));
  const isLoading = householdQuery.isLoading || transactionsQuery.isLoading;

  console.log('🎨 Render state:', {
    isLoading,
    householdLoading: householdQuery.isLoading,
    transactionsLoading: transactionsQuery.isLoading,
    hasUserId: !!householdQuery.data?.userId,
    transactionsCount: formattedTransactions.length,
    groupedDates: Object.keys(searchGroupedByDate).length,
  });

  // Delete handler
  const handleDelete = async (transactionId: string) => {
    try {
      console.log('🗑️ Deleting transaction:', transactionId);

      // Use the proper delete API that handles account balance updates
      const { deleteTransaction } = await import('@/lib/transactions-api');
      const result = await deleteTransaction(transactionId);

      if (!result.success) {
        console.error('❌ Delete failed:', result.error);
        return;
      }

      console.log('✅ Transaction deleted successfully');
      // Invalidate queries to refresh all data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budget-details'] });
    } catch (error) {
      console.error('❌ Error deleting transaction:', error);
    }
  };

  // Duplicate handler
  const handleDuplicate = (transactionId: string) => {
    const transaction = formattedTransactions.find((t: any) => t.id === transactionId);
    if (!transaction) {
      console.error('❌ Transaction not found for duplication:', transactionId);
      return;
    }

    console.log('📋 Duplicating transaction:', transactionId);

    // Navigate to add screen with pre-filled data
    // Note: We use today's date, not the original transaction date
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
  };

  return (
    <LinearGradient colors={['#1A1C1E', '#2C5F5D']} style={{ flex: 1 }}>
      <StickyStatusBar scrollY={scrollY} />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: (insets.top || 44) + 16,
          paddingHorizontal: 20,
          paddingBottom: 100,
        }}
      >
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

        {/* Recurring Section */}
        {formattedRecurring.length > 0 && (
          <RecurringSection
            recurringTransactions={formattedRecurring}
            onEdit={(id) => router.push(`/transactions/add?recurringId=${id}`)}
          />
        )}

        {/* Transaction List (Grouped by Date) */}
        {isLoading ? (
          <View className="items-center justify-center py-20">
            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Loading transactions...</Text>
          </View>
        ) : Object.keys(searchGroupedByDate).length > 0 ? (
          Object.entries(searchGroupedByDate).map(([date, transactions]) => (
            <View key={date} className="mb-4">
              <Text
                className="text-sm font-semibold mb-2 ml-1"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {formatDateHeader(date)}
              </Text>
              {(transactions as any[]).map((transaction) => (
                <TransactionListItem
                  key={transaction.id}
                  transaction={transaction}
                  onClick={() => router.push(`/transactions/add?id=${transaction.id}`)}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </View>
          ))
        ) : (
          <View className="items-center justify-center py-20">
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
      </Animated.ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/transactions/add')}
        className="absolute items-center justify-center"
        style={{
          bottom: 20,
          right: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#2C5F5D',
          // Triple-layer glow effect
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
