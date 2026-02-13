import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, spacing, typography } from '@/constants/colors';

interface SlopeChartItem {
  categoryId: string;
  categoryName: string;
  emoji: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
}

interface SlopeChartProps {
  data: SlopeChartItem[];
}

export function SlopeChart({ data }: SlopeChartProps) {
  // Find max value for Y-axis scaling
  const maxValue = Math.max(
    ...data.flatMap((d) => [d.previousValue, d.currentValue]),
    1 // Ensure minimum value of 1 to avoid division by zero
  );

  const calculateY = (value: number): number => {
    // Map to 15-45 range (60px total - 15px padding top/bottom)
    if (maxValue === 0) return 30; // Center if no data
    const percentage = value / maxValue;
    return 60 - (percentage * 30 + 15);
  };

  return (
    <View style={styles.container}>
      {data.map((item) => {
        const isIncrease = item.changePercent > 0;
        const endColor = isIncrease ? colors.budgetProgressing : colors.sageGreen;

        return (
          <View key={item.categoryId} style={styles.item}>
            <Text style={styles.label}>
              {item.emoji} {item.categoryName}
            </Text>

            <View style={styles.lineContainer}>
              <Svg width="100%" height="60">
                <Defs>
                  <LinearGradient id={`grad-${item.categoryId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={colors.softLavender} />
                    <Stop offset="100%" stopColor={endColor} />
                  </LinearGradient>
                </Defs>

                <Line
                  x1="10%"
                  y1={calculateY(item.previousValue)}
                  x2="90%"
                  y2={calculateY(item.currentValue)}
                  stroke={`url(#grad-${item.categoryId})`}
                  strokeWidth="2"
                />

                <Circle cx="10%" cy={calculateY(item.previousValue)} r="4" fill={colors.softLavender} />

                <Circle cx="90%" cy={calculateY(item.currentValue)} r="4" fill={endColor} />
              </Svg>
            </View>

            <View style={styles.values}>
              <Text style={styles.valueLeft}>{item.previousValue.toLocaleString('de-CH')}</Text>

              <View
                style={[
                  styles.change,
                  {
                    backgroundColor: isIncrease
                      ? 'rgba(229, 195, 153, 0.2)'
                      : 'rgba(168, 181, 161, 0.2)',
                  },
                ]}
              >
                <Text style={[styles.changeText, { color: endColor }]}>
                  {item.previousValue === 0 ? 'NEW' : (
                    `${isIncrease ? '+' : ''}${item.changePercent}% ${isIncrease ? '↑' : '↓'}`
                  )}
                </Text>
              </View>

              <Text style={styles.valueRight}>{item.currentValue.toLocaleString('de-CH')}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md, // 16px
  },
  item: {
    marginBottom: spacing.lg, // 24px per analyticsdesign.md
  },
  label: {
    ...typography.small, // 13px per design.md
    color: colors.textWhiteSecondary, // 0.7 opacity
    marginBottom: spacing.sm, // 8px
  },
  lineContainer: {
    height: 60, // Per analyticsdesign.md slope chart spec
    marginBottom: spacing.sm, // 8px
  },
  values: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLeft: {
    ...typography.bodyBold, // 16px, weight 600
    fontWeight: '700',
    color: colors.softLavender,
    fontVariant: ['tabular-nums'], // Monospaced numbers per design.md
  },
  valueRight: {
    ...typography.bodyBold, // 16px, weight 600
    fontWeight: '700',
    color: colors.contextTeal,
    fontVariant: ['tabular-nums'], // Monospaced numbers per design.md
  },
  change: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12, // Per design.md border radius sm
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
