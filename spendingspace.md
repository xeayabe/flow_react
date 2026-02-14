# Spending Pace - Feature Documentation

**Feature ID**: US-TBD  
**Version**: 1.0  
**Date**: February 12, 2026  
**Author**: Analytics & Budget Team  
**Status**: Planned for Phase 2  
**Priority**: P1 (High Value)

---

## Table of Contents

1. [Overview](#overview)
2. [User Value](#user-value)
3. [How It Works](#how-it-works)
4. [Calculations](#calculations)
5. [UI/UX Specifications](#uiux-specifications)
6. [Implementation Guide](#implementation-guide)
7. [API Requirements](#api-requirements)
8. [Testing Scenarios](#testing-scenarios)
9. [Edge Cases & Handling](#edge-cases--handling)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### What is Spending Pace?

**Spending Pace** is a proactive budget tracking feature that compares how fast a user is spending their budget against the passage of time in their current budget period. It answers the critical question: **"At my current rate, will I stay within budget?"**

### Core Concept

Instead of just showing "You've spent CHF 1,800 of CHF 3,000", Spending Pace adds temporal context:

```
Time Progress:    52% of period elapsed
Budget Progress:  60% of budget used

Insight: You're spending 16% faster than time ⚠️
```

This transforms reactive budgeting ("Oh no, I overspent!") into **proactive financial awareness** ("I need to slow down now").

---

## User Value

### Problem It Solves

**Traditional budgeting apps** show:
- ✅ How much you've spent
- ✅ How much budget remains
- ❌ **Whether your current pace is sustainable**

**Example Scenario**:
```
User sees: "CHF 1,800 / 3,000 spent"
User thinks: "I have CHF 1,200 left, I'm fine!"

Reality: 16 days into 31-day period
At current pace: Will spend CHF 3,488 (CHF 488 over budget)
```

Without pace awareness, users don't realize they're overspending until it's too late.

### Flow's Solution

**Spending Pace provides**:
1. **Early Warning**: "You're spending too fast" on day 10, not day 30
2. **Actionable Guidance**: "Spend max CHF 80/day to stay on budget"
3. **Positive Reinforcement**: "Great discipline! You're under pace"
4. **Projection**: "At this rate: CHF 3,488 total by period end"

---

## How It Works

### Visual Explanation

```
Budget Period: Jan 25 - Feb 24 (31 days)
Today: Feb 10 (16 days in)

┌────────────────────────────────────────────────────┐
│ 🛒 Groceries                                       │
│                                                    │
│ CHF 1,800 / 3,000 spent                            │
│                                                    │
│ Budget Used (60%)                                  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                    │
│ Time Elapsed (52%)                                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                                    │
│ ⚠️ Spending 16% faster than time                  │
│                                                    │
│ 📊 At this rate: CHF 3,488 total (CHF 488 over)   │
│ 💡 Spend max CHF 80/day to stay on budget         │
└────────────────────────────────────────────────────┘
```

### Pace Ratio Formula

```
Pace Ratio = Budget Progress / Time Progress

Where:
- Budget Progress = (Amount Spent / Budget Amount) × 100
- Time Progress = (Days Elapsed / Total Days) × 100
```

**Interpretation**:
- **Ratio > 1.15**: Spending too fast ⚠️
- **Ratio 0.85 - 1.15**: On track ✓
- **Ratio < 0.85**: Under budget pace ✅

**Why 15% tolerance?**  
Accounts for natural spending variability (e.g., buying groceries in bulk once a week vs. daily small purchases).

---

## Calculations

### Step-by-Step Algorithm

#### Input Data

```typescript
interface PaceCalculationInput {
  budgetAmount: number;      // Total budget for category
  spentSoFar: number;        // Amount spent to date
  periodStart: Date;         // Budget period start date
  periodEnd: Date;           // Budget period end date
  currentDate?: Date;        // Defaults to today
}
```

#### Step 1: Time Calculations

```typescript
function calculateTimeMetrics(
  periodStart: Date,
  periodEnd: Date,
  currentDate: Date = new Date()
) {
  // Total days in budget period
  const totalDays = daysBetween(periodStart, periodEnd);
  
  // Days elapsed since period start
  const daysElapsed = daysBetween(periodStart, currentDate);
  
  // Days remaining until period end
  const daysRemaining = totalDays - daysElapsed;
  
  // Percentage of period elapsed
  const timeProgress = (daysElapsed / totalDays) * 100;
  
  return { totalDays, daysElapsed, daysRemaining, timeProgress };
}

// Helper: Calculate days between two dates
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / msPerDay);
}
```

#### Step 2: Budget Calculations

```typescript
function calculateBudgetMetrics(
  budgetAmount: number,
  spentSoFar: number
) {
  // Percentage of budget used
  const budgetProgress = (spentSoFar / budgetAmount) * 100;
  
  // Budget remaining
  const budgetRemaining = budgetAmount - spentSoFar;
  
  return { budgetProgress, budgetRemaining };
}
```

#### Step 3: Pace Analysis

```typescript
function calculatePace(
  budgetProgress: number,
  timeProgress: number,
  daysElapsed: number,
  spentSoFar: number
) {
  // Avoid division by zero on day 1
  if (timeProgress === 0 || daysElapsed === 0) {
    return {
      paceRatio: null,
      status: 'insufficient-data',
      dailySpendRate: null,
    };
  }
  
  // Core pace ratio
  const paceRatio = budgetProgress / timeProgress;
  
  // Daily spending rate
  const dailySpendRate = spentSoFar / daysElapsed;
  
  // Determine status
  let status: 'too-fast' | 'on-track' | 'under-pace';
  if (paceRatio > 1.15) {
    status = 'too-fast';
  } else if (paceRatio < 0.85) {
    status = 'under-pace';
  } else {
    status = 'on-track';
  }
  
  return { paceRatio, status, dailySpendRate };
}
```

#### Step 4: Projections

```typescript
function calculateProjection(
  dailySpendRate: number,
  totalDays: number,
  budgetAmount: number
) {
  // Projected total spending by period end
  const projectedTotal = dailySpendRate * totalDays;
  
  // How much over/under budget
  const projectedVariance = projectedTotal - budgetAmount;
  
  return { projectedTotal, projectedVariance };
}
```

#### Step 5: Recommendations

```typescript
function calculateRecommendation(
  budgetRemaining: number,
  daysRemaining: number,
  status: string
) {
  // Can't recommend if no days left
  if (daysRemaining <= 0) {
    return {
      safeDailySpend: 0,
      message: 'Budget period ended',
    };
  }
  
  // Safe daily spend to stay on budget
  const safeDailySpend = budgetRemaining / daysRemaining;
  
  // Generate message based on status
  let message: string;
  if (status === 'too-fast') {
    message = `Spend max CHF ${safeDailySpend.toFixed(0)}/day to stay on budget`;
  } else if (status === 'under-pace') {
    const surplus = Math.abs(budgetRemaining);
    message = `Great pace! You could save CHF ${surplus.toFixed(0)} this period`;
  } else {
    message = `Stay on track with CHF ${safeDailySpend.toFixed(0)}/day`;
  }
  
  return { safeDailySpend, message };
}
```

#### Complete Function

```typescript
export function calculateSpendingPace(input: PaceCalculationInput) {
  const { budgetAmount, spentSoFar, periodStart, periodEnd, currentDate } = input;
  
  // Step 1: Time metrics
  const time = calculateTimeMetrics(periodStart, periodEnd, currentDate);
  
  // Step 2: Budget metrics
  const budget = calculateBudgetMetrics(budgetAmount, spentSoFar);
  
  // Step 3: Pace analysis
  const pace = calculatePace(
    budget.budgetProgress,
    time.timeProgress,
    time.daysElapsed,
    spentSoFar
  );
  
  // Return early if insufficient data
  if (pace.status === 'insufficient-data') {
    return {
      status: 'insufficient-data',
      message: 'Need at least 1 day of data to calculate pace',
    };
  }
  
  // Step 4: Projections
  const projection = calculateProjection(
    pace.dailySpendRate!,
    time.totalDays,
    budgetAmount
  );
  
  // Step 5: Recommendations
  const recommendation = calculateRecommendation(
    budget.budgetRemaining,
    time.daysRemaining,
    pace.status
  );
  
  return {
    // Time
    totalDays: time.totalDays,
    daysElapsed: time.daysElapsed,
    daysRemaining: time.daysRemaining,
    timeProgress: time.timeProgress,
    
    // Budget
    budgetAmount,
    spentSoFar,
    budgetRemaining: budget.budgetRemaining,
    budgetProgress: budget.budgetProgress,
    
    // Pace
    paceRatio: pace.paceRatio,
    status: pace.status,
    dailySpendRate: pace.dailySpendRate,
    
    // Projection
    projectedTotal: projection.projectedTotal,
    projectedVariance: projection.projectedVariance,
    
    // Recommendation
    safeDailySpend: recommendation.safeDailySpend,
    recommendationMessage: recommendation.message,
  };
}
```

---

## UI/UX Specifications

### Component: SpendingPaceCard

#### Visual Hierarchy

```
1. Category Name (emoji + text)
2. Amount Spent / Budget Total
3. Dual Progress Bars (visual comparison)
   - Budget Progress (colored by status)
   - Time Progress (always teal)
4. Status Message (color-coded)
5. Projection (if relevant)
6. Recommendation (actionable)
```

#### Design Tokens

```typescript
// Colors
const statusColors = {
  'too-fast': colors.budgetProgressing,    // #E5C399 (amber)
  'on-track': colors.contextTeal,          // #2C5F5D (teal)
  'under-pace': colors.sageGreen,          // #A8B5A1 (sage green)
};

// Spacing
padding: spacing.lg (24px)
gap: spacing.md (16px)

// Border
borderRadius: borderRadius.md (16px)
borderColor: colors.glassBorder
```

#### Typography

```typescript
// Category name
fontSize: 18
fontWeight: '700'
color: colors.textWhite

// Amount
fontSize: 15
color: colors.textWhiteSecondary

// Progress labels
fontSize: 13
color: colors.textWhiteSecondary

// Status
fontSize: 15
fontWeight: '600'
color: statusColors[status]

// Projection & recommendation
fontSize: 14
color: colors.textWhiteSecondary
```

#### Interactive States

**Default**:
- Background: `colors.glassWhite` (rgba(255, 255, 255, 0.03))
- Border: `colors.glassBorder` (rgba(255, 255, 255, 0.05))

**Press** (if tappable to category details):
- Background: `colors.glassHover` (rgba(255, 255, 255, 0.05))
- Scale: 0.98

**Accessibility**:
```typescript
accessibilityLabel={`${categoryName} spending pace: ${status}. 
  ${spentSoFar.toLocaleString('de-CH')} spent of ${budgetAmount.toLocaleString('de-CH')} budgeted. 
  ${timeProgress.toFixed(0)}% of period elapsed, ${budgetProgress.toFixed(0)}% of budget used. 
  ${recommendationMessage}`}
accessibilityRole="summary"
```

---

### Placement Options

#### Option 1: Dashboard Widget (Recommended)

**Location**: Main dashboard, after Financial Health Card, before transactions list

**Behavior**:
- Show pace for **top 3 most-spent categories** only
- Collapsed by default, tap to expand all
- Update in real-time as transactions are added

**Pros**:
- High visibility
- Proactive awareness
- Reduces need to navigate to budget screen

**Cons**:
- Adds vertical scroll length

---

#### Option 2: Budget Detail Screen

**Location**: When user taps a category from Budget screen

**Behavior**:
- Show pace prominently at top of category detail
- Below budget allocation, above transaction list

**Pros**:
- Contextual (only when user wants budget details)
- Doesn't clutter dashboard

**Cons**:
- Lower discoverability
- Reactive (user must navigate to see)

---

#### Option 3: Analytics Screen

**Location**: New section in Analytics redesign

**Behavior**:
- Show pace for **all categories** with budgets
- Sorted by pace ratio (fastest first)

**Pros**:
- Comprehensive view
- Fits analytics mindset

**Cons**:
- Too late (analytics is reflective, not proactive)
- Requires navigation

---

**Recommendation**: **Option 1 (Dashboard)** for primary placement + **Option 2 (Budget Detail)** for context

---

## Implementation Guide

### File Structure

```
/mobile/src/
├── components/budget/
│   ├── SpendingPaceCard.tsx          # Main component
│   └── __tests__/
│       └── SpendingPaceCard.test.tsx # Unit tests
├── lib/
│   ├── spending-pace.ts              # Calculation functions
│   └── __tests__/
│       └── spending-pace.test.ts     # Calculation tests
├── hooks/
│   └── useSpendingPace.ts            # Data fetching hook
└── app/(tabs)/
    └── index.tsx                     # Dashboard (integrate here)
```

---

### Step 1: Create Calculation Library

**File**: `/mobile/src/lib/spending-pace.ts`

```typescript
/**
 * Spending Pace Calculation Library
 * 
 * Calculates whether user is spending faster or slower than
 * the passage of time in their budget period.
 */

export interface SpendingPaceInput {
  budgetAmount: number;
  spentSoFar: number;
  periodStart: Date;
  periodEnd: Date;
  currentDate?: Date;
}

export interface SpendingPaceResult {
  // Time metrics
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  timeProgress: number;
  
  // Budget metrics
  budgetAmount: number;
  spentSoFar: number;
  budgetRemaining: number;
  budgetProgress: number;
  
  // Pace analysis
  paceRatio: number | null;
  status: 'too-fast' | 'on-track' | 'under-pace' | 'insufficient-data';
  dailySpendRate: number | null;
  
  // Projections
  projectedTotal: number | null;
  projectedVariance: number | null;
  
  // Recommendations
  safeDailySpend: number | null;
  recommendationMessage: string;
}

/**
 * Calculate days between two dates
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / msPerDay);
}

/**
 * Main spending pace calculation function
 */
export function calculateSpendingPace(
  input: SpendingPaceInput
): SpendingPaceResult {
  const {
    budgetAmount,
    spentSoFar,
    periodStart,
    periodEnd,
    currentDate = new Date(),
  } = input;
  
  // Validate inputs
  if (budgetAmount <= 0) {
    throw new Error('Budget amount must be greater than 0');
  }
  
  if (spentSoFar < 0) {
    throw new Error('Spent amount cannot be negative');
  }
  
  // Time calculations
  const totalDays = daysBetween(periodStart, periodEnd);
  const daysElapsed = daysBetween(periodStart, currentDate);
  const daysRemaining = totalDays - daysElapsed;
  const timeProgress = (daysElapsed / totalDays) * 100;
  
  // Budget calculations
  const budgetProgress = (spentSoFar / budgetAmount) * 100;
  const budgetRemaining = budgetAmount - spentSoFar;
  
  // Need at least 1 day of data
  if (daysElapsed === 0 || timeProgress === 0) {
    return {
      totalDays,
      daysElapsed,
      daysRemaining,
      timeProgress,
      budgetAmount,
      spentSoFar,
      budgetRemaining,
      budgetProgress,
      paceRatio: null,
      status: 'insufficient-data',
      dailySpendRate: null,
      projectedTotal: null,
      projectedVariance: null,
      safeDailySpend: null,
      recommendationMessage: 'Need at least 1 day of data to calculate pace',
    };
  }
  
  // Pace calculations
  const paceRatio = budgetProgress / timeProgress;
  const dailySpendRate = spentSoFar / daysElapsed;
  
  // Determine status
  let status: 'too-fast' | 'on-track' | 'under-pace';
  if (paceRatio > 1.15) {
    status = 'too-fast';
  } else if (paceRatio < 0.85) {
    status = 'under-pace';
  } else {
    status = 'on-track';
  }
  
  // Projections
  const projectedTotal = dailySpendRate * totalDays;
  const projectedVariance = projectedTotal - budgetAmount;
  
  // Recommendations
  const safeDailySpend = daysRemaining > 0 
    ? budgetRemaining / daysRemaining 
    : 0;
  
  let recommendationMessage: string;
  if (daysRemaining <= 0) {
    recommendationMessage = 'Budget period ended';
  } else if (status === 'too-fast') {
    recommendationMessage = `Spend max CHF ${safeDailySpend.toFixed(0)}/day to stay on budget`;
  } else if (status === 'under-pace') {
    recommendationMessage = `Great pace! You could save CHF ${Math.abs(budgetRemaining).toFixed(0)} this period`;
  } else {
    recommendationMessage = `Stay on track with CHF ${safeDailySpend.toFixed(0)}/day`;
  }
  
  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    timeProgress,
    budgetAmount,
    spentSoFar,
    budgetRemaining,
    budgetProgress,
    paceRatio,
    status,
    dailySpendRate,
    projectedTotal,
    projectedVariance,
    safeDailySpend,
    recommendationMessage,
  };
}

/**
 * Get color for pace status
 */
export function getPaceColor(status: SpendingPaceResult['status']): string {
  const colors = {
    'too-fast': '#E5C399',      // budgetProgressing (amber)
    'on-track': '#2C5F5D',      // contextTeal
    'under-pace': '#A8B5A1',    // sageGreen
    'insufficient-data': '#B8A8C8', // softLavender
  };
  
  return colors[status];
}

/**
 * Get icon for pace status
 */
export function getPaceIcon(status: SpendingPaceResult['status']): string {
  const icons = {
    'too-fast': '⚠️',
    'on-track': '✓',
    'under-pace': '✅',
    'insufficient-data': 'ℹ️',
  };
  
  return icons[status];
}

/**
 * Get human-readable status label
 */
export function getPaceLabel(status: SpendingPaceResult['status']): string {
  const labels = {
    'too-fast': 'Spending too fast',
    'on-track': 'On track',
    'under-pace': 'Under budget pace',
    'insufficient-data': 'Not enough data',
  };
  
  return labels[status];
}
```

---

### Step 2: Create React Component

**File**: `/mobile/src/components/budget/SpendingPaceCard.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, borderRadius, formatCurrency } from '@/lib/design-tokens';
import { 
  calculateSpendingPace, 
  getPaceColor, 
  getPaceIcon, 
  getPaceLabel 
} from '@/lib/spending-pace';

interface SpendingPaceCardProps {
  categoryId: string;
  categoryName: string;
  emoji: string;
  budgetAmount: number;
  spentSoFar: number;
  periodStart: Date;
  periodEnd: Date;
  onPress?: () => void;
}

export function SpendingPaceCard({
  categoryId,
  categoryName,
  emoji,
  budgetAmount,
  spentSoFar,
  periodStart,
  periodEnd,
  onPress,
}: SpendingPaceCardProps) {
  
  // Calculate pace metrics
  const pace = calculateSpendingPace({
    budgetAmount,
    spentSoFar,
    periodStart,
    periodEnd,
  });
  
  // Don't render if insufficient data
  if (pace.status === 'insufficient-data') {
    return null;
  }
  
  // Get status styling
  const statusColor = getPaceColor(pace.status);
  const statusIcon = getPaceIcon(pace.status);
  const statusLabel = getPaceLabel(pace.status);
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && onPress && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${categoryName} spending pace: ${statusLabel}. ${formatCurrency(spentSoFar)} spent of ${formatCurrency(budgetAmount)} budgeted. ${pace.timeProgress.toFixed(0)}% of period elapsed, ${pace.budgetProgress.toFixed(0)}% of budget used. ${pace.recommendationMessage}`}
    >
      {/* Header */}
      <Text style={styles.categoryName}>
        {emoji} {categoryName}
      </Text>
      
      {/* Amount */}
      <Text style={styles.amount}>
        CHF {formatCurrency(spentSoFar)} / {formatCurrency(budgetAmount)} spent
      </Text>
      
      {/* Dual Progress Bars */}
      <View style={styles.progressSection}>
        {/* Budget Progress */}
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>
            Budget Used ({pace.budgetProgress.toFixed(0)}%)
          </Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { 
                width: `${Math.min(pace.budgetProgress, 100)}%`,
                backgroundColor: statusColor,
              }
            ]} />
          </View>
        </View>
        
        {/* Time Progress */}
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>
            Time Elapsed ({pace.timeProgress.toFixed(0)}%)
          </Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { 
                width: `${pace.timeProgress}%`,
                backgroundColor: colors.contextTeal,
              }
            ]} />
          </View>
        </View>
      </View>
      
      {/* Status */}
      <Text style={[styles.status, { color: statusColor }]}>
        {statusIcon} {statusLabel}
      </Text>
      
      {/* Projection (only if over budget) */}
      {pace.projectedVariance !== null && pace.projectedVariance > 0 && (
        <Text style={styles.projection}>
          📊 At this rate: CHF {formatCurrency(pace.projectedTotal!)} total
          {' '}(CHF {formatCurrency(pace.projectedVariance)} over)
        </Text>
      )}
      
      {/* Recommendation */}
      <Text style={[
        styles.recommendation,
        { color: pace.status === 'too-fast' ? statusColor : colors.textWhiteSecondary }
      ]}>
        💡 {pace.recommendationMessage}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassWhite,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardPressed: {
    backgroundColor: colors.glassHover,
    transform: [{ scale: 0.98 }],
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 15,
    color: colors.textWhiteSecondary,
    marginBottom: spacing.md,
  },
  progressSection: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  progressItem: {
    gap: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textWhiteSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  projection: {
    fontSize: 14,
    color: colors.textWhiteSecondary,
    marginBottom: spacing.xs,
  },
  recommendation: {
    fontSize: 14,
    fontWeight: '500',
  },
});
```

---

### Step 3: Create Data Hook

**File**: `/mobile/src/hooks/useSpendingPace.ts`

```typescript
import { useMemo } from 'react';
import { useQuery } from '@/lib/instantdb';
import { calculateCurrentPeriod } from '@/lib/dates';

interface CategoryPaceData {
  categoryId: string;
  categoryName: string;
  emoji: string;
  budgetAmount: number;
  spentSoFar: number;
}

export function useSpendingPace(userId: string) {
  // Get current period dates
  const { periodStart, periodEnd } = calculateCurrentPeriod(userId);
  
  // Fetch budget and spending data
  const { data: budgets } = useQuery({
    budgets: {
      $: {
        where: {
          userId,
          periodStart,
          periodEnd,
        },
      },
    },
  });
  
  const { data: transactions } = useQuery({
    transactions: {
      $: {
        where: {
          userId,
          date: {
            $gte: periodStart,
            $lte: periodEnd,
          },
        },
      },
    },
  });
  
  // Calculate spending by category
  const categoryPaceData = useMemo(() => {
    if (!budgets || !transactions) return [];
    
    return budgets.map(budget => {
      // Sum transactions for this category
      const categoryTransactions = transactions.filter(
        t => t.categoryId === budget.categoryId
      );
      
      const spentSoFar = categoryTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      
      return {
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        emoji: budget.emoji,
        budgetAmount: budget.amount,
        spentSoFar,
      };
    })
    // Only show categories with budgets and spending
    .filter(c => c.budgetAmount > 0 && c.spentSoFar > 0)
    // Sort by pace ratio (fastest first)
    .sort((a, b) => {
      const ratioA = (a.spentSoFar / a.budgetAmount) / 
        ((new Date().getTime() - periodStart.getTime()) / 
         (periodEnd.getTime() - periodStart.getTime()));
      const ratioB = (b.spentSoFar / b.budgetAmount) / 
        ((new Date().getTime() - periodStart.getTime()) / 
         (periodEnd.getTime() - periodStart.getTime()));
      return ratioB - ratioA;
    })
    // Top 3 only for dashboard
    .slice(0, 3);
  }, [budgets, transactions, periodStart, periodEnd]);
  
  return {
    categoryPaceData,
    periodStart,
    periodEnd,
  };
}
```

---

### Step 4: Integrate into Dashboard

**File**: `/mobile/src/app/(tabs)/index.tsx`

```typescript
import { SpendingPaceCard } from '@/components/budget/SpendingPaceCard';
import { useSpendingPace } from '@/hooks/useSpendingPace';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { categoryPaceData, periodStart, periodEnd } = useSpendingPace(user.id);
  
  return (
    <ScrollView>
      {/* Existing components */}
      <FinancialHealthCard />
      
      {/* NEW: Spending Pace Section */}
      {categoryPaceData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>⏱️ Spending Pace</Text>
          <Text style={styles.sectionSubtitle}>
            How fast are you using your budget?
          </Text>
          
          {categoryPaceData.map(category => (
            <SpendingPaceCard
              key={category.categoryId}
              {...category}
              periodStart={periodStart}
              periodEnd={periodEnd}
              onPress={() => router.push(`/budget/${category.categoryId}`)}
            />
          ))}
        </View>
      )}
      
      {/* Rest of dashboard */}
    </ScrollView>
  );
}
```

---

## API Requirements

### Endpoint: Get Spending Pace Data

**Not needed** - Can be calculated client-side from existing data:
- Budget allocations (from `budgets` table)
- Transactions (from `transactions` table)
- Period dates (calculated from user's payday setting)

### Optional: Pre-calculated Server-side

For performance optimization, could add:

**Endpoint**: `GET /api/budget/spending-pace`

**Query Params**:
```typescript
{
  userId: string;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  topN?: number;       // Default 3 (for dashboard)
}
```

**Response**:
```typescript
{
  categories: Array<{
    categoryId: string;
    categoryName: string;
    emoji: string;
    budgetAmount: number;
    spentSoFar: number;
    paceRatio: number;
    status: 'too-fast' | 'on-track' | 'under-pace';
    projectedTotal: number;
    recommendedDailySpend: number;
  }>;
  periodStart: string;
  periodEnd: string;
  daysElapsed: number;
  daysRemaining: number;
}
```

---

## Testing Scenarios

### Unit Tests

**File**: `/mobile/src/lib/__tests__/spending-pace.test.ts`

```typescript
import { calculateSpendingPace } from '../spending-pace';

describe('calculateSpendingPace', () => {
  const periodStart = new Date('2026-01-25');
  const periodEnd = new Date('2026-02-24');
  
  it('calculates too-fast pace correctly', () => {
    const currentDate = new Date('2026-02-10'); // 16 days in
    const result = calculateSpendingPace({
      budgetAmount: 3000,
      spentSoFar: 1800,
      periodStart,
      periodEnd,
      currentDate,
    });
    
    expect(result.status).toBe('too-fast');
    expect(result.paceRatio).toBeGreaterThan(1.15);
    expect(result.projectedTotal).toBeGreaterThan(3000);
  });
  
  it('calculates on-track pace correctly', () => {
    const currentDate = new Date('2026-02-10'); // 16 days in
    const result = calculateSpendingPace({
      budgetAmount: 3000,
      spentSoFar: 1550, // ~52% of budget in 52% of time
      periodStart,
      periodEnd,
      currentDate,
    });
    
    expect(result.status).toBe('on-track');
    expect(result.paceRatio).toBeGreaterThanOrEqual(0.85);
    expect(result.paceRatio).toBeLessThanOrEqual(1.15);
  });
  
  it('calculates under-pace correctly', () => {
    const currentDate = new Date('2026-02-10'); // 16 days in
    const result = calculateSpendingPace({
      budgetAmount: 3000,
      spentSoFar: 1200, // Only 40% of budget in 52% of time
      periodStart,
      periodEnd,
      currentDate,
    });
    
    expect(result.status).toBe('under-pace');
    expect(result.paceRatio).toBeLessThan(0.85);
    expect(result.projectedTotal).toBeLessThan(3000);
  });
  
  it('handles first day of period', () => {
    const currentDate = new Date('2026-01-25'); // Day 0
    const result = calculateSpendingPace({
      budgetAmount: 3000,
      spentSoFar: 0,
      periodStart,
      periodEnd,
      currentDate,
    });
    
    expect(result.status).toBe('insufficient-data');
    expect(result.paceRatio).toBeNull();
  });
  
  it('handles last day of period', () => {
    const currentDate = new Date('2026-02-24'); // Last day
    const result = calculateSpendingPace({
      budgetAmount: 3000,
      spentSoFar: 2950,
      periodStart,
      periodEnd,
      currentDate,
    });
    
    expect(result.daysRemaining).toBe(0);
    expect(result.safeDailySpend).toBe(0);
  });
  
  it('handles overspending', () => {
    const currentDate = new Date('2026-02-10');
    const result = calculateSpendingPace({
      budgetAmount: 3000,
      spentSoFar: 3200, // Already over
      periodStart,
      periodEnd,
      currentDate,
    });
    
    expect(result.budgetProgress).toBeGreaterThan(100);
    expect(result.budgetRemaining).toBeLessThan(0);
  });
  
  it('throws error for invalid budget amount', () => {
    expect(() => {
      calculateSpendingPace({
        budgetAmount: 0,
        spentSoFar: 100,
        periodStart,
        periodEnd,
      });
    }).toThrow('Budget amount must be greater than 0');
  });
});
```

---

### Component Tests

**File**: `/mobile/src/components/budget/__tests__/SpendingPaceCard.test.tsx`

```typescript
import { render } from '@testing-library/react-native';
import { SpendingPaceCard } from '../SpendingPaceCard';

describe('SpendingPaceCard', () => {
  const defaultProps = {
    categoryId: 'cat-1',
    categoryName: 'Groceries',
    emoji: '🛒',
    budgetAmount: 3000,
    spentSoFar: 1800,
    periodStart: new Date('2026-01-25'),
    periodEnd: new Date('2026-02-24'),
  };
  
  it('renders correctly with too-fast pace', () => {
    const { getByText } = render(
      <SpendingPaceCard {...defaultProps} />
    );
    
    expect(getByText(/🛒 Groceries/)).toBeTruthy();
    expect(getByText(/1,800/)).toBeTruthy();
    expect(getByText(/3,000/)).toBeTruthy();
    expect(getByText(/Spending too fast/)).toBeTruthy();
  });
  
  it('shows projection when over budget', () => {
    const { getByText } = render(
      <SpendingPaceCard {...defaultProps} />
    );
    
    expect(getByText(/At this rate:/)).toBeTruthy();
  });
  
  it('does not render with insufficient data', () => {
    const { container } = render(
      <SpendingPaceCard
        {...defaultProps}
        spentSoFar={0}
      />
    );
    
    expect(container.children.length).toBe(0);
  });
  
  it('handles press event', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <SpendingPaceCard {...defaultProps} onPress={onPress} />
    );
    
    const card = getByRole('button');
    card.props.onPress();
    
    expect(onPress).toHaveBeenCalled();
  });
});
```

---

### Manual Testing Scenarios

| Scenario | Setup | Expected Result |
|----------|-------|-----------------|
| **Too Fast** | Budget: 3000, Spent: 1800, Day 16/31 | Amber warning, "Spending too fast", projection over budget |
| **On Track** | Budget: 3000, Spent: 1550, Day 16/31 | Teal checkmark, "On track", no projection |
| **Under Pace** | Budget: 3000, Spent: 1200, Day 16/31 | Green checkmark, "Under budget pace", savings message |
| **First Day** | Budget: 3000, Spent: 0, Day 0/31 | No card rendered |
| **Last Day** | Budget: 3000, Spent: 2950, Day 31/31 | Shows status, no daily recommendation |
| **Over Budget** | Budget: 3000, Spent: 3200, Day 16/31 | Still calculates pace, shows negative remaining |
| **Zero Budget** | Budget: 0, Spent: 500 | Error or no card |
| **Fractional Days** | Mid-day calculation | Rounds down days elapsed |

---

## Edge Cases & Handling

### Edge Case 1: First Day of Period (Day 0)

**Problem**: Can't calculate daily rate with 0 days elapsed

**Solution**: Return `insufficient-data` status
```typescript
if (daysElapsed === 0) {
  return { status: 'insufficient-data', ... };
}
```

**UI**: Don't render card at all

---

### Edge Case 2: Last Day of Period

**Problem**: 0 days remaining, can't recommend daily spend

**Solution**: Set `safeDailySpend = 0`, message = "Budget period ended"
```typescript
if (daysRemaining <= 0) {
  safeDailySpend = 0;
  message = 'Budget period ended';
}
```

**UI**: Show status but no daily recommendation

---

### Edge Case 3: Already Over Budget

**Problem**: `budgetRemaining` is negative

**Solution**: Still calculate pace, show negative remaining
```typescript
// Allow negative budgetRemaining
const budgetRemaining = budgetAmount - spentSoFar; // Can be negative

