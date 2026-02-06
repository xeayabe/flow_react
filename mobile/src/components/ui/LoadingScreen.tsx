 import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors } from '@/lib/design-tokens';

interface LoadingScreenProps {
  message?: string;
}

/**
 * Consistent loading screen matching Flow's design system
 * Dark gradient with animated diamond icon and message
 */
export function LoadingScreen({ message = 'Loading your financial overview...' }: LoadingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1, paddingTop: insets.top }}
    >
      <View className="flex-1 items-center justify-center">
        <Animated.View entering={FadeIn.duration(500)}>
          <Text className="text-4xl mb-4">💎</Text>
        </Animated.View>
        <Text className="text-white/70 text-sm">{message}</Text>
      </View>
    </LinearGradient>
  );
}