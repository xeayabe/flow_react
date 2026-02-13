import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Polyline } from 'react-native-svg';
import { colors, spacing, typography } from '@/constants/colors';

interface TrendDataPoint {
  label: string; // "Nov", "Dec", "Jan", "Feb (current)"
  income: number;
  expenses: number;
  savingsRate: number;
}

interface IncomeTrendChartProps {
  data: TrendDataPoint[];
}

export function IncomeTrendChart({ data }: IncomeTrendChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No data available for trend chart</Text>
      </View>
    );
  }

  // Check if all values are zero
  const hasData = data.some(d => d.income > 0 || d.expenses > 0);
  if (!hasData) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No income or expenses recorded yet</Text>
        <Text style={styles.emptySubtext}>Add transactions to see your trend</Text>
      </View>
    );
  }

  // Chart dimensions
  const chartWidth = 320;
  const chartHeight = 180;
  const padding = 20;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  // Find max value for Y-axis scaling
  const maxValue = Math.max(
    ...data.flatMap(d => [d.income, d.expenses]),
    1 // Ensure minimum value of 1 to avoid division by zero
  );
  const yScale = maxValue > 0 ? plotHeight / (maxValue * 1.1) : 0; // 10% padding at top

  // Calculate X positions
  const xStep = plotWidth / (data.length - 1);

  // Generate points for income and expenses lines
  const incomePoints = data.map((point, index) => ({
    x: padding + index * xStep,
    y: chartHeight - padding - (point.income || 0) * yScale,
  }));

  const expensesPoints = data.map((point, index) => ({
    x: padding + index * xStep,
    y: chartHeight - padding - (point.expenses || 0) * yScale,
  }));

  // Convert to polyline format
  const incomePolyline = incomePoints.map(p => `${p.x},${p.y}`).join(' ');
  const expensesPolyline = expensesPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.chartPurple }]} />
          <Text style={styles.legendText}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.softLavender }]} />
          <Text style={styles.legendText}>Expenses</Text>
        </View>
      </View>

      {/* Chart */}
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines (optional) */}
        <Line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />

        {/* Income line */}
        <Polyline
          points={incomePolyline}
          fill="none"
          stroke={colors.chartPurple}
          strokeWidth="2"
        />

        {/* Expenses line */}
        <Polyline
          points={expensesPolyline}
          fill="none"
          stroke={colors.softLavender}
          strokeWidth="2"
        />

        {/* Income data points */}
        {incomePoints.map((point, index) => (
          <Circle
            key={`income-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={colors.chartPurple}
          />
        ))}

        {/* Expenses data points */}
        {expensesPoints.map((point, index) => (
          <Circle
            key={`expenses-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={colors.softLavender}
          />
        ))}
      </Svg>

      {/* X-axis labels */}
      <View style={styles.xAxisLabels}>
        {data.map((point, index) => (
          <Text key={index} style={styles.xAxisLabel}>
            {point.label}
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
    justifyContent: 'center',
    marginBottom: spacing.md, // 16px
    gap: spacing.lg, // 24px
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm, // 8px
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.small, // 13px per design.md
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
  emptySubtext: {
    ...typography.small, // 12px
    color: colors.textWhiteTertiary, // 0.5 opacity per design.md
    textAlign: 'center',
    marginTop: 4,
  },
});
