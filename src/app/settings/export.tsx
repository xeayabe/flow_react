import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import { db } from '@/lib/db';
import {
  exportToCSV,
  exportToExcel,
  getTransactionsForExport,
  ExportFilters,
} from '@/lib/import-export-api';
import { formatCurrency } from '@/lib/transactions-api';

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
  const { user } = db.useAuth();

  // Filter state
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [showDateOptions, setShowDateOptions] = useState(false);
  const [showTypeOptions, setShowTypeOptions] = useState(false);

  // Fetch user data
  const userDataQuery = useQuery({
    queryKey: ['userData', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user');

      const userResult = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });
      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const householdResult = await db.queryOnce({
        households: { $: { where: { createdByUserId: userRecord.id } } },
      });
      const household = householdResult.data.households?.[0];
      if (!household) throw new Error('Household not found');

      const accountsResult = await db.queryOnce({
        accounts: { $: { where: { userId: userRecord.id, isActive: true } } },
      });
      const accounts = (accountsResult.data.accounts || []).map((a: { id: string; name: string }) => ({
        id: a.id,
        name: a.name,
      }));

      const categoriesResult = await db.queryOnce({
        categories: { $: { where: { householdId: household.id, isActive: true } } },
      });
      const categories = (categoriesResult.data.categories || []).map((c: { id: string; name: string }) => ({
        id: c.id,
        name: c.name,
      }));

      return { userRecord, household, accounts, categories };
    },
    enabled: !!user?.email,
  });

  const userId = userDataQuery.data?.userRecord?.id;
  const householdId = userDataQuery.data?.household?.id;
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
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </SafeAreaView>
    );
  }

  const preview = previewQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4">
          <Text className="text-xl font-bold text-gray-900 mb-2">Export Transactions</Text>
          <Text className="text-sm text-gray-600 mb-6">
            Download your transactions as CSV or Excel file
          </Text>

          {/* Filters Section */}
          <View className="bg-white rounded-xl p-4 mb-4">
            <View className="flex-row items-center mb-4">
              <Filter size={18} color="#6B7280" />
              <Text className="text-sm font-semibold text-gray-900 ml-2">Filters</Text>
            </View>

            {/* Date Range */}
            <View className="mb-4">
              <Text className="text-xs text-gray-500 mb-2">Date Range</Text>
              <Pressable
                onPress={() => setShowDateOptions(!showDateOptions)}
                className="flex-row items-center justify-between px-4 py-3 bg-gray-50 rounded-lg"
              >
                <View className="flex-row items-center">
                  <Calendar size={18} color="#006A6A" />
                  <Text className="text-sm text-gray-900 ml-2">
                    {DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label}
                  </Text>
                </View>
                <ChevronDown size={18} color="#9CA3AF" />
              </Pressable>

              {showDateOptions && (
                <View className="mt-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setDateRange(option.value);
                        setShowDateOptions(false);
                      }}
                      className={`px-4 py-3 flex-row items-center justify-between border-b border-gray-100 ${
                        dateRange === option.value ? 'bg-teal-50' : ''
                      }`}
                    >
                      <Text
                        className={
                          dateRange === option.value
                            ? 'text-teal-700 font-medium'
                            : 'text-gray-900'
                        }
                      >
                        {option.label}
                      </Text>
                      {dateRange === option.value && <Check size={18} color="#0D9488" />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Type Filter */}
            <View>
              <Text className="text-xs text-gray-500 mb-2">Transaction Type</Text>
              <Pressable
                onPress={() => setShowTypeOptions(!showTypeOptions)}
                className="flex-row items-center justify-between px-4 py-3 bg-gray-50 rounded-lg"
              >
                <Text className="text-sm text-gray-900 capitalize">
                  {typeFilter === 'all' ? 'All Transactions' : typeFilter}
                </Text>
                <ChevronDown size={18} color="#9CA3AF" />
              </Pressable>

              {showTypeOptions && (
                <View className="mt-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                      className={`px-4 py-3 flex-row items-center justify-between border-b border-gray-100 ${
                        typeFilter === option.value ? 'bg-teal-50' : ''
                      }`}
                    >
                      <Text
                        className={
                          typeFilter === option.value
                            ? 'text-teal-700 font-medium'
                            : 'text-gray-900'
                        }
                      >
                        {option.label}
                      </Text>
                      {typeFilter === option.value && <Check size={18} color="#0D9488" />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Preview Section */}
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-sm font-semibold text-gray-900 mb-3">Preview</Text>

            {previewQuery.isLoading ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#006A6A" />
              </View>
            ) : preview ? (
              <>
                <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                  <Text className="text-sm text-gray-600">Total Transactions</Text>
                  <Text className="text-sm font-semibold text-gray-900">{preview.count}</Text>
                </View>

                <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                  <Text className="text-sm text-gray-600">Income</Text>
                  <View className="items-end">
                    <Text className="text-sm font-semibold text-green-700">
                      +{formatCurrency(preview.totalIncome)}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {preview.incomeCount} transactions
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-sm text-gray-600">Expenses</Text>
                  <View className="items-end">
                    <Text className="text-sm font-semibold text-red-700">
                      -{formatCurrency(preview.totalExpenses)}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {preview.expenseCount} transactions
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text className="text-sm text-gray-500 text-center py-4">
                No transactions found
              </Text>
            )}
          </View>

          {/* Format Selection */}
          <View className="bg-white rounded-xl p-4 mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-3">Export Format</Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setExportFormat('csv')}
                className={`flex-1 p-4 rounded-lg border-2 items-center ${
                  exportFormat === 'csv'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <FileText
                  size={28}
                  color={exportFormat === 'csv' ? '#0D9488' : '#9CA3AF'}
                />
                <Text
                  className={`text-sm font-medium mt-2 ${
                    exportFormat === 'csv' ? 'text-teal-700' : 'text-gray-600'
                  }`}
                >
                  CSV
                </Text>
                <Text className="text-xs text-gray-400 mt-1">Universal format</Text>
              </Pressable>

              <Pressable
                onPress={() => setExportFormat('xlsx')}
                className={`flex-1 p-4 rounded-lg border-2 items-center ${
                  exportFormat === 'xlsx'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <FileSpreadsheet
                  size={28}
                  color={exportFormat === 'xlsx' ? '#0D9488' : '#9CA3AF'}
                />
                <Text
                  className={`text-sm font-medium mt-2 ${
                    exportFormat === 'xlsx' ? 'text-teal-700' : 'text-gray-600'
                  }`}
                >
                  Excel
                </Text>
                <Text className="text-xs text-gray-400 mt-1">Formatted spreadsheet</Text>
              </Pressable>
            </View>
          </View>

          {/* Export Button */}
          <Pressable
            onPress={() => exportMutation.mutate()}
            disabled={!preview?.count || exportMutation.isPending}
            className={`py-4 rounded-xl flex-row items-center justify-center ${
              preview?.count ? 'bg-teal-600' : 'bg-gray-300'
            }`}
          >
            {exportMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Download size={20} color="white" />
                <Text className="text-base font-semibold text-white ml-2">
                  Export {preview?.count || 0} Transactions
                </Text>
              </>
            )}
          </Pressable>

          {/* Privacy Note */}
          <View className="mt-6 p-4 bg-blue-50 rounded-xl">
            <Text className="text-xs text-blue-700 text-center">
              Exported files contain your financial data. Store them securely.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
