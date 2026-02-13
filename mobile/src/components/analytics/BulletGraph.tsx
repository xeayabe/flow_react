import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, getBudgetColor } from '@/constants/colors';

interface BulletGraphProps {
  categoryName: string;
  emoji: string;
  actual: number;
  budget: number;
  percentUsed: number;
}

export function BulletGraph({ categoryName, emoji, actual, budget, percentUsed }: BulletGraphProps) {
  const color = getBudgetColor(percentUsed);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.name}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.categoryName}>{categoryName}</Text>
        </View>
        <View style={styles.values}>
          <Text style={[styles.actual, { color }]}>
            {actual.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.budget}>
            of {budget.toLocaleString('de-CH', { minimumFractionDigits: 2 })} budget
          </Text>
        </View>
      </View>

      <View style={styles.bulletContainer}>
        {/* Background ranges */}
        <View style={styles.ranges}>
          <View style={[styles.range, styles.rangeGood]} />
          <View style={[styles.range, styles.rangeOk]} />
          <View style={[styles.range, styles.rangeCaution]} />
        </View>

        {/* Actual bar */}
        <View
          style={[
            styles.bar,
            { width: `${Math.min(percentUsed, 100)}%`, backgroundColor: color },
          ]}
        />

        {/* Budget marker */}
        <View style={styles.marker} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg, // 24px
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm, // 8px
  },
  name: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm, // 8px
    flex: 1,
  },
  emoji: {
    fontSize: 18, // Per analyticsdesign.md
  },
  categoryName: {
    ...typography.body, // 16px per design.md
    fontWeight: '600',
    color: colors.textWhite,
  },
  values: {
    alignItems: 'flex-end',
  },
  actual: {
    ...typography.bodyBold, // 16px, weight 600
    fontWeight: '700',
    fontVariant: ['tabular-nums'], // Monospaced numbers per design.md
  },
  budget: {
    ...typography.small, // 12px
    color: colors.textWhiteSecondary, // 0.7 opacity
  },
  bulletContainer: {
    position: 'relative',
    height: 24, // Per analyticsdesign.md bullet graph spec
    backgroundColor: colors.glassWhite,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ranges: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    flexDirection: 'row',
  },
  range: {
    height: '100%',
  },
  rangeGood: {
    width: '70%',
    backgroundColor: 'rgba(197, 212, 190, 0.3)', // budgetOnTrack with 30% opacity
  },
  rangeOk: {
    width: '20%',
    backgroundColor: 'rgba(229, 195, 153, 0.3)', // budgetProgressing with 30% opacity
  },
  rangeCaution: {
    width: '10%',
    backgroundColor: 'rgba(74, 141, 137, 0.3)', // budgetNearlyThere with 30% opacity
  },
  bar: {
    position: 'absolute',
    height: 8, // Centered vertically in 24px container
    top: 8,
    borderRadius: 4,
  },
  marker: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: colors.textWhite,
    opacity: 0.5,
    right: 0,
  },
});
