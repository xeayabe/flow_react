import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { BudgetStatusCard } from '@/components/dashboard/BudgetStatusCard';
import { colors } from '@/lib/design-tokens';

/**
 * Test page for Budget Status Card component
 * Verifies collapsible glass card with grouped budget items
 */
export default function TestBudgetStatusPage() {
  // Mock budget data with various spending levels
  const budgets = [
    {
      id: '1',
      categoryName: 'Groceries',
      categoryEmoji: '🛒',
      categoryGroup: 'Essential',
      allocatedAmount: 1000,
      spentAmount: 450,
    },
    {
      id: '2',
      categoryName: 'Transportation',
      categoryEmoji: '🚗',
      categoryGroup: 'Essential',
      allocatedAmount: 900,
      spentAmount: 780,
    },
    {
      id: '3',
      categoryName: 'Utilities',
      categoryEmoji: '💡',
      categoryGroup: 'Essential',
      allocatedAmount: 300,
      spentAmount: 285,
    },
    {
      id: '4',
      categoryName: 'Dining Out',
      categoryEmoji: '🍽️',
      categoryGroup: 'Lifestyle',
      allocatedAmount: 400,
      spentAmount: 320,
    },
    {
      id: '5',
      categoryName: 'Entertainment',
      categoryEmoji: '🎮',
      categoryGroup: 'Lifestyle',
      allocatedAmount: 200,
      spentAmount: 125,
    },
    {
      id: '6',
      categoryName: 'Gym & Fitness',
      categoryEmoji: '🏋️',
      categoryGroup: 'Lifestyle',
      allocatedAmount: 100,
      spentAmount: 95,
    },
    {
      id: '7',
      categoryName: 'Phone & Internet',
      categoryEmoji: '📱',
      categoryGroup: 'Bills',
      allocatedAmount: 80,
      spentAmount: 55,
    },
    {
      id: '8',
      categoryName: 'Insurance',
      categoryEmoji: '🛡️',
      categoryGroup: 'Bills',
      allocatedAmount: 250,
      spentAmount: 250,
    },
  ];

  // Calculate totals for reference
  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Budget Status Test',
          headerStyle: { backgroundColor: colors.contextDark },
          headerTintColor: '#fff',
        }}
      />
      <View className="flex-1 bg-context-dark">
        <ScrollView className="flex-1">
          <SafeAreaView edges={['bottom']} className="p-6">

            {/* Header */}
            <View className="mb-6">
              <Text className="text-white text-2xl font-bold mb-2">
                Budget Status Card
              </Text>
              <Text className="text-white/60 text-base">
                Collapsible glass card with grouped budget categories
              </Text>
            </View>

            {/* Budget Status Card - With Data */}
            <BudgetStatusCard budgets={budgets} />

            {/* Summary Stats */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-6">
              <Text className="text-white text-lg font-semibold mb-3">
                📊 Budget Summary
              </Text>

              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-white/60 text-sm">Total Allocated:</Text>
                  <Text className="text-white text-sm font-semibold">
                    {totalAllocated.toLocaleString('de-CH')} CHF
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-white/60 text-sm">Total Spent:</Text>
                  <Text className="text-white text-sm font-semibold">
                    {totalSpent.toLocaleString('de-CH')} CHF
                  </Text>
                </View>

                <View className="h-px bg-white/10 my-2" />

                <View className="flex-row justify-between">
                  <Text className="text-white text-sm font-semibold">Remaining:</Text>
                  <Text
                    className="text-sm font-bold"
                    style={{
                      color: totalRemaining >= 0 ? colors.contextSage : colors.contextLavender,
                    }}
                  >
                    {totalRemaining >= 0 ? '+' : ''}
                    {totalRemaining.toLocaleString('de-CH')} CHF
                  </Text>
                </View>

                <View className="mt-3 pt-3 border-t border-white/10">
                  <Text className="text-white/60 text-xs">
                    Overall: {((totalSpent / totalAllocated) * 100).toFixed(0)}% used
                  </Text>
                </View>
              </View>
            </View>

            {/* Category Breakdown */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                📁 Category Groups
              </Text>

              <View className="space-y-3">
                <View>
                  <Text className="text-white text-sm font-semibold mb-1">
                    Essential (3 categories)
                  </Text>
                  <Text className="text-white/60 text-xs">
                    Groceries, Transportation, Utilities
                  </Text>
                </View>

                <View>
                  <Text className="text-white text-sm font-semibold mb-1">
                    Lifestyle (3 categories)
                  </Text>
                  <Text className="text-white/60 text-xs">
                    Dining Out, Entertainment, Gym & Fitness
                  </Text>
                </View>

                <View>
                  <Text className="text-white text-sm font-semibold mb-1">
                    Bills (2 categories)
                  </Text>
                  <Text className="text-white/60 text-xs">
                    Phone & Internet, Insurance
                  </Text>
                </View>
              </View>
            </View>

            {/* Visual Verification */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                ✓ Visual Verification
              </Text>

              <View className="space-y-2">
                <Text className="text-white/80 text-sm">
                  □ Glass card with subtle border
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Header shows "Budget Status" with icon
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Total remaining displays with dynamic color
                </Text>
                <Text className="text-white/80 text-sm">
                  □ ChevronDown rotates when clicked
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Smooth collapse/expand animation
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Budget items appear with stagger
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Each item shows emoji + name + amounts
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Context Lines display correct colors
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Categories grouped correctly
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Pressable header responds to touch
                </Text>
              </View>
            </View>

            {/* Animation Details */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                ✨ Animation Details
              </Text>

              <Text className="text-white/80 text-sm leading-6 mb-3">
                The card uses LayoutAnimation for smooth collapse/expand,
                and each budget item slides in with a 50ms stagger.
              </Text>

              <View className="space-y-2">
                <Text className="text-white/60 text-sm">
                  • Collapse: 300ms easeInEaseOut
                </Text>
                <Text className="text-white/60 text-sm">
                  • ChevronDown: Rotates 180° smoothly
                </Text>
                <Text className="text-white/60 text-sm">
                  • Budget Items: Staggered 50ms delay
                </Text>
                <Text className="text-white/60 text-sm">
                  • Each item: 500ms slide-in from below
                </Text>
                <Text className="text-white/60 text-sm">
                  • Header press: Subtle background highlight
                </Text>
              </View>
            </View>

            {/* Empty State Test */}
            <View className="mt-6">
              <Text className="text-white text-lg font-semibold mb-3">
                Empty State Preview
              </Text>
              <BudgetStatusCard budgets={[]} />
            </View>

            {/* Usage Example */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                💻 Usage Example
              </Text>

              <View className="bg-black/30 rounded-lg p-3">
                <Text className="text-white/80 text-xs font-mono leading-5">
                  {`<BudgetStatusCard
  budgets={[
    {
      id: '1',
      categoryName: 'Groceries',
      categoryEmoji: '🛒',
      categoryGroup: 'Essential',
      allocatedAmount: 1000,
      spentAmount: 450,
    },
    // ... more budgets
  ]}
/>`}
                </Text>
              </View>
            </View>

            {/* Integration Notes */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                🔗 Integration Notes
              </Text>

              <Text className="text-white/80 text-sm leading-6 mb-3">
                This component is ready to integrate into your dashboard.
                Connect it to your budget data source:
              </Text>

              <View className="space-y-2">
                <Text className="text-white/60 text-sm">
                  1. Fetch budgets from InstantDB
                </Text>
                <Text className="text-white/60 text-sm">
                  2. Transform data to Budget interface
                </Text>
                <Text className="text-white/60 text-sm">
                  3. Pass to BudgetStatusCard component
                </Text>
                <Text className="text-white/60 text-sm">
                  4. Component handles grouping & display
                </Text>
                <Text className="text-white/60 text-sm">
                  5. Users can collapse/expand as needed
                </Text>
              </View>
            </View>

            {/* Spacer */}
            <View className="h-8" />

          </SafeAreaView>
        </ScrollView>
      </View>
    </>
  );
}
