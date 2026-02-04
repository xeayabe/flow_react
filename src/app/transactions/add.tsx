import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Check, Calendar, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { db } from '@/lib/db';
import { createTransaction } from '@/lib/transactions-api';
import { getCategories } from '@/lib/categories-api';
import { getUserAccounts } from '@/lib/accounts-api';
import { getCategoryGroups } from '@/lib/category-groups-api';
import { getUserProfileAndHousehold } from '@/lib/household-utils';
import { createExpenseSplits, calculateSplitRatio } from '@/lib/shared-expenses-api';
import { getCategorySuggestion, savePayeeMapping } from '@/lib/payee-mappings-api';
import { createRecurringTemplate } from '@/lib/recurring-api';
import { formatCurrency } from '@/lib/formatCurrency';
import PayeePickerModal from '@/components/PayeePickerModal';
import QuickCategoryButtons from '@/components/transactions/QuickCategoryButtons';
import ExpandableCalendar from '@/components/transactions/ExpandableCalendar';
import SaveFAB from '@/components/transactions/SaveFAB';
import BottomSheetSelect from '@/components/transactions/BottomSheetSelect';
import SharedExpenseSection from '@/components/transactions/SharedExpenseSection';
import StickyStatusBar from '@/components/layout/StickyStatusBar';
import { cn } from '@/lib/cn';

type TransactionType = 'income' | 'expense';

