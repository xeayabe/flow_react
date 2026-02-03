import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { HouseholdBalanceWidget } from '@/components/dashboard/HouseholdBalanceWidget';
import { colors } from '@/lib/design-tokens';

/**
 * Test page for Household Balance Widget
 * Shows debt scenarios and animation behavior
 */
export default function TestHouseholdBalancePage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Household Balance Test',
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
                Household Balance Widget
              </Text>
              <Text className="text-white/60 text-base">
                Prominent debt indicator with pulsing animation
              </Text>
            </View>

            {/* Test Case 1: Partner owes you */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">
                📊 Scenario 1: Partner Owes You
              </Text>
              <HouseholdBalanceWidget
                debtAmount={347.85}
                partnerName="Sarah"
                yourSplitRatio={59}
                partnerSplitRatio={41}
                hasUnsettledExpenses={true}
              />
            </View>

            {/* Test Case 2: You owe partner */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">
                📊 Scenario 2: You Owe Partner
              </Text>
              <HouseholdBalanceWidget
                debtAmount={-524.20}
                partnerName="Michael"
                yourSplitRatio={45}
                partnerSplitRatio={55}
                hasUnsettledExpenses={true}
              />
            </View>

            {/* Test Case 3: Large debt amount */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">
                📊 Scenario 3: Large Debt (Swiss Formatting)
              </Text>
              <HouseholdBalanceWidget
                debtAmount={2847.65}
                partnerName="Emma"
                yourSplitRatio={60}
                partnerSplitRatio={40}
                hasUnsettledExpenses={true}
              />
            </View>

            {/* Test Case 4: Small debt (should still show) */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">
                📊 Scenario 4: Small Debt
              </Text>
              <HouseholdBalanceWidget
                debtAmount={-12.50}
                partnerName="Lucas"
                yourSplitRatio={50}
                partnerSplitRatio={50}
                hasUnsettledExpenses={true}
              />
            </View>

            {/* Test Case 5: No unsettled expenses (should not render) */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">
                📊 Scenario 5: No Unsettled Expenses (Hidden)
              </Text>
              <HouseholdBalanceWidget
                debtAmount={250.00}
                partnerName="Alex"
                yourSplitRatio={55}
                partnerSplitRatio={45}
                hasUnsettledExpenses={false}
              />
              <View className="bg-white/5 rounded-xl p-3 border border-white/10">
                <Text className="text-white/60 text-sm text-center">
                  ↑ Component should not render (hasUnsettledExpenses = false)
                </Text>
              </View>
            </View>

            {/* Test Case 6: Zero debt (should not render) */}
            <View className="mb-6">
              <Text className="text-white text-lg font-semibold mb-3">
                📊 Scenario 6: Zero Debt (Hidden)
              </Text>
              <HouseholdBalanceWidget
                debtAmount={0}
                partnerName="Jordan"
                yourSplitRatio={50}
                partnerSplitRatio={50}
                hasUnsettledExpenses={true}
              />
              <View className="bg-white/5 rounded-xl p-3 border border-white/10">
                <Text className="text-white/60 text-sm text-center">
                  ↑ Component should not render (debtAmount = 0)
                </Text>
              </View>
            </View>

            {/* Visual Verification */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                ✓ Visual Verification
              </Text>

              <View className="space-y-2">
                <Text className="text-white/80 text-sm">
                  □ Glass card with subtle border and shadow
                </Text>
                <Text className="text-white/80 text-sm">
                  □ "HOUSEHOLD BALANCE" label in uppercase
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Split ratio displayed (e.g., "59% / 41%")
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Status text shows who owes whom
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Large amount in Swiss format (apostrophes)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Tabular numbers prevent jitter
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Primary teal button with shadow
                </Text>
                <Text className="text-white/80 text-sm">
                  □ "Shared expenses split..." note at bottom
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Pulsing glow animation for 10 seconds
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Animation stops after 10s
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Button press stops animation
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Navigates to /settle on press
                </Text>
              </View>
            </View>

            {/* Animation Details */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                ✨ Animation Details
              </Text>

              <Text className="text-white/80 text-sm leading-6 mb-3">
                The widget uses React Native Reanimated for smooth pulsing glow
                that draws attention to unsettled household debt.
              </Text>

              <View className="space-y-2">
                <Text className="text-white/60 text-sm">
                  • Pulse: Opacity 1 → 0.6 → 1 over 3 seconds
                </Text>
                <Text className="text-white/60 text-sm">
                  • Scale: Subtle 2% scale variation
                </Text>
                <Text className="text-white/60 text-sm">
                  • Duration: Repeats 3 times (~9 seconds)
                </Text>
                <Text className="text-white/60 text-sm">
                  • Auto-stop: After 10 seconds
                </Text>
                <Text className="text-white/60 text-sm">
                  • Manual stop: On button press
                </Text>
              </View>
            </View>

            {/* Conditional Rendering Logic */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                🔍 Conditional Rendering
              </Text>

              <Text className="text-white/80 text-sm leading-6 mb-3">
                The widget only appears when:
              </Text>

              <View className="space-y-2">
                <Text className="text-white/60 text-sm">
                  1. hasUnsettledExpenses = true
                </Text>
                <Text className="text-white/60 text-sm">
                  2. Math.abs(debtAmount) {'>'} 0.01 CHF
                </Text>
                <Text className="text-white/60 text-sm">
                  (Hidden when debt is settled or essentially zero)
                </Text>
              </View>
            </View>

            {/* Debt Direction */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                💰 Debt Direction
              </Text>

              <View className="space-y-3">
                <View>
                  <Text className="text-white text-sm font-semibold mb-1">
                    Positive debtAmount (+347.85):
                  </Text>
                  <Text className="text-white/60 text-xs">
                    "Sarah owes you 347.85 CHF"
                  </Text>
                </View>

                <View>
                  <Text className="text-white text-sm font-semibold mb-1">
                    Negative debtAmount (-524.20):
                  </Text>
                  <Text className="text-white/60 text-xs">
                    "You owe Michael 524.20 CHF"
                  </Text>
                </View>

                <View className="mt-2 pt-3 border-t border-white/10">
                  <Text className="text-white/60 text-xs">
                    Display always shows absolute value with clear direction
                  </Text>
                </View>
              </View>
            </View>

            {/* Usage Example */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                💻 Usage Example
              </Text>

              <View className="bg-black/30 rounded-lg p-3">
                <Text className="text-white/80 text-xs font-mono leading-5">
                  {`<HouseholdBalanceWidget
  debtAmount={347.85}
  partnerName="Sarah"
  yourSplitRatio={59}
  partnerSplitRatio={41}
  hasUnsettledExpenses={true}
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
                This widget should be integrated into the dashboard to show
                household debt at a glance.
              </Text>

              <View className="space-y-2">
                <Text className="text-white/60 text-sm">
                  1. Fetch household debt data from InstantDB
                </Text>
                <Text className="text-white/60 text-sm">
                  2. Calculate debtAmount (positive/negative)
                </Text>
                <Text className="text-white/60 text-sm">
                  3. Get partner name and split ratios
                </Text>
                <Text className="text-white/60 text-sm">
                  4. Check if there are unsettled expenses
                </Text>
                <Text className="text-white/60 text-sm">
                  5. Widget auto-hides when debt is zero
                </Text>
                <Text className="text-white/60 text-sm">
                  6. Button navigates to /settle screen
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
