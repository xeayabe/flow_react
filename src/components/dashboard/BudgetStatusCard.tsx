import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { TrendingUp, ChevronDown } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/Glass';
import { BudgetItem } from '@/components/budget/BudgetItem';
import { formatCurrency } from '@/lib/formatCurrency';
import { colors } from '@/lib/design-tokens';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Budget {
  id: string;
  categoryName: string;
  categoryEmoji?: string;
  categoryGroup: string;
  allocatedAmount: number;
  spentAmount: number;
}

interface SummaryTotals {
  totalAllocated: number;
  totalSpent: number;
}

interface BudgetStatusCardProps {
  budgets: Budget[];
  /** Optional summary totals from budgetSummary table (more accurate than calculating from budgets) */
  summaryTotals?: SummaryTotals;
}

// Group configuration with emojis and sort order
const GROUP_CONFIG: Record<string, { emoji: string; order: number }> = {
  'Needs': { emoji: '🏠', order: 1 },
  'Wants': { emoji: '🎯', order: 2 },
  'Savings': { emoji: '💰', order: 3 },
  'Other': { emoji: '📊', order: 4 },
};

/**
 * Budget Status Card - Collapsible card showing all budget categories
 * Groups budgets by Needs/Wants/Savings and shows total remaining amount
 */
export function BudgetStatusCard({ budgets, summaryTotals }: BudgetStatusCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Use summary totals if provided (from budgetSummary table), otherwise calculate from budgets
  // This ensures the remaining amount matches the Budget screen exactly
  const totalAllocated = summaryTotals
    ? Math.round(summaryTotals.totalAllocated * 100) / 100
    : Math.round(budgets.reduce((sum, b) => sum + b.allocatedAmount, 0) * 100) / 100;
  const totalSpent = summaryTotals
    ? Math.round(summaryTotals.totalSpent * 100) / 100
    : Math.round(budgets.reduce((sum, b) => sum + b.spentAmount, 0) * 100) / 100;
  const totalRemaining = Math.round((totalAllocated - totalSpent) * 100) / 100;

  // Group budgets by category group (Needs, Wants, Savings)
  const groupedBudgets = budgets.reduce((groups, budget) => {
    const group = budget.categoryGroup || 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(budget);
    return groups;
  }, {} as Record<string, Budget[]>);

  // Sort groups by defined order
  const sortedGroups = Object.entries(groupedBudgets)
    .map(([groupName, items]) => ({
      groupName,
      emoji: GROUP_CONFIG[groupName]?.emoji || '📊',
      order: GROUP_CONFIG[groupName]?.order || 999,
      totalSpent: items.reduce((sum, b) => sum + b.spentAmount, 0),
      totalAllocated: items.reduce((sum, b) => sum + b.allocatedAmount, 0),
      items,
    }))
    .sort((a, b) => a.order - b.order);

  const toggleOpen = () => {
    // Animate the layout change
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setIsOpen(!isOpen);
  };

  return (
    <GlassCard hover={false}>
      {/* Header */}
      <Pressable
        onPress={toggleOpen}
        className="w-full flex-row justify-between items-center p-5"
        style={({ pressed }) => ({
          backgroundColor: pressed ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        })}
      >
        <View className="flex-row items-center">
          <TrendingUp
            size={20}
            color={colors.contextSage}
            strokeWidth={1.5}
          />
          <Text
            className="text-white font-medium ml-3"
            style={{
              fontSize: 15,
              letterSpacing: 0.5,
            }}
          >
            Budget Status
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text
            className="font-medium mr-3"
            style={{
              fontSize: 14,
              color: totalRemaining >= 0 ? colors.contextSage : colors.contextLavender,
              fontVariant: ['tabular-nums'],
            }}
          >
            {totalRemaining >= 0 ? '+' : ''}{formatCurrency(totalRemaining, { showCurrency: false })}
          </Text>
          <ChevronDown
            size={16}
            color="white"
            strokeWidth={1.5}
            style={{
              transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
            }}
          />
        </View>
      </Pressable>

      {/* Collapsible Content */}
      {isOpen && (
        <View
          className="px-5 pb-5 pt-4"
          style={{
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          {sortedGroups.map((group, groupIndex) => (
            <Animated.View
              key={group.groupName}
              entering={FadeInDown.delay(groupIndex * 100).duration(300)}
              className="mb-5"
              style={{ marginBottom: groupIndex === sortedGroups.length - 1 ? 0 : 20 }}
            >
              {/* Group Header */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">{group.emoji}</Text>
                  <Text
                    className="text-white/70 font-semibold"
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 1.5,
                    }}
                  >
                    {group.groupName}
                  </Text>
                </View>
                <Text
                  className="text-white/50"
                  style={{
                    fontSize: 11,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatCurrency(group.totalSpent, { showCurrency: false })} / {formatCurrency(group.totalAllocated, { showCurrency: false })}
                </Text>
              </View>

              {/* Individual budget items in this group */}
              {group.items.map((budget, itemIndex) => (
                <BudgetItem
                  key={budget.id}
                  emoji={budget.categoryEmoji || '📊'}
                  label={budget.categoryName}
                  spent={budget.spentAmount}
                  allocated={budget.allocatedAmount}
                  animationDelay={groupIndex * 100 + itemIndex * 50}
                />
              ))}
            </Animated.View>
          ))}

          {/* Empty state */}
          {budgets.length === 0 && (
            <View className="items-center py-8">
              <Text className="text-white/50 text-sm text-center">
                No budget categories yet. Create your first budget!
              </Text>
            </View>
          )}
        </View>
      )}
    </GlassCard>
  );
}
