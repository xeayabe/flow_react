import React, { useEffect } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ContextLine } from './ContextLine';
import { formatCurrency } from '@/lib/formatCurrency';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BudgetCategory {
  id: string;
  categoryName: string;
  categoryEmoji?: string;
  allocatedAmount: number;
  spentAmount: number;
}

interface BudgetGroupItemProps {
  groupName: string;
  categories: BudgetCategory[];
  totalSpent: number;
  totalAllocated: number;
  isOpen: boolean;
  onToggle: () => void;
  animationDelay?: number;
}

/**
 * Budget Group Item - Collapsible card showing category group totals
 * Two-row layout to handle long category group names gracefully
 */
export function BudgetGroupItem({
  groupName,
  categories,
  totalSpent,
  totalAllocated,
  isOpen,
  onToggle,
  animationDelay = 0,
}: BudgetGroupItemProps) {
  const percentUsed = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const remaining = totalAllocated - totalSpent;

  // Animation values for the card
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(
      animationDelay,
      withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      })
    );

    translateY.value = withDelay(
      animationDelay,
      withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      })
    );
  }, [animationDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleToggle = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        200,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    onToggle();
  };

  return (
    <Animated.View
      className="bg-white/[0.05] border border-white/10 rounded-xl overflow-hidden"
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 4,
        },
        animatedStyle,
      ]}
    >
      {/* Group Header - Clickable */}
      <Pressable
        onPress={handleToggle}
        className="p-4"
        style={({ pressed }) => ({
          backgroundColor: pressed ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        })}
      >
        {/* Two-row layout for better space management */}
        <View className="mb-3">
          {/* Row 1: Title, Count, and Chevron */}
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-row items-center flex-1 mr-3">
              <Text
                className="text-white font-semibold flex-1"
                style={{
                  fontSize: 14,
                  letterSpacing: 0.3,
                }}
                numberOfLines={1}
              >
                {groupName}
              </Text>
              <Text
                className="text-white/40 ml-2"
                style={{ fontSize: 12 }}
              >
                ({categories.length})
              </Text>
            </View>
            <ChevronDown
              size={14}
              color="rgba(255, 255, 255, 0.5)"
              strokeWidth={2}
              style={{
                transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
              }}
            />
          </View>

          {/* Row 2: Amounts - Always visible on separate line */}
          <View className="flex-row justify-end">
            <Text
              className="text-white/70"
              style={{
                fontSize: 11,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCurrency(totalSpent, { showCurrency: false })} / {formatCurrency(totalAllocated, { showCurrency: false })}
            </Text>
          </View>
        </View>

        {/* Context Line for group totals */}
        <ContextLine percentUsed={percentUsed} remaining={remaining} />
      </Pressable>

      {/* Expanded Content - Nested Categories */}
      {isOpen && categories.length > 0 && (
        <View
          className="px-4 pb-4"
          style={{
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          {categories.map((category) => {
            const catPercentUsed = category.allocatedAmount > 0
              ? (category.spentAmount / category.allocatedAmount) * 100
              : 0;
            const catRemaining = category.allocatedAmount - category.spentAmount;

            return (
              <View
                key={category.id}
                className="mt-3 ml-4"
              >
                {/* Nested Category Card */}
                <View
                  className="bg-white/[0.03] border border-white/5 rounded-lg p-3"
                >
                  {/* Category Header - Two rows for long names */}
                  <View className="mb-2">
                    {/* Row 1: Emoji and Name */}
                    <View className="flex-row items-center mb-1">
                      <Text className="text-base mr-2">
                        {category.categoryEmoji || '📊'}
                      </Text>
                      <Text
                        className="text-white/90 font-medium flex-1"
                        style={{ fontSize: 12 }}
                        numberOfLines={1}
                      >
                        {category.categoryName}
                      </Text>
                    </View>
                    {/* Row 2: Amounts */}
                    <View className="flex-row justify-end">
                      <Text
                        className="text-white/60"
                        style={{
                          fontSize: 10,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formatCurrency(category.spentAmount, { showCurrency: false })} / {formatCurrency(category.allocatedAmount, { showCurrency: false })}
                      </Text>
                    </View>
                  </View>

                  {/* Category Context Line */}
                  <ContextLine percentUsed={catPercentUsed} remaining={catRemaining} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}
