import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { ContextLine } from '@/components/budget/ContextLine';
import { colors } from '@/lib/design-tokens';

/**
 * Test page for Context Line component
 * Verifies ultra-thin 2px progress bars with 4-tier color system
 */
export default function TestContextLinePage() {
  const testCases = [
    { percentUsed: 35, remaining: 650, label: 'Early in period - On Track' },
    { percentUsed: 75, remaining: 250, label: 'Mid period - Progressing Well' },
    { percentUsed: 92, remaining: 80, label: 'Late period - Nearly There' },
    { percentUsed: 105, remaining: -50, label: 'Over budget - Flow Adjusted' },
    { percentUsed: 0, remaining: 1000, label: 'Just started - Full budget' },
    { percentUsed: 100, remaining: 0, label: 'Exactly at limit' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Context Line Test',
          headerStyle: { backgroundColor: colors.contextDark },
          headerTintColor: '#fff',
        }}
      />
      <View className="flex-1 bg-context-dark">
        <ScrollView className="flex-1">
          <SafeAreaView edges={['bottom']} className="p-6 space-y-6">

            {/* Header */}
            <View className="mb-4">
              <Text className="text-white text-2xl font-bold mb-2">
                Context Line Component
              </Text>
              <Text className="text-white/60 text-base">
                Ultra-thin 2px progress indicators with calm colors
              </Text>
            </View>

            {/* Test Cases */}
            {testCases.map((test, idx) => (
              <View key={idx} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <Text className="text-white text-sm font-semibold mb-1">
                  {test.label}
                </Text>
                <Text className="text-white/60 text-xs mb-3">
                  {test.percentUsed}% used • {test.remaining > 0 ? `${test.remaining} CHF remaining` : `${Math.abs(test.remaining)} CHF over`}
                </Text>

                <ContextLine
                  percentUsed={test.percentUsed}
                  remaining={test.remaining}
                />
              </View>
            ))}

            {/* Visual Verification */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                ✓ Visual Verification
              </Text>

              <View className="space-y-2">
                <Text className="text-white/80 text-sm">
                  □ Line height is exactly 2px (ultra-thin)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Sage Green for 0-70% (ON TRACK)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Soft Amber for 70-90% (PROGRESSING WELL)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Deep Teal for 90-100% (NEARLY THERE)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Soft Lavender for 100%+ (FLOW ADJUSTED)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Status label matches color
                </Text>
                <Text className="text-white/80 text-sm">
                  □ "X left" uses tabular numbers
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Smooth 1s transition animation
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Rounded full ends
                </Text>
                <Text className="text-white/80 text-sm">
                  □ 9px uppercase labels
                </Text>
              </View>
            </View>

            {/* Color Reference */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-3">
                🎨 4-Tier Color System
              </Text>

              <View className="space-y-3">
                <View>
                  <View className="flex-row items-center mb-1">
                    <View className="w-12 h-12 bg-[#A8B5A1] rounded-lg mr-3" />
                    <View>
                      <Text className="text-white text-sm font-semibold">Sage Green</Text>
                      <Text className="text-white/60 text-xs">#A8B5A1 • 0-70%</Text>
                    </View>
                  </View>
                  <Text className="text-white/60 text-xs">
                    ON TRACK - You're doing great!
                  </Text>
                </View>

                <View>
                  <View className="flex-row items-center mb-1">
                    <View className="w-12 h-12 bg-[#D4A574] rounded-lg mr-3" />
                    <View>
                      <Text className="text-white text-sm font-semibold">Soft Amber</Text>
                      <Text className="text-white/60 text-xs">#D4A574 • 70-90%</Text>
                    </View>
                  </View>
                  <Text className="text-white/60 text-xs">
                    PROGRESSING WELL - Stay mindful
                  </Text>
                </View>

                <View>
                  <View className="flex-row items-center mb-1">
                    <View className="w-12 h-12 bg-[#2C5F5D] rounded-lg mr-3" />
                    <View>
                      <Text className="text-white text-sm font-semibold">Deep Teal</Text>
                      <Text className="text-white/60 text-xs">#2C5F5D • 90-100%</Text>
                    </View>
                  </View>
                  <Text className="text-white/60 text-xs">
                    NEARLY THERE - Almost at limit
                  </Text>
                </View>

                <View>
                  <View className="flex-row items-center mb-1">
                    <View className="w-12 h-12 bg-[#B4A7D6] rounded-lg mr-3" />
                    <View>
                      <Text className="text-white text-sm font-semibold">Soft Lavender</Text>
                      <Text className="text-white/60 text-xs">#B4A7D6 • 100%+</Text>
                    </View>
                  </View>
                  <Text className="text-white/60 text-xs">
                    FLOW ADJUSTED - Not a failure, just adjusted
                  </Text>
                </View>
              </View>
            </View>

            {/* Expected Visual */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-3">
                📐 Expected Visual (35% used)
              </Text>

              <Text className="text-white/60 text-xs font-mono mb-2">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </Text>
              <Text className="text-context-sage text-xs font-mono mb-2">
                ███████████━━━━━━━━━━━━━━━━━━━━━
              </Text>
              <Text className="text-white/60 text-xs font-mono mb-3">
                ↑ Ultra-thin 2px line (not chunky!)
              </Text>

              <View className="flex-row justify-between">
                <Text className="text-context-sage text-xs font-semibold">
                  ON TRACK
                </Text>
                <Text className="text-white/50 text-xs">
                  650.00 left
                </Text>
              </View>
            </View>

            {/* Philosophy */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <Text className="text-white text-lg font-semibold mb-3">
                💡 Design Philosophy
              </Text>

              <Text className="text-white/80 text-sm leading-6 mb-3">
                Context Lines replace anxiety-inducing red progress bars with a calm,
                empathetic 4-tier color system that provides guidance without judgment.
              </Text>

              <Text className="text-white/60 text-sm leading-6 mb-2">
                <Text className="text-white font-semibold">Why ultra-thin?</Text>
                {'\n'}Subtle 2px lines are glanceable without being overwhelming.
                They provide context without dominating the interface.
              </Text>

              <Text className="text-white/60 text-sm leading-6">
                <Text className="text-white font-semibold">Why no red?</Text>
                {'\n'}Red creates anxiety and shame. Our lavender "Flow Adjusted"
                reframes overspending as a natural part of financial management.
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
