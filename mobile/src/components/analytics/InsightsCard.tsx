import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/colors';

interface Insight {
  type: 'positive' | 'attention' | 'neutral';
  icon: string;
  message: string;
}

interface InsightsCardProps {
  insights: Insight[];
}

function getInsightColor(type: Insight['type']): string {
  switch (type) {
    case 'positive':
      return colors.sageGreen; // #A8B5A1
    case 'attention':
      return colors.budgetProgressing; // #E5C399
    case 'neutral':
      return colors.softLavender; // #B8A8C8
  }
}

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>💡 Insights & Recommendations</Text>

      {insights.map((insight, index) => (
        <View
          key={index}
          style={[styles.insightItem, { borderLeftColor: getInsightColor(insight.type) }]}
        >
          <Text style={styles.insightIcon}>{insight.icon}</Text>
          <Text style={styles.insightText}>{insight.message}</Text>
        </View>
      ))}

      {insights.length === 0 && (
        <Text style={styles.emptyText}>No insights available yet. Keep tracking your spending!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.glassWhite, // 0.03 opacity per design.md
    borderRadius: 16, // Per design.md border radius md
    borderWidth: 1,
    borderColor: colors.glassBorder, // 0.05 opacity
    padding: spacing.lg, // 24px per design.md card padding
    marginBottom: spacing.md, // 16px
  },
  header: {
    ...typography.h4, // 20px, weight 600 per design.md
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: spacing.md, // 16px
  },
  insightItem: {
    flexDirection: 'row',
    backgroundColor: colors.glassWhite, // Glass background per analyticsdesign.md
    borderLeftWidth: 3, // Per analyticsdesign.md insight spec
    borderRadius: spacing.sm, // 8px
    padding: spacing.md, // 16px per analyticsdesign.md
    marginBottom: spacing.sm, // 8px per analyticsdesign.md
    gap: 12,
  },
  insightIcon: {
    fontSize: 20, // Per analyticsdesign.md
  },
  insightText: {
    flex: 1,
    ...typography.caption, // 14px per design.md
    lineHeight: 21, // 1.5x font size per design.md
    color: colors.textWhite,
  },
  emptyText: {
    ...typography.caption, // 14px
    color: colors.textWhiteSecondary, // 0.7 opacity
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
