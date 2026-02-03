import React from 'react';
import { View, Text } from 'react-native';
import { getBudgetColor, getBudgetStatus } from '@/lib/getBudgetColor';
import { formatCurrency } from '@/lib/formatCurrency';

interface ContextLineProps {
  percentUsed: number;
  remaining: number;
}

/**
 * Context Line - Ultra-thin 2px progress indicator
 * Uses calm 4-tier color system instead of anxiety-inducing reds
 *
 * Color Philosophy:
 * - 0-70%: Sage Green (ON TRACK)
 * - 70-90%: Soft Amber (PROGRESSING WELL)
 * - 90-100%: Deep Teal (NEARLY THERE)
 * - 100%+: Soft Lavender (FLOW ADJUSTED)
 */
export function ContextLine({ percentUsed, remaining }: ContextLineProps) {
  const color = getBudgetColor(percentUsed);
  const status = getBudgetStatus(percentUsed);
  const displayPercent = Math.min(percentUsed, 100);

  return (
    <View className="w-full">
      {/* Ultra-thin 2px line - NOT chunky bars! */}
      <View
        className="h-[2px] w-full rounded-full overflow-hidden mb-2"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <View
          className="h-full"
          style={{
            width: `${displayPercent}%`,
            backgroundColor: color,
          }}
        />
      </View>

      {/* Status labels */}
      <View className="flex-row justify-between items-center">
        <Text
          className="font-medium"
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: color,
          }}
        >
          {status}
        </Text>
        <Text
          className="opacity-50"
          style={{
            fontSize: 9,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatCurrency(remaining, { showCurrency: false })} left
        </Text>
      </View>
    </View>
  );
}
