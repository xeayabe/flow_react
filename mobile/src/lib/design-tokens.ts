  /**
 * Flow Design System - Centralized Design Tokens
 *
 * Single source of truth for colors, spacing, and design primitives.
 * Use these tokens throughout the app instead of hardcoded values.
 */

/**
 * Color palette for Flow app
 *
 * @example
 * ```tsx
 * import { colors } from '@/lib/design-tokens';
 *
 * <View style={{ backgroundColor: colors.bgDark }}>
 *   <Text style={{ color: colors.textWhite }}>Hello</Text>
 * </View>
 * ```
 */
export const colors = {
  // Base colors
  contextDark: '#1A1C1E',
  contextTeal: '#2C5F5D',
  sageGreen: '#A8B5A1',
  softLavender: '#B8A8C8',

  // Backward compatibility aliases
  contextSage: '#A8B5A1', // Alias for sageGreen
  contextLavender: '#B4A7D6', // Alias for softLavender

  // Semantic colors
  success: '#A8B5A1',
  warning: '#E8C5A8',
  error: '#C8A8A8',

  // Budget Status (4-tier system)
  budgetOnTrack: '#C5D4BE',      // 0-70%: Brighter Sage Green
  budgetProgressing: '#E5C399',   // 70-90%: Brighter Amber
  budgetNearlyThere: '#4A8D89',   // 90-100%: Brighter Teal
  budgetFlowAdjusted: '#D4C4ED',  // >100%: Brighter Lavender

  // Glassmorphism backgrounds
  bgDark: 'rgba(26, 28, 30, 0.7)',
  bgGlass: 'rgba(26, 28, 30, 0.5)',

  // Glassmorphism (legacy)
  glassWhite: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.05)',
  glassHover: 'rgba(255, 255, 255, 0.05)',

  // Borders
  borderTeal: 'rgba(44, 95, 93, 0.3)',
  borderTealLight: 'rgba(44, 95, 93, 0.2)',
  borderSage: 'rgba(168, 181, 161, 0.5)',
  borderSageSubtle: 'rgba(168, 181, 161, 0.15)', // For floating navigation

  // Text colors
  textWhite: '#FFFFFF',
  textWhiteSecondary: 'rgba(255, 255, 255, 0.7)',
  textWhiteTertiary: 'rgba(255, 255, 255, 0.6)',
  textWhiteDisabled: 'rgba(255, 255, 255, 0.4)',
} as const;

/**
 * Spacing scale based on 4px increments
 *
 * @example
 * ```tsx
 * import { spacing } from '@/lib/design-tokens';
 *
 * <View style={{ padding: spacing.md, gap: spacing.sm }}>
 *   <Text>Content with consistent spacing</Text>
 * </View>
 * ```
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/**
 * Border radius values for consistent rounded corners
 *
 * @example
 * ```tsx
 * import { borderRadius } from '@/lib/design-tokens';
 *
 * <View style={{ borderRadius: borderRadius.lg }}>
 *   <Text>Rounded card</Text>
 * </View>
 * ```
 */
export const borderRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  floating: 28, // For floating navigation container
} as const;

// TypeScript types for design tokens
export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;

/**
 * Get a color value from the design system
 *
 * @param key - The color key to retrieve
 * @returns The color value
 *
 * @example
 * ```tsx
 * const tealColor = getColor('contextTeal'); // '#2C5F5D'
 * ```
 */
export function getColor(key: ColorKey): string {
  return colors[key];
}

/**
 * Get a spacing value from the design system
 *
 * @param key - The spacing key to retrieve
 * @returns The spacing value in pixels
 *
 * @example
 * ```tsx
 * const padding = getSpacing('md'); // 16
 * ```
 */
export function getSpacing(key: SpacingKey): number {
  return spacing[key];
}

/**
 * Get a border radius value from the design system
 *
 * @param key - The border radius key to retrieve
 * @returns The border radius value in pixels
 *
 * @example
 * ```tsx
 * const radius = getBorderRadius('lg'); // 20
 * ```
 */
export function getBorderRadius(key: BorderRadiusKey): number {
  return borderRadius[key];
}

/**
 * Glassmorphism utility styles for React Native
 *
 * @example
 * ```tsx
 * import { glassStyles } from '@/lib/design-tokens';
 *
 * <View style={glassStyles.card}>
 *   <Text>Glass card content</Text>
 * </View>
 * ```
 */
export const glassStyles = {
  base: {
    backgroundColor: colors.glassWhite,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  hover: {
    backgroundColor: colors.glassHover,
  },
  card: {
    backgroundColor: colors.glassWhite,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  header: {
    backgroundColor: colors.glassWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
} as const;

/**
 * Format currency with locale-appropriate separators.
 * Re-exports from the canonical formatCurrency module.
 */
export { formatCurrency } from './formatCurrency';

/**
 * Get color for transaction amount based on type
 *
 * @param type - Transaction type ('income' or 'expense')
 * @returns Color string
 *
 * @example
 * ```tsx
 * <Text style={{ color: getAmountColor('income') }}>+1'000.00</Text>
 * <Text style={{ color: getAmountColor('expense') }}>-500.00</Text>
 * ```
 */
export function getAmountColor(type: 'income' | 'expense'): string {
  return type === 'income' ? colors.sageGreen : colors.textWhite;
}
