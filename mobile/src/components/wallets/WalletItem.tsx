import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatCurrency } from '@/lib/formatCurrency';
import { colors } from '@/lib/design-tokens';

interface WalletItemProps {
  name: string;
  type: string;
  balance: number;
  isDefault: boolean;
  onPress?: () => void;
  animationDelay?: number;
}

/**
 * WalletItem - Individual wallet/account row
 * Uses neutral colors for negative balances (NO RED!)
 */
export function WalletItem({
  name,
  type,
  balance,
  isDefault,
  onPress,
  animationDelay = 0,
}: WalletItemProps) {
  const isNegative = balance < 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(300).springify()}
    >
      <Pressable
        onPress={onPress}
        className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mt-3"
        style={({ pressed }) => ({
          backgroundColor: pressed ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)',
        })}
      >
        <View className="flex-row justify-between items-start">
          {/* Left: Name and details */}
          <View>
            <View className="flex-row items-center mb-1">
              <Text
                className="text-white font-medium"
                style={{ fontSize: 15 }}
              >
                {name}
              </Text>
              {isDefault && (
                <View
                  className="ml-2 px-2 rounded-full"
                  style={{
                    backgroundColor: colors.contextTeal,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    className="text-white"
                    style={{
                      fontSize: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Default
                  </Text>
                </View>
              )}
            </View>
            <Text
              className="text-white/50"
              style={{ fontSize: 12 }}
            >
              {type}
            </Text>
          </View>

          {/* Right: Balance */}
          <View className="items-end">
            <Text
              className="font-medium"
              style={{
                fontSize: 14,
                fontVariant: ['tabular-nums'],
                // CRITICAL: Use neutral gray for negative, NOT red!
                color: isNegative ? '#64748B' : '#fff',
              }}
            >
              {formatCurrency(balance)}
            </Text>
            <Text
              className="text-white/50 mt-0.5"
              style={{ fontSize: 10 }}
            >
              {isNegative ? 'Amount Owed' : 'Balance'}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