interface FormData {
  type: TransactionType;
  amount: string;
  categoryId: string;
  accountId: string;
  date: string;
  note: string;
  payee: string;
  isRecurring: boolean;
  recurringDay: number;
  isShared?: boolean;
  paidByUserId?: string;
}

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = db.useAuth();
  const amountInputRef = useRef<TextInput>(null);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const [showPayeePicker, setShowPayeePicker] = useState(false);
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);

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

  // Shared expense state
  const [isShared, setIsShared] = useState(false);
  const [paidByUserId, setPaidByUserId] = useState<string>('');

  // Get user and household info
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

  // Get split ratios
  const splitRatiosQuery = useQuery({
    queryKey: ['split-ratios', householdQuery.data?.householdId],
    queryFn: async () => {
      if (!householdQuery.data?.householdId) return [];
      try {
        return await calculateSplitRatio(householdQuery.data.householdId);
      } catch (error) {
        return [];
      }
    },
    enabled: !!householdQuery.data?.householdId && isShared,
  });

  // Auto-select current user as payer
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
      if (!householdQuery.data?.householdId || !householdQuery.data?.userRecord?.id) return [];
      return getCategories(householdQuery.data.householdId, householdQuery.data.userRecord.id);
    },
    enabled: !!householdQuery.data?.householdId && !!householdQuery.data?.userRecord?.id,
  });

  // Set default account
  useEffect(() => {
    if (accountsQuery.data && accountsQuery.data.length > 0 && !formData.accountId) {
      const defaultAccount = accountsQuery.data.find((acc) => acc.isDefault) || accountsQuery.data[0];
      setFormData((prev) => ({ ...prev, accountId: defaultAccount.id }));
    }
  }, [accountsQuery.data]);

  // Handle payee selection
  const handleSelectPayee = async (selectedPayee: string) => {
    setFormData((prev) => ({ ...prev, payee: selectedPayee }));

    if (householdQuery.data?.userRecord?.id) {
      const suggested = await getCategorySuggestion(householdQuery.data.userRecord.id, selectedPayee);
      if (suggested) {
        setFormData((prev) => ({ ...prev, categoryId: suggested }));
        setSuggestedCategoryId(suggested);
      }
    }
  };

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (formData.isRecurring) {
        const templateId = await createRecurringTemplate({
          userId: householdQuery.data!.userRecord.id,
          householdId: householdQuery.data!.householdId,
          amount: parseFloat(formData.amount),
          categoryId: formData.categoryId,
          accountId: formData.accountId,
          recurringDay: formData.recurringDay,
          payee: formData.payee || undefined,
          note: formData.note || undefined,
        });
        return { success: true, templateId, isTemplate: true };
      }

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
        isRecurring: false,
        recurringDay: undefined,
        isShared: isShared,
        paidByUserId: isShared ? paidByUserId : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create transaction');
      }

      if (isShared && result.transactionId) {
        await createExpenseSplits(
          result.transactionId,
          parseFloat(formData.amount),
          householdQuery.data!.householdId,
          paidByUserId
        );
      }

      return { ...result, isTemplate: false };
    },
    onSuccess: async (result: any) => {
      if (formData.payee.trim() && formData.categoryId && householdQuery.data?.userRecord?.id) {
        await savePayeeMapping(
          householdQuery.data.userRecord.id,
          formData.payee.trim(),
          formData.categoryId
        );
      }

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budget-details'] });

      if (result.isTemplate) {
        Alert.alert(
          'Recurring Expense Set Up!',
          `Your recurring expense will appear on day ${formData.recurringDay} of each month.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        router.back();
      }
    },
    onError: (error) => {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create transaction');
    },
  });

  const validateAndSubmit = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!formData.categoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.accountId) {
      Alert.alert('Error', 'Please select a wallet');
      return;
    }
    createMutation.mutate();
  };

  const isFormValid = () => {
    return (
      formData.amount !== '' &&
      parseFloat(formData.amount) > 0 &&
      formData.categoryId !== '' &&
      formData.accountId !== ''
    );
  };

  const categories = (categoriesQuery.data as any[]) || [];
  const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
  const selectedAccount = accountsQuery.data?.find((acc) => acc.id === formData.accountId);
  const partnerName = householdMembersQuery.data?.find((m: any) => m.userId !== householdQuery.data?.userRecord?.id)?.userName || 'Partner';

  if (householdQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <LinearGradient colors={['#1A1C1E', '#2C5F5D']} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#A8B5A1" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1C1E', '#2C5F5D']} style={{ flex: 1 }}>
      <StickyStatusBar scrollY={scrollY} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 20,
          }}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(400)} className="flex-row items-center justify-between mb-6">
            <Pressable
              onPress={() => router.back()}
              className="items-center justify-center rounded-xl mr-4"
              style={{
                width: 40,
                height: 40,
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <ArrowLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </Pressable>
            <Text className="text-2xl font-bold flex-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Add {formData.type === 'expense' ? 'Expense' : 'Income'}
            </Text>
          </Animated.View>

          {/* Type Toggle */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mb-6">
            <View className="flex-row rounded-xl p-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              {(['expense', 'income'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setFormData({ ...formData, type, categoryId: '' })}
                  className="flex-1 py-3 rounded-lg items-center"
                  style={{
                    backgroundColor: formData.type === type ? 'rgba(44,95,93,0.8)' : 'transparent',
                  }}
                >
                  <Text
                    className="font-semibold capitalize text-base"
                    style={{ color: formData.type === type ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)' }}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Amount Glass Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-6 rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View className="p-5">
              <Text className="text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Amount</Text>
              <View className="flex-row items-center">
                <TextInput
                  ref={amountInputRef}
                  className="flex-1 text-4xl font-bold"
                  style={{ color: '#A8B5A1' }}
                  placeholder="0.00"
                  placeholderTextColor="rgba(168,181,161,0.3)"
                  keyboardType="decimal-pad"
                  value={formData.amount}
                  onChangeText={(text) => {
                    const normalized = text.replace(',', '.');
                    const cleaned = normalized.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                    setFormData({ ...formData, amount: finalValue });
                  }}
                  autoFocus
                />
                <Text className="text-xl font-semibold ml-2" style={{ color: 'rgba(255,255,255,0.6)' }}>CHF</Text>
              </View>
            </View>
          </Animated.View>

          {/* Shared Expense Section - Only for expenses with 2+ members */}
          {householdMembersQuery.data && householdMembersQuery.data.length >= 2 && formData.type === 'expense' && !formData.isRecurring && (
            <Animated.View
              entering={FadeInDown.delay(250).duration(400)}
              className="mb-6 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.05)',
                padding: 20,
              }}
            >
              <SharedExpenseSection
                partnerName={partnerName}
                amount={formData.amount}
                isShared={isShared}
                setIsShared={setIsShared}
                paidByUserId={paidByUserId}
                setPaidByUserId={setPaidByUserId}
                currentUserId={householdQuery.data?.userRecord?.id || ''}
                partnerUserId={householdMembersQuery.data?.find((m: any) => m.userId !== householdQuery.data?.userRecord?.id)?.userId || ''}
                splitRatios={splitRatiosQuery.data || []}
              />
            </Animated.View>
          )}

          {/* Payee Glass Card */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mb-6 rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <Pressable onPress={() => setShowPayeePicker(true)} className="p-5">
              <Text className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Payee</Text>
              <Text className="text-base" style={{ color: formData.payee ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>
                {formData.payee || 'Select payee...'}
              </Text>
            </Pressable>
            {suggestedCategoryId === formData.categoryId && formData.categoryId && formData.payee.trim() && (
              <View className="flex-row items-center px-5 pb-4" style={{ backgroundColor: 'rgba(168,181,161,0.1)' }}>
                <Sparkles size={14} color="#A8B5A1" style={{ marginRight: 6 }} />
                <Text className="text-xs flex-1" style={{ color: 'rgba(168,181,161,0.9)' }}>
                  Category auto-filled from history
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Category Glass Card */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} className="mb-6">
            <Text className="text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Category</Text>

            <BottomSheetSelect
              label="Select Category"
              options={categories.map((cat: any) => ({
                id: cat.id,
                name: cat.name,
                icon: cat.icon || cat.emoji || '📝',
              }))}
              value={formData.categoryId}
              onChange={(categoryId) => setFormData({ ...formData, categoryId })}
              placeholder="-- Select Category --"
            />

            {/* AI Suggestion Indicator */}
            {suggestedCategoryId === formData.categoryId && formData.categoryId && formData.payee.trim() && (
              <View className="flex-row items-center mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(168,181,161,0.1)' }}>
                <Sparkles size={14} color="#A8B5A1" style={{ marginRight: 6 }} />
                <Text className="text-xs flex-1" style={{ color: 'rgba(168,181,161,0.9)' }}>
                  Category auto-filled from history
                </Text>
              </View>
            )}

            {/* Quick Category Buttons */}
            <View className="mt-3">
              <QuickCategoryButtons
                categories={categories}
                selectedCategoryId={formData.categoryId}
                onSelectCategory={(categoryId) => setFormData({ ...formData, categoryId })}
                type={formData.type}
              />
            </View>
          </Animated.View>

          {/* Wallet Glass Card */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mb-6">
            <Text className="text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Wallet</Text>

            <BottomSheetSelect
              label="Select Wallet"
              options={(accountsQuery.data || []).map((account) => ({
                id: account.id,
                name: account.name,
                icon: '💳',
                meta: formatCurrency(account.balance),
              }))}
              value={formData.accountId}
              onChange={(accountId) => setFormData({ ...formData, accountId })}
              placeholder="-- Select Wallet --"
            />
          </Animated.View>

          {/* Date Glass Card */}
          <Animated.View entering={FadeInDown.delay(450).duration(400)} className="mb-6">
            <Text className="text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Date</Text>
            <ExpandableCalendar
              value={new Date(formData.date + 'T00:00:00')}
              onChange={(date) => {
                const dateStr = date.toISOString().split('T')[0];
                setFormData({ ...formData, date: dateStr });
              }}
            />
          </Animated.View>

          {/* Recurring Toggle */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)} className="mb-6 rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View className="p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    🔁 Repeats Monthly
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Create recurring template
                  </Text>
                </View>
                <Switch
                  value={formData.isRecurring}
                  onValueChange={(newValue) => {
                    setFormData({ ...formData, isRecurring: newValue });
                    if (newValue) setIsShared(false);
                  }}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#2C5F5D' }}
                  thumbColor="#fff"
                />
              </View>

              {formData.isRecurring && (
                <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                  <Text className="text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Day of month</Text>
                  <TextInput
                    className="text-center py-3 px-4 rounded-xl text-xl font-bold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#A8B5A1' }}
                    keyboardType="number-pad"
                    value={formData.recurringDay.toString()}
                    onChangeText={(text) => {
                      const day = Math.min(31, Math.max(1, parseInt(text) || 1));
                      setFormData({ ...formData, recurringDay: day });
                    }}
                    maxLength={2}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        </Animated.ScrollView>

        {/* Floating Action Button */}
        <SaveFAB
          onSave={validateAndSubmit}
          disabled={!isFormValid()}
          isLoading={createMutation.isPending}
        />
      </KeyboardAvoidingView>

      {/* Modals */}
      <PayeePickerModal
        visible={showPayeePicker}
        onClose={() => setShowPayeePicker(false)}
        onSelectPayee={handleSelectPayee}
        userId={householdQuery.data?.userRecord?.id || ''}
        currentPayee={formData.payee}
      />
    </LinearGradient>
  );
}
