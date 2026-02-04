import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { RecentTransactionsCard } from '@/components/transactions/RecentTransactionsCard';
import { colors } from '@/lib/design-tokens';

// Get today's date for realistic mock data
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);

// Mock transaction data
interface Transaction {
  id: string;
  name: string;
  emoji: string;
  category: string;
  amount: number;
  date: string;
  isShared?: boolean;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    name: 'Migros',
    emoji: '🛒',
    category: 'Groceries',
    amount: -87.50,
    date: today.toISOString(),
    isShared: true,
  },
  {
    id: '2',
    name: 'SBB Monthly Pass',
    emoji: '🚆',
    category: 'Transport',
    amount: -220.00,
    date: today.toISOString(),
  },
  {
    id: '3',
    name: 'Coffee at Starbucks',
    emoji: '☕',
    category: 'Dining',
    amount: -6.50,
    date: yesterday.toISOString(),
  },
  {
    id: '4',
    name: 'Salary',
    emoji: '💰',
    category: 'Income',
    amount: 8500.00,
    date: yesterday.toISOString(),
  },
  {
    id: '5',
    name: 'Electricity Bill',
    emoji: '⚡',
    category: 'Utilities',
    amount: -145.30,
    date: twoDaysAgo.toISOString(),
    isShared: true,
  },
  {
    id: '6',
    name: 'Netflix',
    emoji: '🎬',
    category: 'Entertainment',
    amount: -17.90,
    date: twoDaysAgo.toISOString(),
  },
  {
    id: '7',
    name: 'Dinner at Restaurant',
    emoji: '🍽️',
    category: 'Dining',
    amount: -85.00,
    date: lastWeek.toISOString(),
    isShared: true,
  },
  {
    id: '8',
    name: 'Gym Membership',
    emoji: '🏋️',
    category: 'Health',
    amount: -79.00,
    date: lastWeek.toISOString(),
  },
  {
    id: '9',
    name: 'Phone Bill',
    emoji: '📱',
    category: 'Utilities',
    amount: -45.00,
    date: lastWeek.toISOString(),
  },
  {
    id: '10',
    name: 'Freelance Payment',
    emoji: '💼',
    category: 'Income',
    amount: 500.00,
    date: lastWeek.toISOString(),
  },
];

export default function TestTransactionsCard() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Transactions Card Test',
          headerStyle: { backgroundColor: colors.contextDark },
          headerTintColor: '#fff',
        }}
      />
      <LinearGradient
        colors={[colors.contextDark, '#2C5F5D']}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1" edges={['bottom']}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Description */}
            <View className="mb-6">
              <Text className="text-white/90 text-lg font-semibold mb-2">
                Recent Transactions Card
              </Text>
              <Text className="text-white/60 text-sm leading-5">
                Collapsible card showing recent transactions. Tap header to expand/collapse.
                Note: Expense amounts use neutral white/gray, NOT red.
              </Text>
            </View>

            {/* Transactions Card */}
            <RecentTransactionsCard transactions={mockTransactions} />

            {/* Empty state test */}
            <View className="mt-8">
              <Text className="text-white/90 text-lg font-semibold mb-2">
                Empty State
              </Text>
              <Text className="text-white/60 text-sm leading-5 mb-4">
                Shows when no transactions exist
              </Text>
              <RecentTransactionsCard transactions={[]} />
            </View>

            {/* Color Reference */}
            <View className="mt-8 p-4 bg-white/5 rounded-xl">
              <Text className="text-white/90 font-semibold mb-3">
                CRITICAL: Color Usage
              </Text>
              <View className="gap-2">
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}
                  />
                  <Text className="text-white/60 text-xs">
                    Expenses: Neutral white (rgba 0.85) - NO RED!
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colors.contextSage }}
                  />
                  <Text className="text-white/60 text-xs">
                    Income: Sage Green (#A8B5A1)
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: colors.contextTeal }}
                  />
                  <Text className="text-white/60 text-xs">
                    Shared badge: Teal (#2C5F5D)
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom padding */}
            <View className="h-10" />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}
