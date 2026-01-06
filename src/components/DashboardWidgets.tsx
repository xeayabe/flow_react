import React from 'react';
import { Text, View, ScrollView, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import {
  ChevronRight,
  Wallet,
  TrendingDown,
  PiggyBank,
  Plus,
  Eye,
} from 'lucide-react-native';
import { Account } from '@/lib/accounts-api';
import { Transaction } from '@/lib/transactions-api';
import { Category } from '@/lib/categories-api';
import {
  formatCurrency,
  formatTransactionAmount,
  getTransactionTypeColor,
  formatRelativeDate,
  getCategoryIcon,
} from '@/lib/dashboard-helpers';

/**
 * Welcome Header Component
 */
export const WelcomeHeader: React.FC<{
  userName?: string;
  budgetPeriodStart: string;
  budgetPeriodEnd: string;
}> = ({ userName = 'User', budgetPeriodStart, budgetPeriodEnd }) => {
  return (
    <View className="mb-4">
      <Text className="text-3xl font-bold text-gray-900">Welcome back, {userName}! 👋</Text>
    </View>
  );
};

/**
 * Total Balance Card Component
 */
export const TotalBalanceCard: React.FC<{ totalBalance: number }> = ({ totalBalance }) => (
  <Pressable
    onPress={() => router.push('/accounts')}
    className="flex-1 rounded-xl p-4 bg-white border border-gray-100 active:bg-gray-50"
  >
    <Text className="text-xs text-gray-600 font-medium mb-1">Total Balance</Text>
    <Text className="text-2xl font-bold text-gray-900 mb-1">
      {formatCurrency(totalBalance)}
    </Text>
    <Text className="text-xs text-gray-500">Across all accounts</Text>
  </Pressable>
);

/**
 * This Month Spending Card Component
 */
export const ThisMonthSpendingCard: React.FC<{ monthSpending: number; budgetAllocated: number }> = ({
  monthSpending,
  budgetAllocated,
}) => {
  const percentage = budgetAllocated > 0 ? (monthSpending / budgetAllocated) * 100 : 0;

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/transactions')}
      className="flex-1 rounded-xl p-4 bg-white border border-gray-100 active:bg-gray-50"
    >
      <Text className="text-xs text-gray-600 font-medium mb-1">This Month Spending</Text>
      <Text className="text-2xl font-bold text-red-600 mb-1">{formatCurrency(monthSpending)}</Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-500">of {formatCurrency(budgetAllocated)} allocated</Text>
        <Text className={`text-xs font-semibold ${percentage > 100 ? 'text-red-600' : 'text-gray-600'}`}>
          {Math.min(100, Math.round(percentage))}%
        </Text>
      </View>
    </Pressable>
  );
};

/**
 * Recent Transactions Widget Component
 */
