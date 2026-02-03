// Flow Design System - Swiss Precision Aesthetic

export const colors = {
  // Primary Palette
  contextTeal: '#2C5F5D',
  contextSage: '#A8B5A1',
  contextLavender: '#B4A7D6',
  contextDark: '#1A1C1E',

  // Budget Status (4-tier system - NO RED!)
  budgetOnTrack: '#A8B5A1',      // 0-70%: Sage Green
  budgetProgressing: '#D4A574',   // 70-90%: Soft Amber
  budgetNearlyThere: '#2C5F5D',   // 90-100%: Deep Teal
  budgetFlowAdjusted: '#B4A7D6',  // >100%: Soft Lavender

  // Neutral (replaces harsh reds)
  neutral600: '#4B5563',
  neutral700: '#374151',
  neutral800: '#1F2937',

  // Glassmorphism
  glassWhite: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.05)',
  glassHover: 'rgba(255, 255, 255, 0.05)',

  // Destructive (ONLY for delete/sign out)
  destructive: '#DC2626',
};

export const gradients = {
  heroBg: 'linear-gradient(135deg, #2C5F5D 0%, #1e4442 100%)',
  pageBg: 'linear-gradient(180deg, #1A1C1E 0%, #2C5F5D 100%)',
};

export const shadows = {
  glass: '0 8px 32px rgba(0, 0, 0, 0.2)',
  hero: '0 20px 40px rgba(0, 0, 0, 0.3)',
  fab: '0 8px 24px rgba(44, 95, 93, 0.4)',
};

/**
 * Get budget status color based on spent percentage (0-100+)
 * Swiss precision - no red alerts, only mindful guidance
 */
export function getBudgetStatusColor(spentPercent: number): string {
  if (spentPercent <= 70) return colors.budgetOnTrack;
  if (spentPercent <= 90) return colors.budgetProgressing;
  if (spentPercent <= 100) return colors.budgetNearlyThere;
  return colors.budgetFlowAdjusted;
}

/**
 * Format CHF currency with Swiss precision
 * Examples: CHF 1'234.50, CHF 0.00, CHF -150.00
 */
export function formatCHF(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Split into integer and decimal parts
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  // Format integer with Swiss thousand separator (')
  const formattedInteger = integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");

  // Always show 2 decimal places
  const formattedDecimal = decimalPart.toString().padStart(2, '0');

  const sign = isNegative ? '-' : '';
  return `${sign}CHF ${formattedInteger}.${formattedDecimal}`;
}

/**
 * Glassmorphism utility classes for React Native
 * Use with inline styles or combine with className
 */
export const glassStyles = {
  base: {
    backgroundColor: colors.glassWhite,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backdropFilter: 'blur(10px)',
  },
  hover: {
    backgroundColor: colors.glassHover,
  },
  card: {
    backgroundColor: colors.glassWhite,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    backgroundColor: colors.glassWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
};

/**
 * Generate glassmorphism style object with custom opacity
 */
export function createGlassStyle(opacity: number = 0.03, blur: number = 10) {
  return {
    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
    borderWidth: 1,
    borderColor: `rgba(255, 255, 255, ${opacity + 0.02})`,
    backdropFilter: `blur(${blur}px)`,
  };
}

/**
 * Typography scale matching Swiss precision
 */
export const typography = {
  hero: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
    letterSpacing: -1,
  },
  h1: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
};

/**
 * Spacing scale (multiples of 4)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Border radius scale
 */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