// Recommendation changes
if (budgetRemaining < 0) {
  message = `You're CHF ${Math.abs(budgetRemaining).toFixed(0)} over budget — avoid new spending`;
}
```

**UI**: Show red-amber color, strong recommendation

---

### Edge Case 4: Zero Spending

**Problem**: User has budget but hasn't spent anything

**Solution**: Don't render card (not useful until spending starts)
```typescript
if (spentSoFar === 0) {
  return null; // Don't render
}
```

---

### Edge Case 5: Budget Changed Mid-Period

**Problem**: User adjusted budget after period started

**Solution**: Use current budget amount (not historical)
- Phase 1: Accept some inaccuracy
- Phase 2: Use budget snapshots (US-069) for historical accuracy

---

### Edge Case 6: Shared vs Personal Expenses

**Problem**: Should pace include only personal or personal + shared?

**Solution**: Pace should include **all expenses that affect budget**
- Personal expenses: Full amount
- Shared expenses: Only user's split portion

```typescript
// In calculation
const spentSoFar = transactions.reduce((sum, t) => {
  if (t.isShared) {
    // Only count user's portion
    return sum + (t.amount * user.splitPercentage / 100);
  } else {
    // Full amount
    return sum + t.amount;
  }
}, 0);
```

---

### Edge Case 7: Multiple Budget Periods

**Problem**: What if user changes payday mid-month?

**Solution**: Pace only applies to **current period**
- Recalculates when period changes
- Previous periods not affected

---

## Future Enhancements

### Phase 3: Smart Alerts

**Concept**: Proactive notifications when pace changes

**Examples**:
- "⚠️ Your Groceries pace just shifted to 'too fast' — spent CHF 450 this week"
- "✅ Great week! Your Dining Out pace improved from 'too fast' to 'on track'"

**Implementation**:
- Track pace daily
- Compare to yesterday
- Send push notification on status change

---

### Phase 4: Pace Trends

**Concept**: Show pace over time (historical view)

**Visualization**:
```
Groceries Pace Trend (Last 6 Months)

