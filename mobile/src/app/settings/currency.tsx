import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Info, Lock } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useHouseholdCurrency } from '@/hooks/useHouseholdCurrency';
import { CURRENCIES, type CurrencyCode } from '@/constants/currencies';
import { colors, borderRadius } from '@/lib/design-tokens';
import { GlassCard } from '@/components/ui/Glass';

export default function CurrencySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { currency: householdCurrency } = useHouseholdCurrency();
  const config = CURRENCIES[householdCurrency] || CURRENCIES.CHF;

  return (
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.sm,
            backgroundColor: colors.glassWhite,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}
        >
          <ArrowLeft size={20} color={colors.textWhite} strokeWidth={2} />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Currency</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
      >
        {/* Description */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <Text
            style={{ color: colors.textWhiteSecondary }}
            className="text-sm mb-6"
          >
            Your household default currency is used when creating new wallets.
          </Text>
        </Animated.View>

        {/* Current Household Currency */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <GlassCard className="p-5 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.sageGreen, textTransform: 'uppercase', letterSpacing: 0.8 }}
              >
                Household Default
              </Text>
              <Lock size={14} color={colors.textWhiteDisabled} />
            </View>
            <Text className="text-2xl font-bold" style={{ color: colors.textWhite }}>
              {config.code}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textWhiteSecondary }}>
              {config.displayName}
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Supported Currencies */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text
            className="text-xs font-semibold mb-3"
            style={{ color: colors.sageGreen, textTransform: 'uppercase', letterSpacing: 0.8 }}
          >
            Supported Currencies
          </Text>

          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
            const currencyConfig = CURRENCIES[code];
            const isActive = code === householdCurrency;
            return (
              <View
                key={code}
                className="flex-row items-center py-3.5 px-4 rounded-xl mb-1"
                style={{
                  backgroundColor: isActive ? 'rgba(44, 95, 93, 0.3)' : 'transparent',
                }}
              >
                <Text
                  className="text-base font-semibold mr-3"
                  style={{ color: colors.textWhite, width: 44 }}
                >
                  {code}
                </Text>
                <Text className="text-sm flex-1" style={{ color: colors.textWhiteSecondary }}>
                  {currencyConfig.displayName}
                </Text>
                {isActive && (
                  <Text className="text-xs font-medium" style={{ color: colors.sageGreen }}>
                    Default
                  </Text>
                )}
              </View>
            );
          })}
        </Animated.View>

        {/* Info Box */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View
            className="mt-4"
            style={{
              backgroundColor: 'rgba(168, 181, 161, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(168, 181, 161, 0.2)',
              borderRadius: borderRadius.lg,
              padding: 16,
            }}
          >
            <View className="flex-row items-start gap-3">
              <Info size={18} color={colors.sageGreen} />
              <View className="flex-1">
                <Text
                  style={{ color: colors.sageGreen }}
                  className="font-semibold mb-1"
                >
                  Per-Wallet Currency
                </Text>
                <Text
                  style={{ color: colors.textWhiteSecondary }}
                  className="text-sm leading-5"
                >
                  Each wallet can have its own currency, chosen when you create it. Once a wallet is created, its currency is locked and cannot be changed.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
