import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * Shimmer skeleton component with pulsing opacity animation
 */
const ShimmerSkeleton: React.FC<{ width?: string | number; height: number; borderRadius?: number }> = ({
  width = '100%',
  height,
  borderRadius = 8,
}) => {
  const opacity = useSharedValue(0.6);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const style = typeof width === 'string' ? { width, height, borderRadius } : { width, height, borderRadius };

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          ...style,
          backgroundColor: '#E5E7EB',
        } as any,
      ]}
    />
  );
};

/**
 * Card skeleton for Total Balance and This Month Spending cards
 */
export const CardSkeleton: React.FC = () => (
  <View className="flex-1 rounded-xl overflow-hidden p-4 bg-white border border-gray-100 gap-3">
    <ShimmerSkeleton width="60%" height={14} />
    <ShimmerSkeleton width="80%" height={28} />
    <ShimmerSkeleton width="70%" height={12} />
  </View>
);

/**
 * Transaction row skeleton
 */
export const TransactionRowSkeleton: React.FC = () => (
  <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
    <View className="flex-1 gap-2">
      <ShimmerSkeleton width="40%" height={14} />
      <ShimmerSkeleton width="60%" height={12} />
    </View>
    <ShimmerSkeleton width="20%" height={16} />
  </View>
);

/**
 * Account item skeleton
 */
export const AccountItemSkeleton: React.FC = () => (
  <View className="rounded-xl p-4 bg-white border border-gray-100 gap-2">
    <View className="flex-row items-center justify-between">
      <ShimmerSkeleton width="40%" height={14} />
      <ShimmerSkeleton width={60} height={20} borderRadius={4} />
    </View>
    <ShimmerSkeleton width="50%" height={12} />
    <ShimmerSkeleton width="70%" height={20} />
  </View>
);

/**
 * Budget widget skeleton
 */
export const BudgetWidgetSkeleton: React.FC = () => (
  <View className="rounded-2xl overflow-hidden bg-white border border-gray-100">
    {/* Header */}
    <View className="px-4 py-4 border-b border-gray-100 gap-2">
      <ShimmerSkeleton width="50%" height={14} />
      <ShimmerSkeleton width="70%" height={12} />
    </View>

    {/* Content */}
    <View className="px-4 py-4 gap-3">
      <View className="gap-2">
        <ShimmerSkeleton width="100%" height={16} />
        <ShimmerSkeleton width="80%" height={12} />
      </View>
      <ShimmerSkeleton width="100%" height={8} borderRadius={4} />
      <View className="flex-row gap-2">
        <ShimmerSkeleton width="48%" height={14} />
        <ShimmerSkeleton width="48%" height={14} />
      </View>
    </View>
  </View>
);

/**
 * Progress bar skeleton
 */
export const ProgressBarSkeleton: React.FC = () => (
  <View className="gap-2">
    <View className="flex-row justify-between">
      <ShimmerSkeleton width="30%" height={12} />
      <ShimmerSkeleton width="40%" height={12} />
    </View>
    <ShimmerSkeleton width="100%" height={6} borderRadius={3} />
  </View>
);

/**
 * Dashboard loading state with all skeletons
 */
export const DashboardLoadingSkeleton: React.FC = () => (
  <View className="flex-1 bg-white">
    <View className="px-6 py-6 gap-6">
      {/* Header skeleton */}
      <View className="gap-2">
        <ShimmerSkeleton width="60%" height={32} />
        <ShimmerSkeleton width="80%" height={14} />
      </View>

      {/* Summary cards */}
      <View className="flex-row gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </View>

      {/* Budget widget */}
      <BudgetWidgetSkeleton />

      {/* Recent transactions */}
      <View className="gap-2">
        <ShimmerSkeleton width="50%" height={18} />
        <TransactionRowSkeleton />
        <TransactionRowSkeleton />
        <TransactionRowSkeleton />
      </View>

      {/* Accounts list */}
      <View className="gap-2">
        <ShimmerSkeleton width="30%" height={16} />
        <AccountItemSkeleton />
        <AccountItemSkeleton />
      </View>
    </View>
  </View>
);

/**
 * Minimal loading indicator (used for partial updates)
 */
export const MinimalLoadingIndicator: React.FC = () => (
  <ActivityIndicator size="small" color="#006A6A" />
);
