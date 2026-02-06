import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { BudgetItem } from '@/components/budget/BudgetItem';
import { colors } from '@/lib/design-tokens';

/**
 * Test page for Budget Item component
 * Verifies glass cards with Context Lines and slide-in animations
 */
export default function TestBudgetItemPage() {
  const budgetCategories = [
    { emoji: '🛒', label: 'Groceries', spent: 450, allocated: 1000 },
    { emoji: '🚗', label: 'Transportation', spent: 780, allocated: 900 },
    { emoji: '🍽️', label: 'Dining Out', spent: 320, allocated: 400 },
    { emoji: '🎮', label: 'Entertainment', spent: 125, allocated: 200 },
    { emoji: '🏋️', label: 'Gym & Fitness', spent: 95, allocated: 100 },
    { emoji: '📱', label: 'Phone & Internet', spent: 55, allocated: 80 },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Budget Item Test',
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
                Budget Item Cards
              </Text>
              <Text className="text-white/60 text-base">
                Glass effect with Context Lines and animations
              </Text>
            </View>

            {/* Budget Items with Staggered Animation */}
            {budgetCategories.map((category, idx) => (
              <BudgetItem
                key={category.label}
                emoji={category.emoji}
                label={category.label}
                spent={category.spent}
                allocated={category.allocated}
                animationDelay={idx * 100} // Stagger by 100ms
              />
            ))}

            {/* Visual Verification */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-6">
              <Text className="text-white text-lg font-semibold mb-3">
                ✓ Visual Verification
              </Text>

              <View className="space-y-2">
                <Text className="text-white/80 text-sm">
                  □ Glass effect (white/3% background)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Subtle border (white/5%)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Slide-in animation from bottom
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Staggered animation (100ms delay each)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Emoji + label on left
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Spent/allocated on right (tabular)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Context Line shows correct color
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Status matches spending level
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Rounded xl corners (12px)
                </Text>
                <Text className="text-white/80 text-sm">
                  □ Proper spacing (16px padding)
                </Text>
              </View>
            </View>

            {/* Color Indicators */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                🎨 Color Indicators by Category
              </Text>

              <View className="space-y-3">
                <View>
                  <Text className="text-white text-sm font-semibold">
                    🛒 Groceries (45%)
                  </Text>
                  <Text className="text-context-sage text-xs">
                    → Sage Green • ON TRACK
                  </Text>
                </View>

                <View>
                  <Text className="text-white text-sm font-semibold">
                    🚗 Transportation (87%)
                  </Text>
                  <Text className="text-[#D4A574] text-xs">
                    → Soft Amber • PROGRESSING WELL
                  </Text>
                </View>

                <View>
                  <Text className="text-white text-sm font-semibold">
                    🍽️ Dining Out (80%)
                  </Text>
                  <Text className="text-[#D4A574] text-xs">
                    → Soft Amber • PROGRESSING WELL
                  </Text>
                </View>

                <View>
                  <Text className="text-white text-sm font-semibold">
                    🏋️ Gym & Fitness (95%)
                  </Text>
                  <Text className="text-context-teal text-xs">
                    → Deep Teal • NEARLY THERE
                  </Text>
                </View>
              </View>
            </View>

            {/* Animation Details */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                ✨ Animation Details
              </Text>

              <Text className="text-white/80 text-sm leading-6 mb-3">
                Each card slides in from 20px below with a fade-in effect.
                Cards are staggered by 100ms to create a smooth cascade.
              </Text>

              <View className="space-y-2">
                <Text className="text-white/60 text-sm">
                  • Duration: 500ms
                </Text>
                <Text className="text-white/60 text-sm">
                  • Easing: Ease-out
                </Text>
                <Text className="text-white/60 text-sm">
                  • Delay: 0ms, 100ms, 200ms, 300ms...
                </Text>
                <Text className="text-white/60 text-sm">
                  • Transform: translateY(20) → translateY(0)
                </Text>
                <Text className="text-white/60 text-sm">
                  • Opacity: 0 → 1
                </Text>
              </View>
            </View>

            {/* Expected Visual */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                📐 Expected Visual
              </Text>

              <View className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center">
                    <Text className="text-xl mr-2">🛒</Text>
                    <Text className="text-white text-sm font-medium">
                      Groceries
                    </Text>
                  </View>
                  <Text className="text-white/70 text-xs">
                    450.00 / 1'000.00
                  </Text>
                </View>

                <View className="h-[2px] bg-white/10 rounded-full mb-2">
                  <View
                    className="h-full bg-context-sage rounded-full"
                    style={{ width: '45%' }}
                  />
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-context-sage text-xs font-semibold">
                    ON TRACK
                  </Text>
                  <Text className="text-white/50 text-xs">
                    550.00 left
                  </Text>
                </View>
              </View>
            </View>

            {/* Glass Effect Details */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                🔮 Glassmorphism Details
              </Text>

              <Text className="text-white/80 text-sm leading-6 mb-3">
                Budget Item cards use subtle glassmorphism to create depth
                without overwhelming the interface.
              </Text>

              <View className="space-y-2">
                <Text className="text-white/60 text-sm">
                  • Background: white at 3% opacity
                </Text>
                <Text className="text-white/60 text-sm">
                  • Border: white at 5% opacity
                </Text>
                <Text className="text-white/60 text-sm">
                  • Shadow: Soft 8px blur
                </Text>
                <Text className="text-white/60 text-sm">
                  • Backdrop blur: Ready for iOS
                </Text>
                <Text className="text-white/60 text-sm">
                  • Rounded corners: 12px (xl)
                </Text>
              </View>
            </View>

            {/* Usage Example */}
            <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <Text className="text-white text-lg font-semibold mb-3">
                💻 Usage Example
              </Text>

              <View className="bg-black/30 rounded-lg p-3">
                <Text className="text-white/80 text-xs font-mono leading-5">
                  {`<BudgetItem
  emoji="🛒"
  label="Groceries"
  spent={450}
  allocated={1000}
  animationDelay={0}
/>`}
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
