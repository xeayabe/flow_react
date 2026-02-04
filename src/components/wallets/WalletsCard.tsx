import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ChevronDown, Wallet, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '@/components/ui/Glass';
import { WalletItem } from './WalletItem';
import { formatCurrency } from '@/lib/formatCurrency';
import { colors } from '@/lib/design-tokens';
import type { Account } from '@/lib/accounts-api';

interface WalletsCardProps {
  accounts: Account[];
  onAccountPress?: (account: Account) => void;
}

/**
 * WalletsCard - Collapsible card displaying all user wallets
 * Shows total balance in header, expandable list of individual wallets
 * Uses neutral colors for negative balances (NO RED!)
 */
export function WalletsCard({ accounts, onAccountPress }: WalletsCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const assetAccounts = accounts.filter((acc) => acc.balance >= 0);
  const liabilityAccounts = accounts.filter((acc) => acc.balance < 0);
  const totalAssets = assetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = Math.abs(
    liabilityAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  );

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    expandProgress.value = withTiming(isExpanded ? 0 : 1, { duration: 300 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(
          expandProgress.value,
          [0, 1],
          [0, 180],
          Extrapolation.CLAMP
        )}deg`,
      },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    maxHeight: interpolate(
      expandProgress.value,
      [0, 1],
      [0, 1000],
      Extrapolation.CLAMP
    ),
  }));

  const handleAccountPress = (account: Account) => {
    if (onAccountPress) {
      onAccountPress(account);
    } else {
      router.push(`/wallets/edit?id=${account.id}`);
    }
  };

  const handleAddWallet = () => {
    router.push('/wallets/add');
  };

  // Sort accounts: default first, then by balance descending
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.balance - a.balance;
  });

  return (
    <GlassCard className="overflow-hidden">
      {/* Header - Always visible, tap to expand */}
      <Pressable
        onPress={toggleExpanded}
        className="p-5 flex-row items-center justify-between active:opacity-80"
      >
        <View className="flex-row items-center flex-1">
          {/* Icon */}
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: colors.contextTeal }}
          >
            <Wallet size={20} color="white" />
          </View>

          {/* Title and count */}
          <View className="flex-1">
            <Text
              className="text-white/60"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
              }}
            >
              Wallets
            </Text>
            <Text
              className="text-white/95 font-bold"
              style={{
                fontSize: 24,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCurrency(totalBalance)}
            </Text>
          </View>
        </View>

        {/* Expand indicator */}
        <View className="flex-row items-center gap-2">
          <Text className="text-white/50" style={{ fontSize: 12 }}>
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          </Text>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={20} color="rgba(255, 255, 255, 0.5)" />
          </Animated.View>
        </View>
      </Pressable>

      {/* Expandable content */}
      <Animated.View style={contentStyle}>
        <View className="px-5 pb-5">
          {/* Summary row */}
          <View className="flex-row justify-between py-3 border-t border-white/5">
            <View>
              <Text className="text-white/40" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                Assets
              </Text>
              <Text
                className="text-white/90 font-medium"
                style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}
              >
                {formatCurrency(totalAssets)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-white/40" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                Liabilities
              </Text>
              <Text
                className="font-medium"
                style={{
                  fontSize: 13,
                  fontVariant: ['tabular-nums'],
                  // Use neutral color for liabilities, not red
                  color: totalLiabilities > 0 ? colors.contextLavender : 'rgba(255, 255, 255, 0.9)',
                }}
              >
                {totalLiabilities > 0 ? '-' : ''}{formatCurrency(totalLiabilities, { showSign: false })}
              </Text>
            </View>
          </View>

          {/* Wallet list */}
          {sortedAccounts.map((account, index) => (
            <WalletItem
              key={account.id}
              name={account.name}
              institution={account.institution}
              type={account.accountType}
              balance={account.balance}
              isDefault={account.isDefault}
              onPress={() => handleAccountPress(account)}
              animationDelay={index * 50}
            />
          ))}

          {/* Add wallet button */}
          <Pressable
            onPress={handleAddWallet}
            className="flex-row items-center justify-center gap-2 mt-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 active:bg-white/[0.06]"
          >
            <Plus size={18} color="rgba(255, 255, 255, 0.6)" />
            <Text className="text-white/60 font-medium" style={{ fontSize: 14 }}>
              Add Wallet
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </GlassCard>
  );
}
