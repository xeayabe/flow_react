import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/colors';

interface FinancialHealthCardProps {
  netPosition: number;
  netPositionTrend: number;
  income: number;
  expenses: number;
  savingsRate: number;
  status: 'on-track' | 'progressing' | 'nearly-there' | 'flow-adjusted';
}

export function FinancialHealthCard({
  netPosition,
  netPositionTrend,
  income,
  expenses,
  savingsRate,
  status,
}: FinancialHealthCardProps) {
  const statusConfig = {
    'on-track': { label: 'On Track 💚', color: colors.budgetOnTrack },
    'progressing': { label: 'Progressing Well 🟡', color: colors.budgetProgressing },
    'nearly-there': { label: 'Nearly There 🔵', color: colors.budgetNearlyThere },
    'flow-adjusted': { label: 'Flow Adjusted 💜', color: colors.budgetFlowAdjusted },
  };

  return (
    <View style={styles.card}>
      <View style={styles.healthStatus}>
        <Text style={styles.netPosition} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          CHF {netPosition.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {netPositionTrend !== 0 && (
            <Text style={styles.trend}> {netPositionTrend >= 0 ? '↑' : '↓'} {Math.abs(netPositionTrend).toFixed(0)}%</Text>
          )}
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig[status].color }]}>
          <Text style={styles.statusText}>{statusConfig[status].label}</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Income</Text>
          <Text style={[styles.statValue, { color: colors.textWhite }]}>
            {(income || 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Expenses</Text>
          <Text style={[styles.statValue, { color: colors.softLavender }]}>
            {(expenses || 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Savings Rate</Text>
          <Text style={[styles.statValue, { color: colors.sageGreen }]}>
            {savingsRate.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassWhite, // 0.03 opacity per design.md
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder, // 0.05 opacity
    padding: spacing.lg, // 24px
    marginBottom: spacing.md, // 16px
  },
  healthStatus: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  netPosition: {
    fontSize: 48, // Per design.md "Amount (large)" = 48px
    fontWeight: '700',
    color: colors.sageGreen,
    marginBottom: spacing.sm,
    fontVariant: ['tabular-nums'], // Monospaced numbers per design.md
  },
  trend: {
    fontSize: 18,
    color: colors.textWhite,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20, // Pills per design.md
    marginBottom: spacing.lg,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.contextDark, // Text on light badge background
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1, // Equal width distribution
  },
  statLabel: {
    ...typography.small, // 12px per design.md
    color: colors.textWhiteSecondary, // 0.7 opacity
    marginBottom: 4,
    textTransform: 'uppercase', // Per design.md label style
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'], // Monospaced numbers per design.md
  },
});
