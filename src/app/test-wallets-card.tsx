import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { WalletsCard } from '@/components/wallets';
import { colors } from '@/lib/design-tokens';
import type { Account } from '@/lib/accounts-api';

// Mock data for testing - includes various account types and balances
const mockAccounts: Account[] = [
  {
    id: '1',
    userId: 'user1',
    householdId: 'household1',
    name: 'Main Checking',
    institution: 'UBS',
    accountType: 'Checking',
    balance: 8547.32,
    startingBalance: 5000,
    currency: 'CHF',
    last4Digits: '4523',
    isDefault: true,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '2',
    userId: 'user1',
    householdId: 'household1',
    name: 'Emergency Fund',
    institution: 'PostFinance',
    accountType: 'Savings',
    balance: 15000.00,
    startingBalance: 10000,
    currency: 'CHF',
    isDefault: false,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '3',
    userId: 'user1',
    householdId: 'household1',
    name: 'Visa Platinum',
    institution: 'Credit Suisse',
    accountType: 'Credit Card',
    balance: -2340.50, // Negative balance (amount owed)
    startingBalance: 0,
    currency: 'CHF',
    last4Digits: '8901',
    isDefault: false,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '4',
    userId: 'user1',
    householdId: 'household1',
    name: 'Revolut',
    institution: 'Revolut',
    accountType: 'Checking',
    balance: 1250.00,
    startingBalance: 500,
    currency: 'CHF',
    isDefault: false,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '5',
    userId: 'user1',
    householdId: 'household1',
    name: 'Cash Wallet',
    institution: 'Cash',
    accountType: 'Cash',
    balance: 350.00,
    startingBalance: 200,
    currency: 'CHF',
    isDefault: false,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '6',
    userId: 'user1',
    householdId: 'household1',
    name: 'Amex Gold',
    institution: 'Other',
    accountType: 'Credit Card',
    balance: -890.25, // Another credit card with balance
    startingBalance: 0,
    currency: 'CHF',
    last4Digits: '1234',
    isDefault: false,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export default function TestWalletsCard() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Wallets Card Test',
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
                Wallets Card Component
              </Text>
              <Text className="text-white/60 text-sm leading-5">
                Collapsible card showing all wallets. Tap the header to expand/collapse.
                Note: Negative balances use neutral gray color instead of red.
              </Text>
            </View>

            {/* Wallets Card */}
            <WalletsCard
              accounts={mockAccounts}
              onAccountPress={(account) => {
                console.log('Account pressed:', account.name);
              }}
            />

            {/* Empty state test */}
            <View className="mt-8">
              <Text className="text-white/90 text-lg font-semibold mb-2">
                Empty State
              </Text>
              <Text className="text-white/60 text-sm leading-5 mb-4">
                Shows when no accounts exist
              </Text>
              <WalletsCard accounts={[]} />
            </View>

            {/* Single account test */}
            <View className="mt-8">
              <Text className="text-white/90 text-lg font-semibold mb-2">
                Single Account
              </Text>
              <WalletsCard accounts={[mockAccounts[0]]} />
            </View>

            {/* Bottom padding */}
            <View className="h-10" />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}
