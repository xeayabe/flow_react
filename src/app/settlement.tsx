import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckSquare, Square, CircleCheck } from 'lucide-react-native';
import { db } from '@/lib/db';
import {
  getUnsettledSharedExpenses,
  calculateHouseholdDebt,
  createSettlement,
  type UnsettledExpense,
  type DebtSummary,
} from '@/lib/settlement-api';
import { getCurrentUserHouseholdInfo } from '@/lib/household-members-api';

export default function SettlementScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();

  // State management
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [settlementAmount, setSettlementAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('internal_transfer');
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);

  // Payment methods
  const paymentMethods = [
    { value: 'internal_transfer', label: 'Internal Transfer' },
    { value: 'twint', label: 'TWINT' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'revolut', label: 'Revolut' },
    { value: 'other', label: 'Other' },
  ];

  // Get current user's household info
  const { data: userInfo, isLoading: isLoadingUserInfo } = useQuery({
    queryKey: ['user-household-info', user?.email],
    queryFn: () => getCurrentUserHouseholdInfo(user?.email || ''),
    enabled: !!user?.email,
  });

  // Get unsettled expenses
  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['unsettled-expenses', userInfo?.householdId, userInfo?.userId],
    queryFn: () => getUnsettledSharedExpenses(userInfo!.householdId, userInfo!.userId),
    enabled: !!userInfo?.householdId && !!userInfo?.userId,
  });

  // Get debt summary
  const { data: debtInfo, isLoading: isLoadingDebt } = useQuery({
    queryKey: ['household-debt', userInfo?.householdId, userInfo?.userId],
    queryFn: () => calculateHouseholdDebt(userInfo!.householdId, userInfo!.userId),
    enabled: !!userInfo?.householdId && !!userInfo?.userId,
  });

  // Initialize selected expenses (all expenses that the user owes)
  useEffect(() => {
    if (expenses) {
      // Only auto-select expenses where user owes money (positive yourShare)
      const expensesToSettle = expenses
        .filter((e) => e.yourShare > 0)
        .map((e) => e.id);
      setSelectedExpenses(expensesToSettle);
    }
  }, [expenses]);

  // Calculate settlement amount when selection changes
  useEffect(() => {
    if (expenses) {
      const total = expenses
        .filter((e) => selectedExpenses.includes(e.id))
        .reduce((sum, e) => sum + Math.abs(e.yourShare), 0);
      setSettlementAmount(Math.round(total * 100) / 100);
    }
  }, [selectedExpenses, expenses]);

  // Toggle expense selection
  const toggleExpense = (expenseId: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(expenseId)
        ? prev.filter((id) => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  // Get accounts for settlement
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', userInfo?.userId],
    queryFn: async () => {
      const { data } = await db.queryOnce({
        accounts: {
          $: { where: { userId: userInfo!.userId, isActive: true } },
        },
      });
      return data.accounts || [];
    },
    enabled: !!userInfo?.userId,
  });

  const payerAccount = accountsData?.[0]; // Current user's account
  const receiverAccount = accountsData?.find((a: any) => a.userId === debtInfo?.otherMemberId); // Other member's account

  // Settlement mutation
  const settleMutation = useMutation({
    mutationFn: async () => {
      if (!userInfo || !debtInfo || !payerAccount) {
        throw new Error('Missing required data for settlement');
      }

      // Determine who is payer and who is receiver
      const youOwe = debtInfo.amount > 0;
      const payerUserId = youOwe ? userInfo.userId : debtInfo.otherMemberId;
      const receiverUserId = youOwe ? debtInfo.otherMemberId : userInfo.userId;

      // Get receiver's account
      const { data: receiverAccountData } = await db.queryOnce({
        accounts: {
          $: { where: { userId: receiverUserId, isActive: true } },
        },
      });
      const receiverAcc = receiverAccountData.accounts?.[0];

      if (!receiverAcc) {
        throw new Error('Receiver account not found');
      }

      return createSettlement(
        payerUserId,
        receiverUserId,
        Math.abs(settlementAmount),
        payerAccount.id,
        receiverAcc.id,
        userInfo.householdId,
        undefined // No category for settlements
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['unsettled-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['household-debt'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      Alert.alert(
        'Settlement Complete',
        `Successfully settled ${settlementAmount.toFixed(2)} CHF`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Settlement Failed', error.message || 'Could not complete settlement');
    },
  });

  const handleSettle = () => {
    if (selectedExpenses.length === 0) {
      Alert.alert('No Expenses Selected', 'Please select at least one expense to settle');
      return;
    }

    if (settlementAmount <= 0) {
      Alert.alert('Invalid Amount', 'Settlement amount must be greater than 0');
      return;
    }

    const youOwe = debtInfo && debtInfo.amount > 0;
    const actionText = youOwe ? 'pay' : 'request payment of';
    const partnerName = debtInfo?.otherMemberName || 'your partner';

    Alert.alert(
      'Confirm Settlement',
      `Are you sure you want to ${actionText} ${settlementAmount.toFixed(2)} CHF ${
        youOwe ? `to ${partnerName}` : `from ${partnerName}`
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => settleMutation.mutate() },
      ]
    );
  };

  const isLoading = isLoadingUserInfo || isLoadingExpenses || isLoadingDebt;

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#006A6A" />
        <Text className="text-gray-500 mt-4">Loading settlement data...</Text>
      </View>
    );
  }

  // All settled state
  if (!expenses || expenses.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <SafeAreaView edges={['top']} className="flex-1">
          {/* Header */}
          <View className="bg-white flex-row items-center px-4 py-4 border-b border-gray-200">
            <Pressable onPress={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold ml-2 text-gray-900">Settlement</Text>
          </View>

          {/* All Settled Message */}
          <View className="flex-1 items-center justify-center px-8">
            <CircleCheck size={64} color="#10B981" />
            <Text className="text-2xl font-bold text-gray-900 mt-4 text-center">
              All Settled!
            </Text>
            <Text className="text-gray-500 mt-2 text-center">
              You have no unsettled expenses with your household partner.
            </Text>
            <Pressable
              onPress={() => router.back()}
              className="mt-6 bg-teal-600 px-6 py-3 rounded-xl active:bg-teal-700"
            >
              <Text className="text-white font-semibold">Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const youOwe = debtInfo && debtInfo.amount > 0;
  const partnerName = debtInfo?.otherMemberName || 'Partner';
  const totalDebt = Math.abs(debtInfo?.amount || 0);

  return (
    <View className="flex-1 bg-gray-50">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <View className="bg-white flex-row items-center px-4 py-4 border-b border-gray-200">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-semibold ml-2 text-gray-900">
            Settle with {partnerName}
          </Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Total Debt Card */}
          <View className="mx-4 mt-4 bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-sm text-gray-500 mb-1">
              {youOwe ? 'You owe' : 'You are owed'}
            </Text>
            <Text
              className="text-3xl font-bold"
              style={{ color: youOwe ? '#DC2626' : '#10B981' }}
            >
              {totalDebt.toFixed(2)} CHF
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              {expenses.length} unsettled expense{expenses.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Expenses List */}
          <View className="mx-4 mt-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2 px-1">
              Unsettled Shared Expenses ({expenses.length})
            </Text>

            {expenses.map((expense) => {
              const isSelected = selectedExpenses.includes(expense.id);
              const expenseYouOwe = expense.yourShare > 0;

              return (
                <Pressable
                  key={expense.id}
                  onPress={() => toggleExpense(expense.id)}
                  className={`bg-white rounded-xl p-4 mb-2 border ${
                    isSelected ? 'border-teal-500' : 'border-gray-200'
                  }`}
                >
                  <View className="flex-row items-start">
                    <View className="mt-0.5 mr-3">
                      {isSelected ? (
                        <CheckSquare size={24} color="#0D9488" />
                      ) : (
                        <Square size={24} color="#9CA3AF" />
                      )}
                    </View>

                    <View className="flex-1">
                      {/* Date and Category */}
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-base font-semibold text-gray-900">
                          {expense.category}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {new Date(expense.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </View>

                      {/* Description */}
                      {expense.description && (
                        <Text className="text-sm text-gray-600 mb-2">
                          {expense.description}
                        </Text>
                      )}

                      {/* Amount Details */}
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm text-gray-500">
                          Total: {expense.totalAmount.toFixed(2)} CHF
                        </Text>
                        <Text className="text-gray-300">•</Text>
                        <Text
                          className="text-sm font-medium"
                          style={{
                            color: expenseYouOwe ? '#DC2626' : '#10B981',
                          }}
                        >
                          Your share: {Math.abs(expense.yourShare).toFixed(2)} CHF
                        </Text>
                      </View>

                      {/* Paid by */}
                      <Text className="text-xs text-gray-500 mt-1">
                        Paid by {expense.paidBy}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Settlement Summary */}
          <View className="mx-4 mt-4 bg-white rounded-xl p-4 border border-gray-200">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Settlement Summary
            </Text>

            {/* Selected Count */}
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600">Selected expenses</Text>
              <Text className="text-gray-900 font-medium">
                {selectedExpenses.length} of {expenses.length}
              </Text>
            </View>

            {/* Settlement Amount */}
            <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
              <Text className="text-base font-semibold text-gray-900">
                Settlement Amount
              </Text>
              <Text className="text-2xl font-bold text-teal-600">
                {settlementAmount.toFixed(2)} CHF
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Buttons */}
        <View className="bg-white border-t border-gray-200 px-4 py-4">
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="flex-1 py-3 rounded-xl bg-gray-100 active:bg-gray-200"
            >
              <Text className="text-center font-semibold text-gray-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSettle}
              disabled={settleMutation.isPending || selectedExpenses.length === 0}
              className={`flex-1 py-3 rounded-xl ${
                settleMutation.isPending || selectedExpenses.length === 0
                  ? 'bg-gray-300'
                  : 'bg-teal-600 active:bg-teal-700'
              }`}
            >
              {settleMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-center font-semibold text-white">
                  Settle {settlementAmount.toFixed(2)} CHF
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
