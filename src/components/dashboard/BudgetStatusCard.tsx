import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { TrendingUp, ChevronDown } from 'lucide-react-native';
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

/**
 * Budget Status Card - Collapsible card showing all budget categories
 * Groups budgets and shows total remaining amount
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

  // Group budgets by category group
  const groupedBudgets = budgets.reduce((groups, budget) => {
    const group = budget.categoryGroup || 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(budget);
    return groups;
  }, {} as Record<string, Budget[]>);

  // Calculate group totals for display
  const groupTotals = Object.entries(groupedBudgets).map(([groupName, items]) => ({
    groupName,
    totalSpent: items.reduce((sum, b) => sum + b.spentAmount, 0),
    totalAllocated: items.reduce((sum, b) => sum + b.allocatedAmount, 0),
    items,
  }));

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
        <View className="px-5 pb-5 border-t border-white/5 pt-4">
          {groupTotals.map((group, groupIndex) => (
            <View key={group.groupName}>
              {/* Group items */}
              {group.items.map((budget, itemIndex) => (
                <BudgetItem
                  key={budget.id}
                  emoji={budget.categoryEmoji || '📊'}
                  label={budget.categoryName}
                  spent={budget.spentAmount}
                  allocated={budget.allocatedAmount}
                  animationDelay={groupIndex * 50 + itemIndex * 50}
                />
              ))}
            </View>
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
