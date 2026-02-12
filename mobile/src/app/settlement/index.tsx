import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCard, GlassButton } from '@/components/ui/Glass';
import { DebtSummaryCard } from '@/components/settlement/DebtSummaryCard';
import { ExpenseSelectionList } from '@/components/settlement/ExpenseSelectionList';
import { ExpenseStatusList } from '@/components/settlement/ExpenseStatusList';
import { CategorySelector } from '@/components/settlement/CategorySelector';
import { WalletSelector } from '@/components/settlement/WalletSelector';
import { SettlementSummary } from '@/components/settlement/SettlementSummary';
import { useSettlementData } from '@/hooks/useSettlementData';
import { createSettlement } from '@/lib/settlement-api';
import { formatCurrency } from '@/lib/formatCurrency';
import { db } from '@/lib/db';

/**
 * Settlement Screen - Handle debt settlement between household members
 * Two views: Payer (interactive) and Receiver (read-only status)
 */
export default function SettlementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settlementData = useSettlementData();

  // Local state for payer view
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  // Set default wallet when data loads
  React.useEffect(() => {
    if (settlementData.wallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(settlementData.wallets[0].id);
    }
  }, [settlementData.wallets, selectedWalletId]);

  // Determine if user is payer or receiver
  // totalOwed > 0 means you owe money (PAYER)
  // totalOwed < 0 means you're owed money (RECEIVER)
  const isPayer = settlementData.totalOwed > 0;

  // Filter expenses based on role
  // Payer sees expenses where they owe (yourShare > 0)
  // Receiver sees expenses where they're owed (yourShare < 0)
  const relevantExpenses = useMemo(() => {
    return settlementData.unsettledExpenses.filter((expense) =>
      isPayer ? expense.yourShare > 0 : expense.yourShare < 0
    );
  }, [settlementData.unsettledExpenses, isPayer]);

  // Format expenses for display
  const formattedExpenses = useMemo(() => {
    return relevantExpenses.map((expense) => ({
      id: expense.id,
      description: expense.description || expense.payee || 'Shared expense',
      date: expense.date,
      paidBy: expense.paidBy,
      totalAmount: expense.totalAmount,
      yourShare: expense.yourShare,
    }));
  }, [relevantExpenses]);

  // Calculate selected total
  const selectedTotal = useMemo(() => {
    return formattedExpenses
      .filter((e) => selectedExpenseIds.includes(e.id))
      .reduce((sum, e) => sum + Math.abs(e.yourShare), 0);
  }, [formattedExpenses, selectedExpenseIds]);

  // Validation
  const hasSelectedExpenses = selectedExpenseIds.length > 0;
  const hasSelectedCategory = selectedCategoryId !== null;
  const canSettle = hasSelectedExpenses && hasSelectedCategory;

  // Button text based on state
  const buttonText = useMemo(() => {
    if (!hasSelectedExpenses) {
      return 'Select expenses to continue';
    }
    if (!hasSelectedCategory) {
      return 'Select a category to continue';
    }
    return `Settle ${formatCurrency(selectedTotal)}`;
  }, [hasSelectedExpenses, hasSelectedCategory, selectedTotal]);

  // Toggle expense selection
  const handleToggleExpense = (id: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Settlement mutation
  const settlementMutation = useMutation({
    mutationFn: async () => {
      console.log('🔄 Starting settlement mutation...');
      console.log('📊 Settlement data:', {
        canSettle,
        selectedExpenseIds,
        selectedCategoryId,
        selectedWalletId,
        selectedTotal,
        userId: settlementData.userId,
        partnerId: settlementData.partnerId,
        householdId: settlementData.householdId,
      });

      if (!canSettle) {
        console.error('❌ Cannot settle without selections');
        throw new Error('Cannot settle without selections');
      }

      // Get receiver's default account
      console.log('🔍 Fetching partner accounts for userId:', settlementData.partnerId);
      const { data: partnerAccounts } = await db.queryOnce({
        accounts: {
          $: { where: { userId: settlementData.partnerId } },
        },
      });

      console.log('📦 Partner accounts:', partnerAccounts.accounts);
      const receiverAccount = partnerAccounts.accounts?.[0];
      if (!receiverAccount) {
        console.error('❌ Partner has no account set up');
        throw new Error('Partner has no account set up');
      }

      // Get selected expenses to find the payee for the settlement
      const selectedExpenses = relevantExpenses.filter((e) =>
        selectedExpenseIds.includes(e.id)
      );
      const payee = selectedExpenses[0]?.payee || 'Debt Settlement';

      console.log('💰 Creating settlement with:', {
        userId: settlementData.userId,
        partnerId: settlementData.partnerId,
        amount: selectedTotal,
        payerAccountId: selectedWalletId,
        receiverAccountId: receiverAccount.id,
        householdId: settlementData.householdId,
        categoryId: selectedCategoryId,
        expenseIds: selectedExpenseIds,
        payee,
      });

      const result = await createSettlement(
        settlementData.userId,
        settlementData.partnerId,
        selectedTotal,
        selectedWalletId,
        receiverAccount.id,
        settlementData.householdId,
        selectedCategoryId!,
        selectedExpenseIds,
        payee
      );

      console.log('✅ Settlement result:', result);
      return result;
    },
    onSuccess: () => {
      console.log('✅ Settlement successful!');
      Alert.alert(
        'Settlement Complete',
        `Successfully settled ${formatCurrency(selectedTotal)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              settlementData.refetch();
              router.back();
            },
          },
        ]
      );
    },
    onError: (error) => {
      console.error('❌ Settlement mutation error:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Settlement Failed', error.message || 'Unknown error occurred');
    },
  });

  // Handle settle button press
  const handleSettle = () => {
    if (!canSettle) return;
    settlementMutation.mutate();
  };

  // Loading state
  if (settlementData.isLoading) {
    return (
      <LinearGradient
        colors={['#1A1C1E', '#2C5F5D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#A8B5A1" />
          <Text className="text-white/70 text-sm mt-4">Loading settlement data...</Text>
        </View>
      </LinearGradient>
    );
  }

  // No debt state
  if (Math.abs(settlementData.totalOwed) < 0.01) {
    return (
      <LinearGradient
        colors={['#1A1C1E', '#2C5F5D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          className="flex-row items-center px-5 pb-4"
          style={{ paddingTop: insets.top + 16 }}
        >
          <Pressable
            onPress={() => router.back()}
            className="mr-4"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color="white" />
          </Pressable>
          <Text className="text-white text-xl font-semibold">Settlement</Text>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white/90 text-lg font-semibold text-center mb-2">
            All Settled!
          </Text>
          <Text className="text-white/60 text-sm text-center">
            You and {settlementData.partnerName} are all squared up.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1A1C1E', '#2C5F5D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View
        className="flex-row items-center px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="white" />
        </Pressable>
        <Text className="text-white text-xl font-semibold">
          {isPayer ? 'Settle' : 'Outstanding'}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        {/* Debt Summary Card */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <DebtSummaryCard
            isPayer={isPayer}
            partnerName={settlementData.partnerName}
            totalAmount={Math.abs(settlementData.totalOwed)}
            yourSplitRatio={settlementData.splitRatio.you}
            partnerSplitRatio={settlementData.splitRatio.partner}
          />
        </Animated.View>

        {/* Expense List Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mt-4">
          <GlassCard className="p-5">
            {isPayer ? (
              <ExpenseSelectionList
                expenses={formattedExpenses}
                selectedExpenseIds={selectedExpenseIds}
                onToggleExpense={handleToggleExpense}
              />
            ) : (
              <ExpenseStatusList expenses={formattedExpenses} />
            )}
          </GlassCard>
        </Animated.View>

        {/* Category & Wallet Selection (Payer only) */}
        {isPayer && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mt-4">
            <GlassCard className="p-5">
              <CategorySelector
                categories={settlementData.categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
                userId={settlementData.userId}
                householdId={settlementData.householdId}
              />
              <WalletSelector
                wallets={settlementData.wallets}
                selectedWalletId={selectedWalletId}
                onSelectWallet={setSelectedWalletId}
              />
            </GlassCard>
          </Animated.View>
        )}

        {/* Settlement Summary (Payer only) */}
        {isPayer && selectedExpenseIds.length > 0 && (
          <>
            <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mt-4">
              <SettlementSummary
                selectedCount={selectedExpenseIds.length}
                totalAmount={selectedTotal}
              />
            </Animated.View>

            {/* Settle Button in GlassCard */}
            <Animated.View entering={FadeInDown.delay(350).duration(400)} className="mt-4">
              <GlassCard
                className="p-5"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 32,
                  elevation: 8,
                }}
              >
                <GlassButton
                  variant="primary"
                  onPress={handleSettle}
                  disabled={!canSettle || settlementMutation.isPending}
                  style={{
                    opacity: (!canSettle || settlementMutation.isPending) ? 0.5 : 1,
                  }}
                >
                  {settlementMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white text-center font-semibold" style={{ fontSize: 15 }}>
                      {buttonText}
                    </Text>
                  )}
                </GlassButton>
              </GlassCard>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
