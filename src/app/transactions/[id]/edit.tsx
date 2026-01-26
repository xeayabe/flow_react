import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, X, Check, Calendar, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { db } from '@/lib/db';
import { getTransaction, updateTransaction, deleteTransaction, formatCurrency, formatDateSwiss, parseSwissDate, Transaction } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getUserAccounts, formatBalance } from '@/lib/accounts-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { savePayeeMapping, getCategorySuggestion } from '@/lib/payee-mappings-api';
import { cn } from '@/lib/cn';
import PayeePickerModal from '@/components/PayeePickerModal';
import CategoryPickerModal from '@/components/CategoryPickerModal';

type TransactionType = 'income' | 'expense';

interface FormData {
  type: TransactionType;
  amount: string;
  categoryId: string;
  accountId: string;
  date: string;
  note: string;
  payee: string; // Merchant/vendor name
  isRecurring: boolean;
  recurringDay: number;
  isExcludedFromBudget: boolean;
}

interface FormErrors {
  amount?: string;
  categoryId?: string;
  accountId?: string;
  date?: string;
}

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const amountInputRef = useRef<TextInput>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPayeePicker, setShowPayeePicker] = useState(false);
  const [originalTransaction, setOriginalTransaction] = useState<Transaction | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    type: 'expense',
    amount: '',
    categoryId: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    payee: '',
    isRecurring: false,
    recurringDay: 1,
    isExcludedFromBudget: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user and household info (works for both admin and members)
  const householdQuery = useQuery({
    queryKey: ['user-household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');
      const result = await getUserProfileAndHousehold(user.email);
      if (!result) throw new Error('No household found');
      return result;
    },
    enabled: !!user?.email,
  });

  // Get transaction data
  const transactionQuery = useQuery({
    queryKey: ['transaction', id, householdQuery.data?.userRecord?.id],
    queryFn: async () => {
      if (!id || !householdQuery.data?.userRecord?.id) return null;
      return getTransaction(id, householdQuery.data.userRecord.id);
    },
    enabled: !!id && !!householdQuery.data?.userRecord?.id,
  });

  // Get accounts
  const accountsQuery = useQuery({
    queryKey: ['accounts', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  // Get categories
  const categoriesQuery = useQuery({
    queryKey: ['categories', householdQuery.data?.householdId, householdQuery.data?.userRecord?.id],
    queryFn: () => {
      if (!householdQuery.data?.householdId || !householdQuery.data?.userRecord?.id) return [];
      return getCategories(householdQuery.data.householdId, householdQuery.data.userRecord.id);
    },
    enabled: !!householdQuery.data?.householdId && !!householdQuery.data?.userRecord?.id,
  });

  // Get category groups
  const categoryGroupsQuery = useQuery({
    queryKey: ['categoryGroups', householdQuery.data?.householdId, householdQuery.data?.userRecord?.id],
    queryFn: async () => {
      if (!householdQuery.data?.householdId || !householdQuery.data?.userRecord?.id) {
        return [];
      }
      return getCategoryGroups(householdQuery.data.householdId, householdQuery.data.userRecord.id);
    },
    enabled: !!householdQuery.data?.householdId && !!householdQuery.data?.userRecord?.id,
  });

  // Pre-fill form when transaction loads
  useEffect(() => {
    if (transactionQuery.data) {
      const tx = transactionQuery.data;
      setOriginalTransaction(tx);
      setFormData({
        type: tx.type,
        amount: tx.amount.toString(),
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        date: tx.date,
        note: tx.note || '',
        payee: tx.payee || '',
        isRecurring: tx.isRecurring,
        recurringDay: tx.recurringDay || 1,
        isExcludedFromBudget: tx.isExcludedFromBudget || false,
      });
      setTempDate(tx.date);
      setCalendarMonth(new Date(tx.date + 'T00:00:00'));
    }
  }, [transactionQuery.data]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: () =>
      updateTransaction({
        id: id!,
        userId: householdQuery.data!.userRecord.id,
        householdId: householdQuery.data!.householdId,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        note: formData.note || undefined,
        payee: formData.payee || undefined,
        isRecurring: formData.isRecurring,
        recurringDay: formData.isRecurring ? formData.recurringDay : undefined,
        isExcludedFromBudget: formData.isExcludedFromBudget,
      }),
    onSuccess: async () => {
      // Save payee-category mapping for smart learning (if category changed)
      if (formData.payee.trim() && formData.categoryId && householdQuery.data?.userRecord?.id) {
        await savePayeeMapping(
          householdQuery.data.userRecord.id,
          formData.payee.trim(),
          formData.categoryId
        );
      }

      queryClient.invalidateQueries({ queryKey: ['transactions', householdQuery.data?.userRecord?.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['wallets', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['all-payees', householdQuery.data?.userRecord?.id] });

      setSuccessMessage('✓ Transaction updated!');
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        router.back();
      }, 1500);
    },
    onError: (error) => {
      console.error('Transaction update failed:', error);
      Alert.alert('Error', 'Failed to update transaction. Please try again.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteTransaction(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', householdQuery.data?.userRecord?.id] });
      queryClient.invalidateQueries({ queryKey: ['accounts', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['wallets', user?.email] });
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete transaction. Please try again.');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (!formData.accountId) {
      newErrors.accountId = 'Please select an account';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    updateMutation.mutate();
    setIsSubmitting(false);
  };

  // Handle payee selection from modal
  const handleSelectPayee = async (selectedPayee: string) => {
    setFormData((prev) => ({ ...prev, payee: selectedPayee }));

    // Auto-fill category if mapping exists
    if (householdQuery.data?.userRecord?.id) {
      const suggested = await getCategorySuggestion(
        householdQuery.data.userRecord.id,
        selectedPayee
      );
      if (suggested) {
        setFormData((prev) => ({ ...prev, categoryId: suggested }));
      }
    }
  };

  const handleClearPayee = () => {
    setFormData((prev) => ({ ...prev, payee: '' }));
  };

  // Filter categories by type
  const categories = (categoriesQuery.data as any[]) || [];
  const filteredCategories = categories.filter((cat) => cat.type === formData.type);

  const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
  const selectedAccount = accountsQuery.data?.find((acc) => acc.id === formData.accountId);

  // Get category groups
  const categoryGroups = categoryGroupsQuery.data || [];

  // Create a map of group keys to group info
  const groupKeyToInfo: Record<string, { name: string; icon?: string; type: string }> = {};
  categoryGroups.forEach((group) => {
    groupKeyToInfo[group.key] = { name: group.name, icon: group.icon, type: group.type };
  });

  // Group categories by their categoryGroup field
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    const groupKey = cat.categoryGroup;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(cat);
    return acc;
  }, {} as Record<string, any[]>);

  // Get the order of groups - sorted by displayOrder from the database
  const groupOrder = categoryGroups
    .filter((g) => g.type === formData.type)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((g) => g.key);

  // Error states
  if (!id) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-lg font-semibold text-gray-900 mb-4">Transaction not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="px-6 py-3 rounded-lg bg-teal-600"
        >
          <Text className="text-white font-semibold">Back to Transactions</Text>
        </Pressable>
      </View>
    );
  }

  if (transactionQuery.isLoading || householdQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading || categoryGroupsQuery.isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

  if (transactionQuery.data === null) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-lg font-semibold text-gray-900 mb-4">Transaction not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="px-6 py-3 rounded-lg bg-teal-600"
        >
          <Text className="text-white font-semibold">Back to Transactions</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Edit Transaction',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="pl-4">
              <ChevronLeft size={24} color="#006A6A" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView edges={['bottom']} className="flex-1">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View className="px-6 py-8">
              {/* Success Message */}
              {showSuccess && (
                <View className="mb-6 p-4 rounded-lg bg-green-50 flex-row items-center gap-2">
                  <Check size={20} color="#059669" />
                  <Text className="text-sm font-semibold text-green-700">{successMessage}</Text>
                </View>
              )}

              {/* Type Toggle */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Type</Text>
                <View className="flex-row gap-3">
                  {(['expense', 'income'] as const).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setFormData({ ...formData, type, categoryId: '' })}
                      className={cn(
                        'flex-1 py-3 rounded-lg border-2 items-center',
                        formData.type === type ? 'bg-teal-50 border-teal-600' : 'border-gray-200'
                      )}
                    >
                      <Text
                        className={cn('font-semibold capitalize', formData.type === type ? 'text-teal-600' : 'text-gray-700')}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Amount Input */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Amount (CHF)</Text>
                <View className="relative">
                  <Text className="absolute left-4 top-4 text-lg font-semibold text-gray-700">CHF</Text>
                  <TextInput
                    ref={amountInputRef}
                    className={cn(
                      'pl-14 pr-4 py-3 rounded-lg border-2 text-lg font-semibold',
                      errors.amount ? 'border-red-500' : 'border-gray-200'
                    )}
                    style={{ color: '#006A6A' }}
                    placeholder="0.00"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="decimal-pad"
                    value={formData.amount}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9.]/g, '');
                      setFormData({ ...formData, amount: cleaned });
                      if (errors.amount) setErrors({ ...errors, amount: undefined });
                    }}
                  />
                </View>
                {errors.amount && <Text className="text-xs text-red-500 mt-2">{errors.amount}</Text>}
              </View>

              {/* Payee / Merchant Input (Optional) */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Payee / Merchant (Optional)</Text>
                <Pressable
                  onPress={() => setShowPayeePicker(true)}
                  className="p-3 rounded-lg border-2 flex-row items-center justify-between border-gray-200"
                >
                  <Text className={cn('font-medium', formData.payee ? 'text-gray-900' : 'text-gray-500')}>
                    {formData.payee || 'Choose payee...'}
                  </Text>
                  <Text className="text-gray-400">›</Text>
                </Pressable>
                {formData.payee && (
                  <Pressable onPress={handleClearPayee} className="mt-2">
                    <Text className="text-sm text-red-600">Clear payee</Text>
                  </Pressable>
                )}
              </View>

              {/* Category Dropdown */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Category</Text>
                <Pressable
                  onPress={() => setShowCategoryModal(true)}
                  className={cn(
                    'p-3 rounded-lg border-2 flex-row items-center justify-between',
                    errors.categoryId ? 'border-red-500' : 'border-gray-200'
                  )}
                >
                  <Text className={cn('font-medium', selectedCategory ? 'text-gray-900' : 'text-gray-500')}>
                    {selectedCategory?.name || 'Select category'}
                  </Text>
                  <Text className="text-gray-400">›</Text>
                </Pressable>
                {errors.categoryId && <Text className="text-xs text-red-500 mt-2">{errors.categoryId}</Text>}
              </View>

              {/* Wallet Dropdown */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Wallet</Text>
                <Pressable
                  onPress={() => setShowAccountModal(true)}
                  className={cn(
                    'p-3 rounded-lg border-2 flex-row items-center justify-between',
                    errors.accountId ? 'border-red-500' : 'border-gray-200'
                  )}
                >
                  <View className="flex-1">
                    <Text className={cn('font-medium', selectedAccount ? 'text-gray-900' : 'text-gray-500')}>
                      {selectedAccount?.name || 'Select wallet'}
                    </Text>
                    {selectedAccount && (
                      <Text className="text-xs text-gray-500 mt-1">{formatBalance(selectedAccount.balance, selectedAccount.currency)}</Text>
                    )}
                  </View>
                  <Text className="text-gray-400">›</Text>
                </Pressable>
                {errors.accountId && <Text className="text-xs text-red-500 mt-2">{errors.accountId}</Text>}
              </View>

              {/* Date Input */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Date</Text>
                <Pressable
                  onPress={() => {
                    setTempDate(formData.date);
                    setShowDatePicker(true);
                  }}
                  className={cn(
                    'p-3 rounded-lg border-2 flex-row items-center justify-between',
                    errors.date ? 'border-red-500' : 'border-gray-200'
                  )}
                >
                  <Text className="font-medium text-gray-900">{formatDateSwiss(formData.date)}</Text>
                  <Text className="text-gray-400">›</Text>
                </Pressable>
                {errors.date && <Text className="text-xs text-red-500 mt-2">{errors.date}</Text>}
              </View>

              {/* Note */}
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-semibold text-gray-700">Note</Text>
                  <Text className="text-xs text-gray-500">{formData.note.length}/200</Text>
                </View>
                <TextInput
                  className="p-3 rounded-lg border-2 border-gray-200 text-base"
                  style={{ color: '#1F2937', minHeight: 80 }}
                  placeholder="Add a note..."
                  placeholderTextColor="#D1D5DB"
                  multiline
                  value={formData.note}
                  onChangeText={(text) => setFormData({ ...formData, note: text.slice(0, 200) })}
                />
              </View>

              {/* Recurring Checkbox */}
              <View className="mb-8 flex-row items-center justify-between p-4 rounded-lg border border-gray-200">
                <Text className="font-medium text-gray-900">This repeats monthly</Text>
                <Pressable
                  onPress={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
                  className={cn(
                    'w-6 h-6 rounded border-2 items-center justify-center',
                    formData.isRecurring ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                  )}
                >
                  {formData.isRecurring && <Check size={16} color="white" />}
                </Pressable>
              </View>

              {/* Recurring Day Selector */}
              {formData.isRecurring && (
                <View className="mb-8">
                  <Text className="text-sm font-semibold text-gray-700 mb-3">On day of each month</Text>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      className="flex-1 p-3 rounded-lg border-2 border-gray-200 text-base text-center font-semibold"
                      style={{ color: '#006A6A' }}
                      keyboardType="number-pad"
                      value={formData.recurringDay.toString()}
                      onChangeText={(text) => {
                        const day = Math.min(31, Math.max(1, parseInt(text) || 1));
                        setFormData({ ...formData, recurringDay: day });
                      }}
                      maxLength={2}
                    />
                    <Text className="font-medium text-gray-900">of each month</Text>
                  </View>
                </View>
              )}

              {/* Exclude from Budget Toggle */}
              {formData.type === 'expense' && (
                <View className="mb-8 flex-row items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
                  <View className="flex-1 flex-row items-center gap-3">
                    {formData.isExcludedFromBudget ? (
                      <EyeOff size={20} color="#DC2626" />
                    ) : (
                      <Eye size={20} color="#006A6A" />
                    )}
                    <View className="flex-1">
                      <Text className="font-medium text-gray-900">Exclude from Budget</Text>
                      <Text className="text-xs text-gray-600 mt-1">
                        {formData.isExcludedFromBudget ? 'This won\'t count toward budget' : 'Include in budget'}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => setFormData({ ...formData, isExcludedFromBudget: !formData.isExcludedFromBudget })}
                    className={cn(
                      'w-6 h-6 rounded border-2 items-center justify-center',
                      formData.isExcludedFromBudget ? 'bg-red-600 border-red-600' : 'border-gray-300'
                    )}
                  >
                    {formData.isExcludedFromBudget && <Check size={16} color="white" />}
                  </Pressable>
                </View>
              )}

              {/* Action Buttons */}
              <View className="gap-3">
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting || updateMutation.isPending}
                  className="py-4 rounded-lg bg-teal-600 items-center justify-center"
                >
                  {isSubmitting || updateMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Update Transaction</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => router.back()}
                  disabled={isSubmitting || updateMutation.isPending}
                  className="py-4 rounded-lg border-2 border-gray-200 items-center justify-center"
                >
                  <Text className="text-base font-semibold text-gray-700">Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting || updateMutation.isPending || deleteMutation.isPending}
                  className="py-4 rounded-lg border-2 border-red-200 items-center justify-center"
                >
                  <Text className="text-base font-semibold text-red-600">Delete Transaction</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent={false} animationType="slide">
        <View className="flex-1 bg-white">
          <SafeAreaView edges={['top']} className="bg-white">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-bold">Select Date</Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <X size={24} color="#006A6A" />
              </Pressable>
            </View>
          </SafeAreaView>

          <ScrollView className="flex-1 px-6 py-4">
            {/* Month/Year Navigation */}
            <View className="flex-row items-center justify-between mb-6">
              <Pressable
                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                className="p-2"
              >
                <ChevronLeft size={24} color="#006A6A" />
              </Pressable>
              <Text className="text-lg font-semibold text-gray-900">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                className="p-2"
              >
                <ChevronRight size={24} color="#006A6A" />
              </Pressable>
            </View>

            {/* Day Labels */}
            <View className="flex-row mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} className="flex-1 text-center font-semibold text-gray-700 text-sm">
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View className="flex-row flex-wrap">
              {(() => {
                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                // Get today's date components in local time
                const now = new Date();
                const todayYear = now.getFullYear();
                const todayMonth = now.getMonth();
                const todayDay = now.getDate();

                const days = [];

                // Empty cells before first day
                for (let i = 0; i < firstDay; i++) {
                  days.push(<View key={`empty-${i}`} style={{ width: '14.28%' }} className="aspect-square" />);
                }

                // Days of month
                for (let day = 1; day <= daysInMonth; day++) {
                  // Create date string in YYYY-MM-DD format directly (no timezone conversion)
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = dateStr === formData.date;
                  const isToday = year === todayYear && month === todayMonth && day === todayDay;
                  // Compare year/month/day directly to avoid timezone issues
                  const isFuture = year > todayYear ||
                    (year === todayYear && month > todayMonth) ||
                    (year === todayYear && month === todayMonth && day > todayDay);

                  days.push(
                    <Pressable
                      key={day}
                      onPress={() => {
                        if (dateStr && !isFuture) {
                          setFormData({ ...formData, date: dateStr });
                          if (errors.date) setErrors({ ...errors, date: undefined });
                          setShowDatePicker(false);
                        }
                      }}
                      disabled={isFuture}
                      style={{ width: '14.28%' }}
                      className={cn(
                        'aspect-square items-center justify-center rounded-lg mb-2',
                        isSelected ? 'bg-teal-600' : isToday && !isSelected ? 'bg-teal-100 border-2 border-teal-600' : 'bg-gray-50',
                        isFuture ? 'opacity-30' : ''
                      )}
                    >
                      <Text
                        className={cn(
                          'text-base font-semibold',
                          isSelected ? 'text-white' : 'text-gray-900'
                        )}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                }

                return days;
              })()}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Category Picker Modal (NEW) */}
      {householdQuery.data?.householdId && householdQuery.data?.userRecord?.id && (
        <CategoryPickerModal
          visible={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          onSelectCategory={(categoryId, categoryName) => {
            setFormData({ ...formData, categoryId });
          }}
          userId={householdQuery.data.userRecord.id}
          householdId={householdQuery.data.householdId}
          currentCategoryId={formData.categoryId}
          transactionType={formData.type}
        />
      )}

      {/* Wallet Modal */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAccountModal(false)}>
        <View className="flex-1 bg-white">
          <SafeAreaView edges={['top']} className="bg-white flex-1">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
              <Text className="text-xl font-semibold text-gray-900">Select Wallet</Text>
              <Pressable onPress={() => setShowAccountModal(false)}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}>
              {accountsQuery.data?.map((account) => (
                <Pressable
                  key={account.id}
                  onPress={() => {
                    setFormData({ ...formData, accountId: account.id });
                    setShowAccountModal(false);
                  }}
                  className={cn(
                    'p-4 rounded-lg mb-2 flex-row items-center justify-between',
                    formData.accountId === account.id ? 'bg-teal-50' : 'bg-gray-50'
                  )}
                >
                  <View className="flex-1">
                    <Text className={cn('font-semibold', formData.accountId === account.id ? 'text-teal-600' : 'text-gray-900')}>
                      {account.name}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1">{formatBalance(account.balance, account.currency)}</Text>
                  </View>
                  {formData.accountId === account.id && <Check size={20} color="#006A6A" />}
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-2xl mx-6 p-6 gap-4">
            <View className="items-center gap-2">
              <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center">
                <Trash2 size={24} color="#DC2626" />
              </View>
              <Text className="text-lg font-semibold text-gray-900">Delete Transaction?</Text>
              <Text className="text-sm text-gray-600 text-center">
                This will permanently delete the transaction and restore the account balance.
              </Text>
            </View>

            <View className="gap-3">
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                className="py-3 rounded-lg border-2 border-gray-200 items-center justify-center"
              >
                <Text className="text-base font-semibold text-gray-700">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowDeleteConfirm(false);
                  deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="py-3 rounded-lg bg-red-600 items-center justify-center"
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-base font-semibold text-white">Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payee Picker Modal */}
      {householdQuery.data?.userRecord?.id && (
        <PayeePickerModal
          visible={showPayeePicker}
          onClose={() => setShowPayeePicker(false)}
          onSelectPayee={handleSelectPayee}
          userId={householdQuery.data.userRecord.id}
          currentPayee={formData.payee}
        />
      )}
    </View>
  );
}
