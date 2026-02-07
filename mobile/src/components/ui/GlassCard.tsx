import React from 'react';
import { Pressable, View, ViewStyle, StyleProp, PressableStateCallbackType } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, borderRadius } from '@/lib/design-tokens';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  intensity?: number;
  noPadding?: boolean;
}

/**
 * GlassCard - Main glassmorphism card component for Flow app
 *
 * @example
 * ```tsx
 * // Basic card
 * <GlassCard>
 *   <Text>Content here</Text>
 * </GlassCard>
 *
 * // Pressable card
 * <GlassCard onPress={() => console.log('Pressed')}>
 *   <Text>Tap me</Text>
 * </GlassCard>
 *
 * // Custom intensity and no padding
 * <GlassCard intensity={30} noPadding>
 *   <CustomLayout />
 * </GlassCard>
 * ```
 */
export function GlassCard({
  children,
  className,
  style,
  onPress,
  disabled = false,
  intensity = 20,
  noPadding = false,
}: GlassCardProps) {
  const baseStyle: ViewStyle = {
    backgroundColor: colors.bgDark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  };

  const paddingStyle: ViewStyle = noPadding ? {} : { padding: 16 };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }: PressableStateCallbackType) => [
          baseStyle,
          {
            borderColor: pressed
              ? colors.borderSage // Sage Green on press
              : colors.borderTeal, // Deep Teal default
            opacity: pressed ? 0.8 : 1,
          },
          style,
        ]}
      >
        <BlurView intensity={intensity} style={paddingStyle}>
          {children}
        </BlurView>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        baseStyle,
        {
          borderColor: colors.borderTeal, // Deep Teal
        },
        style,
      ]}
    >
      <BlurView intensity={intensity} style={paddingStyle}>
        {children}
      </BlurView>
    </View>
  );
}

/**
 * GlassSection - Lighter variant for grouping content within cards
 *
 * @example
 * ```tsx
 * // Group related content
 * <GlassSection>
 *   <Text>Section Header</Text>
 *   <Text>Section content with lighter styling</Text>
 * </GlassSection>
 *
 * // Nested within GlassCard
 * <GlassCard>
 *   <GlassSection>
 *     <Text>Grouped content</Text>
 *   </GlassSection>
 * </GlassCard>
 *
 * // Pressable section
 * <GlassSection onPress={() => navigate('Details')}>
 *   <Text>Tap to see details</Text>
 * </GlassSection>
 * ```
 */
export function GlassSection({
  children,
  className,
  style,
  onPress,
  disabled = false,
  intensity = 15,
  noPadding = false,
}: GlassCardProps) {
  const baseStyle: ViewStyle = {
    backgroundColor: colors.bgGlass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  };

  const paddingStyle: ViewStyle = noPadding ? {} : { padding: 16 };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }: PressableStateCallbackType) => [
          baseStyle,
          {
            borderColor: pressed
              ? colors.borderSage // Sage Green on press
              : colors.borderTealLight, // Lighter Deep Teal default
            opacity: pressed ? 0.8 : 1,
          },
          style,
        ]}
      >
        <BlurView intensity={intensity} style={paddingStyle}>
          {children}
        </BlurView>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        baseStyle,
        {
          borderColor: colors.borderTealLight, // Lighter Deep Teal
        },
        style,
      ]}
    >
      <BlurView intensity={intensity} style={paddingStyle}>
        {children}
      </BlurView>
    </View>
  );
}
