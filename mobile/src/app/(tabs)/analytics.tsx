import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { getDateRange, DateRangeOption } from '@/lib/analytics-api';
import { colors, spacing, typography } from '@/constants/colors';

// Analytics Components
import { FinancialHealthCard } from '@/components/analytics/FinancialHealthCard';
import { TreeMapChart } from '@/components/analytics/TreeMapChart';
import { PerformanceCards } from '@/components/analytics/PerformanceCards';
import { SpendingPaceCard } from '@/components/analytics/SpendingPaceCard';
import { IncomeTrendChart } from '@/components/analytics/IncomeTrendChart';
import { CategoryTrendChart } from '@/components/analytics/CategoryTrendChart';
import { SlopeChart } from '@/components/analytics/SlopeChart';
import { InsightsCard } from '@/components/analytics/InsightsCard';
import { PeriodSelector } from '@/components/analytics/PeriodSelector';
import { AnalyticsTabSelector, AnalyticsTab } from '@/components/analytics/AnalyticsTabSelector';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = db.useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<DateRangeOption>('this_month');
  const [selectedTab, setSelectedTab] = useState<AnalyticsTab>('now'); // Default to "Now"

  // Get user profile and household
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const result = await getUserProfileAndHousehold(user.email);
      if (!result) throw new Error('No household found');
      return result;
    },
    enabled: !!user?.email,
  });

  const userId = householdQuery.data?.userId || '';
  const householdId = householdQuery.data?.householdId || '';
  const paydayDay = householdQuery.data?.paydayDay || 25;

  // Calculate date range based on selected period
  const dateRange = getDateRange(selectedPeriod, paydayDay);

  // Fetch all analytics data
  const { data: analyticsData, loading, error } = useAnalyticsData(
    userId,
    householdId,
    dateRange.start,
    dateRange.end
  );

  // Fetch budgets for Spending Pace widget
  const budgetsQuery = useQuery({
    queryKey: ['budgets', userId, dateRange.start, dateRange.end],
    queryFn: async () => {
      const result = await db.queryOnce({
        budgets: {
          $: {
            where: {
              userId,
              isActive: true,
            },
          },
        },
      });
      return result.data.budgets || [];
    },
    enabled: !!userId && selectedTab === 'now',
  });

  // Calculate overall spending pace (aggregate all budgets)
  const spendingPaceData = useMemo(() => {
    if (!analyticsData || !budgetsQuery.data || budgetsQuery.data.length === 0) return null;

    const budgets = budgetsQuery.data;
    const categorySpending = new Map<string, number>();

    // Sum spending by category from transactions (analyticsData already has this)
    analyticsData.categoryDistribution.categories.forEach((cat) => {
      categorySpending.set(cat.categoryId, cat.amount);
    });

    // Aggregate all budgets and spending
    let totalBudget = 0;
    let totalSpent = 0;

    budgets.forEach((budget: any) => {
      const spent = categorySpending.get(budget.categoryId) || 0;
      totalBudget += budget.allocatedAmount || 0;
      totalSpent += spent;
    });

    // Only show if there's budget allocated
    if (totalBudget === 0) return null;

    console.log(`Overall Spending Pace - Budget: ${totalBudget}, Spent: ${totalSpent}`);

    return {
      categoryId: 'overall',
      categoryName: 'Overall Budget',
      emoji: '💰',
      budgetAmount: totalBudget,
      spentSoFar: totalSpent,
    };
  }, [analyticsData, budgetsQuery.data, dateRange]);

  if (!user) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={styles.container}
      >
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>Please log in to view analytics</Text>
        </View>
      </LinearGradient>
    );
  }

  if (householdQuery.isLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={styles.container}
      >
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.sageGreen} />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!householdQuery.data) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={styles.container}
      >
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>No household found</Text>
        </View>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={styles.container}
      >
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.sageGreen} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={styles.container}
      >
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>Failed to load analytics</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!analyticsData) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        style={styles.container}
      >
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <Text style={styles.errorText}>No analytics data available</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>
            {dateRange.start} to {dateRange.end}
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.section}>
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </View>

        {/* Tab Selector */}
        <AnalyticsTabSelector
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
        />

        {/* NOW VIEW */}
        {selectedTab === 'now' && (
          <>
            {/* Financial Health Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Health</Text>
              <FinancialHealthCard
                netPosition={analyticsData.healthSummary.netPosition}
                netPositionTrend={analyticsData.healthSummary.netPositionTrend}
                income={analyticsData.healthSummary.income}
                expenses={analyticsData.healthSummary.expenses}
                savingsRate={analyticsData.healthSummary.savingsRate}
                status={analyticsData.healthSummary.status}
              />
            </View>

            {/* Spending Distribution (TreeMap + Performance Cards) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spending Distribution</Text>
              <TreeMapChart data={analyticsData.categoryDistribution.categories} />

              {/* Performance Insights Cards */}
              <PerformanceCards
                mostConsistent={analyticsData.categoryDistribution.performanceInsights.mostConsistent}
                trendingUp={analyticsData.categoryDistribution.performanceInsights.trendingUp}
              />
            </View>

            {/* Spending Pace */}
            {spendingPaceData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏱️ Spending Pace</Text>
                <Text style={styles.sectionSubtitle}>
                  Are you spending faster than time?
                </Text>
                <SpendingPaceCard
                  categoryId={spendingPaceData.categoryId}
                  categoryName={spendingPaceData.categoryName}
                  emoji={spendingPaceData.emoji}
                  budgetAmount={spendingPaceData.budgetAmount}
                  spentSoFar={spendingPaceData.spentSoFar}
                  periodStart={dateRange.start}
                  periodEnd={dateRange.end}
                />
              </View>
            )}
          </>
        )}

        {/* TRENDS VIEW */}
        {selectedTab === 'trends' && (
          <>
            {/* Income vs Expenses Trend */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Income & Expense Trend</Text>
              <View style={styles.card}>
                <IncomeTrendChart data={analyticsData.incomeTrend.periods} />
              </View>
            </View>

            {/* Category Trends */}
            {analyticsData.categoryTrends.categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category Performance</Text>
                <View style={styles.card}>
                  <CategoryTrendChart data={analyticsData.categoryTrends} />
                </View>
              </View>
            )}

            {/* Period Comparison (Slope Chart) */}
            {analyticsData.periodComparison.topChanges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Period-over-Period Changes</Text>
                <View style={styles.card}>
                  <SlopeChart data={analyticsData.periodComparison.topChanges} />
                </View>
              </View>
            )}

            {/* Insights & Recommendations */}
            {analyticsData.insights.insights.length > 0 && (
              <View style={styles.section}>
                <InsightsCard insights={analyticsData.insights.insights} />
              </View>
            )}
          </>
        )}

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg, // 24px per design.md
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1, // 34px, weight 700
    color: colors.textWhite,
    marginBottom: 4,
    letterSpacing: -0.5, // Per design.md display typography
  },
  subtitle: {
    ...typography.caption, // 14px
    color: colors.textWhiteSecondary,
  },
  section: {
    marginBottom: spacing.lg, // 24px between sections
  },
  sectionTitle: {
    ...typography.h3, // 22px, weight 600 per design.md
    color: colors.textWhite,
    marginBottom: 12,
  },
  sectionSubtitle: {
    ...typography.caption, // 14px
    color: colors.textWhiteSecondary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.glassWhite, // 0.03 opacity per design.md glassmorphism
    borderRadius: 16, // Per design.md border radius md
    borderWidth: 1,
    borderColor: colors.glassBorder, // 0.05 opacity
    padding: spacing.lg, // 24px per design.md card padding
  },
  loadingText: {
    marginTop: 12,
    ...typography.body,
    color: colors.textWhiteSecondary,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorDetail: {
    ...typography.caption,
    color: colors.textWhiteSecondary,
    textAlign: 'center',
  },
});
