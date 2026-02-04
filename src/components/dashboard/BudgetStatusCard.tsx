import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { TrendingUp, ChevronDown, ChevronRight } from 'lucide-react-native';
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
 * Groups budgets by Needs/Wants/Savings with individually collapsible groups
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
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: prev[groupName] === undefined ? false : !prev[groupName],
    }));
  };

  // Check if a group is open (default to true)
  const isGroupOpen = (groupName: string) => openGroups[groupName] !== false;

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
          {sortedGroups.map((group, groupIndex) => {
            const groupOpen = isGroupOpen(group.groupName);

            return (
              <Animated.View
                key={group.groupName}
                entering={FadeInDown.delay(groupIndex * 100).duration(300)}
                style={{ marginBottom: groupIndex === sortedGroups.length - 1 ? 0 : 16 }}
              >
                {/* Group Header - Clickable */}
                <Pressable
                  onPress={() => toggleGroup(group.groupName)}
                  className="flex-row items-center justify-between py-2"
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    marginHorizontal: -8,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                  })}
                >
                  <View className="flex-row items-center">
                    <ChevronRight
                      size={14}
                      color="rgba(255, 255, 255, 0.5)"
                      strokeWidth={2}
                      style={{
                        transform: [{ rotate: groupOpen ? '90deg' : '0deg' }],
                        marginRight: 8,
                      }}
                    />
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
                    <Text
                      className="text-white/40 ml-2"
                      style={{ fontSize: 10 }}
                    >
                      ({group.items.length})
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
                </Pressable>

                {/* Collapsible Group Items */}
                {groupOpen && (
                  <View className="mt-2">
                    {group.items.map((budget, itemIndex) => (
                      <BudgetItem
                        key={budget.id}
                        emoji={budget.categoryEmoji || '📊'}
                        label={budget.categoryName}
                        spent={budget.spentAmount}
                        allocated={budget.allocatedAmount}
                        animationDelay={itemIndex * 50}
                      />
                    ))}
                  </View>
                )}
              </Animated.View>
            );
          })}

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
