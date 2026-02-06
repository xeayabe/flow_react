import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Wallet, ChevronDown } from 'lucide-react-native';
import { GlassCard } from '@/components/ui/Glass';
import { WalletItem } from '@/components/wallets/WalletItem';
import { formatCurrency } from '@/lib/formatCurrency';
import { colors } from '@/lib/design-tokens';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WalletData {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  isDefault: boolean;
}

interface WalletsCardProps {
  wallets: WalletData[];
}

/**
 * Wallets Card - Collapsible card showing all user wallets
 * Displays total balance and individual wallet details
 * Uses neutral colors for negative balances (NO RED!)
 */
export function WalletsCard({ wallets }: WalletsCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Calculate total balance
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  // Sort wallets: default first, then by balance descending
  const sortedWallets = [...wallets].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.balance - a.balance;
  });

  const toggleOpen = () => {
    // Animate the layout change
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );
    setIsOpen(!isOpen);
  };

  const handleWalletPress = (walletId: string) => {
    router.push(`/wallets/${walletId}`);
  };

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
          <Wallet
            size={20}
            color={colors.contextTeal}
            strokeWidth={2}
          />
          <Text
            className="text-white font-medium ml-3"
            style={{
              fontSize: 15,
              letterSpacing: 0.5,
            }}
          >
            Wallets
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text
            className="text-white/60 mr-3"
            style={{
              fontSize: 12,
            }}
          >
            {wallets.length} {wallets.length === 1 ? 'account' : 'accounts'}
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
        <View className="px-5 pb-5 border-t border-white/5 pt-4">
          {sortedWallets.map((wallet, index) => (
            <WalletItem
              key={wallet.id}
              name={wallet.name}
              institution={wallet.institution}
              type={wallet.type}
              balance={wallet.balance}
              isDefault={wallet.isDefault}
              onPress={() => handleWalletPress(wallet.id)}
              animationDelay={index * 50}
            />
          ))}

          {/* Empty state */}
          {wallets.length === 0 && (
            <View className="items-center py-8">
              <Text className="text-white/50 text-sm text-center">
                No wallets yet. Add your first wallet to get started!
              </Text>
            </View>
          )}
        </View>
      )}
    </GlassCard>
  );
}
