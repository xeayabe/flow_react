import React from 'react';
import { View, Pressable, ViewStyle, PressableProps } from 'react-native';
import { cn } from '@/lib/cn';
import { colors, glassStyles } from '@/lib/design-tokens';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: ViewStyle;
}

/**
 * GlassCard - Swiss-inspired glassmorphism card
 * Subtle transparency with delicate borders
 */
export function GlassCard({ children, className, hover = true, style }: GlassCardProps) {
  return (
    <View
      className={cn(
        'rounded-2xl border',
        'bg-white/[0.03] border-white/5',
        className
      )}
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 32,
          elevation: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface GlassButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

/**
 * GlassButton - Premium button with Swiss precision
 * Primary: Solid teal with depth
 * Secondary: Glass effect with subtle borders
 */
export function GlassButton({
  variant = 'primary',
  children,
  className,
  style,
  ...props
}: GlassButtonProps) {
  return (
    <Pressable
      className={cn(
        'w-full rounded-xl px-4 py-3',
        variant === 'primary' && 'bg-[#2C5F5D]',
        variant === 'secondary' && 'bg-white/[0.03] border border-white/10',
        className
      )}
      style={({ pressed }) => [
        variant === 'primary' && {
          shadowColor: colors.contextTeal,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: pressed ? 0.4 : 0.3,
          shadowRadius: pressed ? 16 : 12,
          elevation: pressed ? 6 : 4,
          transform: [{ translateY: pressed ? 0 : -2 }],
        },
        variant === 'secondary' && {
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

interface GlassHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

/**
 * GlassHeader - Translucent header with bottom border
 * Perfect for custom navigation headers
 */
export function GlassHeader({ children, className, style }: GlassHeaderProps) {
  return (
    <View
      className={cn(
        'bg-white/[0.03] border-b border-white/5',
        className
      )}
      style={style}
    >
      {children}
    </View>
  );
}

interface GlassInputContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  focused?: boolean;
}

/**
 * GlassInputContainer - Glassmorphism wrapper for form inputs
 * Highlights on focus with subtle glow
 */
export function GlassInputContainer({
  children,
  className,
  style,
  focused = false,
}: GlassInputContainerProps) {
  return (
    <View
      // Prevents Fabric view flattening — without this, conditionally applying
      // shadow styles causes a native remove+reinsert that steals TextInput focus
      collapsable={false}
      className={cn(
        'rounded-xl border px-4 py-3',
        focused ? 'bg-white/[0.05] border-white/10' : 'bg-white/[0.03] border-white/5',
        className
      )}
      style={[
        focused && {
          shadowColor: colors.contextTeal,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface GlassSectionProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

/**
 * GlassSection - Large glass surface for content sections
 * Reduced border radius for better content nesting
 */
export function GlassSection({ children, className, style }: GlassSectionProps) {
  return (
    <View
      className={cn(
        'rounded-xl border',
        'bg-white/[0.03] border-white/5',
        'p-4',
        className
      )}
      style={[
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
