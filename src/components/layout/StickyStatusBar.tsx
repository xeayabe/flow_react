import React from 'react';
import { View, Platform, StatusBar as RNStatusBar } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface StickyStatusBarProps {
  scrollY: Animated.SharedValue<number>;
}

const STATUS_BAR_HEIGHT = Platform.select({
  ios: 44,
  android: RNStatusBar.currentHeight || 24,
  default: 44,
});

export default function StickyStatusBar({ scrollY }: StickyStatusBarProps) {
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    // Show blur background when scrolled past 20px
    const opacity = interpolate(scrollY.value, [0, 20], [0, 1], 'clamp');

    return {
      opacity: withTiming(opacity, { duration: 300 }),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top || STATUS_BAR_HEIGHT,
          zIndex: 9999,
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['rgba(26,28,30,0.95)', 'rgba(26,28,30,0.85)']}
        style={{
          flex: 1,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
        }}
      />
    </Animated.View>
  );
}
