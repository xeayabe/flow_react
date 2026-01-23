import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BudgetPeriodSummary } from '@/lib/trends-api';

interface LineChartProps {
  data: BudgetPeriodSummary[];
}

export default function LineChart({ data }: LineChartProps) {
  const { width } = Dimensions.get('window');
  const chartWidth = width - 48; // px-6 on both sides = 48
  const chartHeight = 250;

  if (!data || data.length < 2) {
    return (
      <View className="h-64 items-center justify-center">
        <Text className="text-sm text-gray-600">Insufficient data</Text>
      </View>
    );
  }

  // Calculate bounds
  const allValues = data.flatMap((d) => [d.income, d.expenses]);
  const maxValue = Math.max(...allValues, 1);

  // Normalize values to 0-1 range
  const normalizeValue = (value: number) => (value / maxValue) * (chartHeight - 60);

  return (
    <Animated.View entering={FadeIn.duration(600)} className="w-full">
      <View className="relative" style={{ height: chartHeight, width: chartWidth }}>
        {/* Grid lines and labels */}
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = chartHeight - 40 - (percent / 100) * (chartHeight - 60);
          const value = Math.round((percent / 100) * maxValue / 500) * 500;
          return (
            <View key={`grid-${percent}`} className="absolute left-0 right-0" style={{ top: y }}>
              <View className="border-t border-gray-200" style={{ borderStyle: 'dashed' }} />
              <Text className="text-xs text-gray-500 absolute -left-12" style={{ top: -8 }}>
                {value > 0 ? `${value / 1000}k` : '0'}
              </Text>
            </View>
          );
        })}

        {/* Data visualization - bars/columns instead of lines for simplicity */}
        <View className="flex-row items-flex-end justify-between px-2" style={{ height: chartHeight - 40 }}>
          {data.map((period, i) => {
            const incomHeight = normalizeValue(period.income);
            const expenseHeight = normalizeValue(period.expenses);
            const maxHeight = Math.max(incomHeight, expenseHeight);

            return (
              <View key={`${period.periodStart}-${i}`} className="items-center flex-1 mx-0.5">
                {/* Income bar */}
                <View className="absolute w-1.5 bg-green-500 rounded-t" style={{ height: incomHeight }} />
                {/* Expense bar */}
                <View className="absolute w-1.5 bg-red-500 rounded-t" style={{ height: expenseHeight, marginLeft: 8 }} />
              </View>
            );
          })}
        </View>

        {/* X-axis */}
        <View className="border-t border-gray-300 mt-2 flex-row items-center justify-between px-2">
          {data.map((d, i) => {
            // Show every 2nd label to avoid crowding
            if (data.length > 6 && i % 2 !== 0) return <View key={`label-empty-${i}`} className="flex-1" />;
            return (
              <Text key={`label-${i}`} className="text-xs text-gray-600 flex-1 text-center">
                {d.periodLabel.split(' ')[0]}
              </Text>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View className="flex-row justify-center gap-6 mt-4">
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 bg-green-500 rounded" />
          <Text className="text-xs text-gray-700">Income</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 bg-red-500 rounded" />
          <Text className="text-xs text-gray-700">Expenses</Text>
        </View>
      </View>
    </Animated.View>
  );
}
