import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, X, Check } from 'lucide-react-native';
import { db } from '@/lib/db';
import { createTransaction, formatCurrency, formatDateSwiss, parseSwissDate } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getUserAccounts, formatBalance } from '@/lib/accounts-api';
import { cn } from '@/lib/cn';

type TransactionType = 'income' | 'expense';

interface FormData {
  type: TransactionType;
  amount: string;
  categoryId: string;
  accountId: string;
  date: string;
  note: string;
  isRecurring: boolean;
  recurringDay: number;
}

interface FormErrors {
  amount?: string;
  categoryId?: string;
  accountId?: string;
  date?: string;
}

export default function AddTransactionScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const amountInputRef = useRef<TextInput>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState<FormData>({
    type: 'expense',
    amount: '',
    categoryId: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    isRecurring: false,
    recurringDay: 1,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user and household info
  const householdQuery = useQuery({
    queryKey: ['household', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const userResult = await db.queryOnce({
        users: {
          $: {
            where: {
              email: user.email,
            },
          },
        },
      });

      const userRecord = userResult.data.users?.[0];
      if (!userRecord) throw new Error('User not found');

      const householdsResult = await db.queryOnce({
        households: {
          $: {
            where: {
              createdByUserId: userRecord.id,
            },
          },
        },
      });

      const household = householdsResult.data.households?.[0];
      if (!household) throw new Error('No household found');

      return { userRecord, household };
    },
    enabled: !!user?.email,
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
    queryKey: ['categories', householdQuery.data?.household?.id],
    queryFn: () => getCategories(householdQuery.data!.household.id),
    enabled: !!householdQuery.data?.household?.id,
  });

  // Set default account on first load
  useEffect(() => {
    if (accountsQuery.data && accountsQuery.data.length > 0 && !formData.accountId) {
      const defaultAccount = accountsQuery.data.find((acc) => acc.isDefault) || accountsQuery.data[0];
      setFormData((prev) => ({ ...prev, accountId: defaultAccount.id }));
    }
  }, [accountsQuery.data]);

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: () =>
      createTransaction({
        userId: householdQuery.data!.userRecord.id,
        householdId: householdQuery.data!.household.id,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        note: formData.note || undefined,
        isRecurring: formData.isRecurring,
        recurringDay: formData.isRecurring ? formData.recurringDay : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });

      setSuccessMessage(`✓ ${formData.type === 'income' ? 'Income' : 'Expense'} added!`);
      setShowSuccess(true);

      // Clear form after 2 seconds
      setTimeout(() => {
        setFormData({
          type: formData.type,
          amount: '',
          categoryId: '',
          accountId: accountsQuery.data?.[0]?.id || '',
          date: new Date().toISOString().split('T')[0],
          note: '',
          isRecurring: false,
          recurringDay: 1,
        });
        setShowSuccess(false);
        amountInputRef.current?.focus();
      }, 2000);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
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
    createMutation.mutate();
    setIsSubmitting(false);
  };

  // Filter categories by type
  const categories = (categoriesQuery.data as any[]) || [];
  const filteredCategories = categories.filter((cat) => cat.type === formData.type);

  const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
  const selectedAccount = accountsQuery.data?.find((acc) => acc.id === formData.accountId);

  // Group categories
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    const group = cat.categoryGroup;
    if (!acc[group]) acc[group] = [];
    acc[group].push(cat);
    return acc;
  }, {} as Record<string, any[]>);

  const groupOrder = formData.type === 'income' ? ['income'] : ['needs', 'wants', 'savings', 'other'];

  if (householdQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Add Transaction',
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

              {/* Account Dropdown */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Account</Text>
                <Pressable
                  onPress={() => setShowAccountModal(true)}
                  className={cn(
                    'p-3 rounded-lg border-2 flex-row items-center justify-between',
                    errors.accountId ? 'border-red-500' : 'border-gray-200'
                  )}
                >
                  <View className="flex-1">
                    <Text className={cn('font-medium', selectedAccount ? 'text-gray-900' : 'text-gray-500')}>
                      {selectedAccount?.name || 'Select account'}
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
                <Text className="text-sm font-semibold text-gray-700 mb-3">Date (DD.MM.YYYY)</Text>
                <TextInput
                  className={cn(
                    'p-3 rounded-lg border-2 text-base font-medium',
                    errors.date ? 'border-red-500' : 'border-gray-200'
                  )}
                  style={{ color: '#1F2937' }}
                  placeholder="25.12.2024"
                  placeholderTextColor="#D1D5DB"
                  value={formatDateSwiss(formData.date)}
                  onChangeText={(text) => {
                    const parsed = parseSwissDate(text);
                    if (parsed) {
                      setFormData({ ...formData, date: parsed });
                      if (errors.date) setErrors({ ...errors, date: undefined });
                    }
                  }}
                />
                {errors.date && <Text className="text-xs text-red-500 mt-2">{errors.date}</Text>}
              </View>

              {/* Note */}
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-semibold text-gray-700">Note (Optional)</Text>
                  <Text className="text-xs text-gray-500">{formData.note.length}/200</Text>
                </View>
                <TextInput
                  className="p-3 rounded-lg border-2 border-gray-200 text-base"
                  style={{ color: '#1F2937', minHeight: 100 }}
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

              {/* Submit Button */}
              <View className="gap-3">
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting || createMutation.isPending}
                  className="py-4 rounded-lg bg-teal-600 items-center justify-center"
                >
                  {isSubmitting || createMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Add Transaction</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => router.back()}
                  disabled={isSubmitting || createMutation.isPending}
                  className="py-4 rounded-lg border-2 border-gray-200 items-center justify-center"
                >
                  <Text className="text-base font-semibold text-gray-700">Cancel</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Date Picker Modal - Simple text input with validation */}

      {/* Category Dropdown Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/30">
          <SafeAreaView className="flex-1" edges={['bottom']}>
            <View className="flex-1 bg-white rounded-t-3xl pt-6">
              <View className="flex-row items-center justify-between px-6 pb-6 border-b border-gray-100">
                <Text className="text-xl font-semibold text-gray-900">Select Category</Text>
                <Pressable onPress={() => setShowCategoryModal(false)}>
                  <X size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView className="flex-1 px-6">
                {groupOrder.map((group) => {
                  const groupCategories = groupedCategories[group] || [];
                  if (groupCategories.length === 0) return null;

                  const groupLabels: Record<string, string> = {
                    income: 'Income',
                    needs: 'Needs (50%)',
                    wants: 'Wants (30%)',
                    savings: 'Savings (20%)',
                    other: 'Other',
                  };

                  return (
                    <View key={group}>
                      <Text className="text-sm font-semibold text-gray-700 mt-6 mb-3">{groupLabels[group]}</Text>
                      {groupCategories.map((category: any) => (
                        <Pressable
                          key={category.id}
                          onPress={() => {
                            setFormData({ ...formData, categoryId: category.id });
                            setShowCategoryModal(false);
                          }}
                          className={cn(
                            'p-4 rounded-lg mb-2 flex-row items-center justify-between',
                            formData.categoryId === category.id ? 'bg-teal-50' : 'bg-gray-50'
                          )}
                        >
                          <View className="flex-row items-center gap-3 flex-1">
                            {category.icon && <Text className="text-lg">{category.icon}</Text>}
                            <Text className={cn('font-medium', formData.categoryId === category.id ? 'text-teal-600' : 'text-gray-900')}>
                              {category.name}
                            </Text>
                          </View>
                          {formData.categoryId === category.id && <Check size={20} color="#006A6A" />}
                        </Pressable>
                      ))}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Account Dropdown Modal */}
      <Modal visible={showAccountModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/30">
          <SafeAreaView className="flex-1" edges={['bottom']}>
            <View className="flex-1 bg-white rounded-t-3xl pt-6">
              <View className="flex-row items-center justify-between px-6 pb-6 border-b border-gray-100">
                <Text className="text-xl font-semibold text-gray-900">Select Account</Text>
                <Pressable onPress={() => setShowAccountModal(false)}>
                  <X size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView className="flex-1 px-6">
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
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
