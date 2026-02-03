import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '@/lib/formatCurrency';
import { colors } from '@/lib/design-tokens';

interface TruePositionHeroProps {
  netWorth: number;
  assets: number;
  liabilities: number;
}

/**
 * TruePositionHero - Swiss-inspired hero card showing net worth
 * Main focal point of the dashboard with assets/liabilities breakdown
 */
export function TruePositionHero({
  netWorth,
  assets,
  liabilities
}: TruePositionHeroProps) {
  return (
    <LinearGradient
      colors={['#2C5F5D', '#1e4442']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-3xl p-8 border border-white/10"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
        elevation: 12,
      }}
    >
      {/* Label */}
      <Text
        className="text-center text-white/70 mb-2"
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: 2,
          fontWeight: '600',
        }}
      >
        True Position
      </Text>

      {/* Main Amount */}
      <View className="items-center mb-1">
        <View className="flex-row items-baseline">
          <Text
            className="text-white font-bold"
            style={{
              fontSize: 48,
              letterSpacing: -1,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatCurrency(netWorth, { showCurrency: false })}
          </Text>
          <Text
            className="text-white/80 font-light ml-2"
            style={{ fontSize: 18 }}
          >
            CHF
          </Text>
        </View>
      </View>

      {/* Assets/Liabilities Breakdown */}
      <View className="mt-6 pt-6 border-t border-white/10">
        <View className="flex-row justify-center">
          {/* Assets */}
          <View className="flex-1 items-center">
            <Text
              className="text-white/50 mb-1"
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                fontWeight: '600',
              }}
            >
              Assets
            </Text>
            <Text
              className="text-white font-medium"
              style={{
                fontSize: 14,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatCurrency(assets, { showSign: true })}
            </Text>
          </View>

          {/* Divider */}
          <View className="w-px bg-white/10 mx-4" style={{ height: 40 }} />

          {/* Liabilities */}
          <View className="flex-1 items-center">
            <Text
              className="text-white/50 mb-1"
              style={{
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                fontWeight: '600',
              }}
            >
              Liabilities
            </Text>
            <Text
              className="font-medium"
              style={{
                fontSize: 14,
                fontVariant: ['tabular-nums'],
                color: colors.contextLavender,
              }}
            >
              {formatCurrency(-Math.abs(liabilities), { showSign: true })}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
