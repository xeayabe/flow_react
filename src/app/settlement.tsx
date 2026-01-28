import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckSquare, Square, CircleCheck, ChevronDown, Check, X, Wallet } from 'lucide-react-native';
import { db } from '@/lib/db';
import {
  getUnsettledSharedExpenses,
  calculateHouseholdDebt,
  createSettlement,
  type UnsettledExpense,
  type DebtSummary,
} from '@/lib/settlement-api';
import { getCurrentUserHouseholdInfo } from '@/lib/household-members-api';
import { formatBalance, type Account } from '@/lib/accounts-api';
import { cn } from '@/lib/cn';

export default function SettlementScreen() {
  const queryClient = useQueryClient();
  const { user } = db.useAuth();

  // State management
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [settlementAmount, setSettlementAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('internal_transfer');
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);

  // Wallet selection state
  const [yourWalletId, setYourWalletId] = useState<string>('');
  const [partnerWalletId, setPartnerWalletId] = useState<string>('');
  const [showYourWalletPicker, setShowYourWalletPicker] = useState(false);
  const [showPartnerWalletPicker, setShowPartnerWalletPicker] = useState(false);

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

  // Get partner's accounts for settlement
  const { data: partnerAccountsData } = useQuery({
    queryKey: ['partner-accounts', debtInfo?.otherMemberId],
    queryFn: async () => {
      const { data } = await db.queryOnce({
        accounts: {
          $: { where: { userId: debtInfo!.otherMemberId, isActive: true } },
        },
      });
      return data.accounts || [];
    },
    enabled: !!debtInfo?.otherMemberId,
  });

  // Set default wallets when data loads
  useEffect(() => {
    if (accountsData && accountsData.length > 0 && !yourWalletId) {
      const defaultWallet = accountsData.find((a: any) => a.isDefault) || accountsData[0];
      setYourWalletId(defaultWallet.id);
    }
  }, [accountsData, yourWalletId]);

  useEffect(() => {
    if (partnerAccountsData && partnerAccountsData.length > 0 && !partnerWalletId) {
      const defaultWallet = partnerAccountsData.find((a: any) => a.isDefault) || partnerAccountsData[0];
      setPartnerWalletId(defaultWallet.id);
    }
  }, [partnerAccountsData, partnerWalletId]);

  const payerAccount = accountsData?.[0]; // Current user's account
  const receiverAccount = accountsData?.find((a: any) => a.userId === debtInfo?.otherMemberId); // Other member's account

  // Get selected wallet objects for display
  const yourWallet = accountsData?.find((a: any) => a.id === yourWalletId);
  const partnerWallet = partnerAccountsData?.find((a: any) => a.id === partnerWalletId);

  // Settlement mutation
  const settleMutation = useMutation({
    mutationFn: async () => {
      if (!userInfo || !debtInfo) {
        throw new Error('Missing required data for settlement');
      }

      // Check if wallets are selected
      if (!yourWalletId || !partnerWalletId) {
        throw new Error('Please select wallets for settlement');
      }

      // Determine who is payer and who is receiver based on debt direction
      const youOwe = debtInfo.amount > 0;
      const payerUserId = youOwe ? userInfo.userId : debtInfo.otherMemberId;
      const receiverUserId = youOwe ? debtInfo.otherMemberId : userInfo.userId;

      // Determine wallet IDs based on debt direction
      // If you owe: your wallet sends, partner wallet receives
      // If you're owed: partner wallet sends, your wallet receives
      const payerWalletId = youOwe ? yourWalletId : partnerWalletId;
      const receiverWalletId = youOwe ? partnerWalletId : yourWalletId;

      return createSettlement(
        payerUserId,
        receiverUserId,
        Math.abs(settlementAmount),
        payerWalletId,
        receiverWalletId,
        userInfo.householdId,
        undefined // No category for settlements
      );
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['unsettled-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['household-debt'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['partner-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });

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
              Settlement Details
            </Text>

            {/* Your Wallet Selection */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">
                {youOwe ? 'Pay From (Your Wallet)' : 'Receive In (Your Wallet)'}
              </Text>
              <Pressable
                onPress={() => setShowYourWalletPicker(true)}
                className="flex-row items-center justify-between p-3 rounded-xl border-2 border-gray-200 bg-gray-50"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-teal-100 items-center justify-center mr-3">
                    <Wallet size={20} color="#0D9488" />
                  </View>
                  <View className="flex-1">
                    {yourWallet ? (
                      <>
                        <Text className="text-base font-semibold text-gray-900">
                          {yourWallet.name}
                        </Text>
                        <Text className="text-sm text-gray-500">
                          {formatBalance(yourWallet.balance || 0, yourWallet.currency || 'CHF')}
                        </Text>
                      </>
                    ) : (
                      <Text className="text-gray-400">Select your wallet...</Text>
                    )}
                  </View>
                </View>
                <ChevronDown size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Partner's Wallet Selection */}
            <View className="mb-4">
              <Text className="text-sm text-gray-600 mb-2">
                {youOwe ? `Send To (${partnerName}'s Wallet)` : `From (${partnerName}'s Wallet)`}
              </Text>
              <Pressable
                onPress={() => setShowPartnerWalletPicker(true)}
                className="flex-row items-center justify-between p-3 rounded-xl border-2 border-gray-200 bg-gray-50"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Wallet size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    {partnerWallet ? (
                      <>
                        <Text className="text-base font-semibold text-gray-900">
                          {partnerWallet.name}
                        </Text>
                        <Text className="text-sm text-gray-500">
                          {formatBalance(partnerWallet.balance || 0, partnerWallet.currency || 'CHF')}
                        </Text>
                      </>
                    ) : (
                      <Text className="text-gray-400">Select {partnerName}'s wallet...</Text>
                    )}
                  </View>
                </View>
                <ChevronDown size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Divider */}
            <View className="border-t border-gray-100 my-3" />

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
              disabled={settleMutation.isPending || selectedExpenses.length === 0 || !yourWalletId || !partnerWalletId}
              className={cn(
                "flex-1 py-3 rounded-xl",
                settleMutation.isPending || selectedExpenses.length === 0 || !yourWalletId || !partnerWalletId
                  ? 'bg-gray-300'
                  : 'bg-teal-600 active:bg-teal-700'
              )}
            >
              {settleMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-center font-semibold text-white">
                  {youOwe ? `Pay ${settlementAmount.toFixed(2)} CHF` : `Confirm Received ${settlementAmount.toFixed(2)} CHF`}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Your Wallet Picker Modal */}
      <Modal
        visible={showYourWalletPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowYourWalletPicker(false)}
      >
        <View className="flex-1 bg-white">
          <SafeAreaView edges={['top']} className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">Select Your Wallet</Text>
              <Pressable onPress={() => setShowYourWalletPicker(false)} className="p-2">
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="flex-1 px-4 pt-4">
              {accountsData?.map((wallet: any) => (
                <Pressable
                  key={wallet.id}
                  onPress={() => {
                    setYourWalletId(wallet.id);
                    setShowYourWalletPicker(false);
                  }}
                  className={cn(
                    "flex-row items-center p-4 rounded-xl mb-2 border-2",
                    yourWalletId === wallet.id ? "border-teal-500 bg-teal-50" : "border-gray-200 bg-white"
                  )}
                >
                  <View className="w-12 h-12 rounded-full bg-teal-100 items-center justify-center mr-3">
                    <Wallet size={24} color="#0D9488" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{wallet.name}</Text>
                    <Text className="text-sm text-gray-500">
                      {wallet.institution} • {formatBalance(wallet.balance || 0, wallet.currency || 'CHF')}
                    </Text>
                  </View>
                  {yourWalletId === wallet.id && <Check size={24} color="#0D9488" />}
                </Pressable>
              ))}
              {(!accountsData || accountsData.length === 0) && (
                <View className="items-center py-8">
                  <Wallet size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-3">No wallets found</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Partner's Wallet Picker Modal */}
      <Modal
        visible={showPartnerWalletPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPartnerWalletPicker(false)}
      >
        <View className="flex-1 bg-white">
          <SafeAreaView edges={['top']} className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">{partnerName}'s Wallet</Text>
              <Pressable onPress={() => setShowPartnerWalletPicker(false)} className="p-2">
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView className="flex-1 px-4 pt-4">
              {partnerAccountsData?.map((wallet: any) => (
                <Pressable
                  key={wallet.id}
                  onPress={() => {
                    setPartnerWalletId(wallet.id);
                    setShowPartnerWalletPicker(false);
                  }}
                  className={cn(
                    "flex-row items-center p-4 rounded-xl mb-2 border-2",
                    partnerWalletId === wallet.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                  )}
                >
                  <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Wallet size={24} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{wallet.name}</Text>
                    <Text className="text-sm text-gray-500">
                      {wallet.institution} • {formatBalance(wallet.balance || 0, wallet.currency || 'CHF')}
                    </Text>
                  </View>
                  {partnerWalletId === wallet.id && <Check size={24} color="#3B82F6" />}
                </Pressable>
              ))}
              {(!partnerAccountsData || partnerAccountsData.length === 0) && (
                <View className="items-center py-8">
                  <Wallet size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-3">{partnerName} has no wallets</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
