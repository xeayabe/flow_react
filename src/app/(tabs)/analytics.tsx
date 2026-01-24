import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  PieChart as PieChartIcon,
  BarChart3,
  ChevronDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react-native';
import Svg, { G, Path } from 'react-native-svg';
import { db } from '@/lib/db';
import {
  getCategoryAnalytics,
  getDateRange,
  DateRangeOption,
  CategorySpending,
  formatISOtoEuropean,
} from '@/lib/analytics-api';
import { formatCurrency } from '@/lib/transactions-api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = Math.min(SCREEN_WIDTH - 80, 280);

type ViewMode = 'pie' | 'bar' | 'both';
type TypeFilter = 'expense' | 'income';

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'this_month', label: 'This Budget Period' },
  { value: 'last_month', label: 'Last Budget Period' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
];

// Pie chart component using SVG
function PieChartComponent({ data, size, onSegmentPress }: { data: CategorySpending[]; size: number; onSegmentPress: (categoryId: string) => void }) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{ width: size / 1.5, height: size / 1.5, borderRadius: size / 3, backgroundColor: '#E5E7EB' }}
        />
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 8 }}>No data</Text>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const center = size / 2;
  const radius = size / 2.5;
  const innerRadius = radius * 0.6;

  let startAngle = -90;

  const segments = data.map((item) => {
    const percentage = item.amount / total;
    const angle = percentage * 360;
    const endAngle = startAngle + angle;

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

    return {
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      path,
      color: item.color,
      startAngleDeg: startAngle - angle,
      endAngleDeg: startAngle,
    };
  });

  // Detect which segment was clicked based on angle
  const handleChartPress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;

    // Calculate angle from center
    const dx = locationX - center;
    const dy = locationY - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if touch is within the pie ring (between inner and outer radius)
    if (distance >= innerRadius && distance <= radius) {
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      // Normalize to 0-360 range
      if (angle < 0) angle += 360;

      // Find which segment this angle belongs to
      for (const segment of segments) {
        const start = segment.startAngleDeg;
        const end = segment.endAngleDeg;

        // Handle wrap-around at 360/0
        let angleInRange = false;
        if (start < end) {
          angleInRange = angle >= start && angle < end;
        } else {
          angleInRange = angle >= start || angle < end;
        }

        if (angleInRange) {
          console.log('🎯 Pie segment clicked:', segment.categoryName, 'ID:', segment.categoryId, 'Angle:', angle);
          setSelectedSegment(segment.categoryId);
          onSegmentPress(segment.categoryId);
          return;
        }
      }
    }
  };

  return (
    <Pressable
      onPress={handleChartPress}
      style={{ width: size, height: size, position: 'relative' }}
    >
      <View style={{ width: size, height: size, position: 'relative' }}>
        {/* Visual pie chart */}
        <Svg width={size} height={size}>
          <G>
            {segments.map((segment) => (
              <Path
                key={segment.categoryId}
                d={segment.path}
                fill={segment.color}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ))}
          </G>
        </Svg>

        {/* Center text */}
        <View
          style={{
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            top: center - innerRadius * 0.6,
            left: center - innerRadius * 0.8,
            width: innerRadius * 1.6,
            height: innerRadius * 1.2,
            pointerEvents: 'none',
          }}
        >
          <Text style={{ fontSize: 12, color: '#6B7280' }}>Total</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(total)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// Bar chart component
function BarChartComponent({ data, maxWidth, onBarPress }: { data: CategorySpending[]; maxWidth: number; onBarPress: (categoryId: string) => void }) {
  if (data.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No data</Text>
      </View>
    );
  }

  const maxAmount = Math.max(...data.map((item) => item.amount));

  return (
    <View style={{ gap: 12 }}>
      {data.slice(0, 8).map((item) => {
        const barWidth = maxAmount > 0 ? (item.amount / maxAmount) * (maxWidth - 100) : 0;

        return (
          <Pressable
            key={item.categoryId}
            onPress={() => onBarPress(item.categoryId)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 96 }}>
              <Text style={{ fontSize: 12, color: '#4B5563' }} numberOfLines={1}>
                {item.categoryName}
              </Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  height: 24,
                  borderTopRightRadius: 6,
                  borderBottomRightRadius: 6,
                  width: Math.max(barWidth, 4),
                  backgroundColor: item.color,
                }}
              />
              <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// Category breakdown row
function CategoryRow({ item, onPress }: { item: CategorySpending; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{ width: 12, height: 12, borderRadius: 6, marginRight: 12, backgroundColor: item.color }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>
          {item.categoryName}
        </Text>
        <Text style={{ fontSize: 12, color: '#6B7280' }}>
          {item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
          {formatCurrency(item.amount)}
        </Text>
        <Text style={{ fontSize: 12, color: '#6B7280' }}>{item.percentage}%</Text>
      </View>
      <View style={{ width: 64, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
        <View
          style={{
            height: '100%',
            borderRadius: 4,
            width: `${Math.min(100, item.percentage)}%`,
            backgroundColor: item.color,
          }}
        />
      </View>
      <ArrowRight size={16} color="#9CA3AF" style={{ marginLeft: 8 }} />
    </Pressable>
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
    <View style={{ position: 'relative', zIndex: 10 }}>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: isOpen ? '#14B8A6' : '#E5E7EB',
          backgroundColor: isOpen ? '#F0FDFA' : 'white',
        }}
      >
        <Text style={{ fontSize: 14, color: '#374151', marginRight: 4 }}>{selectedOption?.label || label}</Text>
        <ChevronDown size={16} color="#6B7280" />
      </Pressable>

      {isOpen && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            backgroundColor: 'white',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            minWidth: 160,
            zIndex: 50,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
                backgroundColor: option.value === value ? '#F0FDFA' : 'white',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: option.value === value ? '#0F766E' : '#374151',
                  fontWeight: option.value === value ? '500' : '400',
                }}
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
    <View style={{ paddingHorizontal: 24, paddingVertical: 16, gap: 24 }}>
      <View style={{ height: 32, width: 192, backgroundColor: '#E5E7EB', borderRadius: 8 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ height: 40, width: 112, backgroundColor: '#E5E7EB', borderRadius: 8 }} />
        <View style={{ height: 40, width: 112, backgroundColor: '#E5E7EB', borderRadius: 8 }} />
      </View>
      <View style={{ backgroundColor: '#F3F4F6', borderRadius: 16, padding: 24, alignItems: 'center' }}>
        <View
          style={{ backgroundColor: '#E5E7EB', borderRadius: CHART_SIZE / 2, width: CHART_SIZE, height: CHART_SIZE }}
        />
      </View>
      <View style={{ gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ height: 64, backgroundColor: '#F3F4F6', borderRadius: 12 }} />
        ))}
      </View>
    </View>
  );
}

