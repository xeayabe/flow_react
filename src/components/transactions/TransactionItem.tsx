import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatCurrency } from '@/lib/formatCurrency';
import { colors } from '@/lib/design-tokens';

interface TransactionItemProps {
  emoji: string;
  name: string;
  category: string;
  date: string; // Display date like "Today", "Yesterday", or "Jan 15"
  amount: number;
  isShared?: boolean;
  onPress?: () => void;
  animationDelay?: number;
}

/**
 * TransactionItem - Individual transaction row
 * Uses neutral colors for amounts (NO RED for expenses!)
 */
export function TransactionItem({
  emoji,
  name,
  category,
  date,
  amount,
  isShared = false,
  onPress,
  animationDelay = 0,
}: TransactionItemProps) {
  const isExpense = amount < 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(300).springify()}
    >
      <Pressable
        onPress={onPress}
        className="p-4 rounded-xl"
        style={({ pressed }) => ({
          backgroundColor: pressed ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        })}
      >
        <View className="flex-row justify-between items-center">
          {/* Left: Icon, Name, Details */}
          <View className="flex-1 flex-row items-center">
            {/* Emoji */}
            <Text className="text-lg mr-3">{emoji}</Text>

            {/* Name and Details */}
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text
                  className="text-white font-medium"
                  style={{ fontSize: 15 }}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {isShared && (
                  <View
                    className="ml-2 px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: 'rgba(44, 95, 93, 0.2)',
                      borderColor: 'rgba(44, 95, 93, 0.4)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 8,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: colors.contextSage,
                      }}
                    >
                      Shared
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center">
                <Text className="text-white/50" style={{ fontSize: 11 }}>
                  {date}
                </Text>
                <Text className="text-white/50 mx-2" style={{ fontSize: 11 }}>
                  •
                </Text>
                <Text className="text-white/50" style={{ fontSize: 11 }}>
                  {category}
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Amount */}
          <Text
            className="font-semibold text-right"
            style={{
              fontSize: 15,
              fontVariant: ['tabular-nums'],
              // CRITICAL: Use neutral white/gray, NO RED!
              // Expenses show in slightly dimmer white, income in sage green
              color: isExpense ? 'rgba(255, 255, 255, 0.85)' : colors.contextSage,
            }}
          >
            {isExpense ? '' : '+'}{formatCurrency(Math.abs(amount))}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
