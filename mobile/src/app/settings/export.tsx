import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from '@tanstack/react-query';
import Animated, { FadeInDown, useSharedValue } from 'react-native-reanimated';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Check,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react-native';
import { db } from '@/lib/db';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import {
  exportToCSV,
  exportToExcel,
  getTransactionsForExport,
  ExportFilters,
} from '@/lib/import-export-api';
import { formatCurrency } from '@/lib/transactions-api';
import { colors, borderRadius, spacing } from '@/lib/design-tokens';
import StickyStatusBar from '@/components/layout/StickyStatusBar';
import { router } from 'expo-router';

type DateRangeOption = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year';
type ExportFormat = 'csv' | 'xlsx';

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
];

function getDateRange(option: DateRangeOption): { start?: string; end?: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (option) {
    case 'this_month': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    }
    case 'last_month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    }
    case 'last_3_months': {
      const start = new Date(year, month - 2, 1);
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    }
    case 'last_6_months': {
      const start = new Date(year, month - 5, 1);
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    }
    case 'this_year': {
      const start = new Date(year, 0, 1);
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      };
    }
    default:
      return {};
  }
}

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const { user } = db.useAuth();

  // Filter state
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [showDateOptions, setShowDateOptions] = useState(false);
  const [showTypeOptions, setShowTypeOptions] = useState(false);

  // Fetch user data (works for both admin and members)
  const userDataQuery = useQuery({
    queryKey: ['userData', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user');

      const profileData = await getUserProfileAndHousehold(user.email);
      if (!profileData) throw new Error('User or household not found');

      const { userRecord, householdId } = profileData;

      const accountsResult = await db.queryOnce({
        accounts: { $: { where: { userId: userRecord.id, isActive: true } } },
      });
      const accounts = (accountsResult.data.accounts || []).map((a: { id: string; name: string }) => ({
        id: a.id,
        name: a.name,
      }));

      const categoriesResult = await db.queryOnce({
        categories: { $: { where: { householdId, isActive: true } } },
      });
      const categories = (categoriesResult.data.categories || []).map((c: { id: string; name: string }) => ({
        id: c.id,
        name: c.name,
      }));

      return { userRecord, householdId, accounts, categories };
    },
    enabled: !!user?.email,
  });

  const userId = userDataQuery.data?.userRecord?.id;
  const householdId = userDataQuery.data?.householdId;
  const accounts = userDataQuery.data?.accounts || [];
  const categories = userDataQuery.data?.categories || [];

  // Build filters
  const filters: ExportFilters = useMemo(() => {
    const range = getDateRange(dateRange);
    return {
      dateStart: range.start,
      dateEnd: range.end,
      type: typeFilter === 'all' ? undefined : typeFilter,
    };
  }, [dateRange, typeFilter]);

  // Preview query
  const previewQuery = useQuery({
    queryKey: ['exportPreview', userId, householdId, filters, categories, accounts],
    queryFn: async () => {
      if (!userId || !householdId) return null;

      const transactions = await getTransactionsForExport(
        userId,
        householdId,
        filters,
        categories,
        accounts
      );

      // Calculate stats
      let totalIncome = 0;
      let totalExpenses = 0;
      let incomeCount = 0;
      let expenseCount = 0;

      transactions.forEach((t) => {
        if (t.type === 'Income') {
          totalIncome += t.amount;
          incomeCount++;
        } else {
          totalExpenses += t.amount;
          expenseCount++;
        }
      });

      return {
        transactions,
        totalIncome,
        totalExpenses,
        incomeCount,
        expenseCount,
        count: transactions.length,
      };
    },
    enabled: !!userId && !!householdId,
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!previewQuery.data?.transactions) {
        throw new Error('No transactions to export');
      }

      const filename = `transactions_${new Date().toISOString().split('T')[0]}`;

      if (exportFormat === 'csv') {
        return exportToCSV(previewQuery.data.transactions, `${filename}.csv`);
      } else {
        return exportToExcel(previewQuery.data.transactions, `${filename}.xlsx`);
      }
    },
    onSuccess: (result) => {
      if (!result.success) {
        Alert.alert('Error', result.error || 'Export failed');
      }
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  if (userDataQuery.isLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.sageGreen} />
        </View>
      </LinearGradient>
    );
  }

  const preview = previewQuery.data;

  return (
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <StickyStatusBar scrollY={scrollY} />

      {/* Header */}
      <View
        className="flex-row items-center px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.sm,
            backgroundColor: colors.glassWhite,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}
        >
          <ArrowLeft size={20} color={colors.textWhite} strokeWidth={2} />
        </Pressable>
        <Text className="text-white text-xl font-semibold">Export Data</Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
      >
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <Text
            style={{ color: colors.textWhiteSecondary }}
            className="text-sm mb-6"
          >
            Download your transactions as CSV or Excel file
          </Text>
        </Animated.View>

          {/* Filters Section */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View
              style={{
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                borderRadius: borderRadius.lg,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View className="flex-row items-center mb-4">
                <Filter size={18} color={colors.sageGreen} />
                <Text
                  style={{ color: colors.textWhite }}
                  className="text-sm font-semibold ml-2"
                >
                  Filters
                </Text>
              </View>

              {/* Date Range */}
              <View className="mb-4">
                <Text
                  style={{ color: colors.textWhiteSecondary }}
                  className="text-xs mb-2"
                >
                  Date Range
                </Text>
                <Pressable
                  onPress={() => setShowDateOptions(!showDateOptions)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: borderRadius.md,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View className="flex-row items-center">
                    <Calendar size={18} color={colors.sageGreen} />
                    <Text style={{ color: colors.textWhite }} className="text-sm ml-2">
                      {DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label}
                    </Text>
                  </View>
                  <ChevronDown size={18} color={colors.textWhiteSecondary} />
                </Pressable>

                {showDateOptions && (
                  <View
                    style={{
                      marginTop: 4,
                      backgroundColor: colors.glassWhite,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      borderRadius: borderRadius.md,
                      overflow: 'hidden',
                    }}
                  >
                    {DATE_RANGE_OPTIONS.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setDateRange(option.value);
                          setShowDateOptions(false);
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottomWidth: 1,
                          borderBottomColor: 'rgba(255,255,255,0.05)',
                          backgroundColor:
                            dateRange === option.value ? 'rgba(168,181,161,0.1)' : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            color:
                              dateRange === option.value ? colors.sageGreen : colors.textWhite,
                            fontWeight: dateRange === option.value ? '600' : '400',
                          }}
                        >
                          {option.label}
                        </Text>
                        {dateRange === option.value && (
                          <Check size={18} color={colors.sageGreen} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* Type Filter */}
              <View>
                <Text
                  style={{ color: colors.textWhiteSecondary }}
                  className="text-xs mb-2"
                >
                  Transaction Type
                </Text>
                <Pressable
                  onPress={() => setShowTypeOptions(!showTypeOptions)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: borderRadius.md,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: colors.textWhite }} className="text-sm capitalize">
                    {typeFilter === 'all' ? 'All Transactions' : typeFilter}
                  </Text>
                  <ChevronDown size={18} color={colors.textWhiteSecondary} />
                </Pressable>

                {showTypeOptions && (
                  <View
                    style={{
                      marginTop: 4,
                      backgroundColor: colors.glassWhite,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      borderRadius: borderRadius.md,
                      overflow: 'hidden',
                    }}
                  >
                    {[
                      { value: 'all', label: 'All Transactions' },
                      { value: 'income', label: 'Income Only' },
                      { value: 'expense', label: 'Expenses Only' },
                    ].map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setTypeFilter(option.value as typeof typeFilter);
                          setShowTypeOptions(false);
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottomWidth: 1,
                          borderBottomColor: 'rgba(255,255,255,0.05)',
                          backgroundColor:
                            typeFilter === option.value ? 'rgba(168,181,161,0.1)' : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            color:
                              typeFilter === option.value ? colors.sageGreen : colors.textWhite,
                            fontWeight: typeFilter === option.value ? '600' : '400',
                          }}
                        >
                          {option.label}
                        </Text>
                        {typeFilter === option.value && (
                          <Check size={18} color={colors.sageGreen} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Preview Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View
              style={{
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                borderRadius: borderRadius.lg,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: colors.textWhite }}
                className="text-sm font-semibold mb-3"
              >
                Preview
              </Text>

              {previewQuery.isLoading ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color={colors.sageGreen} />
                </View>
              ) : preview ? (
                <>
                  <View
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: 'rgba(255,255,255,0.05)',
                    }}
                    className="flex-row items-center justify-between"
                  >
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
                      Total Transactions
                    </Text>
                    <Text style={{ color: colors.textWhite }} className="text-sm font-semibold">
                      {preview.count}
                    </Text>
                  </View>

                  <View
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: 'rgba(255,255,255,0.05)',
                    }}
                    className="flex-row items-center justify-between"
                  >
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
                      Income
                    </Text>
                    <View className="items-end">
                      <Text
                        style={{ color: colors.sageGreen }}
                        className="text-sm font-semibold"
                      >
                        +{formatCurrency(preview.totalIncome)}
                      </Text>
                      <Text style={{ color: colors.textWhiteSecondary }} className="text-xs">
                        {preview.incomeCount} transactions
                      </Text>
                    </View>
                  </View>

                  <View style={{ paddingVertical: 8 }} className="flex-row items-center justify-between">
                    <Text style={{ color: colors.textWhiteSecondary }} className="text-sm">
                      Expenses
                    </Text>
                    <View className="items-end">
                      <Text
                        style={{ color: colors.softAmber }}
                        className="text-sm font-semibold"
                      >
                        -{formatCurrency(preview.totalExpenses)}
                      </Text>
                      <Text style={{ color: colors.textWhiteSecondary }} className="text-xs">
                        {preview.expenseCount} transactions
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text
                  style={{ color: colors.textWhiteSecondary }}
                  className="text-sm text-center py-4"
                >
                  No transactions found
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Format Selection */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View
              style={{
                backgroundColor: colors.glassWhite,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                borderRadius: borderRadius.lg,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <Text
                style={{ color: colors.textWhite }}
                className="text-sm font-semibold mb-3"
              >
                Export Format
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setExportFormat('csv')}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: borderRadius.md,
                    borderWidth: 2,
                    borderColor:
                      exportFormat === 'csv' ? colors.sageGreen : 'rgba(255,255,255,0.1)',
                    backgroundColor:
                      exportFormat === 'csv' ? 'rgba(168,181,161,0.1)' : 'rgba(255,255,255,0.03)',
                    alignItems: 'center',
                  }}
                >
                  <FileText
                    size={28}
                    color={exportFormat === 'csv' ? colors.sageGreen : colors.textWhiteSecondary}
                  />
                  <Text
                    style={{
                      color: exportFormat === 'csv' ? colors.sageGreen : colors.textWhite,
                      fontWeight: exportFormat === 'csv' ? '600' : '400',
                    }}
                    className="text-sm mt-2"
                  >
                    CSV
                  </Text>
                  <Text
                    style={{ color: colors.textWhiteSecondary }}
                    className="text-xs mt-1"
                  >
                    Universal format
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setExportFormat('xlsx')}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: borderRadius.md,
                    borderWidth: 2,
                    borderColor:
                      exportFormat === 'xlsx' ? colors.sageGreen : 'rgba(255,255,255,0.1)',
                    backgroundColor:
                      exportFormat === 'xlsx' ? 'rgba(168,181,161,0.1)' : 'rgba(255,255,255,0.03)',
                    alignItems: 'center',
                  }}
                >
                  <FileSpreadsheet
                    size={28}
                    color={exportFormat === 'xlsx' ? colors.sageGreen : colors.textWhiteSecondary}
                  />
                  <Text
                    style={{
                      color: exportFormat === 'xlsx' ? colors.sageGreen : colors.textWhite,
                      fontWeight: exportFormat === 'xlsx' ? '600' : '400',
                    }}
                    className="text-sm mt-2"
                  >
                    Excel
                  </Text>
                  <Text
                    style={{ color: colors.textWhiteSecondary }}
                    className="text-xs mt-1"
                  >
                    Formatted spreadsheet
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Export Button */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Pressable
              onPress={() => exportMutation.mutate()}
              disabled={!preview?.count || exportMutation.isPending}
              style={{
                paddingVertical: 16,
                borderRadius: borderRadius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  preview?.count && !exportMutation.isPending
                    ? colors.contextTeal
                    : 'rgba(255,255,255,0.1)',
                opacity: !preview?.count || exportMutation.isPending ? 0.5 : 1,
              }}
            >
              {exportMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.textWhite} />
              ) : (
                <>
                  <Download size={20} color={colors.textWhite} />
                  <Text
                    style={{ color: colors.textWhite }}
                    className="text-base font-semibold ml-2"
                  >
                    Export {preview?.count || 0} Transactions
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Privacy Note */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <View
              style={{
                marginTop: 24,
                padding: 16,
                backgroundColor: 'rgba(227, 160, 93, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(227, 160, 93, 0.3)',
                borderRadius: borderRadius.md,
              }}
            >
              <Text
                style={{ color: colors.softAmber }}
                className="text-xs text-center"
              >
                Exported files contain your financial data. Store them securely.
              </Text>
            </View>
          </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
