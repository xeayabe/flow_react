import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ContextLine } from './ContextLine';
import { formatCurrency } from '@/lib/formatCurrency';

interface BudgetItemProps {
  emoji: string;
  label: string;
  spent: number;
  allocated: number;
  animationDelay?: number;
}

/**
 * Budget Item Card - Individual category with Context Line
 * Glass effect with slide-in animation
 */
export function BudgetItem({
  emoji,
  label,
  spent,
  allocated,
  animationDelay = 0
}: BudgetItemProps) {
  const percentUsed = (spent / allocated) * 100;
  const remaining = allocated - spent;

  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    // Slide in with fade
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

  return (
    <Animated.View
      className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mt-3"
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 2,
        },
        animatedStyle,
      ]}
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center">
          <Text className="text-xl mr-2">{emoji}</Text>
          <Text
            className="text-white font-medium"
            style={{ fontSize: 13 }}
          >
            {label}
          </Text>
        </View>

        <Text
          className="text-white/70"
          style={{
            fontSize: 11,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCurrency(spent, { showCurrency: false })} / {formatCurrency(allocated, { showCurrency: false })}
        </Text>
      </View>

      {/* Context Line */}
      <ContextLine percentUsed={percentUsed} remaining={remaining} />
    </Animated.View>
  );
}
