import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CreditCard, Wallet, PiggyBank, Banknote, TrendingUp } from 'lucide-react-native';
import { formatCurrency } from '@/lib/formatCurrency';
import { colors } from '@/lib/design-tokens';

interface WalletItemProps {
  name: string;
  institution: string;
  type: string;
  balance: number;
  isDefault: boolean;
  onPress?: () => void;
  animationDelay?: number;
}

/**
 * Get the appropriate icon for a wallet type
 */
function getWalletIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'credit card':
      return CreditCard;
    case 'savings':
      return PiggyBank;
    case 'cash':
      return Banknote;
    case 'investment':
      return TrendingUp;
    default:
      return Wallet;
  }
}

/**
 * WalletItem - Individual wallet/account row in the Wallets Card
 * Uses neutral colors for negative balances (NO RED!)
 */
export function WalletItem({
  name,
  institution,
  type,
  balance,
  isDefault,
  onPress,
  animationDelay = 0,
}: WalletItemProps) {
  const isNegative = balance < 0;
  const Icon = getWalletIcon(type);

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(300).springify()}
    >
      <Pressable
        onPress={onPress}
        className="bg-white/[0.03] border border-white/5 rounded-xl p-4 mt-3 active:bg-white/[0.06]"
      >
        <View className="flex-row items-center">
          {/* Icon */}
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <Icon
              size={20}
              color={isNegative ? colors.neutral600 : 'rgba(255, 255, 255, 0.7)'}
            />
          </View>

          {/* Left: Name and details */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-1">
              <Text
                className="text-white/90 font-medium"
                style={{ fontSize: 15 }}
              >
                {name}
              </Text>
              {isDefault && (
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.contextTeal }}
                >
                  <Text
                    className="text-white"
                    style={{
                      fontSize: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontWeight: '600',
                    }}
                  >
                    Default
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-white/50" style={{ fontSize: 12 }}>
              {institution} • {type}
            </Text>
          </View>

          {/* Right: Balance */}
          <View className="items-end">
            <Text
              className="font-medium"
              style={{
                fontSize: 15,
                fontVariant: ['tabular-nums'],
                // CRITICAL: Use neutral gray for negative, NOT red!
                color: isNegative ? colors.neutral600 : 'rgba(255, 255, 255, 0.95)',
              }}
            >
              {formatCurrency(balance)}
            </Text>
            <Text className="text-white/40 mt-0.5" style={{ fontSize: 10 }}>
              {isNegative ? 'Amount Owed' : 'Balance'}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
