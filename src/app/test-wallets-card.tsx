import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { WalletsCard } from '@/components/dashboard/WalletsCard';
import { colors } from '@/lib/design-tokens';

// Mock wallet data for testing
interface WalletData {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  isDefault: boolean;
}

const mockWallets: WalletData[] = [
  {
    id: '1',
    name: 'Main Checking',
    institution: 'UBS',
    type: 'Checking',
    balance: 8547.32,
    isDefault: true,
  },
  {
    id: '2',
    name: 'Emergency Fund',
    institution: 'PostFinance',
    type: 'Savings',
    balance: 15000.00,
    isDefault: false,
  },
  {
    id: '3',
    name: 'Visa Platinum',
    institution: 'Credit Suisse',
    type: 'Credit Card',
    balance: -2340.50, // Negative balance (amount owed)
    isDefault: false,
  },
  {
    id: '4',
    name: 'Revolut',
    institution: 'Revolut',
    type: 'Checking',
    balance: 1250.00,
    isDefault: false,
  },
  {
    id: '5',
    name: 'Cash Wallet',
    institution: 'Cash',
    type: 'Cash',
    balance: 350.00,
    isDefault: false,
  },
  {
    id: '6',
    name: 'Amex Gold',
    institution: 'Other',
    type: 'Credit Card',
    balance: -890.25, // Another credit card with balance
    isDefault: false,
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
            <WalletsCard wallets={mockWallets} />

            {/* Empty state test */}
            <View className="mt-8">
              <Text className="text-white/90 text-lg font-semibold mb-2">
                Empty State
              </Text>
              <Text className="text-white/60 text-sm leading-5 mb-4">
                Shows when no accounts exist
              </Text>
              <WalletsCard wallets={[]} />
            </View>

            {/* Single account test */}
            <View className="mt-8">
              <Text className="text-white/90 text-lg font-semibold mb-2">
                Single Account
              </Text>
              <WalletsCard wallets={[mockWallets[0]]} />
            </View>

            {/* Bottom padding */}
            <View className="h-10" />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}
