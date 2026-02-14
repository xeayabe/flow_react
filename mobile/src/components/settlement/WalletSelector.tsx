import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { formatCurrency } from '@/lib/formatCurrency';

interface WalletData {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface WalletSelectorProps {
  wallets: WalletData[];
  selectedWalletId: string;
  onSelectWallet: (walletId: string) => void;
}

/**
 * WalletSelector - Allow payer to select payment source wallet
 * Radio button style selection with wallet details
 */
export function WalletSelector({
  wallets,
  selectedWalletId,
  onSelectWallet,
}: WalletSelectorProps) {
  return (
    <View>
      {/* Section Title */}
      <Text
        className="text-white/60 mb-4"
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        Pay From
      </Text>

      {/* Wallet Options */}
      <View className="gap-3">
        {wallets.map((wallet) => {
          const isSelected = wallet.id === selectedWalletId;

          return (
            <Pressable
              key={wallet.id}
              onPress={() => onSelectWallet(wallet.id)}
              style={({ pressed }) => ({
                backgroundColor: isSelected
                  ? 'rgba(44, 95, 93, 0.2)'
                  : pressed
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(255, 255, 255, 0.03)',
                borderWidth: 1,
                borderColor: isSelected
                  ? '#2C5F5D'
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: 14,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Wallet Icon */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Wallet size={20} color="rgba(255, 255, 255, 0.7)" />
                </View>

                {/* Wallet Details */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    className="text-white/90 font-semibold"
                    style={{ fontSize: 15 }}
                  >
                    {wallet.name}
                  </Text>
                  <Text
                    className="text-white/50 mt-0.5"
                    style={{ fontSize: 11 }}
                  >
                    {wallet.type}
                  </Text>
                </View>

                {/* Balance and Radio Button */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                  <Text
                    className="text-white/70"
                    style={{
                      fontSize: 14,
                      fontVariant: ['tabular-nums'],
                      marginRight: 12,
                    }}
                  >
                    {formatCurrency(wallet.balance)}
                  </Text>

                  {/* Radio Button */}
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? 'rgba(255, 255, 255, 0.7)'
                        : 'rgba(255, 255, 255, 0.3)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        }}
                      />
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}

        {/* Empty state */}
        {wallets.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-white/50 text-sm text-center">
              No wallets available
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
