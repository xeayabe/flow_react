import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Info, CheckCircle2, ChevronDown, ArrowLeft } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAccount,
  getUserAccountsCount,
  parseBalance,
  ACCOUNT_TYPES,
  type AccountType,
  type CreateAccountData,
} from '@/lib/accounts-api';
import { db } from '@/lib/db';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { WalletTypePicker } from '@/components/AccountTypePicker';
import { GlassCard, GlassButton, GlassInputContainer } from '@/components/ui/Glass';
import { colors } from '@/lib/design-tokens';
import { useHouseholdCurrency } from '@/hooks/useHouseholdCurrency';
import { CURRENCIES, CURRENCY_CODES, type CurrencyCode, getCurrencyConfig } from '@/constants/currencies';

interface FormData {
  name: string;
  accountType: AccountType | '';
  currency: CurrencyCode;
  startingBalance: string;
  last4Digits: string;
  isDefault: boolean;
}

interface ValidationErrors {
  name?: string;
  accountType?: string;
  startingBalance?: string;
  last4Digits?: string;
}

export default function AddWalletScreen() {
  const { user } = db.useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { currency: householdCurrency } = useHouseholdCurrency();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    accountType: '',
    currency: 'CHF',
    startingBalance: '',
    last4Digits: '',
    isDefault: false,
  });

  // Update default currency once household currency loads
  const [currencyInitialized, setCurrencyInitialized] = useState(false);
  React.useEffect(() => {
    if (householdCurrency && !currencyInitialized) {
      setFormData((prev) => ({ ...prev, currency: householdCurrency }));
      setCurrencyInitialized(true);
    }
  }, [householdCurrency, currencyInitialized]);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showAccountTypePicker, setShowAccountTypePicker] = useState<boolean>(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState<boolean>(false);
  const [isFirstAccount, setIsFirstAccount] = useState<boolean>(false);

  const selectedCurrencyConfig = getCurrencyConfig(formData.currency);

  // Check if this is user's first wallet
  React.useEffect(() => {
    checkIfFirstWallet();
  }, [user]);

  const checkIfFirstWallet = async () => {
    if (!user?.email) return;

    const result = await db.queryOnce({
      users: {
        $: {
          where: {
            email: user.email.toLowerCase(),
          },
        },
      },
    });

    const userData = result.data.users?.[0];
    if (!userData) return;

    const count = await getUserAccountsCount(userData.id);
    const isFirst = count === 0;
    setIsFirstAccount(isFirst);

    if (isFirst) {
      setFormData((prev) => ({ ...prev, isDefault: true }));
    }
  };

  const createAccountMutation = useMutation({
    mutationFn: async (data: CreateAccountData) => {
      if (!user?.email) throw new Error('User not authenticated');
      return createAccount(user.email, data);
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        router.replace('/wallets');
      } else {
        setErrors({ name: response.error });
      }
    },
    onError: () => {
      setErrors({ name: 'Something went wrong. Please try again' });
    },
  });

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Please enter a wallet name';
    if (name.trim().length < 2) return 'Minimum 2 characters';
    if (name.length > 50) return 'Maximum 50 characters';
    return undefined;
  };

  const validateAccountType = (accountType: string): string | undefined => {
    if (!accountType) return 'Please select a wallet type';
    return undefined;
  };

  const validateStartingBalance = (balance: string): string | undefined => {
    if (!balance.trim()) return 'Please enter a starting balance';
    const parsed = parseBalance(balance);
    if (parsed === null) return 'Please enter a valid number';
    return undefined;
  };

  const validateLast4Digits = (digits: string): string | undefined => {
    if (digits && digits.length !== 4) return 'Should be 4 digits';
    if (digits && !/^\d{4}$/.test(digits)) return 'Should be 4 digits';
    return undefined;
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched({ ...touched, [field]: true });
    setFocusedField(null);

    let error: string | undefined;
    switch (field) {
      case 'name':
        error = validateName(formData.name);
        break;
      case 'accountType':
        error = validateAccountType(formData.accountType);
        break;
      case 'startingBalance':
        error = validateStartingBalance(formData.startingBalance);
        break;
      case 'last4Digits':
        error = validateLast4Digits(formData.last4Digits);
        break;
    }

    setErrors({ ...errors, [field]: error });
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    setTouched({
      name: true,
      accountType: true,
      startingBalance: true,
      last4Digits: true,
    });

    const newErrors: ValidationErrors = {
      name: validateName(formData.name),
      accountType: validateAccountType(formData.accountType),
      startingBalance: validateStartingBalance(formData.startingBalance),
      last4Digits: validateLast4Digits(formData.last4Digits),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some((error) => error !== undefined)) {
      return;
    }

    const parsedBalance = parseBalance(formData.startingBalance);
    if (parsedBalance === null) {
      setErrors({ ...errors, startingBalance: 'Please enter a valid number' });
      return;
    }

    const accountData: CreateAccountData = {
      name: formData.name.trim(),
      accountType: formData.accountType as AccountType,
      startingBalance: parsedBalance,
      last4Digits: formData.last4Digits || undefined,
      isDefault: formData.isDefault,
      currency: formData.currency,
    };

    createAccountMutation.mutate(accountData);
  };

  const isValid =
    !validateName(formData.name) &&
    !validateAccountType(formData.accountType) &&
    !validateStartingBalance(formData.startingBalance) &&
    !validateLast4Digits(formData.last4Digits);

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
          onPress={() => router.dismiss()}
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
        <Text className="text-white text-xl font-semibold flex-1">Add Wallet</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(0).duration(400)}>
            <Text className="text-center mb-6" style={{ color: colors.textWhiteSecondary, fontSize: 14 }}>
              Track your money across all wallets
            </Text>
          </Animated.View>

          {/* Wallet Name */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} className="mb-5">
            <Text className="text-xs font-medium mb-2" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Wallet Name
            </Text>
            <GlassInputContainer focused={focusedField === 'name'}>
              <View className="flex-row items-center justify-between">
                <TextInput
                  className="flex-1 text-base"
                  style={{ color: colors.textWhite }}
                  placeholder="e.g., My Checking, Savings"
                  placeholderTextColor={colors.textWhiteDisabled}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    setErrors({ ...errors, name: undefined });
                  }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => handleBlur('name')}
                  maxLength={50}
                />
                <Text className="text-xs ml-2" style={{ color: colors.textWhiteDisabled }}>
                  {formData.name.length}/50
                </Text>
              </View>
            </GlassInputContainer>
            {touched.name && errors.name && (
              <View className="flex-row items-center mt-2 ml-1">
                <Info size={12} color={colors.warning} />
                <Text className="text-xs ml-1.5" style={{ color: colors.warning }}>
                  {errors.name}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Account Type Selector */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)} className="mb-5">
            <Text className="text-xs font-medium mb-2" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Wallet Type
            </Text>
            <Pressable onPress={() => setShowAccountTypePicker(true)}>
              <GlassInputContainer focused={!!formData.accountType}>
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-base flex-1"
                    style={{ color: formData.accountType ? colors.textWhite : colors.textWhiteDisabled }}
                  >
                    {formData.accountType || 'Select wallet type'}
                  </Text>
                  <ChevronDown size={18} color={colors.textWhiteDisabled} />
                </View>
              </GlassInputContainer>
            </Pressable>
            {touched.accountType && errors.accountType && (
              <View className="flex-row items-center mt-2 ml-1">
                <Info size={12} color={colors.warning} />
                <Text className="text-xs ml-1.5" style={{ color: colors.warning }}>
                  {errors.accountType}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Currency Selector */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-5">
            <Text className="text-xs font-medium mb-2" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Currency
            </Text>
            <Pressable onPress={() => setShowCurrencyPicker(true)}>
              <GlassInputContainer focused={showCurrencyPicker}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base" style={{ color: colors.textWhite }}>
                    {formData.currency} — {selectedCurrencyConfig.displayName}
                  </Text>
                  <ChevronDown size={18} color={colors.textWhiteDisabled} />
                </View>
              </GlassInputContainer>
            </Pressable>
          </Animated.View>

          {/* Starting Balance */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)} className="mb-5">
            <Text className="text-xs font-medium mb-2" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Starting Balance
            </Text>
            <GlassInputContainer focused={focusedField === 'startingBalance'}>
              <View className="flex-row items-center">
                <Text className="text-base font-medium mr-3" style={{ color: colors.textWhiteDisabled }}>
                  {selectedCurrencyConfig.symbol}
                </Text>
                <TextInput
                  className="flex-1 text-base"
                  style={{ color: colors.textWhite }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textWhiteDisabled}
                  value={formData.startingBalance}
                  onChangeText={(text) => {
                    setFormData({ ...formData, startingBalance: text });
                    setErrors({ ...errors, startingBalance: undefined });
                  }}
                  onFocus={() => setFocusedField('startingBalance')}
                  onBlur={() => handleBlur('startingBalance')}
                  keyboardType="decimal-pad"
                />
              </View>
            </GlassInputContainer>
            {touched.startingBalance && errors.startingBalance && (
              <View className="flex-row items-center mt-2 ml-1">
                <Info size={12} color={colors.warning} />
                <Text className="text-xs ml-1.5" style={{ color: colors.warning }}>
                  {errors.startingBalance}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Last 4 Digits */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-medium" style={{ color: colors.textWhiteDisabled, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Last 4 Digits
              </Text>
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(44, 95, 93, 0.3)' }}>
                <Text className="text-xs" style={{ color: colors.sageGreen }}>Optional</Text>
              </View>
            </View>
            <GlassInputContainer focused={focusedField === 'last4Digits'}>
              <TextInput
                className="text-base"
                style={{ color: colors.textWhite }}
                placeholder="e.g., 1234"
                placeholderTextColor={colors.textWhiteDisabled}
                value={formData.last4Digits}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '').slice(0, 4);
                  setFormData({ ...formData, last4Digits: cleaned });
                  setErrors({ ...errors, last4Digits: undefined });
                }}
                onFocus={() => setFocusedField('last4Digits')}
                onBlur={() => handleBlur('last4Digits')}
                keyboardType="number-pad"
                maxLength={4}
              />
            </GlassInputContainer>
            {touched.last4Digits && errors.last4Digits && (
              <View className="flex-row items-center mt-2 ml-1">
                <Info size={12} color={colors.warning} />
                <Text className="text-xs ml-1.5" style={{ color: colors.warning }}>
                  {errors.last4Digits}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Default Wallet Toggle */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} className="mb-8">
            {!isFirstAccount ? (
              <Pressable
                onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              >
                <GlassCard className="p-4">
                  <View className="flex-row items-center">
                    <View
                      className="w-6 h-6 rounded-md border-2 mr-3 items-center justify-center"
                      style={{
                        borderColor: formData.isDefault ? colors.sageGreen : colors.textWhiteDisabled,
                        backgroundColor: formData.isDefault ? colors.contextTeal : 'transparent',
                      }}
                    >
                      {formData.isDefault && <CheckCircle2 size={14} color={colors.sageGreen} />}
                    </View>
                    <Text className="text-sm font-medium" style={{ color: colors.textWhite }}>
                      Set as default wallet
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            ) : (
              <GlassCard className="p-4">
                <Text className="text-xs text-center" style={{ color: colors.textWhiteSecondary }}>
                  This will be your default wallet
                </Text>
              </GlassCard>
            )}
          </Animated.View>

          {/* Submit Button */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <GlassButton
              variant="primary"
              onPress={handleSubmit}
              disabled={!isValid || createAccountMutation.isPending}
              style={{
                opacity: isValid && !createAccountMutation.isPending ? 1 : 0.4,
                height: 56,
              }}
              className="items-center justify-center"
            >
              {createAccountMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-semibold text-center" style={{ color: 'white' }}>
                  Add Wallet
                </Text>
              )}
            </GlassButton>
          </Animated.View>

          {/* Bottom padding */}
          <View className="h-10" />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Sheet Pickers */}
      <WalletTypePicker
        visible={showAccountTypePicker}
        selectedAccountType={formData.accountType}
        accountTypes={ACCOUNT_TYPES}
        onSelect={(accountType: AccountType) => {
          setFormData({ ...formData, accountType });
          setErrors({ ...errors, accountType: undefined });
        }}
        onClose={() => setShowAccountTypePicker(false)}
      />

      {/* Currency Picker Modal */}
      {showCurrencyPicker && (
        <Pressable
          className="absolute inset-0 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setShowCurrencyPicker(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              className="rounded-t-3xl px-5 pt-5 pb-10"
              style={{ backgroundColor: colors.contextDark }}
            >
              <Text className="text-lg font-semibold mb-4" style={{ color: colors.textWhite }}>
                Select Currency
              </Text>
              {CURRENCY_CODES.map((code) => {
                const config = CURRENCIES[code];
                const isSelected = formData.currency === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => {
                      setFormData({ ...formData, currency: code });
                      setShowCurrencyPicker(false);
                    }}
                    className="flex-row items-center py-3.5 px-4 rounded-xl mb-1"
                    style={{
                      backgroundColor: isSelected ? 'rgba(44, 95, 93, 0.3)' : 'transparent',
                    }}
                  >
                    <Text className="text-base font-semibold mr-3" style={{ color: colors.textWhite, width: 44 }}>
                      {code}
                    </Text>
                    <Text className="text-sm flex-1" style={{ color: colors.textWhiteSecondary }}>
                      {config.displayName}
                    </Text>
                    {isSelected && <CheckCircle2 size={20} color={colors.sageGreen} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      )}
    </LinearGradient>
  );
}
