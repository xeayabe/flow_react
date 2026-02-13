import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Polyline } from 'react-native-svg';
import { colors, spacing, typography } from '@/constants/colors';

interface CategoryTrendData {
  periods: string[]; // ["Nov", "Dec", "Jan", "Feb"]
  categories: Array<{
    categoryId: string;
    categoryName: string;
    values: number[]; // Amounts for each period
    color: string;
  }>;
}

interface CategoryTrendChartProps {
  data: CategoryTrendData;
}

export function CategoryTrendChart({ data }: CategoryTrendChartProps) {
  if (data.categories.length === 0 || data.periods.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No category data available for trend chart</Text>
      </View>
    );
  }

  // Chart dimensions
  const chartWidth = 320;
  const chartHeight = 200;
  const padding = 20;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  // Find max value across all categories for Y-axis scaling
  const maxValue = Math.max(
    ...data.categories.flatMap(cat => cat.values),
    1 // Ensure minimum value of 1 to avoid division by zero
  );
  const yScale = maxValue > 0 ? plotHeight / (maxValue * 1.1) : 0; // 10% padding at top

  // Calculate X positions
  const xStep = plotWidth / (data.periods.length - 1);

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legend}>
        {data.categories.map((category) => (
          <View key={category.categoryId} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: category.color }]} />
            <Text style={styles.legendText}>{category.categoryName}</Text>
          </View>
        ))}
      </View>

      {/* Chart */}
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid line */}
        <Line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />

        {/* Render lines for each category */}
        {data.categories.map((category) => {
          // Generate points for this category
          const points = category.values.map((value, index) => ({
            x: padding + index * xStep,
            y: chartHeight - padding - (value || 0) * yScale,
          }));

          // Convert to polyline format
          const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

          return (
            <React.Fragment key={category.categoryId}>
              {/* Line */}
              <Polyline
                points={polyline}
                fill="none"
                stroke={category.color}
                strokeWidth="2"
              />

              {/* Data points */}
              {points.map((point, index) => (
                <Circle
                  key={`${category.categoryId}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill={category.color}
                />
              ))}
            </React.Fragment>
          );
        })}
      </Svg>

      {/* X-axis labels */}
      <View style={styles.xAxisLabels}>
        {data.periods.map((period, index) => (
          <Text key={index} style={styles.xAxisLabel}>
            {period}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md, // 16px
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing.md, // 16px
    gap: 12, // Per analyticsdesign.md legend spec
    maxWidth: 320,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11, // Per analyticsdesign.md legend font size
    color: colors.textWhite,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 320 - 40, // chartWidth - padding*2
    marginTop: spacing.sm, // 8px
    paddingHorizontal: spacing.lg, // 20px
  },
  xAxisLabel: {
    fontSize: 11, // Per analyticsdesign.md chart label spec
    color: colors.textWhiteSecondary, // 0.7 opacity
    textAlign: 'center',
    flex: 1,
  },
  emptyText: {
    ...typography.caption, // 14px
    color: colors.textWhiteSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
