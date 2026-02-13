import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, formatCurrency } from '@/constants/colors';

interface TreeMapItem {
  categoryId: string;
  categoryName: string;
  emoji: string;
  amount: number;
  percentage: number;
  color: string;
}

interface TreeMapChartProps {
  data: TreeMapItem[];
}

export function TreeMapChart({ data }: TreeMapChartProps) {
  // Sort by amount (largest first)
  const sorted = [...data].sort((a, b) => b.amount - a.amount);

  // Take top 6 for better heatmap layout
  const top6 = sorted.slice(0, 6);

  const handlePress = (categoryId: string) => {
    router.push(`/(tabs)/transactions?category=${categoryId}`);
  };

  if (top6.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No spending data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Row 1: Large tile (50%) + 2 medium tiles (25% each) */}
      <View style={styles.row}>
        {top6[0] && (
          <Pressable
            style={[
              styles.tile,
              styles.tileLarge,
              { backgroundColor: top6[0].color, opacity: 0.85 },
            ]}
            onPress={() => handlePress(top6[0].categoryId)}
          >
            <Text style={styles.emojiLarge}>{top6[0].emoji}</Text>
            <Text style={styles.labelLarge} numberOfLines={1} ellipsizeMode="tail">
              {top6[0].categoryName}
            </Text>
            <Text style={styles.percentLarge}>{top6[0].percentage.toFixed(0)}%</Text>
            <Text style={styles.amountLarge} numberOfLines={1} ellipsizeMode="tail">
              {formatCurrency(top6[0].amount)}
            </Text>
          </Pressable>
        )}

        <View style={styles.column}>
          {top6[1] && (
            <Pressable
              style={[
                styles.tile,
                styles.tileMedium,
                { backgroundColor: top6[1].color, opacity: 0.75 },
              ]}
              onPress={() => handlePress(top6[1].categoryId)}
            >
              <Text style={styles.emojiMedium}>{top6[1].emoji}</Text>
              <Text style={styles.labelMedium} numberOfLines={1} ellipsizeMode="tail">
                {top6[1].categoryName}
              </Text>
              <Text style={styles.percentMedium}>{top6[1].percentage.toFixed(0)}%</Text>
            </Pressable>
          )}

          {top6[2] && (
            <Pressable
              style={[
                styles.tile,
                styles.tileMedium,
                { backgroundColor: top6[2].color, opacity: 0.75 },
              ]}
              onPress={() => handlePress(top6[2].categoryId)}
            >
              <Text style={styles.emojiMedium}>{top6[2].emoji}</Text>
              <Text style={styles.labelMedium} numberOfLines={1} ellipsizeMode="tail">
                {top6[2].categoryName}
              </Text>
              <Text style={styles.percentMedium}>{top6[2].percentage.toFixed(0)}%</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Row 2: 3 small tiles (33% each) */}
      <View style={styles.row}>
        {top6[3] && (
          <Pressable
            style={[
              styles.tile,
              styles.tileSmall,
              { backgroundColor: top6[3].color, opacity: 0.65 },
            ]}
            onPress={() => handlePress(top6[3].categoryId)}
          >
            <Text style={styles.emojiSmall}>{top6[3].emoji}</Text>
            <Text style={styles.labelSmall} numberOfLines={1} ellipsizeMode="tail">
              {top6[3].categoryName}
            </Text>
            <Text style={styles.percentSmall}>{top6[3].percentage.toFixed(0)}%</Text>
          </Pressable>
        )}

        {top6[4] && (
          <Pressable
            style={[
              styles.tile,
              styles.tileSmall,
              { backgroundColor: top6[4].color, opacity: 0.65 },
            ]}
            onPress={() => handlePress(top6[4].categoryId)}
          >
            <Text style={styles.emojiSmall}>{top6[4].emoji}</Text>
            <Text style={styles.labelSmall} numberOfLines={1} ellipsizeMode="tail">
              {top6[4].categoryName}
            </Text>
            <Text style={styles.percentSmall}>{top6[4].percentage.toFixed(0)}%</Text>
          </Pressable>
        )}

        {top6[5] && (
          <Pressable
            style={[
              styles.tile,
              styles.tileSmall,
              { backgroundColor: top6[5].color, opacity: 0.65 },
            ]}
            onPress={() => handlePress(top6[5].categoryId)}
          >
            <Text style={styles.emojiSmall}>{top6[5].emoji}</Text>
            <Text style={styles.labelSmall} numberOfLines={1} ellipsizeMode="tail">
              {top6[5].categoryName}
            </Text>
            <Text style={styles.percentSmall}>{top6[5].percentage.toFixed(0)}%</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs, // 4px gap between rows
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs, // 4px gap between tiles
    marginBottom: spacing.xs,
  },
  column: {
    flex: 1,
    gap: spacing.xs,
  },
  tile: {
    borderRadius: spacing.sm, // 8px
    padding: spacing.md, // 16px
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle border
  },

  // Large tile (50% width, double height)
  tileLarge: {
    flex: 1,
    minHeight: 160,
  },

  // Medium tiles (25% width each, stacked)
  tileMedium: {
    minHeight: 76, // (160 - 4) / 2
  },

  // Small tiles (33% width each)
  tileSmall: {
    flex: 1,
    minHeight: 80,
  },

  // Large tile text styles
  emojiLarge: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: spacing.xs,
  },
  percentLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: spacing.xs,
  },
  amountLarge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhite,
    fontVariant: ['tabular-nums'],
    opacity: 0.9,
  },

  // Medium tile text styles
  emojiMedium: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  labelMedium: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: spacing.xs,
  },
  percentMedium: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textWhite,
  },

  // Small tile text styles
  emojiSmall: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: spacing.xs,
  },
  percentSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textWhite,
  },

  emptyText: {
    ...typography.caption,
    color: colors.textWhiteSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: spacing.lg,
  },
});
