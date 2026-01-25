import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ChevronDown } from 'lucide-react-native';
import { db } from '@/lib/db';
import { createSettlement } from '@/lib/settlement-api';
import { getCategories } from '@/lib/categories-api';
import { cn } from '@/lib/cn';

interface SettlementModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  receiverUserId: string;
  receiverName: string;
}

interface PayerData {
  accounts: any[];
  userProfile: any;
  member: any;
}

export default function SettlementModal({
  visible,
  onClose,
  amount,
  receiverUserId,
  receiverName,
}: SettlementModalProps) {
  const { user } = db.useAuth();
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [receiverAccount, setReceiverAccount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  // Load payer's accounts
  const { data: payerAccounts, isLoading: payerLoading } = useQuery({
    queryKey: ['payer-accounts', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email');

      const { data: userData } = await db.queryOnce({
        users: { $: { where: { email: user.email } } },
      });

      if (!userData?.users?.[0]) throw new Error('User not found');
      const userProfile = userData.users[0];

      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: userProfile.id, status: 'active' } },
        },
      });

      if (!memberData?.householdMembers?.[0]) throw new Error('Household not found');
      const member = memberData.householdMembers[0];

      const { data: accountData } = await db.queryOnce({
        accounts: {
          $: { where: { householdId: member.householdId, userId: userProfile.id } },
        },
      });

      return {
        accounts: accountData.accounts || [],
        userProfile,
        member,
      } as PayerData;
    },
    enabled: !!user?.email && visible,
  });

  // Load receiver's accounts
  const { data: receiverAccounts, isLoading: receiverLoading } = useQuery({
    queryKey: ['receiver-accounts', receiverUserId],
    queryFn: async () => {
      if (!receiverUserId) throw new Error('No receiver ID');

      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: receiverUserId, status: 'active' } },
        },
      });

      if (!memberData?.householdMembers?.[0]) throw new Error('Receiver not found');
      const member = memberData.householdMembers[0];

      const { data: accountData } = await db.queryOnce({
        accounts: {
          $: { where: { householdId: member.householdId, userId: receiverUserId } },
        },
      });

      return accountData.accounts || [];
    },
    enabled: !!receiverUserId && visible,
  });

  // Load categories for the payer
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['settlement-categories', payerAccounts?.member?.householdId, payerAccounts?.userProfile?.id],
    queryFn: async () => {
      if (!payerAccounts?.member?.householdId || !payerAccounts?.userProfile?.id) return [];
      return getCategories(payerAccounts.member.householdId, payerAccounts.userProfile.id);
    },
    enabled: !!payerAccounts?.member?.householdId && !!payerAccounts?.userProfile?.id && visible,
  });

  // Auto-select first accounts and find a default category
  useEffect(() => {
    if (payerAccounts?.accounts && payerAccounts.accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(payerAccounts.accounts[0].id);
    }
    if (receiverAccounts && receiverAccounts.length > 0 && !receiverAccount) {
      setReceiverAccount(receiverAccounts[0].id);
    }
    // Auto-select a "Transfer" or "Settlement" category if available, otherwise first expense category
    if (categories && categories.length > 0 && !selectedCategory) {
      const transferCategory = categories.find((c: any) =>
        c.name.toLowerCase().includes('transfer') ||
        c.name.toLowerCase().includes('settlement') ||
        c.name.toLowerCase().includes('internal')
      );
      if (transferCategory?.id) {
        setSelectedCategory(transferCategory.id);
      } else {
        // Default to first expense category
        const expenseCategory = categories.find((c: any) => c.type === 'expense');
        if (expenseCategory?.id) {
          setSelectedCategory(expenseCategory.id);
        }
      }
    }
  }, [payerAccounts?.accounts, receiverAccounts, selectedAccount, receiverAccount, categories, selectedCategory]);

  const settleMutation = useMutation({
    mutationFn: async () => {
      if (!payerAccounts || !selectedAccount || !receiverAccount) {
        throw new Error('Missing required data');
      }

      console.warn('🎯🎯🎯 SETTLEMENT MUTATION STARTING 🎯🎯🎯');
      console.log('Calling createSettlement with:', {
        payerUserId: payerAccounts.userProfile.id,
        receiverUserId: receiverUserId,
        amount: amount,
        categoryId: selectedCategory,
      });

      return createSettlement(
        payerAccounts.userProfile.id,
        receiverUserId,
        amount,
        selectedAccount,
        receiverAccount,
        payerAccounts.member.householdId,
        selectedCategory || undefined
      );
    },
    onSuccess: (result) => {
      console.log('✅ Settlement mutation success:', result);

      // Get the householdId for proper query invalidation
      const householdId = payerAccounts?.member.householdId;

      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['debt-balance'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-household', householdId] });
      queryClient.invalidateQueries({ queryKey: ['payer-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['receiver-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });

      // Force refetch transaction queries with exact household ID to ensure UI updates
      if (householdId) {
        queryClient.refetchQueries({ queryKey: ['transactions-household', householdId], type: 'active' });
      }
      queryClient.refetchQueries({ queryKey: ['recent-transactions'], type: 'active' });
      queryClient.refetchQueries({ queryKey: ['budget-summary'], type: 'active' });

      // Show detailed result
      const message = result?.splitsSettled
        ? `Payment of ${amount.toFixed(2)} CHF recorded.\n\n${result.splitsSettled} split(s) settled.\nOriginal transaction amounts have been reduced.`
        : `Payment of ${amount.toFixed(2)} CHF recorded.\n\nNo matching splits found - transaction amounts unchanged.`;

      Alert.alert('Settlement Complete', message);
      setSelectedAccount('');
      setReceiverAccount('');
      setSelectedCategory('');
      setShowCategoryPicker(false);
      onClose();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Could not create settlement');
    },
  });

  const handleSettle = () => {
    if (!selectedAccount || !receiverAccount) {
      Alert.alert('Required', 'Please select accounts');
      return;
    }

    const selectedAcct = payerAccounts?.accounts.find((a: any) => a.id === selectedAccount);
    if (selectedAcct && selectedAcct.balance < amount) {
      Alert.alert(
        'Insufficient Funds',
        `Account balance (${selectedAcct.balance.toFixed(2)} CHF) is less than settlement amount (${amount.toFixed(2)} CHF). Continue anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => settleMutation.mutate() },
        ]
      );
      return;
    }

    settleMutation.mutate();
  };

  const selectedPayerAcct = payerAccounts?.accounts.find((a: any) => a.id === selectedAccount);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 max-h-3/4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-bold text-gray-900">Settle Debt</Text>
            <Pressable onPress={onClose} disabled={settleMutation.isPending}>
              <X size={24} color="#374151" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount */}
            <View className="bg-red-50 p-4 rounded-xl mb-6 border border-red-200">
              <Text className="text-sm text-red-700 mb-1 font-semibold">Amount to settle</Text>
              <Text className="text-4xl font-bold text-red-600 mb-2">{amount.toFixed(2)} CHF</Text>
              <Text className="text-sm text-red-700">Payment to {receiverName}</Text>
            </View>

            {/* Payer's account */}
            {payerLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#006A6A" />
              </View>
            ) : (
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Pay from your account:</Text>
                {payerAccounts?.accounts.map((account: any) => (
                  <Pressable
                    key={account.id}
                    onPress={() => setSelectedAccount(account.id)}
                    disabled={settleMutation.isPending}
                    className={cn(
                      'p-4 rounded-xl mb-2 border-2',
                      selectedAccount === account.id
                        ? 'bg-teal-50 border-teal-600'
                        : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <Text
                      className={cn(
                        'font-semibold mb-1',
                        selectedAccount === account.id ? 'text-teal-900' : 'text-gray-900'
                      )}
                    >
                      {account.name}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Balance: {account.balance.toFixed(2)} CHF
                    </Text>
                    {account.balance < amount && (
                      <Text className="text-xs text-red-600 mt-1">⚠️ Insufficient balance</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Receiver's account */}
            {receiverLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#006A6A" />
              </View>
            ) : (
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-3">
                  To {receiverName}'s account:
                </Text>
                {receiverAccounts?.map((account: any) => (
                  <Pressable
                    key={account.id}
                    onPress={() => setReceiverAccount(account.id)}
                    disabled={settleMutation.isPending}
                    className={cn(
                      'p-4 rounded-xl mb-2 border-2',
                      receiverAccount === account.id
                        ? 'bg-teal-50 border-teal-600'
                        : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <Text
                      className={cn(
                        'font-semibold mb-1',
                        receiverAccount === account.id ? 'text-teal-900' : 'text-gray-900'
                      )}
                    >
                      {account.name}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Balance: {account.balance.toFixed(2)} CHF
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Category selector */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-3">Category:</Text>
              <Pressable
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                disabled={settleMutation.isPending || categoriesLoading}
                className={cn(
                  'p-4 rounded-xl border-2 flex-row items-center justify-between',
                  selectedCategory ? 'bg-teal-50 border-teal-600' : 'bg-gray-50 border-gray-200'
                )}
              >
                <Text className={cn(
                  'font-semibold',
                  selectedCategory ? 'text-teal-900' : 'text-gray-500'
                )}>
                  {categoriesLoading
                    ? 'Loading...'
                    : categories?.find((c: any) => c.id === selectedCategory)?.name || 'Select category'}
                </Text>
                <ChevronDown size={20} color={selectedCategory ? '#0D9488' : '#9CA3AF'} />
              </Pressable>

              {/* Category dropdown */}
              {showCategoryPicker && categories && (
                <View className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <ScrollView style={{ maxHeight: 200 }}>
                    {categories
                      .filter((c: any) => c.type === 'expense')
                      .map((category: any) => (
                        <Pressable
                          key={category.id}
                          onPress={() => {
                            setSelectedCategory(category.id);
                            setShowCategoryPicker(false);
                          }}
                          className={cn(
                            'p-3 border-b border-gray-100',
                            selectedCategory === category.id ? 'bg-teal-50' : ''
                          )}
                        >
                          <Text className={cn(
                            'font-medium',
                            selectedCategory === category.id ? 'text-teal-900' : 'text-gray-900'
                          )}>
                            {category.name}
                          </Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Summary */}
            <View className="bg-gray-50 p-4 rounded-xl mb-6">
              <Text className="text-xs text-gray-600 mb-2">SETTLEMENT SUMMARY</Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-gray-700">You pay:</Text>
                <Text className="text-sm font-semibold text-gray-900">{amount.toFixed(2)} CHF</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-gray-700">From:</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {selectedPayerAcct?.name || 'Select account'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-700">Category:</Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {categories?.find((c: any) => c.id === selectedCategory)?.name || 'None'}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Settle button */}
          <View className="gap-3">
            <Pressable
              onPress={handleSettle}
              disabled={
                settleMutation.isPending || !selectedAccount || !receiverAccount || payerLoading || receiverLoading
              }
              className={cn(
                'py-4 rounded-xl active:opacity-80',
                settleMutation.isPending ? 'bg-red-600 opacity-50' : 'bg-red-600'
              )}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {settleMutation.isPending ? 'Processing...' : `Pay ${amount.toFixed(2)} CHF`}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              disabled={settleMutation.isPending}
              className="py-3 rounded-xl border-2 border-gray-300 active:opacity-60"
            >
              <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
