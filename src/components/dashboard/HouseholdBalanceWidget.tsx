import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { formatCurrency } from '@/lib/formatCurrency';
import { GlassCard, GlassButton } from '@/components/ui/Glass';

interface HouseholdBalanceWidgetProps {
  debtAmount: number; // Positive if partner owes you, negative if you owe partner
  partnerName: string;
  yourSplitRatio: number; // e.g., 59
  partnerSplitRatio: number; // e.g., 41
  hasUnsettledExpenses: boolean;
}

export function HouseholdBalanceWidget({
  debtAmount,
  partnerName,
  yourSplitRatio,
  partnerSplitRatio,
  hasUnsettledExpenses,
}: HouseholdBalanceWidgetProps) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(true);

  // Pulsing glow animation
  const glowOpacity = useSharedValue(1);

  useEffect(() => {
    // Pulse animation for 10 seconds
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      3, // Repeat 3 times = ~9 seconds
      false
    );

    // Stop animation after 10 seconds
    const timer = setTimeout(() => {
      setIsAnimating(false);
      cancelAnimation(glowOpacity);
      glowOpacity.value = withTiming(1, { duration: 500 });
    }, 10000);

    return () => {
      clearTimeout(timer);
      cancelAnimation(glowOpacity);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    if (!isAnimating) return {};
    return {
      opacity: glowOpacity.value,
      transform: [{ scale: 1 + (1 - glowOpacity.value) * 0.02 }],
    };
  });

  // Don't show if no unsettled expenses or debt is essentially zero
  if (!hasUnsettledExpenses || Math.abs(debtAmount) < 0.01) {
    return null;
  }

  const youOwe = debtAmount < 0;
  const amountDisplay = Math.abs(debtAmount);

  return (
    <Animated.View style={animatedStyle}>
      <GlassCard
        className="p-5"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 32,
          elevation: 8,
        }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-2">
          <Text
            className="text-white/60"
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}
          >
            Household Balance
          </Text>
          <Text
            className="text-white/60"
            style={{
              fontSize: 11,
              fontVariant: ['tabular-nums'],
            }}
          >
            {yourSplitRatio}% / {partnerSplitRatio}%
          </Text>
        </View>

        {/* Status */}
        <Text className="text-white/90 text-sm mb-2">
          {youOwe ? `You owe ${partnerName}` : `${partnerName} owes you`}
        </Text>

        {/* Amount */}
        <Text
          className="text-white/95 font-bold mb-4"
          style={{
            fontSize: 40,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCurrency(amountDisplay)}
        </Text>

        {/* CTA Button */}
        <GlassButton
          variant="primary"
          onPress={() => {
            setIsAnimating(false);
            router.push('/settle');
          }}
        >
          <Text className="text-white text-center font-semibold" style={{ fontSize: 15 }}>
            View Details & Settle
          </Text>
        </GlassButton>

        {/* Note */}
        <Text
          className="text-white/50 text-center mt-3"
          style={{ fontSize: 11 }}
        >
          Shared expenses split based on income ratio
        </Text>
      </GlassCard>
    </Animated.View>
  );
}
