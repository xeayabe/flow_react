 import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { colors } from '@/lib/design-tokens';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  opacity?: number;
  borderOpacity?: number;
  padding?: number;
  borderRadius?: number;
}

/**
 * Reusable glassmorphism card component
 * Consistent with Flow's design system
 */
export function GlassCard({
  children,
  opacity = 0.03,
  borderOpacity = 0.05,
  padding = 16,
  borderRadius = 16,
  style,
  ...props
}: GlassCardProps) {
  const glassStyle: ViewStyle = {
    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
    borderWidth: 1,
    borderColor: `rgba(255, 255, 255, ${borderOpacity})`,
    borderRadius,
    padding,
  };

  return (
    <View style={[glassStyle, style]} {...props}>
      {children}
    </View>
  );
}

/**
 * Glass card without padding (for custom layouts)
 */
export function GlassContainer({
  children,
  opacity = 0.03,
  borderOpacity = 0.05,
  borderRadius = 16,
  style,
  ...props
}: GlassCardProps) {
  const glassStyle: ViewStyle = {
    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
    borderWidth: 1,
    borderColor: `rgba(255, 255, 255, ${borderOpacity})`,
    borderRadius,
    overflow: 'hidden',
  };

  return (
    <View style={[glassStyle, style]} {...props}>
      {children}
    </View>
  );
}