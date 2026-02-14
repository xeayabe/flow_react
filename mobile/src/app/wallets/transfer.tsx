import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowDownUp, Wallet, Building2, CreditCard, TrendingUp, Banknote, Check } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserAccounts, type Account } from '@/lib/accounts-api';
import { createTransfer, validateTransfer } from '@/lib/transfer-api';
import { formatCurrency } from '@/lib/formatCurrency';
import { db } from '@/lib/db';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard, GlassButton, GlassInputContainer } from '@/components/ui/Glass';
import { colors } from '@/lib/design-tokens';

function getWalletIcon(accountType: string) {
  switch (accountType) {
    case 'Checking':
      return Building2;
    case 'Savings':
      return Wallet;
    case 'Credit Card':
      return CreditCard;
    case 'Investment':
      return TrendingUp;
    case 'Cash':
      return Banknote;
    default:
      return Building2;
  }
}

interface WalletOptionProps {
  account: Account;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

function WalletOption({ account, isSelected, onPress, disabled }: WalletOptionProps) {
  const Icon = getWalletIcon(account.accountType);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: isSelected
          ? 'rgba(44, 95, 93, 0.2)'
          : pressed
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: isSelected ? colors.contextTeal : 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 14,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-lg items-center justify-center mr-3"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <Icon size={20} color="rgba(255, 255, 255, 0.7)" />
        </View>

        <View className="flex-1">
          <Text className="text-white/90 font-semibold" style={{ fontSize: 15 }}>
            {account.name}
          </Text>
          <Text className="text-white/50 mt-0.5" style={{ fontSize: 11 }}>
            {account.accountType}
          </Text>
        </View>

        <View className="flex-row items-center ml-3">
          <Text
            className="text-white/70 mr-3"
            style={{ fontSize: 14, fontVariant: ['tabular-nums'] }}
          >
            {formatCurrency(account.balance)}
          </Text>

          {/* Radio Button */}
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                }}
              />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function TransferScreen() {
  const { fromId } = useLocalSearchParams<{ fromId?: string }>();
  const { user } = db.useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [fromAccountId, setFromAccountId] = useState<string>(fromId || '');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [amountFocused, setAmountFocused] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);

  // Fetch user accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['wallets', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return getUserAccounts(user.email);
    },
    enabled: !!user?.email,
  });

  // Derived state
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId]
  );
  const toAccount = useMemo(
    () => accounts.find((a) => a.id === toAccountId),
    [accounts, toAccountId]
  );
  const amount = parseFloat(amountText) || 0;

  // Validation
  const validationError = useMemo(() => {
    if (!fromAccountId || !toAccountId || amount <= 0) return null;
    return validateTransfer(
      amount,
      fromAccountId,
      toAccountId,
      fromAccount?.balance ?? 0
    );
  }, [amount, fromAccountId, toAccountId, fromAccount]);

  const canTransfer = fromAccountId && toAccountId && amount > 0 && !validationError;

  // Swap accounts
  const handleSwap = () => {
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!fromAccount || !toAccount) {
        throw new Error('Please select both wallets');
      }

      // Get user's household info for the transfer record
      const { data: memberData } = await db.queryOnce({
        householdMembers: {
          $: { where: { userId: fromAccount.userId, status: 'active' } },
        },
      });
      const householdId = memberData.householdMembers?.[0]?.householdId;
      if (!householdId) throw new Error('Household not found');

      return createTransfer({
        userId: fromAccount.userId,
        householdId,
        fromAccountId,
        toAccountId,
        amount,
        note: note.trim() || undefined,
      });
    },
    onSuccess: (result) => {
      // Invalidate wallet queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });

      Alert.alert(
        'Transfer Complete',
        `${formatCurrency(result.amount)} CHF transferred from ${fromAccount?.name} to ${toAccount?.name}`,
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Transfer Failed', error.message || 'Something went wrong. Please try again.');
    },
  });

  const handleTransfer = () => {
    if (!canTransfer) return;
    Keyboard.dismiss();
    transferMutation.mutate();
  };

  // Set "Pay Full" amount for credit card payoff
  const handlePayFull = () => {
    if (toAccount && toAccount.balance < 0) {
      const fullAmount = Math.abs(toAccount.balance);
      setAmountText(fullAmount.toFixed(2));
    } else if (fromAccount) {
      setAmountText(fromAccount.balance.toFixed(2));
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.sageGreen} />
          <Text className="text-sm mt-4" style={{ color: colors.textWhiteSecondary }}>
            Loading wallets...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // Need at least 2 accounts to transfer
  if (accounts.length < 2) {
    return (
      <LinearGradient
        colors={[colors.contextDark, colors.contextTeal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <View
          className="flex-row items-center px-5 pb-4"
          style={{ paddingTop: insets.top + 16 }}
        >
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
          <Text className="text-white text-xl font-semibold">Transfer</Text>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeInDown.duration(400)} className="items-center">
            <View
              className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}
            >
              <ArrowDownUp size={40} color={colors.sageGreen} />
            </View>
            <Text className="text-xl font-semibold mb-2 text-center" style={{ color: colors.textWhite }}>
              Need More Wallets
            </Text>
            <Text className="text-sm text-center" style={{ color: colors.textWhiteSecondary }}>
              You need at least 2 wallets to make a transfer. Add another wallet first.
            </Text>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.contextDark, colors.contextTeal]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View
        className="flex-row items-center px-5 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
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
        <Text className="text-white text-xl font-semibold flex-1">Transfer</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* From Wallet */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <GlassCard className="p-5 mb-3">
            <Text
              className="mb-3"
              style={{
                color: colors.textWhiteDisabled,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              From
            </Text>
            <View className="gap-2">
              {accounts.map((account) => (
                <WalletOption
                  key={account.id}
                  account={account}
                  isSelected={fromAccountId === account.id}
                  onPress={() => setFromAccountId(account.id)}
                  disabled={account.id === toAccountId}
                />
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Swap Button */}
        {fromAccountId && toAccountId && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} className="items-center -my-1 z-10">
            <Pressable
              onPress={handleSwap}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.contextTeal }}
            >
              <ArrowDownUp size={18} color="white" />
            </Pressable>
          </Animated.View>
        )}

        {/* To Wallet */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <GlassCard className="p-5 mb-4">
            <Text
              className="mb-3"
              style={{
                color: colors.textWhiteDisabled,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              To
            </Text>
            <View className="gap-2">
              {accounts.map((account) => (
                <WalletOption
                  key={account.id}
                  account={account}
                  isSelected={toAccountId === account.id}
                  onPress={() => setToAccountId(account.id)}
                  disabled={account.id === fromAccountId}
                />
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Amount Input */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassCard className="p-5 mb-4">
            <Text
              className="mb-3"
              style={{
                color: colors.textWhiteDisabled,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Amount
            </Text>

            <GlassInputContainer focused={amountFocused}>
              <View className="flex-row items-center">
                <Text className="text-white/50 text-lg mr-2">CHF</Text>
                <TextInput
                  value={amountText}
                  onChangeText={setAmountText}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  placeholder="0.00"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="decimal-pad"
                  className="flex-1 text-white text-lg"
                  style={{ fontVariant: ['tabular-nums'] }}
                />
              </View>
            </GlassInputContainer>

            {/* Quick Action Buttons */}
            {(fromAccount || toAccount) && (
              <View className="flex-row gap-2 mt-3">
                {/* Pay Full for credit card (negative balance destination) */}
                {toAccount && toAccount.balance < 0 && (
                  <Pressable
                    onPress={handlePayFull}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}
                  >
                    <Text className="text-xs" style={{ color: colors.sageGreen }}>
                      Pay Full ({formatCurrency(Math.abs(toAccount.balance))} CHF)
                    </Text>
                  </Pressable>
                )}
                {/* Transfer all from source */}
                {fromAccount && fromAccount.balance > 0 && !(toAccount && toAccount.balance < 0) && (
                  <Pressable
                    onPress={handlePayFull}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}
                  >
                    <Text className="text-xs" style={{ color: colors.sageGreen }}>
                      Transfer All ({formatCurrency(fromAccount.balance)} CHF)
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Validation Error */}
            {validationError && (
              <View className="mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(200, 168, 168, 0.15)' }}>
                <Text className="text-xs" style={{ color: colors.error }}>
                  {validationError}
                </Text>
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* Optional Note */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <GlassCard className="p-5 mb-4">
            <Text
              className="mb-3"
              style={{
                color: colors.textWhiteDisabled,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Note (Optional)
            </Text>

            <GlassInputContainer focused={noteFocused}>
              <TextInput
                value={note}
                onChangeText={setNote}
                onFocus={() => setNoteFocused(true)}
                onBlur={() => setNoteFocused(false)}
                placeholder="e.g., Credit card payment"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="text-white text-sm"
                maxLength={100}
              />
            </GlassInputContainer>
          </GlassCard>
        </Animated.View>

        {/* Transfer Summary */}
        {canTransfer && fromAccount && toAccount && (
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <GlassCard className="p-5 mb-4">
              <Text
                className="mb-3"
                style={{
                  color: colors.textWhiteDisabled,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Summary
              </Text>

              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-sm" style={{ color: colors.textWhiteSecondary }}>
                    {fromAccount.name}
                  </Text>
                  <Text className="text-sm font-medium" style={{ color: colors.textWhite, fontVariant: ['tabular-nums'] }}>
                    {formatCurrency(fromAccount.balance)} → {formatCurrency(fromAccount.balance - amount)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm" style={{ color: colors.textWhiteSecondary }}>
                    {toAccount.name}
                  </Text>
                  <Text className="text-sm font-medium" style={{ color: colors.textWhite, fontVariant: ['tabular-nums'] }}>
                    {formatCurrency(toAccount.balance)} → {formatCurrency(toAccount.balance + amount)}
                  </Text>
                </View>

                <View className="border-t border-white/5 mt-2 pt-2">
                  <Text className="text-xs text-center" style={{ color: colors.textWhiteDisabled }}>
                    Net worth unchanged · No budget impact
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Confirm Button */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <GlassCard className="p-5">
            <GlassButton
              variant="primary"
              onPress={handleTransfer}
              disabled={!canTransfer || transferMutation.isPending}
              style={{
                opacity: (!canTransfer || transferMutation.isPending) ? 0.5 : 1,
              }}
            >
              {transferMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View className="flex-row items-center justify-center gap-2">
                  <Check size={18} color="white" />
                  <Text className="text-white text-center font-semibold" style={{ fontSize: 15 }}>
                    {canTransfer ? `Transfer ${formatCurrency(amount)} CHF` : 'Select wallets and amount'}
                  </Text>
                </View>
              )}
            </GlassButton>
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}
