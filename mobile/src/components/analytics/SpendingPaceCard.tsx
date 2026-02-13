import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, formatCurrency } from '@/constants/colors';
import {
  calculateSpendingPace,
  getPaceColor,
  getPaceIcon,
  getPaceLabel,
} from '@/lib/spending-pace';

interface SpendingPaceCardProps {
  categoryId: string;
  categoryName: string;
  emoji: string;
  budgetAmount: number;
  spentSoFar: number;
  periodStart: string;
  periodEnd: string;
}

export function SpendingPaceCard({
  categoryName,
  emoji,
  budgetAmount,
  spentSoFar,
  periodStart,
  periodEnd,
}: SpendingPaceCardProps) {
  // Calculate pace metrics
  const pace = calculateSpendingPace({
    budgetAmount,
    spentSoFar,
    periodStart,
    periodEnd,
  });

  // Debug logging
  console.log('SpendingPaceCard Debug:', {
    periodStart,
    periodEnd,
    totalDays: pace.totalDays,
    daysElapsed: pace.daysElapsed,
    daysRemaining: pace.daysRemaining,
    today: new Date().toISOString().split('T')[0],
  });

  // Don't render if insufficient data
  if (pace.status === 'insufficient-data') {
    return null;
  }

  // Get status styling
  const statusColor = getPaceColor(pace.status);
  const statusIcon = getPaceIcon(pace.status);
  const statusLabel = getPaceLabel(pace.status);

  // Calculate projected total spending
  const projectedTotal = pace.projectedTotal !== null ? pace.projectedTotal : 0;

  return (
    <View style={styles.card}>
      {/* 2x2 Grid: Daily Rate & Days Left */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel} numberOfLines={1}>Daily Rate</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {pace.dailySpendRate !== null ? formatCurrency(pace.dailySpendRate) : 'CHF 0.00'}
          </Text>
          <Text style={styles.metricSubtext} numberOfLines={1}>per day</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel} numberOfLines={1}>Resets In</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
            {pace.daysRemaining}
          </Text>
          <Text style={styles.metricSubtext} numberOfLines={1}>days</Text>
        </View>
      </View>

      {/* Period Timeline */}
      <View style={styles.timelineSection}>
        <Text style={styles.timelineLabel}>Period Timeline</Text>
        <View style={styles.timelineDates}>
          <Text style={styles.dateText}>{periodStart}</Text>
          <Text style={styles.dateText}>{periodEnd}</Text>
        </View>
        <View style={styles.timelineBar}>
          <View
            style={[
              styles.timelineProgress,
              {
                width: `${Math.min(pace.timeProgress, 100)}%`,
                backgroundColor: colors.contextTeal,
              },
            ]}
          />
          <View
            style={[
              styles.todayMarker,
              { left: `${Math.min(pace.timeProgress, 100)}%` },
            ]}
          >
            <View style={styles.todayDot} />
            <Text style={styles.todayLabel}>Today</Text>
          </View>
        </View>
      </View>

      {/* Budget Used vs Time Elapsed */}
      <View style={styles.comparisonGrid}>
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonLabel} numberOfLines={1}>Budget Used</Text>
          <Text style={[styles.comparisonPercent, { color: statusColor }]} numberOfLines={1} adjustsFontSizeToFit>
            {pace.budgetProgress.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonLabel} numberOfLines={1}>Time Elapsed</Text>
          <Text style={[styles.comparisonPercent, { color: colors.textWhite }]} numberOfLines={1} adjustsFontSizeToFit>
            {pace.timeProgress.toFixed(1)}%
          </Text>
          <Text style={styles.comparisonAmount} numberOfLines={1}>
            {pace.daysElapsed} of {pace.totalDays} days
          </Text>
        </View>
      </View>

      {/* Pace Indicator */}
      <View style={[styles.paceIndicator, { borderColor: statusColor, backgroundColor: `${statusColor}15` }]}>
        <Text style={[styles.paceMessage, { color: statusColor }]}>
          {statusIcon} {statusLabel}
        </Text>
      </View>

      {/* Projection */}
      <View style={styles.projectionCard}>
        <Text style={styles.projectionLabel}>Projected Total Spending</Text>
        <Text
          style={[
            styles.projectionValue,
            {
              color: projectedTotal > budgetAmount
                ? getPaceColor('too-fast')
                : colors.sageGreen,
            },
          ]}
        >
          {formatCurrency(projectedTotal)}
        </Text>
        <Text style={styles.projectionSubtext}>
          by end of period
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassWhite, // 0.03 opacity
    borderRadius: 16, // Per design.md
    borderWidth: 1,
    borderColor: colors.glassBorder, // 0.05 opacity
    padding: spacing.lg, // 24px
    marginBottom: spacing.md, // 16px
    gap: spacing.lg, // 24px between sections (increased for better breathing room)
  },
  // 2x2 Metrics Grid (Daily Rate & Days Left)
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md, // 16px
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.lg, // 24px (increased for better spacing)
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textWhiteSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20, // Reduced to prevent wrapping
    fontWeight: '700',
    color: colors.textWhite,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 12,
    color: colors.textWhiteSecondary,
    fontWeight: '500',
  },
  // Period Timeline
  timelineSection: {
    gap: 12,
  },
  timelineLabel: {
    fontSize: 13, // Reduced from 14
    fontWeight: '600',
    color: colors.textWhite,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13, // Increased from 12
    color: colors.textWhiteSecondary,
    fontWeight: '500',
  },
  timelineBar: {
    height: 10, // Increased from 8
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
  },
  timelineProgress: {
    height: '100%',
    borderRadius: 5,
  },
  todayMarker: {
    position: 'absolute',
    top: -4,
    transform: [{ translateX: -7 }],
    alignItems: 'center',
  },
  todayDot: {
    width: 14, // Increased from 12
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textWhite,
    borderWidth: 2,
    borderColor: colors.contextTeal,
  },
  todayLabel: {
    fontSize: 11, // Increased from 10
    fontWeight: '700',
    color: colors.textWhite,
    marginTop: 6,
  },
  // Budget Used vs Time Elapsed Comparison
  comparisonGrid: {
    flexDirection: 'row',
    gap: spacing.md, // 16px
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.lg, // 24px (increased)
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  comparisonLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textWhiteSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonPercent: {
    fontSize: 32, // Reduced to prevent wrapping
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 6,
  },
  comparisonAmount: {
    fontSize: 12, // Increased from 11
    color: colors.textWhiteSecondary,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    fontWeight: '500',
  },
  // Pace Indicator
  paceIndicator: {
    borderWidth: 2,
    borderRadius: 12,
    padding: spacing.lg, // 24px (increased)
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  paceMessage: {
    fontSize: 16, // Increased from 15
    fontWeight: '600',
  },
  // Projection Card
  projectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: spacing.lg, // 24px (increased)
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  projectionLabel: {
    fontSize: 11,
    color: colors.textWhiteSecondary,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectionValue: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  projectionSubtext: {
    fontSize: 12,
    color: colors.textWhiteSecondary,
    fontWeight: '500',
  },
});