export const RecentTransactionsWidget: React.FC<{
  transactions: (Transaction & { categoryName?: string; categoryColor?: string })[];
  isLoading?: boolean;
}> = ({ transactions, isLoading = false }) => {
  if (transactions.length === 0) {
    return (
      <View className="rounded-xl overflow-hidden bg-blue-50 border border-blue-100 p-4">
        <View className="items-center">
          <Text className="text-sm font-semibold text-gray-900 mb-1">No Transactions Yet</Text>
          <Text className="text-xs text-gray-600 text-center mb-3">
            Start tracking your expenses to see them here
          </Text>
          <Pressable
            onPress={() => router.push('/transactions/add')}
            className="bg-blue-600 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-xs font-semibold text-white">Add Transaction</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="rounded-xl overflow-hidden bg-white border border-gray-100">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Text className="font-semibold text-gray-900">Recent Transactions</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/transactions')}
          className="flex-row items-center gap-1 active:opacity-60"
        >
          <Text className="text-xs font-semibold text-teal-600">View All</Text>
          <ChevronRight size={14} color="#0D9488" />
        </Pressable>
      </View>

      {/* Transactions List */}
      <View>
        {transactions.slice(0, 5).map((tx, idx) => {
          const IconComponent = getCategoryIcon(tx.categoryName || '');
          const bgColor = tx.categoryColor || '#F3F4F6';
          const textColor = getTransactionTypeColor(tx.type);

          return (
            <Pressable
              key={tx.id || idx}
              onPress={() => router.push(`/transactions/${tx.id}`)}
              className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 active:bg-gray-50"
            >
              <View className="flex-1 flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  <IconComponent size={18} color="#666" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    {tx.categoryName || 'Transaction'}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {formatRelativeDate(tx.date)}
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-bold" style={{ color: textColor }}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Accounts List Widget Component
 */
export const AccountsListWidget: React.FC<{ accounts: Account[]; isLoading?: boolean }> = ({
  accounts,
  isLoading = false,
}) => {
  const displayAccounts = accounts.slice(0, 4);

  if (accounts.length === 0) {
    return (
      <View className="rounded-xl overflow-hidden bg-amber-50 border border-amber-100 p-4">
        <View className="items-center">
          <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mb-2">
            <Wallet size={24} color="#B45309" />
          </View>
          <Text className="text-sm font-semibold text-gray-900 mb-1">No Accounts Yet</Text>
          <Text className="text-xs text-gray-600 text-center mb-3">
            Create your first account to start tracking
          </Text>
          <Pressable
            onPress={() => router.push('/accounts/add')}
            className="bg-amber-600 px-3 py-1.5 rounded-lg"
          >
            <Text className="text-xs font-semibold text-white">Add Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="rounded-xl overflow-hidden bg-white border border-gray-100">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Text className="font-semibold text-gray-900">Accounts</Text>
        {accounts.length > 4 && (
          <Pressable
            onPress={() => router.push('/accounts')}
            className="flex-row items-center gap-1 active:opacity-60"
          >
            <Text className="text-xs font-semibold text-teal-600">View All</Text>
            <ChevronRight size={14} color="#0D9488" />
          </Pressable>
        )}
      </View>

      {/* Accounts Grid */}
      <View className="p-4 gap-3">
        {displayAccounts.map((account) => (
          <Pressable
            key={account.id}
            onPress={() => router.push(`/accounts/${account.id}`)}
            className="rounded-lg bg-gray-50 border border-gray-100 p-3 active:bg-gray-100 flex-row items-center justify-between"
          >
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="font-semibold text-gray-900 flex-1">{account.name}</Text>
                {account.isDefault && (
                  <View className="bg-teal-100 px-2 py-0.5 rounded-full">
                    <Text className="text-xs font-semibold text-teal-700">Default</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-gray-500">{account.institution}</Text>
            </View>
            <Text className={`text-sm font-bold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(account.balance)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

/**
 * Budget 50/30/20 Breakdown Widget Component
 */
export const Budget50_30_20Widget: React.FC<{
  needsAllocated: number;
  needsSpent: number;
  wantsAllocated: number;
  wantsSpent: number;
  savingsAllocated: number;
  savingsSpent: number;
}> = ({ needsAllocated, needsSpent, wantsAllocated, wantsSpent, savingsAllocated, savingsSpent }) => {
  const categories = [
    {
      name: 'Needs (50%)',
      allocated: needsAllocated,
      spent: needsSpent,
      color: '#0D9488',
    },
    {
      name: 'Wants (30%)',
      allocated: wantsAllocated,
      spent: wantsSpent,
      color: '#3B82F6',
    },
    {
      name: 'Savings (20%)',
      allocated: savingsAllocated,
      spent: savingsSpent,
      color: '#10B981',
    },
  ];

  return (
    <View className="rounded-xl overflow-hidden bg-white border border-gray-100">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100">
        <Text className="font-semibold text-gray-900">Budget Breakdown</Text>
      </View>

      {/* Categories */}
      <View className="p-4 gap-4">
        {categories.map((category) => {
          const percentage = category.allocated > 0 ? (category.spent / category.allocated) * 100 : 0;
          const statusColor =
            percentage >= 100 ? '#EF4444' : percentage >= 90 ? '#F59E0B' : category.color;

          return (
            <View key={category.name}>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-semibold text-gray-900">{category.name}</Text>
                <Text className="text-sm font-bold text-gray-600">
                  {Math.round(percentage)}%
                </Text>
              </View>
              <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                <View
                  style={{
                    width: `${Math.min(100, percentage)}%`,
                    height: '100%',
                    backgroundColor: statusColor,
                  }}
                />
              </View>
              <Text className="text-xs text-gray-500">
                {formatCurrency(category.spent)} / {formatCurrency(category.allocated)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/**
 * Quick Actions Bar Component
 */
export const QuickActionsBar: React.FC = () => (
  <View className="flex-row gap-3">
    <Pressable
      onPress={() => router.push('/transactions/add?type=expense')}
      className="flex-1 rounded-lg bg-red-600 py-3 active:bg-red-700 items-center justify-center flex-row gap-2"
    >
      <Plus size={18} color="white" />
      <Text className="text-sm font-semibold text-white">Add Expense</Text>
    </Pressable>

    <Pressable
      onPress={() => router.push('/transactions/add?type=income')}
      className="flex-1 rounded-lg bg-green-600 py-3 active:bg-green-700 items-center justify-center flex-row gap-2"
    >
      <Plus size={18} color="white" />
      <Text className="text-sm font-semibold text-white">Add Income</Text>
    </Pressable>

    <Pressable
      onPress={() => router.push('/accounts/add')}
      className="flex-1 rounded-lg bg-teal-600 py-3 active:bg-teal-700 items-center justify-center flex-row gap-2"
    >
      <Plus size={18} color="white" />
      <Text className="text-sm font-semibold text-white">Add Account</Text>
    </Pressable>
  </View>
);
