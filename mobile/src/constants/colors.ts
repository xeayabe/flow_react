/**
 * Flow App - Design Tokens & Colors
 *
 * Color palette designed to reduce financial anxiety through calm, soothing colors.
 * - NO harsh reds (associated with danger/debt)
 * - Uses sage green, soft lavender, and amber for status indicators
 * - All colors meet WCAG AA contrast requirements
 */

// ============================================================================
// PRIMARY COLORS
// ============================================================================

export const colors = {
  // --------------------------------------------------------------------------
  // Background & Context Colors
  // --------------------------------------------------------------------------
  contextDark: '#1A1C1E',      // Background gradient start
  contextTeal: '#2C5F5D',      // Background gradient end, primary actions, income

  // --------------------------------------------------------------------------
  // Accent Colors
  // --------------------------------------------------------------------------
  sageGreen: '#A8B5A1',        // Savings, positive actions, success states
  softLavender: '#B8A8C8',     // Expenses (NOT RED!), secondary information
  softAmber: '#E3A05D',        // Highlights, warnings (calm, not harsh)

  // --------------------------------------------------------------------------
  // Budget Status Colors (4-Tier System)
  // --------------------------------------------------------------------------
  budgetOnTrack: '#C5D4BE',     // 0-70% budget usage (green zone)
  budgetProgressing: '#E5C399',  // 70-90% budget usage (amber zone)
  budgetNearlyThere: '#4A8D89',  // 90-100% budget usage (teal zone)
  budgetFlowAdjusted: '#D4C4ED', // >100% budget usage (lavender - NOT RED!)

  // --------------------------------------------------------------------------
  // Text Colors
  // --------------------------------------------------------------------------
  textWhite: '#FFFFFF',                   // Primary text on dark backgrounds
  textWhiteSecondary: 'rgba(255, 255, 255, 0.7)',  // Secondary text (70% opacity)
  textWhiteTertiary: 'rgba(255, 255, 255, 0.6)',   // Tertiary text (60% opacity)
  textDark: '#1A1C1E',                    // Text on light backgrounds

  // --------------------------------------------------------------------------
  // Glass Morphism Effects
  // --------------------------------------------------------------------------
  glassWhite: 'rgba(255, 255, 255, 0.03)',  // Glass card backgrounds (3% opacity)
  glassBorder: 'rgba(255, 255, 255, 0.05)', // Glass card borders (5% opacity)
  glassHover: 'rgba(255, 255, 255, 0.08)',  // Hover state (8% opacity)

  // --------------------------------------------------------------------------
  // Semantic Colors (Chart & Data Visualization)
  // --------------------------------------------------------------------------
  chartBlue: '#2563EB',      // Needs category color
  chartOrange: '#F59E0B',    // Wants category color
  chartGreen: '#10B981',     // Savings category color
  chartPurple: '#8B5CF6',    // Income category color
  chartGray: '#6B7280',      // Other/Uncategorized
};

// ============================================================================
// SPACING SCALE
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 9999,
};

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

export const typography = {
  h1: { fontSize: 34, fontWeight: '700' as const, lineHeight: 41 },
  h2: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h3: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  h4: { fontSize: 20, fontWeight: '600' as const, lineHeight: 25 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get budget status color based on percentage used
 * @param percentUsed - Percentage of budget used (0-100+)
 * @returns Color hex string
 */
export function getBudgetColor(percentUsed: number): string {
  if (percentUsed <= 70) return colors.budgetOnTrack;
  if (percentUsed <= 90) return colors.budgetProgressing;
  if (percentUsed <= 100) return colors.budgetNearlyThere;
  return colors.budgetFlowAdjusted;
}

/**
 * Get budget status label based on percentage used
 * @param percentUsed - Percentage of budget used (0-100+)
 * @returns Status label
 */
export function getBudgetStatus(percentUsed: number): 'on-track' | 'progressing' | 'nearly-there' | 'flow-adjusted' {
  if (percentUsed <= 70) return 'on-track';
  if (percentUsed <= 90) return 'progressing';
  if (percentUsed <= 100) return 'nearly-there';
  return 'flow-adjusted';
}

/**
 * Format currency amount in Swiss format (CHF 1'234.56)
 * @param amount - Amount in CHF
 * @returns Formatted string
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ============================================================================
// DESIGN PHILOSOPHY NOTES
// ============================================================================

/**
 * FORBIDDEN COLORS (DO NOT USE):
 * - ❌ Harsh red (#FF0000, #DC143C) - Creates anxiety
 * - ❌ Bright orange (#FFA500, #FF6347) - Too aggressive
 *
 * ALTERNATIVE FOR WARNINGS/ALERTS:
 * - ✅ Use softAmber (#E3A05D) for gentle warnings
 * - ✅ Use budgetFlowAdjusted (#D4C4ED) for over-budget (lavender, not red)
 *
 * RATIONALE:
 * Traditional budgeting apps use aggressive reds that create financial stress.
 * Flow's palette is clinically selected to promote calm financial awareness.
 */