// Empty state component
function EmptyState({ type }: { type: TypeFilter }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <PieChartIcon size={32} color="#9CA3AF" />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
        No {type === 'expense' ? 'Expenses' : 'Income'} Found
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center' }}>
        {type === 'expense'
          ? 'Add some expenses to see your spending breakdown'
          : 'Add income transactions to see your earnings breakdown'}
      </Text>
    </View>
  );
}

export default function AnalyticsTabScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRangeOption>('this_month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('expense');
  const [viewMode, setViewMode] = useState<ViewMode>('both');

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

  const range = getDateRange(dateRange, paydayDay);

  const analyticsQuery = useQuery({
    queryKey: ['analytics', userId, householdId, range.start, range.end, typeFilter],
    queryFn: async () => {
      if (!userId || !householdId) return null;
      return getCategoryAnalytics(userId, householdId, range.start, range.end, typeFilter);
    },
    enabled: !!userId && !!householdId,
  });

  const isLoading = householdQuery.isLoading || analyticsQuery.isLoading;
  const analytics = analyticsQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
      {/* Header with Tabs */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Analytics</Text>
          <Pressable
            onPress={() => router.push('/transactions/trends')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ECFDF5', borderRadius: 8 }}
          >
            <TrendingUp size={16} color="#0D9488" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0D9488' }}>Trends</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>
          {range.label} ({formatISOtoEuropean(range.start)} to {formatISOtoEuropean(range.end)})
        </Text>
      </View>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 24, paddingVertical: 16, gap: 20 }}>
            {/* Filters */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', zIndex: 100 }}>
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
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={20} color="#0D9488" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>
                      Total {typeFilter === 'expense' ? 'Spending' : 'Income'}
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
                      {formatCurrency(analytics.totalAmount)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Categories</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      {analytics.categoryCount}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Average</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      {formatCurrency(analytics.averagePerCategory)}
                    </Text>
                  </View>
                  {analytics.topCategory && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Top Category</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                        {analytics.topCategory.categoryName}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* View Mode Toggle */}
            {analytics && analytics.categoryBreakdown.length > 0 && (
              <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 }}>
                {[
                  { value: 'pie', label: 'Pie', icon: PieChartIcon },
                  { value: 'bar', label: 'Bar', icon: BarChart3 },
                  { value: 'both', label: 'Both', icon: null },
                ].map(({ value, label, icon: Icon }) => (
                  <Pressable
                    key={value}
                    onPress={() => setViewMode(value as ViewMode)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      borderRadius: 8,
                      gap: 4,
                      backgroundColor: viewMode === value ? 'white' : 'transparent',
                      shadowColor: viewMode === value ? '#000' : 'transparent',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: viewMode === value ? 0.1 : 0,
                      shadowRadius: 2,
                      elevation: viewMode === value ? 2 : 0,
                    }}
                  >
                    {Icon && <Icon size={16} color={viewMode === value ? '#0D9488' : '#6B7280'} />}
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: viewMode === value ? '#0F766E' : '#6B7280',
                      }}
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
                  <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 16 }}>
                      {typeFilter === 'expense' ? 'Spending' : 'Income'} by Category
                    </Text>
                    <PieChartComponent
                      data={analytics.categoryBreakdown}
                      size={CHART_SIZE}
                      onSegmentPress={(categoryId) => {
                        console.log('🎯 Analytics: Pie segment clicked, categoryId:', categoryId);
                        router.push(`/(tabs)/transactions?category=${categoryId}`);
                      }}
                    />
                    {/* Legend */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                      {analytics.categoryBreakdown.slice(0, 6).map((item) => (
                        <View key={item.categoryId} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                          <Text style={{ fontSize: 12, color: '#4B5563' }}>{item.categoryName}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {(viewMode === 'bar' || viewMode === 'both') && (
                  <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 16 }}>
                      Top Categories
                    </Text>
                    <BarChartComponent
                      data={analytics.categoryBreakdown}
                      maxWidth={SCREEN_WIDTH - 80}
                      onBarPress={(categoryId) => {
                        console.log('📊 Analytics: Bar segment clicked, categoryId:', categoryId);
                        router.push(`/(tabs)/transactions?category=${categoryId}`);
                      }}
                    />
                  </View>
                )}

                {/* Category Breakdown Table */}
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 12 }}>
                    Category Breakdown
                  </Text>
                  {analytics.categoryBreakdown.map((item) => (
                    <CategoryRow
                      key={item.categoryId}
                      item={item}
                      onPress={() => {
                        console.log('🔗 Analytics: Category row clicked, categoryId:', item.categoryId);
                        router.push(`/(tabs)/transactions?category=${item.categoryId}`);
                      }}
                    />
                  ))}
                </View>
              </>
            ) : (
              <EmptyState type={typeFilter} />
            )}

            {/* Bottom padding */}
            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
