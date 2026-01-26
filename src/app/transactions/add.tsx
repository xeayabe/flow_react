import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, X, Check, Calendar, ChevronRight, Check as CheckIcon, Sparkles } from 'lucide-react-native';
import { db } from '@/lib/db';
import { createTransaction, formatCurrency, formatDateSwiss, parseSwissDate } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getUserAccounts, formatBalance } from '@/lib/accounts-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { migrateCategoryGroups } from '@/lib/migrate-categories';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { createExpenseSplits, calculateSplitRatio } from '@/lib/shared-expenses-api';
import { getCategorySuggestion, savePayeeMapping } from '@/lib/payee-mappings-api';
import PayeePickerModal from '@/components/PayeePickerModal';
import CategoryPickerModal from '@/components/CategoryPickerModal';
import { cn } from '@/lib/cn';

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
  isShared?: boolean;
  paidByUserId?: string;
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
  const mainScrollRef = useRef<ScrollView>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAddAnotherModal, setShowAddAnotherModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

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
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Shared expense state
  const [isShared, setIsShared] = useState(false);
  const [paidByUserId, setPaidByUserId] = useState<string>('');

  // Smart payee-category learning state
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);
  const [showPayeePicker, setShowPayeePicker] = useState(false);

  // Auto-scroll to date picker when it opens
  useEffect(() => {
    if (showDatePicker) {
      setTimeout(() => {
        mainScrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [showDatePicker]);

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

  // Load household members for shared expenses
  const householdMembersQuery = useQuery({
    queryKey: ['household-members', householdQuery.data?.householdId],
    queryFn: async () => {
      if (!householdQuery.data?.householdId) return [];

      const { data: membersData } = await db.queryOnce({
        householdMembers: {
          $: {
            where: { householdId: householdQuery.data.householdId, status: 'active' },
          },
        },
        users: {},
      });

      if (!membersData?.householdMembers) return [];

      return membersData.householdMembers.map((member: any) => {
        const memberUser = membersData.users?.find((u: any) => u.id === member.userId);
        return {
          ...member,
          userId: member.userId,
          userName: memberUser?.name || 'Unknown',
          userEmail: memberUser?.email || 'unknown@email.com',
        };
      });
    },
    enabled: !!householdQuery.data?.householdId,
  });

  // Get split ratios for showing percentages
  const splitRatiosQuery = useQuery({
    queryKey: ['split-ratios', householdQuery.data?.householdId],
    queryFn: async () => {
      if (!householdQuery.data?.householdId) return [];
      try {
        return await calculateSplitRatio(householdQuery.data.householdId);
      } catch (error) {
        console.error('Error calculating split ratios:', error);
        return [];
      }
    },
    enabled: !!householdQuery.data?.householdId && isShared,
  });

  // Auto-select current user as payer when members load
  useEffect(() => {
    if (householdMembersQuery.data && householdMembersQuery.data.length > 0 && !paidByUserId) {
      const currentMember = householdMembersQuery.data.find(
        (m: any) => m.userId === householdQuery.data?.userRecord?.id
      );
      if (currentMember) {
        setPaidByUserId(currentMember.userId);
      }
    }
  }, [householdMembersQuery.data, householdQuery.data?.userRecord?.id, paidByUserId]);

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
    queryFn: async () => {
      if (!householdQuery.data?.householdId || !householdQuery.data?.userRecord?.id) {
        console.warn('Household ID or User ID not available for categories query');
        return [];
      }

      // Run migration first to fix any categories with old hardcoded group values
      await migrateCategoryGroups(householdQuery.data.householdId);

      const cats = await getCategories(householdQuery.data.householdId, householdQuery.data.userRecord.id);
      console.log('Categories loaded:', { count: cats.length, categories: cats.map(c => ({ id: c.id, name: c.name, type: c.type, group: c.categoryGroup })) });
      return cats;
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

  // Set default account on first load
  useEffect(() => {
    if (accountsQuery.data && accountsQuery.data.length > 0 && !formData.accountId) {
      const defaultAccount = accountsQuery.data.find((acc) => acc.isDefault) || accountsQuery.data[0];
      setFormData((prev) => ({ ...prev, accountId: defaultAccount.id }));
    }
  }, [accountsQuery.data]);

  // Handle payee selection from modal
  const handleSelectPayee = async (selectedPayee: string) => {
    console.log('✅ Payee selected:', selectedPayee);
    setFormData((prev) => ({ ...prev, payee: selectedPayee }));

    // Auto-fill category if mapping exists
    if (householdQuery.data?.userRecord?.id) {
      const suggested = await getCategorySuggestion(householdQuery.data.userRecord.id, selectedPayee);

      if (suggested) {
        console.log('💡 Auto-filling category:', suggested);
        setFormData((prev) => ({ ...prev, categoryId: suggested }));
        setSuggestedCategoryId(suggested);
      }
    }
  };

  // Handle clearing payee
  const handleClearPayee = () => {
    setFormData((prev) => ({ ...prev, payee: '' }));
    setSuggestedCategoryId(null);
  };

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await createTransaction({
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
        isShared: isShared,
        paidByUserId: isShared ? paidByUserId : undefined,
      });

      // Check if the transaction creation was successful
      if (!result.success) {
        throw new Error(result.error || 'Failed to create transaction');
      }

      // If shared, create expense splits
      if (isShared && result.transactionId) {
        console.log('Creating expense splits for transaction:', result.transactionId);
        await createExpenseSplits(
          result.transactionId,
          parseFloat(formData.amount),
          householdQuery.data!.householdId,
          paidByUserId
        );
        console.log('Expense splits created successfully');
      }

      return result;
    },
    onSuccess: async () => {
      // Save payee-category mapping for smart learning
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
      queryClient.invalidateQueries({ queryKey: ['all-payees', householdQuery.data?.userRecord?.id] });

      // Show the "add another" modal immediately
      setShowAddAnotherModal(true);
    },
    onError: (error) => {
      console.error('Transaction creation failed:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create transaction. Please try again.');
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
    createMutation.mutate();
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

  // Group categories by their categoryGroup field (which stores the group key)
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

  if (householdQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading || categoryGroupsQuery.isLoading || householdMembersQuery.isLoading) {
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
          <ScrollView ref={mainScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View className="px-6 py-8">
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

              {/* Payee Picker Button */}
              <View className="mb-8">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Payee (Optional)</Text>
                <Pressable
                  onPress={() => setShowPayeePicker(true)}
                  className={cn(
                    'p-3 rounded-lg border-2 flex-row items-center justify-between',
                    'border-gray-200'
                  )}
                >
                  <Text className={cn('font-medium', formData.payee ? 'text-gray-900' : 'text-gray-500')}>
                    {formData.payee || 'Choose payee...'}
                  </Text>
                  <Text className="text-gray-400">›</Text>
                </Pressable>

                {/* Show hint if category was auto-filled */}
                {suggestedCategoryId === formData.categoryId && formData.categoryId && formData.payee.trim() && (
                  <View className="flex-row items-center mt-2 bg-blue-50 p-2 rounded-lg">
                    <Sparkles size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                    <Text className="text-xs text-blue-700 flex-1">
                      Category auto-filled based on previous usage
                    </Text>
                  </View>
                )}

                {/* Clear button if payee selected */}
                {formData.payee && (
                  <Pressable
                    onPress={handleClearPayee}
                    className="mt-2"
                  >
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
                <Pressable
                  onPress={() => router.push('/accounts/add')}
                  className="mt-2 flex-row items-center gap-1"
                >
                  <Text className="text-xs font-semibold text-teal-600">Don't have a wallet?</Text>
                  <Text className="text-xs font-semibold text-teal-600">Add one</Text>
                </Pressable>
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
                  <View className="flex-row items-center">
                    <Calendar size={20} color="#006A6A" style={{ marginRight: 12 }} />
                    <Text className="text-base font-medium" style={{ color: '#1F2937' }}>
                      {formatDateSwiss(formData.date)}
                    </Text>
                  </View>
                  <Text className="text-gray-400">›</Text>
                </Pressable>
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

              {/* SHARED EXPENSE CONTROLS - Only show if household has 2+ members and transaction type is expense */}
              {householdMembersQuery.data && householdMembersQuery.data.length >= 2 && formData.type === 'expense' && (
                <>
                  {/* Shared expense toggle */}
                  <View className="flex-row items-center justify-between p-4 border-t border-gray-200 mt-4 mb-4">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">Shared Expense</Text>
                      <Text className="text-sm text-gray-600">Split with household members</Text>
                    </View>
                    <Switch
                      value={isShared}
                      onValueChange={setIsShared}
                      trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Who paid selector - only show when shared */}
                  {isShared && (
                    <View className="px-0 pb-4 mb-4">
                      {/* Split Preview */}
                      {formData.amount && parseFloat(formData.amount) > 0 && (
                        <View className="bg-blue-50 p-3 rounded-xl mb-4 border border-blue-200">
                          <Text className="text-xs text-blue-900 font-semibold mb-2">Split Preview:</Text>
                          {householdMembersQuery.data?.map((member: any) => {
                            const ratio = splitRatiosQuery.data?.find((r: any) => r.userId === member.userId);
                            const percentage = ratio?.percentage || 50;
                            const splitAmount = (parseFloat(formData.amount) * percentage) / 100;
                            return (
                              <Text key={member.userId} className="text-xs text-blue-700 mb-1">
                                {member.userName}: {splitAmount.toFixed(2)} CHF ({percentage.toFixed(0)}%)
                              </Text>
                            );
                          })}
                        </View>
                      )}

                      <Text className="text-sm font-semibold text-gray-700 mb-3">Who paid?</Text>
                      {householdMembersQuery.data.map((member: any) => (
                        <Pressable
                          key={member.userId}
                          onPress={() => setPaidByUserId(member.userId)}
                          className={`flex-row items-center p-3 rounded-xl mb-2 ${
                            paidByUserId === member.userId
                              ? 'bg-teal-50 border-2 border-teal-600'
                              : 'bg-gray-50 border-2 border-gray-200'
                          }`}
                        >
                          <View
                            className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                              paidByUserId === member.userId
                                ? 'border-teal-600 bg-teal-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {paidByUserId === member.userId && (
                              <Text className="text-white text-xs font-bold">✓</Text>
                            )}
                          </View>
                          <View>
                            <Text
                              className={`text-base ${
                                paidByUserId === member.userId ? 'font-semibold text-gray-900' : 'text-gray-700'
                              }`}
                            >
                              {member.userName}
                            </Text>
                            <Text className="text-xs text-gray-500">{member.userEmail}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Submit Button */}
              <View className="gap-3">
                {/* Helper message if no accounts */}
                {accountsQuery.data?.length === 0 && (
                  <View className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <Text className="text-amber-900 text-center font-semibold mb-2">
                      You need a wallet first
                    </Text>
                    <Pressable
                      onPress={() => router.push('/accounts/add')}
                      className="bg-teal-600 py-2 px-4 rounded-lg"
                    >
                      <Text className="text-white text-center font-semibold text-sm">
                        Add Your First Wallet
                      </Text>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || accountsQuery.data?.length === 0}
                  className="py-4 rounded-lg bg-teal-600 items-center justify-center"
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-base font-semibold text-white">Add Transaction</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => router.back()}
                  disabled={createMutation.isPending}
                  className="py-4 rounded-lg border-2 border-gray-200 items-center justify-center"
                >
                  <Text className="text-base font-semibold text-gray-700">Cancel</Text>
                </Pressable>

                {/* Link to add another wallet if accounts exist */}
                {accountsQuery.data && accountsQuery.data.length > 0 && (
                  <Pressable onPress={() => router.push('/accounts/add')} className="py-2">
                    <Text className="text-teal-600 text-sm text-center font-medium">
                      Need to add another wallet?
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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

      {/* Account Dropdown Modal */}
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

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} animationType="slide" transparent onRequestClose={() => setShowDatePicker(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowDatePicker(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl">
              <SafeAreaView edges={['bottom']} className="bg-white">
                <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                  <Text className="text-xl font-semibold text-gray-900">Select Date</Text>
                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <X size={24} color="#6B7280" />
                  </Pressable>
                </View>

                <View className="px-6 pt-4 pb-6">
                  {/* Month/Year Navigation */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Pressable
                      onPress={() => {
                        const prev = new Date(calendarMonth);
                        prev.setMonth(prev.getMonth() - 1);
                        setCalendarMonth(prev);
                      }}
                      className="p-2"
                    >
                      <ChevronLeft size={24} color="#006A6A" />
                    </Pressable>
                    <Text className="text-lg font-semibold text-gray-900">
                      {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <Pressable
                      onPress={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                      }}
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
                      const days = [];

                      // Empty cells for days before month starts
                      for (let i = 0; i < firstDay; i++) {
                        days.push(null);
                      }

                      // Days in month
                      for (let i = 1; i <= daysInMonth; i++) {
                        days.push(i);
                      }

                      return days.map((day, index) => {
                        const dateStr =
                          day === null
                            ? null
                            : `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = dateStr === tempDate;
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        return (
                          <Pressable
                            key={index}
                            onPress={() => {
                              if (dateStr) {
                                setTempDate(dateStr);
                                setFormData({ ...formData, date: dateStr });
                                if (errors.date) setErrors({ ...errors, date: undefined });
                                setShowDatePicker(false);
                              }
                            }}
                            disabled={!day}
                            style={{ width: '14.28%' }}
                            className={cn(
                              'aspect-square items-center justify-center rounded-lg mb-2',
                              isSelected && 'bg-teal-600',
                              isToday && !isSelected && 'bg-teal-100 border-2 border-teal-600',
                              !day && 'bg-transparent'
                            )}
                          >
                            {day && (
                              <Text
                                className={cn(
                                  'text-base font-semibold',
                                  isSelected && 'text-white',
                                  !isSelected && 'text-gray-900'
                                )}
                              >
                                {day}
                              </Text>
                            )}
                          </Pressable>
                        );
                      });
                    })()}
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Another Modal */}
      <Modal visible={showAddAnotherModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-2xl mx-6 p-6 gap-4">
            <View className="items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center">
                <CheckIcon size={24} color="#059669" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 text-center">
                {formData.type === 'income' ? 'Income' : 'Expense'} Added!
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Would you like to add another transaction?
              </Text>
            </View>

            <View className="gap-3 mt-2">
              <Pressable
                onPress={() => {
                  setShowAddAnotherModal(false);
                  // Reset form for new transaction
                  setFormData({
                    type: formData.type,
                    amount: '',
                    categoryId: '',
                    accountId: accountsQuery.data?.[0]?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    note: '',
                    payee: '',
                    isRecurring: false,
                    recurringDay: 1,
                  });
                  setSuggestedCategoryId(null);
                  amountInputRef.current?.focus();
                }}
                className="py-3 rounded-lg bg-teal-600 items-center justify-center"
              >
                <Text className="text-base font-semibold text-white">Add Another</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowAddAnotherModal(false);
                  router.back();
                }}
                className="py-3 rounded-lg border-2 border-gray-200 items-center justify-center"
              >
                <Text className="text-base font-semibold text-gray-700">Done</Text>
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