Jan  Feb  Mar  Apr  May  Jun
 ✅   ⚠️   ✅   ✓   ⚠️   ✅

Average: 0.98x (slightly under pace)
```

**User Value**: See if pace is improving or deteriorating

---

### Phase 5: Category Groups

**Concept**: Pace for budget types (Needs/Wants/Savings)

**Example**:
```
Overall Needs Pace: On track (0.97x)
├─ Groceries: Under pace (0.82x)
├─ Rent: On track (1.00x)
└─ Utilities: Too fast (1.22x)
```

---

### Phase 6: Predictive Pace

**Concept**: ML-based prediction accounting for patterns

**Example**:
```typescript
// Factor in known upcoming expenses
const upcomingExpenses = getRecurringExpenses(categoryId);
const adjustedPace = calculatePace({
  ...input,
  spentSoFar: spentSoFar + upcomingExpenses,
});
```

**User Value**: "You're on track now, but rent is due in 5 days — adjust pace"

---

## Documentation Checklist

### Before Implementation

- [ ] Review calculations with sample data
- [ ] Confirm UI placement (dashboard vs budget detail)
- [ ] Validate design token usage
- [ ] Review accessibility requirements

### During Implementation

- [ ] Write unit tests for calculation functions
- [ ] Write component tests
- [ ] Manual test all edge cases
- [ ] Verify Swiss currency formatting
- [ ] Test with real user data

### After Implementation

- [ ] Update user-stories.md with new US-TBD
- [ ] Add to technical-specs.md
- [ ] Update CLAUDE.md with component patterns
- [ ] Create user-facing help text
- [ ] Add to onboarding tutorial (optional)

---

## Summary

### Key Metrics

| Metric | Value |
|--------|-------|
| **Implementation Time** | 8-12 hours |
| **Complexity** | Medium |
| **User Value** | High (proactive budget awareness) |
| **Dependencies** | Budget system, transaction tracking |
| **Priority** | P1 (Phase 2) |

### Files Created

1. `/mobile/src/lib/spending-pace.ts` - Calculation logic
2. `/mobile/src/components/budget/SpendingPaceCard.tsx` - UI component
3. `/mobile/src/hooks/useSpendingPace.ts` - Data fetching
4. Tests for all above

### Files Modified

1. `/mobile/src/app/(tabs)/index.tsx` - Dashboard integration

### Success Criteria

- [ ] Calculations accurate within ±1%
- [ ] UI renders in <100ms
- [ ] All edge cases handled gracefully
- [ ] Accessibility WCAG AA compliant
- [ ] User testing shows 90%+ comprehension

---

**Document Version**: 1.0  
**Last Updated**: February 12, 2026  
**Next Review**: After Phase 2 implementation  
**Maintained By**: Analytics & Budget Team

---

*This document is the authoritative specification for the Spending Pace feature. All implementations should reference this document for calculations, UI design, and behavior.*