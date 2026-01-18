import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Upload,
  FileSpreadsheet,
  ChevronRight,
  Check,
  AlertCircle,
  X,
  Download,
  ArrowRight,
  RefreshCw,
} from 'lucide-react-native';
import { db } from '@/lib/db';
import {
  pickFile,
  parseFile,
  autoDetectColumnMappings,
  validateAndTransformData,
  importTransactions,
  downloadTemplate,
  ParseResult,
  ColumnMapping,
  ValidationResult,
  ParsedRow,
} from '@/lib/import-export-api';
import { formatCurrency } from '@/lib/transactions-api';

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'success';

interface FileInfo {
  name: string;
  uri: string;
  rowCount: number;
}

export default function ImportScreen() {
  const router = useRouter();
  const { user } = db.useAuth();

  // Step state
  const [step, setStep] = useState<Step>('upload');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: null,
    amount: null,
    type: null,
    category: null,
    note: null,
    account: null,
  });
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedCount: number;
    newCategories: string[];
    totalIncome: number;
    totalExpenses: number;
  } | null>(null);

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
      const accounts = accountsResult.data.accounts || [];

      const categoriesResult = await db.queryOnce({
        categories: { $: { where: { householdId: household.id, isActive: true } } },
      });
      const categories = categoriesResult.data.categories || [];

      return { userRecord, household, accounts, categories };
    },
    enabled: !!user?.email,
  });

  const userId = userDataQuery.data?.userRecord?.id;
  const householdId = userDataQuery.data?.household?.id;
  const accounts = userDataQuery.data?.accounts || [];
  const categories = userDataQuery.data?.categories || [];
  const defaultAccount = accounts.find((a: { isDefault: boolean }) => a.isDefault) || accounts[0];

  // File pick mutation
  const pickFileMutation = useMutation({
    mutationFn: async () => {
      const file = await pickFile();
      if (!file) throw new Error('No file selected');

      const result = await parseFile(file.uri, file.name, file.file);
      if (!result.success) throw new Error(result.error || 'Failed to parse file');

      return { file, result };
    },
    onSuccess: ({ file, result }) => {
      console.log('Parse result:', { headers: result.headers, rowCount: result.rowCount });
      setFileInfo({
        name: file.name,
        uri: file.uri,
        rowCount: result.rowCount,
      });
      setParseResult(result);

      // Auto-detect column mappings
      const autoMapping = autoDetectColumnMappings(result.headers);
      console.log('Auto mapping:', autoMapping);
      setColumnMapping(autoMapping);

      setStep('mapping');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!validationResult || !userId || !householdId || !defaultAccount) {
        throw new Error('Missing required data');
      }

      setStep('importing');

      const result = await importTransactions(
        validationResult.validRows,
        userId,
        householdId,
        defaultAccount.id,
        categories.map((c: { id: string; name: string; type: string }) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }))
      );

      if (!result.success) {
        throw new Error(result.errors.join('\n'));
      }

      return result;
    },
    onSuccess: (result) => {
      setImportResult({
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        newCategories: result.newCategoriesCreated,
        totalIncome: result.totalIncome,
        totalExpenses: result.totalExpenses,
      });
      setStep('success');
    },
    onError: (error) => {
      setStep('preview');
      Alert.alert('Import Failed', error.message);
    },
  });

  // Handle column mapping update
  const updateMapping = useCallback((field: keyof ColumnMapping, value: string | null) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Process mapping and validate
  const processMapping = useCallback(() => {
    if (!parseResult) return;

    const result = validateAndTransformData(parseResult.rawData, columnMapping);
    setValidationResult(result);
    setStep('preview');
  }, [parseResult, columnMapping]);

  // Reset everything
  const resetImport = useCallback(() => {
    setStep('upload');
    setFileInfo(null);
    setParseResult(null);
    setColumnMapping({
      date: null,
      amount: null,
      type: null,
      category: null,
      note: null,
      account: null,
    });
    setValidationResult(null);
    setImportResult(null);
  }, []);

  // Download template
  const handleDownloadTemplate = useCallback(async () => {
    const result = await downloadTemplate();
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to download template');
    }
  }, []);

  if (userDataQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Progress Steps */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-center">
            {['Upload', 'Map', 'Preview'].map((label, index) => {
              const stepIndex = ['upload', 'mapping', 'preview'].indexOf(step);
              const isActive = index <= stepIndex;
              const isCurrent = index === stepIndex;

              return (
                <React.Fragment key={label}>
                  <View className="items-center">
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isActive ? 'bg-teal-600' : 'bg-gray-200'
                      }`}
                    >
                      {index < stepIndex ? (
                        <Check size={16} color="white" />
                      ) : (
                        <Text
                          className={`text-sm font-semibold ${
                            isActive ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      className={`text-xs mt-1 ${
                        isCurrent ? 'text-teal-700 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {label}
                    </Text>
                  </View>
                  {index < 2 && (
                    <View
                      className={`w-12 h-0.5 mx-2 ${
                        index < stepIndex ? 'bg-teal-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <View className="px-6 py-4">
            <Text className="text-xl font-bold text-gray-900 mb-2">Upload File</Text>
            <Text className="text-sm text-gray-600 mb-6">
              Upload your CSV or Excel file containing transactions
            </Text>

            {/* Upload Area */}
            <Pressable
              onPress={() => pickFileMutation.mutate()}
              disabled={pickFileMutation.isPending}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 items-center justify-center bg-white mb-6"
            >
              {pickFileMutation.isPending ? (
                <ActivityIndicator size="large" color="#006A6A" />
              ) : (
                <>
                  <View className="w-16 h-16 rounded-full bg-teal-50 items-center justify-center mb-4">
                    <Upload size={32} color="#0D9488" />
                  </View>
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    Tap to select file
                  </Text>
                  <Text className="text-sm text-gray-500 text-center">
                    Supports CSV, Excel (.xlsx, .xls)
                  </Text>
                  <Text className="text-xs text-gray-400 mt-2">Max 10 MB</Text>
                </>
              )}
            </Pressable>

            {/* Supported Formats */}
            <View className="bg-white rounded-xl p-4 mb-6">
              <Text className="text-sm font-semibold text-gray-900 mb-3">
                Supported formats
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {['.csv', '.xlsx', '.xls', '.tsv'].map((format) => (
                  <View key={format} className="px-3 py-1 bg-gray-100 rounded-full">
                    <Text className="text-xs text-gray-700">{format}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Download Template */}
            <Pressable
              onPress={handleDownloadTemplate}
              className="flex-row items-center justify-center py-3 bg-white rounded-xl border border-gray-200"
            >
              <Download size={18} color="#006A6A" />
              <Text className="text-sm font-medium text-teal-700 ml-2">
                Download CSV Template
              </Text>
            </Pressable>

            {/* Privacy Note */}
            <View className="mt-6 p-4 bg-blue-50 rounded-xl">
              <View className="flex-row items-start">
                <AlertCircle size={18} color="#3B82F6" />
                <Text className="text-xs text-blue-700 ml-2 flex-1">
                  Files are processed locally on your device. Your data is not uploaded
                  to any server.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && parseResult && (
          <View className="px-6 py-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-gray-900">Map Columns</Text>
              <Pressable onPress={resetImport}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            {/* File Info */}
            {fileInfo && (
              <View className="flex-row items-center bg-teal-50 rounded-lg p-3 mb-4">
                <FileSpreadsheet size={20} color="#0D9488" />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                    {fileInfo.name}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    {fileInfo.rowCount} rows detected
                  </Text>
                </View>
              </View>
            )}

            {/* Debug: Show detected columns */}
            {parseResult.headers.length > 0 ? (
              <View className="bg-blue-50 rounded-lg p-3 mb-4">
                <Text className="text-xs font-semibold text-blue-700 mb-1">
                  Detected columns ({parseResult.headers.length}):
                </Text>
                <Text className="text-xs text-blue-600">
                  {parseResult.headers.join(', ')}
                </Text>
              </View>
            ) : (
              <View className="bg-amber-50 rounded-lg p-3 mb-4">
                <Text className="text-xs font-semibold text-amber-700">
                  No columns detected. Check your CSV format.
                </Text>
              </View>
            )}

            <Text className="text-sm text-gray-600 mb-4">
              Match your file columns to the app fields
            </Text>

            {/* Required Fields */}
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Required
            </Text>

            {/* Date Mapping */}
            <MappingRow
              label="Date"
              required
              value={columnMapping.date}
              options={parseResult.headers}
              onChange={(v) => updateMapping('date', v)}
            />

            {/* Amount Mapping */}
            <View>
              <MappingRow
                label="Amount"
                required
                value={columnMapping.amount}
                options={parseResult.headers}
                onChange={(v) => updateMapping('amount', v)}
              />
              <Text className="text-xs text-gray-500 px-4 py-2 mb-2">
                For dual-column formats (Inflow/Outflow), import twice:
              </Text>
              <View className="px-4 pb-2 bg-gray-50 rounded-lg border border-gray-200">
                <Text className="text-xs font-medium text-gray-700 py-1">
                  1. Select "Inflow" → imports income transactions
                </Text>
                <Text className="text-xs font-medium text-gray-700 py-1">
                  2. Select "Outflow" → imports expense transactions
                </Text>
              </View>
            </View>

            <Text className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">
              Optional
            </Text>

            {/* Type Mapping */}
            <MappingRow
              label="Type (Income/Expense)"
              value={columnMapping.type}
              options={parseResult.headers}
              onChange={(v) => updateMapping('type', v)}
            />

            {/* Category Mapping */}
            <MappingRow
              label="Category"
              value={columnMapping.category}
              options={parseResult.headers}
              onChange={(v) => updateMapping('category', v)}
            />

            {/* Note Mapping */}
            <MappingRow
              label="Note/Description"
              value={columnMapping.note}
              options={parseResult.headers}
              onChange={(v) => updateMapping('note', v)}
            />

            {/* Continue Button */}
            <Pressable
              onPress={processMapping}
              disabled={!columnMapping.date || !columnMapping.amount}
              className={`mt-6 py-4 rounded-xl flex-row items-center justify-center ${
                columnMapping.date && columnMapping.amount
                  ? 'bg-teal-600'
                  : 'bg-gray-300'
              }`}
            >
              <Text className="text-base font-semibold text-white mr-2">Continue</Text>
              <ChevronRight size={20} color="white" />
            </Pressable>
          </View>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && validationResult && (
          <View className="px-6 py-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-gray-900">Preview Import</Text>
              <Pressable onPress={() => setStep('mapping')}>
                <RefreshCw size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Summary Stats */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="text-sm font-semibold text-gray-900 mb-3">Summary</Text>

              <View className="flex-row mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Valid Rows</Text>
                  <Text className="text-lg font-bold text-teal-700">
                    {validationResult.validRows.length}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Invalid Rows</Text>
                  <Text className="text-lg font-bold text-red-600">
                    {validationResult.invalidRows.length}
                  </Text>
                </View>
              </View>

              <View className="flex-row mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Income</Text>
                  <Text className="text-sm font-semibold text-green-700">
                    +{formatCurrency(validationResult.totalIncome)}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {validationResult.incomeCount} transactions
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Expenses</Text>
                  <Text className="text-sm font-semibold text-red-700">
                    -{formatCurrency(validationResult.totalExpenses)}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {validationResult.expenseCount} transactions
                  </Text>
                </View>
              </View>

              {validationResult.dateRange && (
                <View className="pt-3 border-t border-gray-100">
                  <Text className="text-xs text-gray-500">Date Range</Text>
                  <Text className="text-sm text-gray-900">
                    {validationResult.dateRange.start} to {validationResult.dateRange.end}
                  </Text>
                </View>
              )}
            </View>

            {/* Categories */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="text-sm font-semibold text-gray-900 mb-2">
                Categories ({validationResult.categories.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {validationResult.categories.slice(0, 10).map((cat) => (
                  <View key={cat} className="px-2 py-1 bg-gray-100 rounded">
                    <Text className="text-xs text-gray-700">{cat}</Text>
                  </View>
                ))}
                {validationResult.categories.length > 10 && (
                  <View className="px-2 py-1 bg-gray-100 rounded">
                    <Text className="text-xs text-gray-500">
                      +{validationResult.categories.length - 10} more
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Preview Table */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="text-sm font-semibold text-gray-900 mb-3">
                Preview (First 5 rows)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header */}
                  <View className="flex-row bg-gray-50 rounded-t-lg">
                    <Text className="w-24 px-2 py-2 text-xs font-semibold text-gray-700">
                      Date
                    </Text>
                    <Text className="w-20 px-2 py-2 text-xs font-semibold text-gray-700">
                      Amount
                    </Text>
                    <Text className="w-20 px-2 py-2 text-xs font-semibold text-gray-700">
                      Type
                    </Text>
                    <Text className="w-24 px-2 py-2 text-xs font-semibold text-gray-700">
                      Category
                    </Text>
                  </View>
                  {/* Rows */}
                  {validationResult.validRows.slice(0, 5).map((row, idx) => (
                    <View
                      key={idx}
                      className={`flex-row border-b border-gray-100 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <Text className="w-24 px-2 py-2 text-xs text-gray-900">
                        {row.date}
                      </Text>
                      <Text
                        className={`w-20 px-2 py-2 text-xs font-medium ${
                          row.type === 'income' ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {row.type === 'income' ? '+' : '-'}
                        {row.amount.toFixed(2)}
                      </Text>
                      <Text className="w-20 px-2 py-2 text-xs text-gray-700 capitalize">
                        {row.type}
                      </Text>
                      <Text
                        className="w-24 px-2 py-2 text-xs text-gray-700"
                        numberOfLines={1}
                      >
                        {row.category}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Invalid Rows Warning */}
            {validationResult.invalidRows.length > 0 && (
              <View className="bg-amber-50 rounded-xl p-4 mb-4">
                <View className="flex-row items-center mb-2">
                  <AlertCircle size={18} color="#D97706" />
                  <Text className="text-sm font-semibold text-amber-800 ml-2">
                    {validationResult.invalidRows.length} rows will be skipped
                  </Text>
                </View>
                {validationResult.invalidRows.slice(0, 3).map((row, idx) => (
                  <Text key={idx} className="text-xs text-amber-700 mt-1">
                    Row {row.rowNumber}: {row.errors.join(', ')}
                  </Text>
                ))}
                {validationResult.invalidRows.length > 3 && (
                  <Text className="text-xs text-amber-600 mt-1">
                    ...and {validationResult.invalidRows.length - 3} more
                  </Text>
                )}
              </View>
            )}

            {/* Import Button */}
            <Pressable
              onPress={() => importMutation.mutate()}
              disabled={validationResult.validRows.length === 0}
              className={`py-4 rounded-xl flex-row items-center justify-center ${
                validationResult.validRows.length > 0 ? 'bg-teal-600' : 'bg-gray-300'
              }`}
            >
              <Text className="text-base font-semibold text-white">
                Import {validationResult.validRows.length} Transactions
              </Text>
            </Pressable>

            <Pressable
              onPress={resetImport}
              className="mt-3 py-3 items-center"
            >
              <Text className="text-sm text-gray-600">Cancel</Text>
            </Pressable>
          </View>
        )}

        {/* Importing State */}
        {step === 'importing' && (
          <View className="px-6 py-4 items-center justify-center min-h-[300]">
            <ActivityIndicator size="large" color="#006A6A" />
            <Text className="text-base font-medium text-gray-900 mt-4">
              Importing transactions...
            </Text>
            <Text className="text-sm text-gray-500 mt-1">This may take a moment</Text>
          </View>
        )}

        {/* Success State */}
        {step === 'success' && importResult && (
          <View className="px-6 py-4">
            <View className="items-center py-8">
              <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
                <Check size={40} color="#16A34A" />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">
                Import Successful!
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                {importResult.importedCount} transactions have been imported
              </Text>
            </View>

            {/* Summary */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <View className="flex-row mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Income</Text>
                  <Text className="text-base font-semibold text-green-700">
                    +{formatCurrency(importResult.totalIncome)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500">Expenses</Text>
                  <Text className="text-base font-semibold text-red-700">
                    -{formatCurrency(importResult.totalExpenses)}
                  </Text>
                </View>
              </View>

              {importResult.newCategories.length > 0 && (
                <View className="pt-3 border-t border-gray-100">
                  <Text className="text-xs text-gray-500 mb-1">
                    New categories created
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
                    {importResult.newCategories.map((cat) => (
                      <View key={cat} className="px-2 py-0.5 bg-teal-50 rounded">
                        <Text className="text-xs text-teal-700">{cat}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {importResult.skippedCount > 0 && (
                <View className="pt-3 border-t border-gray-100 mt-3">
                  <Text className="text-xs text-amber-600">
                    {importResult.skippedCount} rows were skipped due to errors
                  </Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <Pressable
              onPress={() => router.replace('/(tabs)/transactions')}
              className="py-4 rounded-xl bg-teal-600 flex-row items-center justify-center"
            >
              <Text className="text-base font-semibold text-white mr-2">
                View Transactions
              </Text>
              <ArrowRight size={20} color="white" />
            </Pressable>

            <Pressable onPress={resetImport} className="mt-3 py-3 items-center">
              <Text className="text-sm text-gray-600">Import Another File</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Column Mapping Row Component
function MappingRow({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  required?: boolean;
}) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <View className="mb-3">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-sm text-gray-700">
          {label}
          {required && <Text className="text-red-500"> *</Text>}
        </Text>
      </View>

      <Pressable
        onPress={() => setShowOptions(!showOptions)}
        className={`flex-row items-center justify-between px-4 py-3 bg-white rounded-lg border ${
          value ? 'border-teal-500' : 'border-gray-200'
        }`}
      >
        <Text className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || 'Select column...'}
        </Text>
        {value ? (
          <Check size={18} color="#0D9488" />
        ) : (
          <ChevronRight size={18} color="#9CA3AF" />
        )}
      </Pressable>

      {showOptions && (
        <View className="mt-1 bg-white rounded-lg border border-gray-200 overflow-hidden max-h-64">
          <ScrollView nestedScrollEnabled>
            <Pressable
              onPress={() => {
                onChange(null);
                setShowOptions(false);
              }}
              className="px-4 py-3 border-b border-gray-100"
            >
              <Text className="text-gray-400 italic">None</Text>
            </Pressable>
            {options.length === 0 ? (
              <View className="px-4 py-3">
                <Text className="text-gray-500 text-sm">No columns found in file</Text>
              </View>
            ) : (
              options.map((option, index) => (
                <Pressable
                  key={`${option}-${index}`}
                  onPress={() => {
                    onChange(option);
                    setShowOptions(false);
                  }}
                  className={`px-4 py-3 border-b border-gray-100 ${
                    value === option ? 'bg-teal-50' : ''
                  }`}
                >
                  <Text
                    className={value === option ? 'text-teal-700 font-medium' : 'text-gray-900'}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
