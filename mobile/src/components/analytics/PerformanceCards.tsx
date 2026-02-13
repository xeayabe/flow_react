import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '@/constants/colors';

interface PerformanceInsight {
  categoryId: string;
  categoryName: string;
  emoji: string;
  metric: string;
  type: 'consistent' | 'trending-up';
}

interface PerformanceCardsProps {
  mostConsistent: PerformanceInsight | null;
  trendingUp: PerformanceInsight | null;
}

export function PerformanceCards({ mostConsistent, trendingUp }: PerformanceCardsProps) {
  if (!mostConsistent && !trendingUp) {
    return null;
  }

  const handlePress = (categoryId: string) => {
    router.push(`/(tabs)/transactions?category=${categoryId}`);
  };

  return (
    <View style={styles.container}>
      {mostConsistent && (
        <Pressable
          style={[styles.card, styles.consistentCard]}
          onPress={() => handlePress(mostConsistent.categoryId)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardLabel}>Most Consistent</Text>
          </View>
          <Text style={styles.categoryName}>
            {mostConsistent.emoji} {mostConsistent.categoryName}
          </Text>
          <Text style={styles.metric}>{mostConsistent.metric}</Text>
        </Pressable>
      )}

      {trendingUp && (
        <Pressable
          style={[styles.card, styles.trendingCard]}
          onPress={() => handlePress(trendingUp.categoryId)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📈</Text>
            <Text style={styles.cardLabel}>Trending Up</Text>
          </View>
          <Text style={styles.categoryName}>
            {trendingUp.emoji} {trendingUp.categoryName}
          </Text>
          <Text style={styles.metric}>{trendingUp.metric}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm, // 8px
    marginTop: spacing.md, // 16px
  },
  card: {
    flex: 1,
    borderRadius: spacing.sm, // 8px
    borderWidth: 1,
    padding: spacing.md, // 16px
    minHeight: 100,
  },
  consistentCard: {
    backgroundColor: `${colors.sageGreen}15`, // 8% opacity
    borderColor: `${colors.sageGreen}40`, // 25% opacity
  },
  trendingCard: {
    backgroundColor: `${colors.softAmber}15`, // 8% opacity
    borderColor: `${colors.softAmber}40`, // 25% opacity
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs, // 4px
    marginBottom: spacing.sm, // 8px
  },
  cardIcon: {
    fontSize: 16,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textWhiteSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textWhite,
    marginBottom: spacing.xs, // 4px
  },
  metric: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textWhiteSecondary,
  },
});
