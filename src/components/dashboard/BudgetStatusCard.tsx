import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { TrendingUp, ChevronDown } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/Glass';
import { BudgetGroupItem } from '@/components/budget/BudgetGroupItem';
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
  categoryGroupIcon?: string;
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

// Default group configuration with sort order (fallback for standard groups)
const DEFAULT_GROUP_CONFIG: Record<string, { order: number }> = {
  'Needs': { order: 1 },
  'needs': { order: 1 },
  'Wants': { order: 2 },
  'wants': { order: 2 },
  'Savings': { order: 3 },
  'savings': { order: 3 },
  'Other': { order: 99 },
  'other': { order: 99 },
};

/**
 * Budget Status Card - Collapsible card showing all budget categories
 * Groups budgets by Needs/Wants/Savings with individually collapsible group cards
 */
export function BudgetStatusCard({ budgets, summaryTotals }: BudgetStatusCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Use summary totals if provided (from budgetSummary table), otherwise calculate from budgets
  const totalAllocated = summaryTotals
    ? Math.round(summaryTotals.totalAllocated * 100) / 100
    : Math.round(budgets.reduce((sum, b) => sum + b.allocatedAmount, 0) * 100) / 100;
  const totalSpent = summaryTotals
    ? Math.round(summaryTotals.totalSpent * 100) / 100
    : Math.round(budgets.reduce((sum, b) => sum + b.spentAmount, 0) * 100) / 100;
  const totalRemaining = Math.round((totalAllocated - totalSpent) * 100) / 100;

  // Group budgets by category group (display name from database)
  const groupedBudgets = budgets.reduce((groups, budget) => {
    const group = budget.categoryGroup || 'Other';
    if (!groups[group]) {
      groups[group] = {
        items: [],
        icon: budget.categoryGroupIcon,
      };
    }
    groups[group].items.push(budget);
    return groups;
  }, {} as Record<string, { items: Budget[]; icon?: string }>);

  // Sort groups by defined order (standard groups first, then custom by name)
  const sortedGroups = Object.entries(groupedBudgets)
    .map(([groupName, data]) => {
      const defaultConfig = DEFAULT_GROUP_CONFIG[groupName];
      return {
        groupName,
        order: defaultConfig?.order || 50,
        totalSpent: data.items.reduce((sum, b) => sum + b.spentAmount, 0),
        totalAllocated: data.items.reduce((sum, b) => sum + b.allocatedAmount, 0),
        items: data.items,
      };
    })
    .sort((a, b) => a.order - b.order || a.groupName.localeCompare(b.groupName));

  const toggleOpen = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setIsOpen(!isOpen);
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: prev[groupName] === undefined ? false : !prev[groupName],
    }));
  };

  // Check if a group is open (default to false - collapsed by default)
  const isGroupOpen = (groupName: string) => openGroups[groupName] === true;

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
          className="px-5 pb-5 pt-2"
          style={{
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <View className="gap-3">
            {sortedGroups.map((group, groupIndex) => (
              <BudgetGroupItem
                key={group.groupName}
                groupName={group.groupName}
                categories={group.items.map(item => ({
                  id: item.id,
                  categoryName: item.categoryName,
                  categoryEmoji: item.categoryEmoji,
                  allocatedAmount: item.allocatedAmount,
                  spentAmount: item.spentAmount,
                }))}
                totalSpent={group.totalSpent}
                totalAllocated={group.totalAllocated}
                isOpen={isGroupOpen(group.groupName)}
                onToggle={() => toggleGroup(group.groupName)}
                animationDelay={groupIndex * 100}
              />
            ))}
          </View>

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
