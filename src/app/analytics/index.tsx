import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  PieChart as PieChartIcon,
  BarChart3,
  ChevronDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import { db } from '@/lib/db';
import {
  getCategoryAnalytics,
  getDateRange,
  DateRangeOption,
  CategorySpending,
} from '@/lib/analytics-api';
import { formatCurrency } from '@/lib/transactions-api';
import { cn } from '@/lib/cn';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = Math.min(SCREEN_WIDTH - 80, 280);

type ViewMode = 'pie' | 'bar' | 'both';
type TypeFilter = 'expense' | 'income';

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'this_month', label: 'This Period' },
  { value: 'last_month', label: 'Last Period' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
];

// Pie chart component using SVG
function PieChartComponent({ data, size }: { data: CategorySpending[]; size: number }) {
  if (data.length === 0) {
    return (
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Circle cx={size / 2} cy={size / 2} r={size / 3} fill="#E5E7EB" />
        <Text className="text-gray-400 text-sm mt-2">No data</Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const center = size / 2;
  const radius = size / 2.5;
  const innerRadius = radius * 0.6;

  let startAngle = -90; // Start from top

  const paths = data.map((item, index) => {
    const percentage = item.amount / total;
    const angle = percentage * 360;
    const endAngle = startAngle + angle;

    // Calculate path
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    startAngle = endAngle;

    return (
      <Path
        key={item.categoryId}
        d={path}
        fill={item.color}
        stroke="#FFFFFF"
        strokeWidth={2}
      />
    );
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G>{paths}</G>
      </Svg>
      {/* Center text */}
      <View
        className="absolute items-center justify-center"
        style={{
          top: center - innerRadius * 0.6,
          left: center - innerRadius * 0.8,
          width: innerRadius * 1.6,
          height: innerRadius * 1.2,
        }}
      >
        <Text className="text-xs text-gray-500">Total</Text>
        <Text className="text-base font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(total)}
        </Text>
      </View>
    </View>
  );
}

// Bar chart component
function BarChartComponent({
  data,
  maxWidth,
}: {
  data: CategorySpending[];
  maxWidth: number;
}) {
  if (data.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-gray-400 text-sm">No data</Text>
      </View>
    );
  }

  const maxAmount = Math.max(...data.map((item) => item.amount));

  return (
    <View className="gap-3">
      {data.slice(0, 8).map((item, index) => {
        const barWidth = maxAmount > 0 ? (item.amount / maxAmount) * (maxWidth - 100) : 0;

        return (
          <Animated.View
            key={item.categoryId}
            entering={FadeInDown.delay(index * 50).duration(300)}
            className="flex-row items-center gap-3"
          >
            <View className="w-24">
              <Text className="text-xs text-gray-600" numberOfLines={1}>
                {item.categoryName}
              </Text>
            </View>
            <View className="flex-1 flex-row items-center gap-2">
              <View
                className="h-6 rounded-r-md"
                style={{
                  width: Math.max(barWidth, 4),
                  backgroundColor: item.color,
                }}
              />
              <Text className="text-xs text-gray-700 font-medium">
                {formatCurrency(item.amount)}
              </Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

// Category breakdown row
function CategoryRow({
  item,
  onPress,
  index,
}: {
  item: CategorySpending;
  onPress: () => void;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 30).duration(200)}>
      <Pressable
        onPress={onPress}
        className="flex-row items-center py-3 px-4 bg-white rounded-xl mb-2 active:bg-gray-50"
      >
        <View
          className="w-3 h-3 rounded-full mr-3"
          style={{ backgroundColor: item.color }}
        />
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900">
            {item.categoryName}
          </Text>
          <Text className="text-xs text-gray-500">
            {item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View className="items-end mr-2">
          <Text className="text-sm font-semibold text-gray-900">
            {formatCurrency(item.amount)}
          </Text>
          <Text className="text-xs text-gray-500">{item.percentage}%</Text>
        </View>
        <View className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, item.percentage)}%`,
              backgroundColor: item.color,
            }}
          />
        </View>
        <ArrowRight size={16} color="#9CA3AF" className="ml-2" />
      </Pressable>
    </Animated.View>
  );
}

// Filter dropdown component
function FilterDropdown<T extends string>({
  value,
  options,
  onSelect,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onSelect: (value: T) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View className="relative z-10">
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        className={cn(
          'flex-row items-center px-3 py-2 rounded-lg border',
          isOpen ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white'
        )}
      >
        <Text className="text-sm text-gray-700 mr-1">{selectedOption?.label || label}</Text>
        <ChevronDown size={16} color="#6B7280" />
      </Pressable>

      {isOpen && (
        <View className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg min-w-[140px] z-50">
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'px-4 py-3 border-b border-gray-100',
                option.value === value && 'bg-teal-50'
              )}
            >
              <Text
                className={cn(
                  'text-sm',
                  option.value === value ? 'text-teal-700 font-medium' : 'text-gray-700'
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// Loading skeleton
function AnalyticsSkeleton() {
  return (
    <View className="px-6 py-4 gap-6">
      <View className="h-8 w-48 bg-gray-200 rounded-lg" />
      <View className="flex-row gap-3">
        <View className="h-10 w-28 bg-gray-200 rounded-lg" />
        <View className="h-10 w-28 bg-gray-200 rounded-lg" />
      </View>
      <View className="bg-gray-100 rounded-2xl p-6 items-center">
        <View
          className="bg-gray-200 rounded-full"
          style={{ width: CHART_SIZE, height: CHART_SIZE }}
        />
      </View>
      <View className="gap-3">
        {[1, 2, 3, 4].map((i) => (
          <View key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </View>
    </View>
  );
}

// Empty state component
function EmptyState({ type }: { type: TypeFilter }) {
  const router = useRouter();

  return (
    <View className="items-center justify-center py-16 px-6">
      <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
        <PieChartIcon size={32} color="#9CA3AF" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        No {type === 'expense' ? 'Expenses' : 'Income'} Found
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-6">
        {type === 'expense'
          ? 'Add some expenses to see your spending breakdown'
          : 'Add income transactions to see your earnings breakdown'}
      </Text>
      <Pressable
        onPress={() => router.push('/transactions/add')}
        className="bg-teal-600 px-6 py-3 rounded-xl active:bg-teal-700"
      >
        <Text className="text-white font-semibold">Add Transaction</Text>
      </Pressable>
    </View>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRangeOption>('this_month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('expense');
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  // Get user and household info
  const { user } = db.useAuth();

  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const householdsResult = await db.queryOnce({
        households: { $: { where: { createdByUserId: userRecord.id } } },
      });

      const household = householdsResult.data.households?.[0];
      if (!household) throw new Error('No household found');

      return { userRecord, household };
    },
    enabled: !!user?.email,
  });

  const userId = householdQuery.data?.userRecord?.id;
  const householdId = householdQuery.data?.household?.id;
  const paydayDay = householdQuery.data?.household?.paydayDay ?? 25;

  // Get date range
  const range = getDateRange(dateRange, paydayDay);

  // Get analytics data
  const analyticsQuery = useQuery({
    queryKey: ['analytics', userId, householdId, range.start, range.end, typeFilter],
    queryFn: async () => {
      if (!userId || !householdId) return null;
      return getCategoryAnalytics(userId, householdId, range.start, range.end, typeFilter);
    },
    enabled: !!userId && !!householdId,
  });

  // Refetch on focus
  const { refetch } = analyticsQuery;
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const isLoading = householdQuery.isLoading || analyticsQuery.isLoading;
  const analytics = analyticsQuery.data;

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/(tabs)/transactions?category=${categoryId}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-4"
        >
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">Analytics</Text>
          <Text className="text-xs text-gray-500">
            {range.label} • {range.start} to {range.end}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-6 py-4 gap-5">
            {/* Filters */}
            <View className="flex-row gap-3 flex-wrap">
              <FilterDropdown
                value={dateRange}
                options={DATE_RANGE_OPTIONS}
                onSelect={setDateRange}
                label="Date Range"
              />
              <FilterDropdown
                value={typeFilter}
                options={[
                  { value: 'expense', label: 'Expenses' },
                  { value: 'income', label: 'Income' },
                ]}
                onSelect={setTypeFilter}
                label="Type"
              />
            </View>

            {/* Summary Stats */}
            {analytics && analytics.categoryBreakdown.length > 0 && (
              <Animated.View
                entering={FadeIn.duration(300)}
                className="bg-white rounded-2xl p-5 border border-gray-100"
              >
                <View className="flex-row items-center gap-3 mb-4">
                  <View className="w-10 h-10 rounded-lg bg-teal-100 items-center justify-center">
                    <TrendingUp size={20} color="#0D9488" />
                  </View>
                  <View>
                    <Text className="text-sm text-gray-500">
                      Total {typeFilter === 'expense' ? 'Spending' : 'Income'}
                    </Text>
                    <Text className="text-2xl font-bold text-gray-900">
                      {formatCurrency(analytics.totalAmount)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-xs text-gray-500">Categories</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {analytics.categoryCount}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500">Average</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatCurrency(analytics.averagePerCategory)}
                    </Text>
                  </View>
                  {analytics.topCategory && (
                    <View className="items-end">
                      <Text className="text-xs text-gray-500">Top Category</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {analytics.topCategory.categoryName}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* View Mode Toggle */}
            {analytics && analytics.categoryBreakdown.length > 0 && (
              <View className="flex-row bg-gray-100 rounded-xl p-1">
                {[
                  { value: 'pie', label: 'Pie', icon: PieChartIcon },
                  { value: 'bar', label: 'Bar', icon: BarChart3 },
                  { value: 'both', label: 'Both', icon: null },
                ].map(({ value, label, icon: Icon }) => (
                  <Pressable
                    key={value}
                    onPress={() => setViewMode(value as ViewMode)}
                    className={cn(
                      'flex-1 flex-row items-center justify-center py-2 rounded-lg gap-1',
                      viewMode === value && 'bg-white shadow-sm'
                    )}
                  >
                    {Icon && (
                      <Icon
                        size={16}
                        color={viewMode === value ? '#0D9488' : '#6B7280'}
                      />
                    )}
                    <Text
                      className={cn(
                        'text-sm font-medium',
                        viewMode === value ? 'text-teal-700' : 'text-gray-500'
                      )}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Charts */}
            {analytics && analytics.categoryBreakdown.length > 0 ? (
              <>
                {(viewMode === 'pie' || viewMode === 'both') && (
                  <Animated.View
                    entering={FadeIn.duration(400)}
                    className="bg-white rounded-2xl p-5 items-center border border-gray-100"
                  >
                    <Text className="text-sm font-medium text-gray-700 mb-4">
                      {typeFilter === 'expense' ? 'Spending' : 'Income'} by Category
                    </Text>
                    <PieChartComponent
                      data={analytics.categoryBreakdown}
                      size={CHART_SIZE}
                    />
                    {/* Legend */}
                    <View className="flex-row flex-wrap justify-center gap-3 mt-4">
                      {analytics.categoryBreakdown.slice(0, 6).map((item) => (
                        <View key={item.categoryId} className="flex-row items-center gap-1">
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <Text className="text-xs text-gray-600">{item.categoryName}</Text>
                        </View>
                      ))}
                    </View>
                  </Animated.View>
                )}

                {(viewMode === 'bar' || viewMode === 'both') && (
                  <Animated.View
                    entering={FadeIn.delay(100).duration(400)}
                    className="bg-white rounded-2xl p-5 border border-gray-100"
                  >
                    <Text className="text-sm font-medium text-gray-700 mb-4">
                      Top Categories
                    </Text>
                    <BarChartComponent
                      data={analytics.categoryBreakdown}
                      maxWidth={SCREEN_WIDTH - 80}
                    />
                  </Animated.View>
                )}

                {/* Category Breakdown Table */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-3">
                    Category Breakdown
                  </Text>
                  {analytics.categoryBreakdown.map((item, index) => (
                    <CategoryRow
                      key={item.categoryId}
                      item={item}
                      index={index}
                      onPress={() => handleCategoryPress(item.categoryId)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <EmptyState type={typeFilter} />
            )}

            {/* Bottom padding */}
            <View className="h-8" />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
