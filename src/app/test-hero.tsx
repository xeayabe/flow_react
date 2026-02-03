import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { TruePositionHero } from '@/components/TruePositionHero';
import { colors } from '@/lib/design-tokens';

/**
 * Test page for TruePositionHero component
 * Shows multiple test cases with different net worth scenarios
 */
export default function TestHeroPage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Hero Card Test',
          headerStyle: { backgroundColor: colors.contextDark },
          headerTintColor: '#fff',
        }}
      />
      <View className="flex-1 bg-context-dark">
        <ScrollView className="flex-1">
          <SafeAreaView edges={['bottom']} className="p-6 space-y-8">

            {/* Header */}
            <View className="mb-4">
              <Text className="text-white text-2xl font-bold mb-2">
                Hero Card Test Cases
              </Text>
              <Text className="text-white/60 text-base">
                Testing TruePositionHero with different scenarios
              </Text>
            </View>

            {/* Test Case 1: Positive Net Worth */}
            <View>
              <View className="mb-3">
                <Text className="text-white text-sm font-semibold mb-1">
                  Test Case 1: Positive Net Worth
                </Text>
                <Text className="text-white/60 text-xs">
                  Assets &gt; Liabilities (typical healthy scenario)
                </Text>
              </View>
              <TruePositionHero
                netWorth={8707.96}
                assets={13648.51}
                liabilities={4940.55}
              />
            </View>

            {/* Test Case 2: Negative Net Worth */}
            <View>
              <View className="mb-3">
                <Text className="text-white text-sm font-semibold mb-1">
                  Test Case 2: Negative Net Worth
                </Text>
                <Text className="text-white/60 text-xs">
                  Liabilities &gt; Assets (debt scenario)
                </Text>
              </View>
              <TruePositionHero
                netWorth={-2500.00}
                assets={1500.00}
                liabilities={4000.00}
              />
            </View>

            {/* Test Case 3: Zero Net Worth */}
            <View>
              <View className="mb-3">
                <Text className="text-white text-sm font-semibold mb-1">
                  Test Case 3: Zero Net Worth
                </Text>
                <Text className="text-white/60 text-xs">
                  Assets = Liabilities (balanced scenario)
                </Text>
              </View>
              <TruePositionHero
                netWorth={0}
                assets={5000.00}
                liabilities={5000.00}
              />
            </View>

            {/* Test Case 4: Large Numbers */}
            <View>
              <View className="mb-3">
                <Text className="text-white text-sm font-semibold mb-1">
                  Test Case 4: Large Numbers
                </Text>
                <Text className="text-white/60 text-xs">
                  Testing Swiss formatting with large amounts
                </Text>
              </View>
              <TruePositionHero
                netWorth={1234567.89}
                assets={2000000.00}
                liabilities={765432.11}
              />
            </View>

            {/* Test Case 5: Small Numbers */}
            <View>
              <View className="mb-3">
                <Text className="text-white text-sm font-semibold mb-1">
                  Test Case 5: Small Numbers
                </Text>
                <Text className="text-white/60 text-xs">
                  Testing with small amounts
                </Text>
              </View>
              <TruePositionHero
                netWorth={123.45}
                assets={200.00}
                liabilities={76.55}
              />
            </View>

            {/* Test Case 6: No Liabilities */}
            <View>
              <View className="mb-3">
                <Text className="text-white text-sm font-semibold mb-1">
                  Test Case 6: No Liabilities
                </Text>
                <Text className="text-white/60 text-xs">
                  Pure assets, no debt
                </Text>
              </View>
              <TruePositionHero
                netWorth={50000.00}
                assets={50000.00}
                liabilities={0}
              />
            </View>

            {/* Visual Verification Checklist */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                ✓ Visual Verification Checklist
              </Text>

              <View className="space-y-2">
                <Text className="text-white/80 text-sm">
                  □ Swiss apostrophe separators (1'234.56)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Tabular numbers (digits aligned)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Teal gradient background
                </Text>
                <Text className="text-white/80 text-sm">
                  □ "TRUE POSITION" label uppercase
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Large net worth display (48px)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ CHF suffix in lighter weight
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Horizontal divider between sections
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Assets with + sign (white)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Liabilities with - sign (lavender)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Vertical divider between amounts
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Soft shadow for depth
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Rounded 3xl corners
                </Text>
              </View>
            </View>

            {/* Expected Visual Format */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-3">
                📐 Expected Visual Format
              </Text>

              <Text className="text-white/60 text-xs font-mono mb-2">
                ┌─────────────────────────────────────┐
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-2">
                │         TRUE POSITION               │
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-2">
                │                                     │
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-2">
                │      8'707.96  CHF                  │
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-2">
                │                                     │
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-2">
                │  ─────────────────────────────────  │
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-2">
                │                                     │
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-2">
                │   ASSETS         │    LIABILITIES   │
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-2">
                │  +13'648.51 CHF  │   -4'940.55 CHF  │
              </Text>
              <Text className="text-white/60 text-xs font-mono">
                └─────────────────────────────────────┘
              </Text>

              <Text className="text-white/40 text-xs mt-3">
                Note: Liabilities shown in lavender (#B4A7D6)
              </Text>
            </View>

            {/* Spacer */}
            <View className="h-8" />

          </SafeAreaView>
        </ScrollView>
      </View>
    </>
  );
}
